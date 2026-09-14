package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"salonos/internal/models"
	"salonos/internal/notify"
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
			        a.deposit_paid, COALESCE(a.deposit_charged,0), a.source, a.created_at,
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
			        a.deposit_paid, COALESCE(a.deposit_charged,0), a.source, a.created_at,
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
			&ap.DepositPaid, &ap.DepositCharged, &ap.Source, &ap.CreatedAt,
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
		        a.deposit_paid, COALESCE(a.deposit_charged,0), a.source, a.created_at,
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
			&ap.DepositPaid, &ap.DepositCharged, &ap.Source, &ap.CreatedAt,
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
	ClientID   uint                        `json:"client_id"`
	StaffID    uint                        `json:"staff_id"`
	ResourceID *uint                       `json:"resource_id"`
	StartAt    time.Time                   `json:"start_at"`
	EndAt      time.Time                   `json:"end_at"`
	Notes      string                      `json:"notes"`
	Source     string                      `json:"source"`
	Services   []models.AppointmentService `json:"services"`
}

// resourceConflict returns true if the given resource already has a
// non-cancelled appointment overlapping [startAt, endAt), excluding
// excludeApptID (0 to not exclude anything).
func (a *App) resourceConflict(ctx context.Context, salonID uint, resourceID uint, excludeApptID uint64, startAt, endAt time.Time) (bool, error) {
	var conflicts int
	err := a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM appointments
		WHERE salon_id=? AND resource_id=? AND id<>?
		  AND status NOT IN ('cancelled','no_show')
		  AND start_at < ? AND end_at > ?`,
		salonID, resourceID, excludeApptID, endAt.UTC(), startAt.UTC()).Scan(&conflicts)
	return conflicts > 0, err
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

	// Check staff double-booking
	if req.StaffID != 0 {
		var staffConflicts int
		a.DB.QueryRowContext(r.Context(), `
			SELECT COUNT(*) FROM appointments
			WHERE salon_id=? AND staff_id=?
			  AND status NOT IN ('cancelled','no_show')
			  AND start_at < ? AND end_at > ?`,
			claims.SalonID, req.StaffID, req.EndAt.UTC(), req.StartAt.UTC()).Scan(&staffConflicts)
		if staffConflicts > 0 {
			a.Error(w, http.StatusConflict, "that staff member is already booked at this time")
			return
		}
	}

	if req.ResourceID != nil {
		conflict, err := a.resourceConflict(r.Context(), claims.SalonID, *req.ResourceID, 0, req.StartAt, req.EndAt)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if conflict {
			a.Error(w, http.StatusConflict, "that resource is already booked at this time")
			return
		}
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "tx error")
		return
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(r.Context(),
		`INSERT INTO appointments (salon_id, client_id, staff_id, resource_id, start_at, end_at, notes, source)
		 VALUES (?,?,?,?,?,?,?,?)`,
		claims.SalonID, req.ClientID, req.StaffID, req.ResourceID,
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

	// Notify client of booking confirmation in background
	go a.notifyAppointmentBooked(context.Background(), apptID, req.ClientID)

	a.JSON(w, http.StatusCreated, map[string]any{
		"id":      apptID,
		"message": "appointment created",
	})
}

// RescheduleAppointment PATCH /api/appointments/{id}/reschedule — move an
// appointment to a new time and/or staff member (drag-and-drop on the
// calendar). Body: { start_at, end_at, staff_id }.
func (a *App) RescheduleAppointment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		StartAt time.Time `json:"start_at"`
		EndAt   time.Time `json:"end_at"`
		StaffID uint      `json:"staff_id"`
	}
	if err := a.Decode(r, &body); err != nil || body.StaffID == 0 || !body.EndAt.After(body.StartAt) {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Reject if the target staff member already has a conflicting appointment.
	var conflicts int
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM appointments
		WHERE salon_id=? AND staff_id=? AND id<>?
		  AND status NOT IN ('cancelled','no_show')
		  AND start_at < ? AND end_at > ?`,
		claims.SalonID, body.StaffID, id, body.EndAt.UTC(), body.StartAt.UTC()).Scan(&conflicts)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	if conflicts > 0 {
		a.Error(w, http.StatusConflict, "that team member already has an appointment at this time")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET start_at=?, end_at=?, staff_id=? WHERE id=? AND salon_id=?`,
		body.StartAt.UTC(), body.EndAt.UTC(), body.StaffID, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found")
		return
	}
	a.logActivity(r.Context(), claims.SalonID, claims.UserID, "rescheduled", "appointment", uint(id), map[string]any{
		"start_at": body.StartAt, "staff_id": body.StaffID,
	})
	a.JSON(w, http.StatusOK, map[string]any{"rescheduled": true})
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
		"pending": true, "scheduled": true, "confirmed": true, "checked_in": true,
		"in_service": true, "in_progress": true, "completed": true, "cancelled": true, "no_show": true,
	}
	if !validStatuses[body.Status] {
		a.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	switch body.Status {
	case "checked_in":
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE appointments SET status=?, checked_in_at=COALESCE(checked_in_at, NOW()) WHERE id=? AND salon_id=?`,
			body.Status, id, claims.SalonID)
	case "completed":
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE appointments SET status=?, checked_out_at=COALESCE(checked_out_at, NOW()) WHERE id=? AND salon_id=?`,
			body.Status, id, claims.SalonID)
	default:
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE appointments SET status=? WHERE id=? AND salon_id=?`,
			body.Status, id, claims.SalonID)
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.logActivity(r.Context(), claims.SalonID, claims.UserID, "status_changed", "appointment", uint(id), map[string]any{"status": body.Status})
	if body.Status == "cancelled" {
		go a.TriggerGapFill(context.Background(), claims.SalonID, id)
	}
	if body.Status == "completed" {
		go a.notifyAppointmentCompleted(context.Background(), int64(id))
	}
	if body.Status == "no_show" {
		// Auto-capture deposit if a PaymentIntent was held and not yet charged
		var piID string
		var depositPaid float64
		var depositCharged int
		a.DB.QueryRowContext(r.Context(),
			`SELECT COALESCE(payment_intent_id,''), COALESCE(deposit_paid,0), COALESCE(deposit_charged,0)
			 FROM appointments WHERE id=? AND salon_id=?`, id, claims.SalonID).
			Scan(&piID, &depositPaid, &depositCharged)
		if piID != "" && depositPaid > 0 && depositCharged == 0 && a.StripeKey != "" {
			captureURL := "https://api.stripe.com/v1/payment_intents/" + piID + "/capture"
			captureReq, _ := http.NewRequestWithContext(r.Context(), "POST", captureURL, nil)
			captureReq.Header.Set("Authorization", "Bearer "+a.StripeKey)
			resp, err := http.DefaultClient.Do(captureReq)
			if err == nil && resp.StatusCode == 200 {
				resp.Body.Close()
				a.DB.ExecContext(r.Context(),
					`UPDATE appointments SET deposit_charged=1 WHERE id=?`, id)
			} else if resp != nil {
				resp.Body.Close()
			}
		}
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

// ListPendingCheckins GET /api/checkins/pending — returns appointments awaiting service start
// (status=checked_in) and walk-ins still waiting, combined into one list for the mobile admin.
func (a *App) ListPendingCheckins(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	type PendingCheckin struct {
		ID          uint      `json:"id"`
		Type        string    `json:"type"` // "appointment" | "walkin"
		ClientName  string    `json:"client_name"`
		ClientPhone string    `json:"client_phone"`
		ServiceName string    `json:"service_name"`
		StaffName   string    `json:"staff_name"`
		CheckedInAt time.Time `json:"checked_in_at"`
		StartAt     string    `json:"start_at"` // "HH:MM" for appointments, "" for walk-ins
		Notes       string    `json:"notes"`
	}

	items := []PendingCheckin{}

	// Checked-in appointments waiting for admin to start service
	apptRows, err := a.DB.QueryContext(r.Context(), `
		SELECT
			ap.id,
			COALESCE(CONCAT(c.first_name,' ',c.last_name), 'Unknown') AS client_name,
			COALESCE(c.phone, '')                                       AS client_phone,
			COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '), 'Service') AS service_name,
			COALESCE(CONCAT(u.first_name,' ',u.last_name), 'Any Available')          AS staff_name,
			COALESCE(ap.checked_in_at, ap.start_at)                    AS checked_in_at,
			DATE_FORMAT(ap.start_at, '%H:%i')                           AS start_at,
			COALESCE(ap.notes, '')                                      AS notes
		FROM appointments ap
		LEFT JOIN clients c              ON c.id  = ap.client_id
		LEFT JOIN users u                ON u.id  = ap.staff_id
		LEFT JOIN appointment_services aps ON aps.appointment_id = ap.id
		LEFT JOIN services s             ON s.id  = aps.service_id
		WHERE ap.salon_id = ? AND ap.status = 'checked_in'
		  AND DATE(ap.start_at) = CURDATE()
		GROUP BY ap.id
		ORDER BY ap.checked_in_at ASC
	`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer apptRows.Close()
	for apptRows.Next() {
		var item PendingCheckin
		item.Type = "appointment"
		var checkedInAt sql.NullTime
		if err := apptRows.Scan(&item.ID, &item.ClientName, &item.ClientPhone,
			&item.ServiceName, &item.StaffName, &checkedInAt, &item.StartAt, &item.Notes); err != nil {
			continue
		}
		if checkedInAt.Valid {
			item.CheckedInAt = checkedInAt.Time
		}
		items = append(items, item)
	}

	// Walk-ins still waiting (not yet in_service)
	walkRows, err := a.DB.QueryContext(r.Context(), `
		SELECT
			id,
			name                                                             AS client_name,
			phone                                                            AS client_phone,
			COALESCE(NULLIF(service_names,''), 'Walk-in')                    AS service_name,
			COALESCE(NULLIF(assigned_staff_name,''), NULLIF(preferred_staff_name,''), 'Any Available') AS staff_name,
			checked_in_at,
			COALESCE(notes, '')                                              AS notes
		FROM walk_in_queue
		WHERE salon_id = ? AND status = 'waiting'
		  AND DATE(checked_in_at) = CURDATE()
		ORDER BY checked_in_at ASC
	`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer walkRows.Close()
	for walkRows.Next() {
		var item PendingCheckin
		item.Type = "walkin"
		if err := walkRows.Scan(&item.ID, &item.ClientName, &item.ClientPhone,
			&item.ServiceName, &item.StaffName, &item.CheckedInAt, &item.Notes); err != nil {
			continue
		}
		items = append(items, item)
	}

	a.JSON(w, http.StatusOK, items)
}

// ApproveCheckin PATCH /api/checkins/{id}/approve — moves appointment to in_progress
func (a *App) ApproveCheckin(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	idStr := r.PathValue("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status='in_service'
		 WHERE id=? AND salon_id=? AND status='checked_in'`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found or not in checked_in state")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"approved": true})
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
		 WHERE id=? AND status IN ('pending','confirmed')`,
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

func (a *App) ListAppointmentsFull(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	ctx := r.Context()
	q := r.URL.Query()
	search := "%" + q.Get("q") + "%"
	status   := q.Get("status")
	from     := q.Get("from")
	to       := q.Get("to")
	clientID := q.Get("client_id")
	if from == "" { from = "2000-01-01" }
	if to   == "" { to   = "2099-12-31" }

	statusClause   := "1=1"
	if status != "" && status != "all" { statusClause = "a.status = '" + status + "'" }

	clientIDClause := "1=1"
	args := []any{claims.SalonID, from, to, search, search}
	if clientID != "" {
		clientIDClause = "a.client_id = ?"
		args = append(args, clientID)
	}

	rows, err := a.DB.QueryContext(ctx, `
		SELECT
			a.id, a.created_at, a.start_at, a.end_at, a.status,
			CONCAT(c.first_name,' ',c.last_name) as client_name,
			COALESCE(c.phone,''),
			CONCAT(u.first_name,' ',u.last_name) as staff_name,
			COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '),'') as service_names,
			COALESCE(SUM(aps.price),0) as total_price,
			COALESCE(SUM(aps.duration_min),0) as total_duration
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		JOIN staff_profiles sp ON sp.id = a.staff_id
		JOIN users u ON u.id = sp.user_id
		LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
		LEFT JOIN services s ON s.id = aps.service_id
		WHERE a.salon_id=?
		  AND DATE(a.start_at) >= ? AND DATE(a.start_at) <= ?
		  AND (`+statusClause+`)
		  AND (CONCAT(c.first_name,' ',c.last_name) LIKE ? OR c.phone LIKE ?)
		  AND (`+clientIDClause+`)
		GROUP BY a.id
		ORDER BY a.start_at DESC
		LIMIT 500`, args...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	type row struct {
		ID           uint    `json:"id"`
		Ref          string  `json:"ref"`
		CreatedAt    string  `json:"created_at"`
		StartAt      string  `json:"start_at"`
		StartAtISO   string  `json:"start_at_iso"`
		EndAt        string  `json:"end_at"`
		Status       string  `json:"status"`
		ClientName   string  `json:"client_name"`
		ClientPhone  string  `json:"client_phone"`
		StaffName    string  `json:"staff_name"`
		ServiceNames string  `json:"service_names"`
		TotalPrice   float64 `json:"total_price"`
		DurationMin  int     `json:"duration_min"`
	}
	list := []row{}
	for rows.Next() {
		var r row
		var startAt, endAt, createdAt time.Time
		rows.Scan(&r.ID, &createdAt, &startAt, &endAt, &r.Status,
			&r.ClientName, &r.ClientPhone, &r.StaffName,
			&r.ServiceNames, &r.TotalPrice, &r.DurationMin)
		r.Ref        = fmt.Sprintf("%08X", r.ID)
		r.CreatedAt  = createdAt.Format("2 Jan 2006, 3:04pm")
		r.StartAt    = startAt.Format("2 Jan 2006, 3:04pm")
		r.StartAtISO = startAt.UTC().Format(time.RFC3339)
		r.EndAt      = endAt.Format("3:04pm")
		list = append(list, r)
	}
	a.JSON(w, http.StatusOK, list)
}

// notifyAppointmentBooked fires a booking confirmation to the client.
func (a *App) notifyAppointmentBooked(ctx context.Context, apptID int64, clientID uint) {
	var info struct {
		clientName  string
		phone       string
		email       string
		serviceName string
		staffName   string
		startAt     time.Time
	}
	err := a.DB.QueryRowContext(ctx, `
		SELECT c.first_name,
		       COALESCE(c.phone,''), COALESCE(c.email,''),
		       COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '),'Appointment'),
		       COALESCE(CONCAT(u.first_name,' ',u.last_name),''),
		       a.start_at
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
		LEFT JOIN services s ON s.id = aps.service_id
		LEFT JOIN staff_profiles sp ON sp.id = a.staff_id
		LEFT JOIN users u ON u.id = sp.user_id
		WHERE a.id = ?
		GROUP BY c.first_name, c.phone, c.email, u.first_name, u.last_name, a.start_at
	`, apptID).Scan(&info.clientName, &info.phone, &info.email, &info.serviceName, &info.staffName, &info.startAt)
	if err != nil || info.phone == "" {
		return
	}
	a.Notifier.NotifyAppointmentBooked(notifyApptInfo(info.clientName, info.phone, info.email, info.serviceName, info.staffName, info.startAt))
}

// notifyAppointmentCompleted fires a thank-you message when an appointment is marked completed.
func (a *App) notifyAppointmentCompleted(ctx context.Context, apptID int64) {
	var info struct {
		clientName  string
		phone       string
		email       string
		serviceName string
		staffName   string
		startAt     time.Time
	}
	err := a.DB.QueryRowContext(ctx, `
		SELECT c.first_name,
		       COALESCE(c.phone,''), COALESCE(c.email,''),
		       COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '),'Appointment'),
		       COALESCE(CONCAT(u.first_name,' ',u.last_name),''),
		       a.start_at
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
		LEFT JOIN services s ON s.id = aps.service_id
		LEFT JOIN staff_profiles sp ON sp.id = a.staff_id
		LEFT JOIN users u ON u.id = sp.user_id
		WHERE a.id = ?
		GROUP BY c.first_name, c.phone, c.email, u.first_name, u.last_name, a.start_at
	`, apptID).Scan(&info.clientName, &info.phone, &info.email, &info.serviceName, &info.staffName, &info.startAt)
	if err != nil || info.phone == "" {
		return
	}
	a.Notifier.NotifyAppointmentCompleted(notifyApptInfo(info.clientName, info.phone, info.email, info.serviceName, info.staffName, info.startAt))
}

// notifyApptInfo builds a notify.ApptInfo from raw fields.
func notifyApptInfo(clientName, phone, email, serviceName, staffName string, startAt time.Time) notify.ApptInfo {
	return notify.ApptInfo{
		ClientName:  clientName,
		Phone:       phone,
		Email:       email,
		ServiceName: serviceName,
		StaffName:   staffName,
		StartAt:     startAt,
	}
}
