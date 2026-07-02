package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

// transactionItem is used in request and response bodies.
type transactionItem struct {
	ID            uint    `json:"id,omitempty"`
	TransactionID uint    `json:"transaction_id,omitempty"`
	ServiceID     *uint   `json:"service_id,omitempty"`
	Name          string  `json:"name"`
	Price         float64 `json:"price"`
	Qty           int     `json:"qty"`
	Subtotal      float64 `json:"subtotal"`
}

type createTransactionRequest struct {
	ClientID      *uint             `json:"client_id"`
	Items         []transactionItem `json:"items"`
	Subtotal      float64           `json:"subtotal"`
	Discount      float64           `json:"discount"`
	TaxAmount     float64           `json:"tax_amount"`
	TipAmount     float64           `json:"tip_amount"`
	GrandTotal    float64           `json:"grand_total"`
	PaymentMethod string            `json:"payment_method"`
	Notes         string            `json:"notes"`
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

	res, err := tx.ExecContext(r.Context(),
		`INSERT INTO transactions
			(salon_id, client_id, subtotal, discount, tax_amount, tip_amount, grand_total, payment_method, notes)
		 VALUES (?,?,?,?,?,?,?,?,?)`,
		claims.SalonID, req.ClientID, req.Subtotal, req.Discount,
		req.TaxAmount, req.TipAmount, req.GrandTotal, req.PaymentMethod, req.Notes)
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
			`INSERT INTO transaction_items (transaction_id, service_id, name, price, qty, subtotal)
			 VALUES (?,?,?,?,?,?)`,
			txnID, item.ServiceID, item.Name, item.Price, qty, subtotal)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "item insert error")
			return
		}
	}

	if req.ClientID != nil {
		_, _ = tx.ExecContext(r.Context(),
			`UPDATE clients SET total_visits = total_visits + 1 WHERE id = ?`, *req.ClientID)
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "commit error")
		return
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

	a.JSON(w, http.StatusCreated, resp)
}

// ListTransactions GET /api/transactions
func (a *App) ListTransactions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT t.id, t.client_id,
		        COALESCE(CONCAT(c.first_name,' ',c.last_name), 'Walk-in') AS client_name,
		        t.grand_total, t.payment_method, t.status,
		        (SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.id) AS items_count,
		        t.created_at
		 FROM transactions t
		 LEFT JOIN clients c ON c.id = t.client_id
		 WHERE t.salon_id = ?
		 ORDER BY t.created_at DESC
		 LIMIT 100`, claims.SalonID)
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
		`SELECT id, transaction_id, service_id, name, price, qty, subtotal
		 FROM transaction_items WHERE transaction_id = ?`, id)
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var it transactionItem
			itemRows.Scan(&it.ID, &it.TransactionID, &it.ServiceID,
				&it.Name, &it.Price, &it.Qty, &it.Subtotal)
			t.Items = append(t.Items, it)
		}
	}
	if t.Items == nil {
		t.Items = []transactionItem{}
	}

	a.JSON(w, http.StatusOK, t)
}
