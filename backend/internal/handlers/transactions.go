package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// transactionItem is used in request and response bodies.
type transactionItem struct {
	ID            uint    `json:"id,omitempty"`
	TransactionID uint    `json:"transaction_id,omitempty"`
	ServiceID     *uint   `json:"service_id,omitempty"`
	ProductID     *uint   `json:"product_id,omitempty"`
	Name          string  `json:"name"`
	Price         float64 `json:"price"`
	Qty           int     `json:"qty"`
	Subtotal      float64 `json:"subtotal"`
}

type createTransactionRequest struct {
	ClientID            *uint             `json:"client_id"`
	Items               []transactionItem `json:"items"`
	Subtotal            float64           `json:"subtotal"`
	Discount            float64           `json:"discount"`
	TaxAmount           float64           `json:"tax_amount"`
	TipAmount           float64           `json:"tip_amount"`
	GrandTotal          float64           `json:"grand_total"`
	PaymentMethod       string            `json:"payment_method"`
	SplitPaymentMethod  string            `json:"split_payment_method,omitempty"`
	SplitAmount         float64           `json:"split_amount,omitempty"`
	Notes               string            `json:"notes"`
}

// CreateTransaction POST /api/transactions
func (a *App) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var req createTransactionRequest
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.PaymentMethod == "" {
		req.PaymentMethod = "card"
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "tx error")
		return
	}
	defer tx.Rollback()

	var splitMethod *string
	var splitAmt *float64
	if req.SplitPaymentMethod != "" && req.SplitAmount > 0 {
		splitMethod = &req.SplitPaymentMethod
		splitAmt = &req.SplitAmount
	}
	res, err := tx.ExecContext(r.Context(),
		`INSERT INTO transactions
			(salon_id, client_id, subtotal, discount, tax_amount, tip_amount, grand_total, payment_method, split_payment_method, split_amount, notes)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		claims.SalonID, req.ClientID, req.Subtotal, req.Discount,
		req.TaxAmount, req.TipAmount, req.GrandTotal, req.PaymentMethod, splitMethod, splitAmt, req.Notes)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	txnID, _ := res.LastInsertId()

	for _, item := range req.Items {
		qty := item.Qty
		if qty <= 0 {
			qty = 1
		}
		subtotal := item.Subtotal
		if subtotal == 0 {
			subtotal = item.Price * float64(qty)
		}
		_, err = tx.ExecContext(r.Context(),
			`INSERT INTO transaction_items (transaction_id, service_id, product_id, name, price, qty, subtotal)
			 VALUES (?,?,?,?,?,?,?)`,
			txnID, item.ServiceID, item.ProductID, item.Name, item.Price, qty, subtotal)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "item insert error")
			return
		}
	}

	if req.ClientID != nil {
		_, _ = tx.ExecContext(r.Context(),
			`UPDATE clients SET total_visits = total_visits + 1 WHERE id = ?`, *req.ClientID)
	}

	// Deduct stock for any product line items — capture qty_before inside tx so reads are consistent
	type pendingLog struct {
		productID uint
		qty       int
		qtyBefore float64
		name      string
		price     float64
	}
	var stockLogs []pendingLog
	for _, item := range req.Items {
		if item.ProductID != nil {
			qty := item.Qty
			if qty <= 0 {
				qty = 1
			}
			var qtyBefore float64
			_ = tx.QueryRowContext(r.Context(),
				`SELECT stock_qty FROM inventory_items WHERE id=? AND salon_id=?`, *item.ProductID, claims.SalonID).Scan(&qtyBefore)
			_, _ = tx.ExecContext(r.Context(),
				`UPDATE inventory_items SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ? AND salon_id = ?`,
				qty, *item.ProductID, claims.SalonID)
			stockLogs = append(stockLogs, pendingLog{*item.ProductID, qty, qtyBefore, item.Name, item.Price})
		}
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "commit error")
		return
	}

	// Log movements after commit — so orphaned log rows can't appear if tx rolls back
	for _, sl := range stockLogs {
		a.logStockMovement(r.Context(), claims.SalonID, int64(sl.productID), "sale", -float64(sl.qty), sl.qtyBefore, "POS sale: "+sl.name, fmt.Sprintf("txn#%d", txnID), sl.price)
	}

	resp := map[string]any{
		"id":         txnID,
		"created_at": time.Now().UTC(),
	}

	// Auto-award loyalty points when a client is attached
	if req.ClientID != nil && req.GrandTotal > 0 {
		if result := a.AutoAwardLoyaltyPoints(r.Context(), claims.SalonID, *req.ClientID, req.GrandTotal, txnID); result != nil {
			resp["loyalty_points_earned"] = result.PointsEarned
			resp["new_loyalty_balance"] = result.NewBalance
			if len(result.RewardsUnlocked) > 0 {
				resp["rewards_unlocked"] = result.RewardsUnlocked
			}
		}

		// Schedule post-visit review request
		go a.ScheduleReviewRequest(r.Context(), claims.SalonID, *req.ClientID, txnID)
	}

	// Loyalty star milestone check (fires even without grand_total, e.g. comp visits)
	if req.ClientID != nil {
		cID := *req.ClientID
		tID := uint(txnID)
		sID := claims.SalonID
		go a.CheckLoyaltyMilestone(context.Background(), sID, cID, tID)
	}

	a.JSON(w, http.StatusCreated, resp)
}

// ListTransactions GET /api/transactions
func (a *App) ListTransactions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	clientID := r.URL.Query().Get("client_id")
	query := `SELECT t.id, t.client_id,
		        COALESCE(CONCAT(c.first_name,' ',c.last_name), 'Walk-in') AS client_name,
		        t.grand_total, t.payment_method, t.status,
		        (SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.id) AS items_count,
		        t.created_at
		 FROM transactions t
		 LEFT JOIN clients c ON c.id = t.client_id
		 WHERE t.salon_id = ?`
	args := []any{claims.SalonID}
	if clientID != "" {
		query += ` AND t.client_id = ?`
		args = append(args, clientID)
	}
	query += ` ORDER BY t.created_at DESC LIMIT 100`

	rows, err := a.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type txnRow struct {
		ID            uint      `json:"id"`
		ClientID      *uint     `json:"client_id"`
		ClientName    string    `json:"client_name"`
		GrandTotal    float64   `json:"grand_total"`
		PaymentMethod string    `json:"payment_method"`
		Status        string    `json:"status"`
		ItemsCount    int       `json:"items_count"`
		CreatedAt     time.Time `json:"created_at"`
	}

	var result []txnRow
	for rows.Next() {
		var t txnRow
		rows.Scan(&t.ID, &t.ClientID, &t.ClientName,
			&t.GrandTotal, &t.PaymentMethod, &t.Status,
			&t.ItemsCount, &t.CreatedAt)
		result = append(result, t)
	}
	if result == nil {
		result = []txnRow{}
	}
	a.JSON(w, http.StatusOK, result)
}

// GetTransaction GET /api/transactions/{id}
func (a *App) GetTransaction(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	type fullTransaction struct {
		ID            uint              `json:"id"`
		SalonID       uint              `json:"salon_id"`
		ClientID      *uint             `json:"client_id"`
		ClientName    string            `json:"client_name"`
		Subtotal      float64           `json:"subtotal"`
		Discount      float64           `json:"discount"`
		TaxAmount     float64           `json:"tax_amount"`
		TipAmount     float64           `json:"tip_amount"`
		GrandTotal    float64           `json:"grand_total"`
		PaymentMethod string            `json:"payment_method"`
		Status        string            `json:"status"`
		Notes         string            `json:"notes"`
		CreatedAt     time.Time         `json:"created_at"`
		Items         []transactionItem `json:"items"`
	}

	var t fullTransaction
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT t.id, t.salon_id, t.client_id,
		        COALESCE(CONCAT(c.first_name,' ',c.last_name), 'Walk-in'),
		        t.subtotal, t.discount, t.tax_amount, t.tip_amount, t.grand_total,
		        t.payment_method, t.status, COALESCE(t.notes,''), t.created_at
		 FROM transactions t
		 LEFT JOIN clients c ON c.id = t.client_id
		 WHERE t.id = ? AND t.salon_id = ?`, id, claims.SalonID).
		Scan(&t.ID, &t.SalonID, &t.ClientID, &t.ClientName,
			&t.Subtotal, &t.Discount, &t.TaxAmount, &t.TipAmount, &t.GrandTotal,
			&t.PaymentMethod, &t.Status, &t.Notes, &t.CreatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "transaction not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	itemRows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, transaction_id, service_id, product_id, name, price, qty, subtotal
		 FROM transaction_items WHERE transaction_id = ?`, id)
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var it transactionItem
			itemRows.Scan(&it.ID, &it.TransactionID, &it.ServiceID, &it.ProductID,
				&it.Name, &it.Price, &it.Qty, &it.Subtotal)
			t.Items = append(t.Items, it)
		}
	}
	if t.Items == nil {
		t.Items = []transactionItem{}
	}

	a.JSON(w, http.StatusOK, t)
}

// setTransactionStatus is shared by Refund/Void — both just change a sale's
// bookkeeping status; every revenue report already filters on
// status='completed', so this alone corrects reporting. No payment gateway
// call is made (POS sales here are settled via a physical card terminal or
// cash, not through this app), so "refund"/"void" record what already
// happened at the register.
func (a *App) setTransactionStatus(w http.ResponseWriter, r *http.Request, newStatus, action string) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	a.Decode(r, &body) // optional body — ignore decode errors (empty body is fine)

	var currentStatus string
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT status FROM transactions WHERE id=? AND salon_id=?`, id, claims.SalonID).Scan(&currentStatus); err != nil {
		a.Error(w, http.StatusNotFound, "transaction not found")
		return
	}
	if currentStatus != "completed" {
		a.Error(w, http.StatusConflict, "this sale is already "+currentStatus)
		return
	}

	if _, err := a.DB.ExecContext(r.Context(),
		`UPDATE transactions SET status=? WHERE id=? AND salon_id=?`, newStatus, id, claims.SalonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.logActivity(r.Context(), claims.SalonID, claims.UserID, action, "transaction", uint(id), map[string]any{"reason": body.Reason})
	a.JSON(w, http.StatusOK, map[string]any{"status": newStatus})
}

