package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// GET /api/public/slots?staff_id=X&date=YYYY-MM-DD
func (a *App) PublicListSlots(w http.ResponseWriter, r *http.Request) {
	staffIDStr := r.URL.Query().Get("staff_id")
	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		a.Error(w, http.StatusBadRequest, "date required")
		return
	}
	d, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid date format")
		return
	}

	bookedSet := make(map[string]bool)
	if staffIDStr != "" && staffIDStr != "0" {
		rows, err := a.DB.QueryContext(r.Context(),
			`SELECT DATE_FORMAT(start_at, '%H:%i') FROM appointments
			 WHERE staff_id=? AND DATE(start_at)=? AND status NOT IN ('cancelled','no_show')`,
			staffIDStr, dateStr)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var t string
				rows.Scan(&t)
				bookedSet[t] = true
			}
		}
	}

	now := time.Now().UTC()
	isToday := d.Format("2006-01-02") == now.Format("2006-01-02")

	type Slot struct {
		Time      string `json:"time"`
		Available bool   `json:"available"`
	}
	var slots []Slot
	for h := 9; h < 19; h++ {
		for _, m := range []int{0, 30} {
			tStr := fmt.Sprintf("%02d:%02d", h, m)
			avail := !bookedSet[tStr]
			if isToday && avail {
				slotMinutes := h*60 + m
				nowMinutes := now.Hour()*60 + now.Minute() + 30
				if slotMinutes <= nowMinutes {
					avail = false
				}
			}
			slots = append(slots, Slot{Time: tStr, Available: avail})
		}
	}
	a.JSON(w, http.StatusOK, slots)
}

