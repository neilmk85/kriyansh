package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"salonos/internal/auth"
	"salonos/internal/middleware"
)

func customerClaimsFrom(r *http.Request) *auth.CustomerClaims {
	c, _ := r.Context().Value(middleware.CustomerClaimsKey).(*auth.CustomerClaims)
	return c
}

// GET /api/customer/profile
func (a *App) CustomerProfile(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)
	var p struct {
		ID          uint    `json:"id"`
		FirstName   string  `json:"first_name"`
		LastName    string  `json:"last_name"`
		Email       string  `json:"email"`
		Phone       string  `json:"phone"`
		Gender      string  `json:"gender"`
		DOB         string  `json:"dob"`
		TotalVisits int     `json:"total_visits"`
		TotalSpend  float64 `json:"total_spend"`
		SMSConsent  bool    `json:"sms_consent"`
	}
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT id, first_name, last_name, COALESCE(email,''), phone,
		        COALESCE(gender,''), COALESCE(DATE_FORMAT(date_of_birth,'%Y-%m-%d'),''),
		        total_visits, COALESCE(total_spend,0), sms_consent
		 FROM clients WHERE id=? AND salon_id=?`, cc.ClientID, cc.SalonID).
		Scan(&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Phone,
			&p.Gender, &p.DOB, &p.TotalVisits, &p.TotalSpend, &p.SMSConsent)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, p)
}

// PUT /api/customer/profile
func (a *App) CustomerUpdateProfile(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)
	var req struct {
		FirstName  string `json:"first_name"`
		LastName   string `json:"last_name"`
		Email      string `json:"email"`
		Gender     string `json:"gender"`
		DOB        string `json:"dob"`
		SMSConsent bool   `json:"sms_consent"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var dob interface{}
	if req.DOB != "" {
		dob = req.DOB
	}
	_, err := a.DB.ExecContext(r.Context(),
		`UPDATE clients SET first_name=?, last_name=?, email=?, gender=?, date_of_birth=?, sms_consent=?
		 WHERE id=? AND salon_id=?`,
		req.FirstName, req.LastName, req.Email, req.Gender, dob, req.SMSConsent,
		cc.ClientID, cc.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// GET /api/customer/appointments
func (a *App) CustomerAppointments(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)
	filter := r.URL.Query().Get("filter") // upcoming | past | all

	query := `
		SELECT a.id, DATE_FORMAT(a.start_at,'%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(a.end_at,'%Y-%m-%dT%H:%i:%sZ'),
		       a.status, COALESCE(a.notes,''),
		       CONCAT(u.first_name,' ',u.last_name),
		       GROUP_CONCAT(COALESCE(s.name,'') ORDER BY s.name SEPARATOR ', '),
		       COALESCE(SUM(aps.price),0)
		FROM appointments a
		JOIN staff_profiles sp ON sp.id = a.staff_id
		JOIN users u ON u.id = sp.user_id
		LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
		LEFT JOIN services s ON s.id = aps.service_id
		WHERE a.client_id=? AND a.salon_id=?`

	switch filter {
	case "upcoming":
		query += ` AND a.start_at >= NOW() AND a.status NOT IN ('cancelled','no_show')`
	case "past":
		query += ` AND (a.start_at < NOW() OR a.status IN ('completed','no_show','cancelled'))`
	}
	query += ` GROUP BY a.id ORDER BY a.start_at DESC LIMIT 50`

	rows, err := a.DB.QueryContext(r.Context(), query, cc.ClientID, cc.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type apptRow struct {
		ID        uint    `json:"id"`
		StartAt   string  `json:"start_at"`
		EndAt     string  `json:"end_at"`
		Status    string  `json:"status"`
		Notes     string  `json:"notes"`
		StaffName string  `json:"staff_name"`
		Services  string  `json:"services"`
		Total     float64 `json:"total"`
	}
	var out []apptRow
	for rows.Next() {
		var a apptRow
		rows.Scan(&a.ID, &a.StartAt, &a.EndAt, &a.Status, &a.Notes, &a.StaffName, &a.Services, &a.Total)
		out = append(out, a)
	}
	if out == nil {
		out = []apptRow{}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	a.JSON(w, http.StatusOK, out)
}

// GET /api/customer/loyalty
func (a *App) CustomerLoyalty(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)

	var balance, lifetime int
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(balance,0), COALESCE(lifetime_points,0) FROM client_loyalty
		 WHERE client_id=? AND salon_id=?`, cc.ClientID, cc.SalonID).
		Scan(&balance, &lifetime)

	// Current tier
	var tierName, tierColor string
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT name, COALESCE(color,'#0D9488') FROM loyalty_tiers
		 WHERE min_points<=? AND salon_id=? ORDER BY min_points DESC LIMIT 1`,
		lifetime, cc.SalonID).Scan(&tierName, &tierColor)

	// Next tier
	var nextTierName string
	var nextTierPoints int
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT name, min_points FROM loyalty_tiers
		 WHERE min_points>? AND salon_id=? ORDER BY min_points ASC LIMIT 1`,
		lifetime, cc.SalonID).Scan(&nextTierName, &nextTierPoints)

	// Recent transactions (last 10)
	type txRow struct {
		Type        string `json:"type"`
		Points      int    `json:"points"`
		Description string `json:"description"`
		CreatedAt   string `json:"created_at"`
	}
	var txns []txRow
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT COALESCE(lt.type,'earn'), lt.points, COALESCE(lt.note,''), DATE_FORMAT(lt.created_at,'%Y-%m-%dT%H:%i:%sZ')
		 FROM loyalty_transactions lt
		 WHERE lt.client_id=? AND lt.salon_id=?
		 ORDER BY lt.created_at DESC LIMIT 10`, cc.ClientID, cc.SalonID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t txRow
			rows.Scan(&t.Type, &t.Points, &t.Description, &t.CreatedAt)
			txns = append(txns, t)
		}
	}
	if txns == nil {
		txns = []txRow{}
	}

	// Available rewards
	type rewardRow struct {
		ID         uint    `json:"id"`
		Name       string  `json:"name"`
		RewardType string  `json:"reward_type"`
		Value      float64 `json:"value"`
		Status     string  `json:"status"`
		GrantedAt  string  `json:"granted_at"`
	}
	var rewards []rewardRow
	rewardRows, err2 := a.DB.QueryContext(r.Context(),
		`SELECT cr.id, lr.name, lr.reward_type, lr.value, cr.status, DATE_FORMAT(cr.granted_at,'%Y-%m-%dT%H:%i:%sZ')
		 FROM client_rewards cr
		 JOIN loyalty_rewards lr ON lr.id = cr.reward_id
		 WHERE cr.client_id=? AND cr.salon_id=? AND cr.status='available'`, cc.ClientID, cc.SalonID)
	if err2 == nil {
		defer rewardRows.Close()
		for rewardRows.Next() {
			var rr rewardRow
			rewardRows.Scan(&rr.ID, &rr.Name, &rr.RewardType, &rr.Value, &rr.Status, &rr.GrantedAt)
			rewards = append(rewards, rr)
		}
	}
	if rewards == nil {
		rewards = []rewardRow{}
	}

	a.JSON(w, http.StatusOK, map[string]interface{}{
		"balance":          balance,
		"lifetime_points":  lifetime,
		"tier_name":        tierName,
		"tier_color":       tierColor,
		"next_tier_name":   nextTierName,
		"next_tier_points": nextTierPoints,
		"transactions":     txns,
		"rewards":          rewards,
	})
}

