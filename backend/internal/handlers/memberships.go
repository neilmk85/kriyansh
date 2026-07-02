package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

type membershipPlan struct {
	ID                     uint      `json:"id"`
	SalonID                uint      `json:"salon_id"`
	Name                   string    `json:"name"`
	Description            string    `json:"description"`
	Price                  float64   `json:"price"`
	BillingCycle           string    `json:"billing_cycle"`
	ServiceDiscountPct     float64   `json:"service_discount_pct"`
	IsActive               bool      `json:"is_active"`
	Color                  string    `json:"color"`
	PaymentType            string    `json:"payment_type"`
	SessionsType           string    `json:"sessions_type"`
	SessionsCount          int       `json:"sessions_count"`
	ValidityDays           int       `json:"validity_days"`
	PaymentFrequency       string    `json:"payment_frequency"`
	EnableOnlineSales      bool      `json:"enable_online_sales"`
	EnableOnlineRedemption bool      `json:"enable_online_redemption"`
	TermsConditions        string    `json:"terms_conditions"`
	ServiceIDs             []int     `json:"service_ids"`
	ActiveMemberCount      int       `json:"active_member_count"`
	CreatedAt              time.Time `json:"created_at"`
}

type clientMembership struct {
	ID             uint      `json:"id"`
	SalonID        uint      `json:"salon_id"`
	ClientID       uint      `json:"client_id"`
	PlanID         uint      `json:"plan_id"`
	PlanName       string    `json:"plan_name"`
	Price          float64   `json:"price"`
	BillingCycle   string    `json:"billing_cycle"`
	DiscountPct    float64   `json:"discount_pct"`
	Status         string    `json:"status"`
	StartDate      string    `json:"start_date"`
	NextBillingDate string   `json:"next_billing_date"`
	CreatedAt      time.Time `json:"created_at"`
}

