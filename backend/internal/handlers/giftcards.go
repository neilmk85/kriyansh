package handlers

import (
	"net/http"
	"time"
)

type giftCard struct {
	ID              int       `json:"id"`
	Code            string    `json:"code"`
	InitialAmount   float64   `json:"initial_amount"`
	RedeemedAmount  float64   `json:"redeemed_amount"`
	Balance         float64   `json:"balance"`
	Status          string    `json:"status"`
	RecipientName   string    `json:"recipient_name"`
	RecipientEmail  string    `json:"recipient_email"`
	SenderName      string    `json:"sender_name"`
	Message         string    `json:"message"`
	IssuedAt        time.Time `json:"issued_at"`
}

// ListGiftCards returns all gift cards for the salon.
func (a *App) ListGiftCards(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT id, code, initial_amount, redeemed_amount,
		       (initial_amount - redeemed_amount) AS balance,
		       status, recipient_name, recipient_email, sender_name, message, issued_at
		FROM gift_cards
		WHERE salon_id = ?
		ORDER BY issued_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	cards := []giftCard{}
	for rows.Next() {
		var c giftCard
		rows.Scan(&c.ID, &c.Code, &c.InitialAmount, &c.RedeemedAmount, &c.Balance,
			&c.Status, &c.RecipientName, &c.RecipientEmail, &c.SenderName, &c.Message, &c.IssuedAt)
		cards = append(cards, c)
	}
	a.JSON(w, http.StatusOK, cards)
}

// IssueGiftCard creates a new gift card (admin/staff).
func (a *App) IssueGiftCard(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		Code           string  `json:"code"`
		Amount         float64 `json:"amount"`
		RecipientName  string  `json:"recipient_name"`
		RecipientEmail string  `json:"recipient_email"`
		SenderName     string  `json:"sender_name"`
		Message        string  `json:"message"`
	}
	if err := a.Decode(r, &body); err != nil || body.Amount <= 0 || body.Code == "" {
		a.Error(w, http.StatusBadRequest, "code and amount are required")
		return
	}
	res, err := a.DB.ExecContext(r.Context(), `
		INSERT INTO gift_cards (salon_id, code, initial_amount, recipient_name, recipient_email, sender_name, message)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		claims.SalonID, body.Code, body.Amount,
		body.RecipientName, body.RecipientEmail, body.SenderName, body.Message)
	if err != nil {
		a.Error(w, http.StatusConflict, "code already exists or db error")
		return
	}
	id, _ := res.LastInsertId()
	var card giftCard
	a.DB.QueryRowContext(r.Context(), `
		SELECT id, code, initial_amount, redeemed_amount,
		       (initial_amount - redeemed_amount) AS balance,
		       status, recipient_name, recipient_email, sender_name, message, issued_at
		FROM gift_cards WHERE id = ?`, id).Scan(
		&card.ID, &card.Code, &card.InitialAmount, &card.RedeemedAmount, &card.Balance,
		&card.Status, &card.RecipientName, &card.RecipientEmail, &card.SenderName, &card.Message, &card.IssuedAt)
	a.JSON(w, http.StatusCreated, card)
}

// ValidateGiftCard checks a code and returns its balance (no auth — used by customer and POS).
func (a *App) ValidateGiftCard(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		a.Error(w, http.StatusBadRequest, "code required")
		return
	}
	var card giftCard
	err := a.DB.QueryRowContext(r.Context(), `
		SELECT id, code, initial_amount, redeemed_amount,
		       (initial_amount - redeemed_amount) AS balance,
		       status, recipient_name, sender_name, issued_at
		FROM gift_cards WHERE code = ?`, code).Scan(
		&card.ID, &card.Code, &card.InitialAmount, &card.RedeemedAmount, &card.Balance,
		&card.Status, &card.RecipientName, &card.SenderName, &card.IssuedAt)
	if err != nil {
		a.Error(w, http.StatusNotFound, "gift card not found")
		return
	}
	if card.Status != "active" {
		a.Error(w, http.StatusUnprocessableEntity, "gift card is "+card.Status)
		return
	}
	a.JSON(w, http.StatusOK, card)
}

// RedeemGiftCard applies a partial or full redemption to a gift card.
func (a *App) RedeemGiftCard(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Amount float64 `json:"amount"`
	}
	if err := a.Decode(r, &body); err != nil || body.Amount <= 0 {
		a.Error(w, http.StatusBadRequest, "amount required")
		return
	}

	// Load current card
	var card giftCard
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT id, initial_amount, redeemed_amount,
		       (initial_amount - redeemed_amount) AS balance, status
		FROM gift_cards WHERE id = ? AND salon_id = ?`, id, claims.SalonID).Scan(
		&card.ID, &card.InitialAmount, &card.RedeemedAmount, &card.Balance, &card.Status)
	if err != nil {
		a.Error(w, http.StatusNotFound, "gift card not found")
		return
	}
	if card.Status != "active" {
		a.Error(w, http.StatusUnprocessableEntity, "gift card is "+card.Status)
		return
	}
	if body.Amount > card.Balance {
		a.Error(w, http.StatusBadRequest, "amount exceeds available balance")
		return
	}

	newRedeemed := card.RedeemedAmount + body.Amount
	newStatus := "active"
	if newRedeemed >= card.InitialAmount {
		newStatus = "redeemed"
	}

	_, err = a.DB.ExecContext(r.Context(), `
		UPDATE gift_cards SET redeemed_amount = ?, status = ? WHERE id = ?`,
		newRedeemed, newStatus, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"redeemed":        body.Amount,
		"remaining_balance": card.Balance - body.Amount,
		"status":          newStatus,
	})
}