// PATCH /api/customer/appointments/{id}/cancel
func (a *App) CustomerCancelAppointment(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)
	id := r.PathValue("id")
	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status='cancelled'
		 WHERE id=? AND client_id=? AND salon_id=? AND start_at > NOW() AND status NOT IN ('cancelled','no_show','completed')`,
		id, cc.ClientID, cc.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusBadRequest, "appointment cannot be cancelled")
		return
	}
	a.JSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// PUT /api/customer/appointments/{id}/reschedule
func (a *App) CustomerRescheduleAppointment(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)
	id := r.PathValue("id")

	var req struct {
		StartAt string `json:"start_at"` // RFC3339
	}
	if err := a.Decode(r, &req); err != nil || req.StartAt == "" {
		a.Error(w, http.StatusBadRequest, "start_at is required")
		return
	}
	newStart, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid start_at format")
		return
	}
	if newStart.Before(time.Now()) {
		a.Error(w, http.StatusBadRequest, "cannot reschedule to a past time")
		return
	}

	// Get total duration from services
	var totalMin int
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(SUM(aps.duration_min),60) FROM appointment_services aps WHERE aps.appointment_id=?`, id).
		Scan(&totalMin)
	newEnd := newStart.Add(time.Duration(totalMin) * time.Minute)

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET start_at=?, end_at=?
		 WHERE id=? AND client_id=? AND salon_id=? AND start_at > NOW() AND status NOT IN ('cancelled','no_show','completed')`,
		newStart.UTC(), newEnd.UTC(), id, cc.ClientID, cc.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusBadRequest, "appointment cannot be rescheduled")
		return
	}
	a.JSON(w, http.StatusOK, map[string]string{
		"status":   "rescheduled",
		"start_at": newStart.Format(time.RFC3339),
		"end_at":   newEnd.Format(time.RFC3339),
	})
}

// GET /api/customer/packages
func (a *App) CustomerPackages(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)

	type pkgRow struct {
		ID            uint    `json:"id"`
		Name          string  `json:"name"`
		Description   string  `json:"description"`
		PurchasePrice float64 `json:"purchase_price"`
		PurchasedAt   string  `json:"purchased_at"`
		ExpiresAt     string  `json:"expires_at"`
		Status        string  `json:"status"`
		Services      string  `json:"services"`
		UsedCount     int     `json:"used_count"`
		TotalQty      int     `json:"total_qty"`
	}

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT cp.id, p.name, COALESCE(p.description,''), cp.purchase_price,
		       DATE_FORMAT(cp.purchased_at,'%Y-%m-%dT%H:%i:%sZ'),
		       COALESCE(DATE_FORMAT(cp.expires_at,'%Y-%m-%dT%H:%i:%sZ'),''),
		       cp.status,
		       COALESCE(GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', '),''),
		       COUNT(DISTINCT pr.id),
		       COALESCE(SUM(DISTINCT ps.qty),0)
		FROM client_packages cp
		JOIN packages p ON p.id=cp.package_id
		LEFT JOIN package_services ps ON ps.package_id=p.id
		LEFT JOIN services s ON s.id=ps.service_id
		LEFT JOIN package_redemptions pr ON pr.client_package_id=cp.id
		WHERE cp.client_id=? AND cp.salon_id=?
		GROUP BY cp.id ORDER BY cp.purchased_at DESC`,
		cc.ClientID, cc.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var out []pkgRow
	for rows.Next() {
		var p pkgRow
		rows.Scan(&p.ID, &p.Name, &p.Description, &p.PurchasePrice, &p.PurchasedAt,
			&p.ExpiresAt, &p.Status, &p.Services, &p.UsedCount, &p.TotalQty)
		out = append(out, p)
	}
	if out == nil {
		out = []pkgRow{}
	}
	a.JSON(w, http.StatusOK, out)
}