// RefundTransaction POST /api/transactions/{id}/refund
func (a *App) RefundTransaction(w http.ResponseWriter, r *http.Request) {
	a.setTransactionStatus(w, r, "refunded", "transaction_refunded")
}

// VoidTransaction POST /api/transactions/{id}/void
func (a *App) VoidTransaction(w http.ResponseWriter, r *http.Request) {
	a.setTransactionStatus(w, r, "void", "transaction_voided")
}

// SendPaymentLink POST /api/transactions/{id}/payment-link
func (a *App) SendPaymentLink(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var grandTotal float64
	var clientID sql.NullInt64
	var phone, firstName sql.NullString

	err = a.DB.QueryRowContext(r.Context(),
		`SELECT t.grand_total, t.client_id, c.phone, c.first_name
		 FROM transactions t
		 LEFT JOIN clients c ON c.id = t.client_id AND c.salon_id = t.salon_id
		 WHERE t.id = ? AND t.salon_id = ?`, id, claims.SalonID).
		Scan(&grandTotal, &clientID, &phone, &firstName)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "transaction not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	if !phone.Valid || phone.String == "" {
		a.Error(w, http.StatusBadRequest, "no phone number on file for this client")
		return
	}

	// Build Stripe Checkout Session
	amountCents := int(grandTotal * 100)
	form := url.Values{}
	form.Set("payment_method_types[]", "card")
	form.Set("mode", "payment")
	form.Set("line_items[0][price_data][currency]", "usd")
	form.Set("line_items[0][price_data][product_data][name]", "Kriyansh Beauty Bar Services")
	form.Set("line_items[0][price_data][unit_amount]", fmt.Sprintf("%d", amountCents))
	form.Set("line_items[0][quantity]", "1")
	form.Set("success_url", "https://store.kriyanshbeautybar.com/kiosk")
	form.Set("cancel_url", "https://store.kriyanshbeautybar.com/kiosk")

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://api.stripe.com/v1/checkout/sessions",
		strings.NewReader(form.Encode()))
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "failed to build stripe request")
		return
	}
	req.Header.Set("Authorization", "Bearer "+a.StripeKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "stripe request failed")
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		a.Error(w, http.StatusInternalServerError, "stripe error: "+string(body))
		return
	}

	var stripeResp struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(body, &stripeResp); err != nil || stripeResp.URL == "" {
		a.Error(w, http.StatusInternalServerError, "failed to parse stripe response")
		return
	}

	name := firstName.String
	if name == "" {
		name = "there"
	}
	msg := fmt.Sprintf("Hi %s! Complete your payment for your visit at Kriyansh Beauty Bar: %s", name, stripeResp.URL)
	a.Notifier.SendSMS(phone.String, msg)

	a.JSON(w, http.StatusOK, map[string]any{
		"sent":  true,
		"phone": phone.String,
	})
}
