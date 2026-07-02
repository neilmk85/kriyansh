package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"salonos/internal/models"
)

// AppointmentCalendar returns per-day counts for a month: ?month=2026-06
func (a *App) AppointmentCalendar(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	monthStr := r.URL.Query().Get("month") // "2026-06"
	if monthStr == "" {
		monthStr = time.Now().UTC().Format("2006-01")
	}
	monthStart, err := time.Parse("2006-01", monthStr)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid month format, use YYYY-MM")
		return
	}
	monthEnd := monthStart.AddDate(0, 1, 0)

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT
			DATE(a.start_at) as appt_date,
			SUM(CASE WHEN c.total_visits <= 1 THEN 1 ELSE 0 END) as new_count,
			SUM(CASE WHEN c.total_visits  > 1 THEN 1 ELSE 0 END) as returning_count,
			COUNT(*) as total
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		WHERE a.salon_id = ?
		  AND a.start_at >= ? AND a.start_at < ?
		  AND a.status NOT IN ('cancelled','no_show')
		GROUP BY DATE(a.start_at)
		ORDER BY appt_date`, claims.SalonID, monthStart.UTC(), monthEnd.UTC())
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type dayCount struct {
		Date      string `json:"date"`
		New       int    `json:"new"`
		Returning int    `json:"returning"`
		Total     int    `json:"total"`
	}
	result := map[string]dayCount{}
	for rows.Next() {
		var dc dayCount
		var d time.Time
		rows.Scan(&d, &dc.New, &dc.Returning, &dc.Total)
		dc.Date = d.Format("2006-01-02")
		result[dc.Date] = dc
	}
	a.JSON(w, http.StatusOK, result)
}

func (a *App) ListAppointments(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	// Optional date filter: ?date=2025-06-12
	dateStr := r.URL.Query().Get("date")
	var rows *sql.Rows
	var err error

	if dateStr != "" {
		d, err2 := time.Parse("2006-01-02", dateStr)
		if err2 != nil {
			a.Error(w, http.StatusBadRequest, "invalid date format, use YYYY-MM-DD")
			return
		}
		next := d.Add(24 * time.Hour)
		rows, err = a.DB.QueryContext(r.Context(),
			`SELECT a.id, a.salon_id, a.client_id, a.staff_id,
			        a.start_at, a.end_at, a.status, COALESCE(a.notes,''),
			        a.deposit_paid, a.source, a.created_at,
			        CONCAT(c.first_name,' ',c.last_name),
			        COALESCE(c.phone,''),
			        CONCAT(u.first_name,' ',u.last_name)
			 FROM appointments a
			 JOIN clients c ON c.id = a.client_id
			 JOIN staff_profiles sp ON sp.id = a.staff_id
			 JOIN users u ON u.id = sp.user_id
			 WHERE a.salon_id=? AND a.start_at >= ? AND a.start_at < ?
			 ORDER BY a.start_at`, claims.SalonID, d.UTC(), next.UTC())
	} else {
		rows, err = a.DB.QueryContext(r.Context(),
			`SELECT a.id, a.salon_id, a.client_id, a.staff_id,
			        a.start_at, a.end_at, a.status, COALESCE(a.notes,''),
			        a.deposit_paid, a.source, a.created_at,
			        CONCAT(c.first_name,' ',c.last_name),
			        COALESCE(c.phone,''),
			        CONCAT(u.first_name,' ',u.last_name)
			 FROM appointments a
			 JOIN clients c ON c.id = a.client_id
			 JOIN staff_profiles sp ON sp.id = a.staff_id
			 JOIN users u ON u.id = sp.user_id
			 WHERE a.salon_id=?
			 ORDER BY a.start_at DESC LIMIT 200`, claims.SalonID)
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var appts []models.Appointment
	for rows.Next() {
		var ap models.Appointment
		rows.Scan(&ap.ID, &ap.SalonID, &ap.ClientID, &ap.StaffID,
			&ap.StartAt, &ap.EndAt, &ap.Status, &ap.Notes,
			&ap.DepositPaid, &ap.Source, &ap.CreatedAt,
			&ap.ClientName, &ap.ClientPhone, &ap.StaffName)
		appts = append(appts, ap)
	}
	if appts == nil {
		appts = []models.Appointment{}
	}
	a.JSON(w, http.StatusOK, appts)
}

func (a *App) GetAppointment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var ap models.Appointment
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT a.id, a.salon_id, a.client_id, a.staff_id,
		        a.start_at, a.end_at, a.status, COALESCE(a.notes,''),
		        a.deposit_paid, a.source, a.created_at,
		        CONCAT(c.first_name,' ',c.last_name),
		        COALESCE(c.phone,''),
		        CONCAT(u.first_name,' ',u.last_name)
		 FROM appointments a
		 JOIN clients c ON c.id = a.client_id
		 JOIN staff_profiles sp ON sp.id = a.staff_id
		 JOIN users u ON u.id = sp.user_id
		 WHERE a.id=? AND a.salon_id=?`, id, claims.SalonID).
		Scan(&ap.ID, &ap.SalonID, &ap.ClientID, &ap.StaffID,
			&ap.StartAt, &ap.EndAt, &ap.Status, &ap.Notes,
			&ap.DepositPaid, &ap.Source, &ap.CreatedAt,
			&ap.ClientName, &ap.ClientPhone, &ap.StaffName)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "appointment not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Load services
	svcRows, err := a.DB.QueryContext(r.Context(),
		`SELECT aps.id, aps.appointment_id, aps.service_id,
		        s.name, aps.price, aps.duration_min
		 FROM appointment_services aps
		 JOIN services s ON s.id = aps.service_id
		 WHERE aps.appointment_id=?`, id)
	if err == nil {
		defer svcRows.Close()
		for svcRows.Next() {
			var sv models.AppointmentService
			svcRows.Scan(&sv.ID, &sv.AppointmentID, &sv.ServiceID,
				&sv.ServiceName, &sv.Price, &sv.DurationMin)
			ap.Services = append(ap.Services, sv)
		}
	}

	a.JSON(w, http.StatusOK, ap)
}