// GET /api/public/staff — list stylists for booking form
func (a *App) PublicListStaff(w http.ResponseWriter, r *http.Request) {
	// Determine salon from first salon
	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.JSON(w, http.StatusOK, []struct{}{})
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT sp.id, CONCAT(u.first_name,' ',u.last_name), COALESCE(sp.specializations,''), COALESCE(sp.color,'#0D9488')
		 FROM staff_profiles sp JOIN users u ON u.id=sp.user_id
		 WHERE sp.salon_id=? AND sp.accepts_online=1 AND u.is_active=1
		 ORDER BY u.first_name`, salonID)
	if err != nil {
		a.JSON(w, http.StatusOK, []struct{}{})
		return
	}
	defer rows.Close()
	type staffRow struct {
		ID             uint   `json:"id"`
		Name           string `json:"name"`
		Specialization string `json:"specialization"`
		Color          string `json:"color"`
	}
	var out []staffRow
	for rows.Next() {
		var s staffRow
		rows.Scan(&s.ID, &s.Name, &s.Specialization, &s.Color)
		out = append(out, s)
	}
	if out == nil {
		out = []staffRow{}
	}
	a.JSON(w, http.StatusOK, out)
}

// POST /api/public/payment-intent — create Stripe PaymentIntent for deposit
func (a *App) PublicCreatePaymentIntent(w http.ResponseWriter, r *http.Request) {
	if a.StripeKey == "" {
		a.Error(w, http.StatusServiceUnavailable, "payments not configured")
		return
	}
	var req struct {
		AmountCents int    `json:"amount_cents"`
		ServiceName string `json:"service_name"`
	}
	if err := a.Decode(r, &req); err != nil || req.AmountCents <= 0 {
		a.Error(w, http.StatusBadRequest, "amount_cents required")
		return
	}

	data := url.Values{}
	data.Set("amount", fmt.Sprintf("%d", req.AmountCents))
	data.Set("currency", "usd")
	data.Set("payment_method_types[]", "card")
	if req.ServiceName != "" {
		data.Set("description", "Deposit: "+req.ServiceName)
	}

	stripeReq, _ := http.NewRequestWithContext(r.Context(), "POST",
		"https://api.stripe.com/v1/payment_intents",
		strings.NewReader(data.Encode()))
	stripeReq.Header.Set("Authorization", "Bearer "+a.StripeKey)
	stripeReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(stripeReq)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "payment provider error")
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var stripeResp struct {
		ID           string `json:"id"`
		ClientSecret string `json:"client_secret"`
	}
	if err := json.Unmarshal(body, &stripeResp); err != nil || stripeResp.ClientSecret == "" {
		a.Error(w, http.StatusInternalServerError, "payment provider error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]string{
		"payment_intent_id": stripeResp.ID,
		"client_secret":     stripeResp.ClientSecret,
	})
}

// POST /api/public/appointments — create appointment from customer booking flow
func (a *App) PublicCreateAppointment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirstName       string  `json:"first_name"`
		LastName        string  `json:"last_name"`
		Email           string  `json:"email"`
		Phone           string  `json:"phone"`
		ServiceIDs      []int   `json:"service_ids"`
		StaffID         int     `json:"staff_id"`
		StartAt         string  `json:"start_at"` // RFC3339
		Notes           string  `json:"notes"`
		PaymentIntentID string  `json:"payment_intent_id"`
		DepositPaid     float64 `json:"deposit_paid"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Phone == "" || len(req.ServiceIDs) == 0 || req.StartAt == "" {
		a.Error(w, http.StatusBadRequest, "phone, service_ids, start_at are required")
		return
	}

	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid start_at format (RFC3339 expected)")
		return
	}

	// Determine salon
	var salonID uint
	if req.StaffID == 0 {
		if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	} else {
		if err := a.DB.QueryRowContext(r.Context(), `SELECT salon_id FROM staff_profiles WHERE id=? LIMIT 1`, req.StaffID).Scan(&salonID); err != nil {
			a.Error(w, http.StatusBadRequest, "invalid staff_id")
			return
		}
	}

	// Verify payment if Stripe is configured
	depositPaid := 0.0
	if a.StripeKey != "" && req.PaymentIntentID != "" {
		pi, err := verifyPaymentIntent(r, a.StripeKey, req.PaymentIntentID)
		if err != nil || (pi != "succeeded" && pi != "requires_capture") {
			a.Error(w, http.StatusPaymentRequired, "deposit payment not confirmed")
			return
		}
		depositPaid = req.DepositPaid
	}

	// Find or create client
	var clientID int
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT id FROM clients WHERE phone=? AND salon_id=?`, req.Phone, salonID).Scan(&clientID)
	if err == sql.ErrNoRows {
		res, err := a.DB.ExecContext(r.Context(),
			`INSERT INTO clients (salon_id, first_name, last_name, email, phone, sms_consent)
			 VALUES (?, ?, ?, ?, ?, 1)`,
			salonID, req.FirstName, req.LastName, req.Email, req.Phone)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
		id, _ := res.LastInsertId()
		clientID = int(id)
	} else if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Calculate total duration and end time
	totalDuration := 0
	for _, svcID := range req.ServiceIDs {
		var dur int
		_ = a.DB.QueryRowContext(r.Context(), `SELECT duration_min FROM services WHERE id=?`, svcID).Scan(&dur)
		totalDuration += dur
	}
	if totalDuration == 0 {
		totalDuration = 60
	}
	endAt := startAt.Add(time.Duration(totalDuration) * time.Minute)

	// For "Any Available", find a free staff member now that we know the time window
	actualStaffID := req.StaffID
	if req.StaffID == 0 {
		if err := a.DB.QueryRowContext(r.Context(),
			`SELECT id FROM staff_profiles
			 WHERE salon_id=? AND accepts_online=1
			 AND id NOT IN (
			   SELECT staff_id FROM appointments
			   WHERE salon_id=? AND status NOT IN ('cancelled','no_show')
			   AND start_at < ? AND end_at > ?
			 )
			 ORDER BY id LIMIT 1`, salonID, salonID, endAt, startAt).Scan(&actualStaffID); err != nil {
			if err == sql.ErrNoRows {
				a.Error(w, http.StatusConflict, "no available staff at this time")
				return
			}
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	// Create appointment
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO appointments (salon_id, client_id, staff_id, start_at, end_at, status, notes, deposit_paid, source)
		 VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, 'online')`,
		salonID, clientID, actualStaffID, startAt, endAt, req.Notes, depositPaid)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	apptID, _ := res.LastInsertId()

	// Link services
	for _, svcID := range req.ServiceIDs {
		var name string
		var price float64
		var dur int
		_ = a.DB.QueryRowContext(r.Context(),
			`SELECT name, price, duration_min FROM services WHERE id=?`, svcID).
			Scan(&name, &price, &dur)
		a.DB.ExecContext(r.Context(),
			`INSERT INTO appointment_services (appointment_id, service_id, service_name, price, duration_min)
			 VALUES (?, ?, ?, ?, ?)`,
			apptID, svcID, name, price, dur)
	}

	// Send confirmation SMS
	if req.Phone != "" {
		var staffName string
		_ = a.DB.QueryRowContext(r.Context(),
			`SELECT CONCAT(u.first_name,' ',u.last_name) FROM staff_profiles sp
			 JOIN users u ON u.id=sp.user_id WHERE sp.id=?`, req.StaffID).Scan(&staffName)

		msg := fmt.Sprintf(
			"Hi %s! Your appointment at Kriyansh Beauty Bar is confirmed for %s with %s. See you then! Reply STOP to opt out.",
			req.FirstName,
			startAt.Format("Mon Jan 2 at 3:04 PM"),
			staffName,
		)
		a.Notifier.SendSMS(req.Phone, msg)
	}

	a.JSON(w, http.StatusCreated, map[string]interface{}{
		"appointment_id": apptID,
		"status":         "confirmed",
		"start_at":       startAt.Format(time.RFC3339),
		"end_at":         endAt.Format(time.RFC3339),
	})
}

func verifyPaymentIntent(r *http.Request, stripeKey, piID string) (string, error) {
	req, _ := http.NewRequestWithContext(r.Context(), "GET",
		"https://api.stripe.com/v1/payment_intents/"+piID, nil)
	req.Header.Set("Authorization", "Bearer "+stripeKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var pi struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(body, &pi); err != nil {
		return "", err
	}
	return pi.Status, nil
}