func (a *App) ListMembershipPlans(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	// Return ALL plans with active member count via LEFT JOIN subquery
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT mp.id, mp.salon_id, mp.name, COALESCE(mp.description,''), mp.price, mp.billing_cycle,
		        mp.service_discount_pct, mp.is_active,
		        COALESCE(mp.color,'#0D9488'), COALESCE(mp.payment_type,'recurring'),
		        COALESCE(mp.sessions_type,'unlimited'), COALESCE(mp.sessions_count,0),
		        COALESCE(mp.validity_days,30), COALESCE(mp.payment_frequency,'monthly'),
		        COALESCE(mp.enable_online_sales,1), COALESCE(mp.enable_online_redemption,1),
		        COALESCE(mp.terms_conditions,''), mp.created_at,
		        COUNT(cm.id) AS active_member_count
		 FROM membership_plans mp
		 LEFT JOIN client_memberships cm
		        ON cm.plan_id = mp.id AND cm.status = 'active'
		 WHERE mp.salon_id=?
		 GROUP BY mp.id
		 ORDER BY mp.is_active DESC, mp.price`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var plans []membershipPlan
	for rows.Next() {
		var p membershipPlan
		rows.Scan(&p.ID, &p.SalonID, &p.Name, &p.Description, &p.Price, &p.BillingCycle,
			&p.ServiceDiscountPct, &p.IsActive,
			&p.Color, &p.PaymentType, &p.SessionsType, &p.SessionsCount,
			&p.ValidityDays, &p.PaymentFrequency,
			&p.EnableOnlineSales, &p.EnableOnlineRedemption,
			&p.TermsConditions, &p.CreatedAt,
			&p.ActiveMemberCount)

		// Load associated service IDs
		svcRows, sErr := a.DB.QueryContext(r.Context(),
			`SELECT service_id FROM membership_plan_services WHERE plan_id = ?`, p.ID)
		if sErr == nil {
			p.ServiceIDs = []int{}
			for svcRows.Next() {
				var sid int
				svcRows.Scan(&sid)
				p.ServiceIDs = append(p.ServiceIDs, sid)
			}
			svcRows.Close()
		} else {
			p.ServiceIDs = []int{}
		}

		plans = append(plans, p)
	}
	if plans == nil {
		plans = []membershipPlan{}
	}
	a.JSON(w, http.StatusOK, plans)
}

func (a *App) CreateMembershipPlan(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var p membershipPlan
	if err := a.Decode(r, &p); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	p.SalonID = claims.SalonID
	if p.Color == "" {
		p.Color = "#0D9488"
	}
	if p.PaymentType == "" {
		p.PaymentType = "recurring"
	}
	if p.SessionsType == "" {
		p.SessionsType = "unlimited"
	}
	if p.PaymentFrequency == "" {
		p.PaymentFrequency = "monthly"
	}
	if p.ValidityDays == 0 {
		p.ValidityDays = 30
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO membership_plans
		 (salon_id, name, description, price, billing_cycle, service_discount_pct,
		  color, payment_type, sessions_type, sessions_count, validity_days,
		  payment_frequency, enable_online_sales, enable_online_redemption, terms_conditions)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		p.SalonID, p.Name, p.Description, p.Price, p.BillingCycle, p.ServiceDiscountPct,
		p.Color, p.PaymentType, p.SessionsType, p.SessionsCount, p.ValidityDays,
		p.PaymentFrequency, p.EnableOnlineSales, p.EnableOnlineRedemption, p.TermsConditions)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	p.ID = uint(id)
	p.IsActive = true

	// Insert service associations
	if p.ServiceIDs == nil {
		p.ServiceIDs = []int{}
	}
	for _, sid := range p.ServiceIDs {
		a.DB.ExecContext(r.Context(),
			`INSERT IGNORE INTO membership_plan_services (plan_id, service_id) VALUES (?,?)`,
			p.ID, sid)
	}

	a.JSON(w, http.StatusCreated, p)
}

func (a *App) UpdateMembershipPlan(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	planID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var p membershipPlan
	if err := a.Decode(r, &p); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if p.Color == "" {
		p.Color = "#0D9488"
	}
	if p.PaymentType == "" {
		p.PaymentType = "recurring"
	}
	if p.SessionsType == "" {
		p.SessionsType = "unlimited"
	}
	if p.PaymentFrequency == "" {
		p.PaymentFrequency = "monthly"
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE membership_plans
		 SET name=?, description=?, price=?, billing_cycle=?, service_discount_pct=?,
		     color=?, payment_type=?, sessions_type=?, sessions_count=?, validity_days=?,
		     payment_frequency=?, enable_online_sales=?, enable_online_redemption=?, terms_conditions=?
		 WHERE id=? AND salon_id=?`,
		p.Name, p.Description, p.Price, p.BillingCycle, p.ServiceDiscountPct,
		p.Color, p.PaymentType, p.SessionsType, p.SessionsCount, p.ValidityDays,
		p.PaymentFrequency, p.EnableOnlineSales, p.EnableOnlineRedemption, p.TermsConditions,
		planID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Re-sync service associations: delete existing, re-insert new
	a.DB.ExecContext(r.Context(),
		`DELETE FROM membership_plan_services WHERE plan_id=?`, planID)
	if p.ServiceIDs == nil {
		p.ServiceIDs = []int{}
	}
	for _, sid := range p.ServiceIDs {
		a.DB.ExecContext(r.Context(),
			`INSERT IGNORE INTO membership_plan_services (plan_id, service_id) VALUES (?,?)`,
			planID, sid)
	}

	p.ID = uint(planID)
	a.JSON(w, http.StatusOK, p)
}

func (a *App) DeleteMembershipPlan(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	planID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`DELETE FROM membership_plans WHERE id=? AND salon_id=?`, planID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) ToggleMembershipPlan(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	planID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	// Flip is_active
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE membership_plans SET is_active = NOT is_active WHERE id=? AND salon_id=?`,
		planID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	var isActive bool
	a.DB.QueryRowContext(r.Context(),
		`SELECT is_active FROM membership_plans WHERE id=?`, planID).Scan(&isActive)
	a.JSON(w, http.StatusOK, map[string]any{"is_active": isActive})
}

func (a *App) GetClientMembership(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var cm clientMembership
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT cm.id, cm.salon_id, cm.client_id, cm.plan_id,
		        mp.name, mp.price, mp.billing_cycle, mp.service_discount_pct,
		        cm.status,
		        DATE_FORMAT(cm.start_date, '%Y-%m-%d'),
		        COALESCE(DATE_FORMAT(cm.next_billing_date, '%Y-%m-%d'),''),
		        cm.created_at
		 FROM client_memberships cm
		 JOIN membership_plans mp ON mp.id = cm.plan_id
		 WHERE cm.client_id=? AND cm.salon_id=? AND cm.status='active'
		 ORDER BY cm.created_at DESC LIMIT 1`, clientID, claims.SalonID).
		Scan(&cm.ID, &cm.SalonID, &cm.ClientID, &cm.PlanID,
			&cm.PlanName, &cm.Price, &cm.BillingCycle, &cm.DiscountPct,
			&cm.Status, &cm.StartDate, &cm.NextBillingDate, &cm.CreatedAt)
	if err == sql.ErrNoRows {
		a.JSON(w, http.StatusOK, nil)
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, cm)
}