type createAppointmentRequest struct {
	ClientID uint                       `json:"client_id"`
	StaffID  uint                       `json:"staff_id"`
	StartAt  time.Time                  `json:"start_at"`
	EndAt    time.Time                  `json:"end_at"`
	Notes    string                     `json:"notes"`
	Source   string                     `json:"source"`
	Services []models.AppointmentService `json:"services"`
}

func (a *App) CreateAppointment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var req createAppointmentRequest
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Source == "" {
		req.Source = "reception"
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "tx error")
		return
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(r.Context(),
		`INSERT INTO appointments (salon_id, client_id, staff_id, start_at, end_at, notes, source)
		 VALUES (?,?,?,?,?,?,?)`,
		claims.SalonID, req.ClientID, req.StaffID,
		req.StartAt.UTC(), req.EndAt.UTC(), req.Notes, req.Source)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	apptID, _ := res.LastInsertId()

	for _, sv := range req.Services {
		_, err = tx.ExecContext(r.Context(),
			`INSERT INTO appointment_services (appointment_id, service_id, price, duration_min)
			 VALUES (?,?,?,?)`, apptID, sv.ServiceID, sv.Price, sv.DurationMin)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "service insert error")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "commit error")
		return
	}

	a.JSON(w, http.StatusCreated, map[string]any{
		"id":      apptID,
		"message": "appointment created",
	})
}

func (a *App) UpdateAppointmentStatus(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
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
	validStatuses := map[string]bool{
		"scheduled": true, "confirmed": true, "checked_in": true,
		"in_progress": true, "completed": true, "cancelled": true, "no_show": true,
	}
	if !validStatuses[body.Status] {
		a.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status=? WHERE id=? AND salon_id=?`,
		body.Status, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	if body.Status == "cancelled" {
		go a.TriggerGapFill(context.Background(), claims.SalonID, id)
	}
	a.JSON(w, http.StatusOK, map[string]any{"status": body.Status})
}

func (a *App) CancelAppointment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status='cancelled' WHERE id=? AND salon_id=?`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	// Trigger gap-fill in background — notifies waitlist/at-risk clients
	go a.TriggerGapFill(context.Background(), claims.SalonID, id)
	a.JSON(w, http.StatusOK, map[string]any{"cancelled": true})
}

// CheckIn POST /api/checkin — public endpoint, no auth required
func (a *App) CheckIn(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AppointmentID uint `json:"appointment_id"`
	}
	if err := a.Decode(r, &body); err != nil || body.AppointmentID == 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status='checked_in', checked_in_at=NOW()
		 WHERE id=? AND status IN ('scheduled','confirmed')`,
		body.AppointmentID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found or already checked in")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"checked_in":     true,
		"appointment_id": body.AppointmentID,
	})
}

// CheckOut POST /api/checkout — staff endpoint, auth required
func (a *App) CheckOut(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		AppointmentID uint `json:"appointment_id"`
	}
	if err := a.Decode(r, &body); err != nil || body.AppointmentID == 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status='completed', checked_out_at=NOW()
		 WHERE id=? AND salon_id=? AND status='checked_in'`,
		body.AppointmentID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found or not checked in")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"checked_out":    true,
		"appointment_id": body.AppointmentID,
	})
}
