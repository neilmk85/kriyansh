package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

// ── Models ────────────────────────────────────────────────────────────────────

type Payrun struct {
	ID          int     `json:"id"`
	SalonID     uint    `json:"salon_id"`
	PeriodFrom  string  `json:"period_from"`
	PeriodTo    string  `json:"period_to"`
	Status      string  `json:"status"`
	TotalAmount float64 `json:"total_amount"`
	CreatedAt   string  `json:"created_at"`
	Notes       string  `json:"notes"`
	ItemCount   int     `json:"item_count"`
}

type PayrunItem struct {
	ID          int     `json:"id"`
	PayrunID    int     `json:"payrun_id"`
	StaffID     int     `json:"staff_id"`
	StaffName   string  `json:"staff_name"`
	HoursWorked float64 `json:"hours_worked"`
	HourlyRate  float64 `json:"hourly_rate"`
	BasePay     float64 `json:"base_pay"`
	Commission  float64 `json:"commission"`
	Tips        float64 `json:"tips"`
	TotalPay    float64 `json:"total_pay"`
}

type createPayrunRequest struct {
	PeriodFrom string `json:"period_from"`
	PeriodTo   string `json:"period_to"`
	Notes      string `json:"notes"`
}

type updatePayrunStatusRequest struct {
	Status string `json:"status"`
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// GET /api/payruns
func (a *App) ListPayruns(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT p.id, p.salon_id,
		       DATE_FORMAT(p.period_from,'%Y-%m-%d'),
		       DATE_FORMAT(p.period_to,'%Y-%m-%d'),
		       p.status, p.total_amount,
		       DATE_FORMAT(p.created_at,'%Y-%m-%dT%H:%i:%sZ'),
		       COALESCE(p.notes,''),
		       COUNT(pi.id) as item_count
		FROM payruns p
		LEFT JOIN payrun_items pi ON pi.payrun_id = p.id
		WHERE p.salon_id = ?
		GROUP BY p.id
		ORDER BY p.created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	payruns := []Payrun{}
	for rows.Next() {
		var p Payrun
		rows.Scan(&p.ID, &p.SalonID, &p.PeriodFrom, &p.PeriodTo,
			&p.Status, &p.TotalAmount, &p.CreatedAt, &p.Notes, &p.ItemCount)
		payruns = append(payruns, p)
	}
	a.JSON(w, http.StatusOK, payruns)
}

// POST /api/payruns
func (a *App) CreatePayrun(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var body createPayrunRequest
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if _, err := time.Parse("2006-01-02", body.PeriodFrom); err != nil {
		a.Error(w, http.StatusBadRequest, "period_from must be YYYY-MM-DD")
		return
	}
	if _, err := time.Parse("2006-01-02", body.PeriodTo); err != nil {
		a.Error(w, http.StatusBadRequest, "period_to must be YYYY-MM-DD")
		return
	}

	ctx := r.Context()

	// Insert the payrun header
	res, err := a.DB.ExecContext(ctx,
		`INSERT INTO payruns (salon_id, period_from, period_to, status, notes)
		 VALUES (?, ?, ?, 'draft', ?)`,
		claims.SalonID, body.PeriodFrom, body.PeriodTo, body.Notes)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error creating payrun")
		return
	}
	payrunID, _ := res.LastInsertId()

	// Fetch all active staff for this salon with their hourly_rate and commission_pct
	staffRows, err := a.DB.QueryContext(ctx, `
		SELECT sp.id,
		       CONCAT(u.first_name,' ',u.last_name),
		       COALESCE(sp.hourly_rate, 0),
		       COALESCE(sp.commission_pct, 0)
		FROM staff_profiles sp
		JOIN users u ON u.id = sp.user_id
		WHERE sp.salon_id = ? AND u.is_active = 1`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error fetching staff")
		return
	}
	defer staffRows.Close()

	type staffEntry struct {
		id            int
		name          string
		hourlyRate    float64
		commissionPct float64
	}
	var staffList []staffEntry
	for staffRows.Next() {
		var s staffEntry
		staffRows.Scan(&s.id, &s.name, &s.hourlyRate, &s.commissionPct)
		staffList = append(staffList, s)
	}
	staffRows.Close()

	var grandTotal float64

	for _, s := range staffList {
		// Hours worked: sum shift durations within the period
		var hoursWorked float64
		a.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(
			  TIMESTAMPDIFF(MINUTE,
			    STR_TO_DATE(CONCAT(shift_date,' ',start_time),'%Y-%m-%d %H:%i'),
			    STR_TO_DATE(CONCAT(shift_date,' ',end_time),'%Y-%m-%d %H:%i')
			  ) / 60.0
			), 0)
			FROM shifts
			WHERE salon_id = ? AND staff_id = ?
			  AND shift_date BETWEEN ? AND ?`,
			claims.SalonID, s.id, body.PeriodFrom, body.PeriodTo).Scan(&hoursWorked)

		basePay := hoursWorked * s.hourlyRate

		// Commission: sum of service revenue × commission_pct for completed
		// appointments, using each service's staff-specific override rate
		// when one is set, falling back to the staff member's flat rate.
		overrides := map[uint]float64{}
		ovRows, _ := a.DB.QueryContext(ctx,
			`SELECT service_id, commission_pct FROM staff_service_commissions WHERE staff_id = ?`, s.id)
		if ovRows != nil {
			for ovRows.Next() {
				var svcID uint
				var pct float64
				if ovRows.Scan(&svcID, &pct) == nil {
					overrides[svcID] = pct
				}
			}
			ovRows.Close()
		}

		var commission float64
		lineRows, err := a.DB.QueryContext(ctx, `
			SELECT aps.service_id, aps.price
			FROM appointment_services aps
			JOIN appointments a ON a.id = aps.appointment_id
			WHERE a.salon_id = ? AND a.staff_id = ?
			  AND a.status IN ('completed','checked_in')
			  AND DATE(a.start_at) BETWEEN ? AND ?`,
			claims.SalonID, s.id, body.PeriodFrom, body.PeriodTo)
		if err == nil {
			for lineRows.Next() {
				var svcID uint
				var price float64
				if lineRows.Scan(&svcID, &price) != nil {
					continue
				}
				pct := s.commissionPct
				if override, ok := overrides[svcID]; ok {
					pct = override
				}
				commission += price * pct / 100.0
			}
			lineRows.Close()
		}

		// Tips: from transactions linked to appointments completed by this staff
		var tips float64
		a.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(t.tip_amount), 0)
			FROM transactions t
			WHERE t.salon_id = ? AND t.staff_id = ?
			  AND t.status = 'completed'
			  AND DATE(t.created_at) BETWEEN ? AND ?`,
			claims.SalonID, s.id, body.PeriodFrom, body.PeriodTo).Scan(&tips)

		totalPay := basePay + commission + tips
		grandTotal += totalPay

		a.DB.ExecContext(ctx, `
			INSERT INTO payrun_items
			  (payrun_id, staff_id, staff_name, hours_worked, hourly_rate,
			   base_pay, commission, tips, total_pay)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			payrunID, s.id, s.name, hoursWorked, s.hourlyRate,
			basePay, commission, tips, totalPay)
	}

	// Update grand total on the header
	a.DB.ExecContext(ctx,
		`UPDATE payruns SET total_amount = ? WHERE id = ?`,
		grandTotal, payrunID)

	// Return the new payrun
	var p Payrun
	err = a.DB.QueryRowContext(ctx, `
		SELECT id, salon_id,
		       DATE_FORMAT(period_from,'%Y-%m-%d'),
		       DATE_FORMAT(period_to,'%Y-%m-%d'),
		       status, total_amount,
		       DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%sZ'),
		       COALESCE(notes,'')
		FROM payruns WHERE id = ?`, payrunID).
		Scan(&p.ID, &p.SalonID, &p.PeriodFrom, &p.PeriodTo,
			&p.Status, &p.TotalAmount, &p.CreatedAt, &p.Notes)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error reading payrun")
		return
	}
	p.ItemCount = len(staffList)
	a.JSON(w, http.StatusCreated, p)
}

// GET /api/payruns/{id}
func (a *App) GetPayrun(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var p Payrun
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT id, salon_id,
		       DATE_FORMAT(period_from,'%Y-%m-%d'),
		       DATE_FORMAT(period_to,'%Y-%m-%d'),
		       status, total_amount,
		       DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%sZ'),
		       COALESCE(notes,'')
		FROM payruns WHERE id = ? AND salon_id = ?`, id, claims.SalonID).
		Scan(&p.ID, &p.SalonID, &p.PeriodFrom, &p.PeriodTo,
			&p.Status, &p.TotalAmount, &p.CreatedAt, &p.Notes)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "payrun not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	itemRows, err := a.DB.QueryContext(r.Context(), `
		SELECT id, payrun_id, staff_id, staff_name,
		       hours_worked, hourly_rate, base_pay, commission, tips, total_pay
		FROM payrun_items WHERE payrun_id = ?
		ORDER BY staff_name`, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error fetching items")
		return
	}
	defer itemRows.Close()

	items := []PayrunItem{}
	for itemRows.Next() {
		var item PayrunItem
		itemRows.Scan(&item.ID, &item.PayrunID, &item.StaffID, &item.StaffName,
			&item.HoursWorked, &item.HourlyRate, &item.BasePay,
			&item.Commission, &item.Tips, &item.TotalPay)
		items = append(items, item)
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"payrun": p,
		"items":  items,
	})
}

// PATCH /api/payruns/{id}/status
func (a *App) UpdatePayrunStatus(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body updatePayrunStatusRequest
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Status != "draft" && body.Status != "pending" && body.Status != "completed" {
		a.Error(w, http.StatusBadRequest, "status must be draft, pending, or completed")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE payruns SET status = ? WHERE id = ? AND salon_id = ?`,
		body.Status, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusNotFound, "payrun not found")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"status": body.Status})
}