// GET /api/customer/membership
func (a *App) CustomerMembership(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)

	var m struct {
		ID              uint    `json:"id"`
		Name            string  `json:"name"`
		Description     string  `json:"description"`
		Price           float64 `json:"price"`
		BillingCycle    string  `json:"billing_cycle"`
		DiscountPct     float64 `json:"discount_pct"`
		Status          string  `json:"status"`
		StartDate       string  `json:"start_date"`
		NextBillingDate string  `json:"next_billing_date"`
		Color           string  `json:"color"`
	}

	err := a.DB.QueryRowContext(r.Context(), `
		SELECT cm.id, mp.name, COALESCE(mp.description,''), mp.price,
		       COALESCE(mp.billing_cycle,'monthly'), COALESCE(mp.service_discount_pct,0),
		       cm.status, COALESCE(DATE_FORMAT(cm.start_date,'%Y-%m-%d'),''),
		       COALESCE(DATE_FORMAT(cm.next_billing_date,'%Y-%m-%d'),''),
		       COALESCE(mp.color,'#0D9488')
		FROM client_memberships cm
		JOIN membership_plans mp ON mp.id=cm.plan_id
		WHERE cm.client_id=? AND cm.salon_id=? AND cm.status='active' LIMIT 1`,
		cc.ClientID, cc.SalonID).
		Scan(&m.ID, &m.Name, &m.Description, &m.Price, &m.BillingCycle,
			&m.DiscountPct, &m.Status, &m.StartDate, &m.NextBillingDate, &m.Color)
	if err != nil {
		// No active membership — return null
		a.JSON(w, http.StatusOK, nil)
		return
	}
	a.JSON(w, http.StatusOK, m)
}

// GET /api/customer/transactions
func (a *App) CustomerTransactions(w http.ResponseWriter, r *http.Request) {
	cc := customerClaimsFrom(r)

	type txRow struct {
		ID            uint    `json:"id"`
		GrandTotal    float64 `json:"grand_total"`
		PaymentMethod string  `json:"payment_method"`
		Status        string  `json:"status"`
		CreatedAt     string  `json:"created_at"`
		StaffName     string  `json:"staff_name"`
		Items         string  `json:"items"`
	}

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT t.id, t.grand_total, t.payment_method, t.status,
		       DATE_FORMAT(t.created_at,'%Y-%m-%dT%H:%i:%sZ'),
		       COALESCE(CONCAT(u.first_name,' ',u.last_name),''),
		       COALESCE(GROUP_CONCAT(ti.name ORDER BY ti.name SEPARATOR ', '),'')
		FROM transactions t
		LEFT JOIN users u ON u.id=t.staff_id
		LEFT JOIN transaction_items ti ON ti.transaction_id=t.id
		WHERE t.client_id=? AND t.salon_id=?
		GROUP BY t.id ORDER BY t.created_at DESC LIMIT 50`,
		cc.ClientID, cc.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, fmt.Sprintf("db error: %v", err))
		return
	}
	defer rows.Close()

	var out []txRow
	for rows.Next() {
		var t txRow
		rows.Scan(&t.ID, &t.GrandTotal, &t.PaymentMethod, &t.Status,
			&t.CreatedAt, &t.StaffName, &t.Items)
		out = append(out, t)
	}
	if out == nil {
		out = []txRow{}
	}
	a.JSON(w, http.StatusOK, out)
}