func (a *App) AssignMembership(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		PlanID uint `json:"plan_id"`
	}
	if err := a.Decode(r, &body); err != nil || body.PlanID == 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	today := time.Now().UTC()
	startDate := today.Format("2006-01-02")
	nextBilling := today.AddDate(0, 1, 0).Format("2006-01-02")

	// Cancel any existing active membership for this client
	a.DB.ExecContext(r.Context(),
		`UPDATE client_memberships SET status='cancelled'
		 WHERE client_id=? AND salon_id=? AND status='active'`,
		clientID, claims.SalonID)

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO client_memberships (salon_id, client_id, plan_id, status, start_date, next_billing_date)
		 VALUES (?,?,?,'active',?,?)`,
		claims.SalonID, clientID, body.PlanID, startDate, nextBilling)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{
		"id":                id,
		"client_id":         clientID,
		"plan_id":           body.PlanID,
		"status":            "active",
		"start_date":        startDate,
		"next_billing_date": nextBilling,
	})
}

// ── ListClientMemberships — GET /api/memberships/active ────────────────────

type activeMembership struct {
	ID              uint    `json:"id"`
	ClientID        uint    `json:"client_id"`
	ClientName      string  `json:"client_name"`
	ClientPhone     string  `json:"client_phone"`
	PlanID          uint    `json:"plan_id"`
	PlanName        string  `json:"plan_name"`
	Price           float64 `json:"price"`
	BillingCycle    string  `json:"billing_cycle"`
	Status          string  `json:"status"`
	StartDate       string  `json:"start_date"`
	NextBillingDate string  `json:"next_billing_date"`
}

func (a *App) ListClientMemberships(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT cm.id, cm.client_id,
		       CONCAT(c.first_name, ' ', c.last_name) as client_name,
		       COALESCE(c.phone,'') as client_phone,
		       cm.plan_id, mp.name as plan_name,
		       mp.price, mp.billing_cycle,
		       cm.status,
		       DATE_FORMAT(cm.start_date, '%Y-%m-%d'),
		       COALESCE(DATE_FORMAT(cm.next_billing_date, '%Y-%m-%d'),'')
		FROM client_memberships cm
		JOIN membership_plans mp ON mp.id = cm.plan_id
		JOIN clients c ON c.id = cm.client_id
		WHERE cm.salon_id=? AND cm.status IN ('active','paused')
		ORDER BY cm.status='active' DESC, cm.next_billing_date ASC`,
		claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var memberships []activeMembership
	var monthlyMRR float64
	var activeCount, pausedCount int

	for rows.Next() {
		var m activeMembership
		rows.Scan(&m.ID, &m.ClientID, &m.ClientName, &m.ClientPhone,
			&m.PlanID, &m.PlanName, &m.Price, &m.BillingCycle,
			&m.Status, &m.StartDate, &m.NextBillingDate)
		memberships = append(memberships, m)

		if m.Status == "active" {
			activeCount++
			switch m.BillingCycle {
			case "monthly":
				monthlyMRR += m.Price
			case "quarterly":
				monthlyMRR += m.Price / 3
			case "annual":
				monthlyMRR += m.Price / 12
			}
		} else if m.Status == "paused" {
			pausedCount++
		}
	}

	if memberships == nil {
		memberships = []activeMembership{}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"memberships": memberships,
		"mrr": map[string]any{
			"monthly_mrr":  monthlyMRR,
			"active_count": activeCount,
			"paused_count": pausedCount,
		},
	})
}

func (a *App) UpdateMembershipStatus(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	validStatuses := map[string]bool{"active": true, "paused": true, "cancelled": true}
	if !validStatuses[body.Status] {
		a.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE client_memberships SET status=?
		 WHERE client_id=? AND salon_id=? AND status != 'cancelled'
		 ORDER BY created_at DESC LIMIT 1`,
		body.Status, clientID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"status": body.Status})
}
