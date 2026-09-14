package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type kioskQueueItem struct {
	ID                uint       `json:"id"`
	Type              string     `json:"type"` // "walkin" | "appointment"
	Name              string     `json:"name"`
	Phone             string     `json:"phone"`
	Services          string     `json:"services"`
	AssignedStaffID   *uint      `json:"assigned_staff_id"`
	AssignedStaffName string     `json:"assigned_staff_name"`
	Status            string     `json:"status"` // waiting, in_service, completed
	WaitMinutes       int        `json:"wait_minutes"`
	Notes             string     `json:"notes"`
	IsRecurring       bool       `json:"is_recurring"`
	LoyaltyStars      int        `json:"loyalty_stars"`
	CheckedInAt       time.Time  `json:"checked_in_at"`
	StartedAt         *time.Time `json:"started_at"`
	CompletedAt       *time.Time `json:"completed_at"`
	ClientID          *uint      `json:"client_id"`
}

type kioskDepositReminder struct {
	ID                 uint   `json:"id"`
	ClientName         string `json:"client_name"`
	ClientPhone        string `json:"client_phone"`
	Services           string `json:"services"`
	StartAt            string `json:"start_at"`
	RecurringFrequency string `json:"recurring_frequency"`
}

type kioskStaffItem struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Color       string `json:"color"`
	AvatarURL   string `json:"avatar_url"`
	KioskStatus string `json:"kiosk_status"` // available, busy, break
}

// kioskSalonID returns the primary salon ID without requiring auth.
func (a *App) kioskSalonID(r *http.Request) (uint, error) {
	var id uint
	err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&id)
	return id, err
}

// GET /api/public/kiosk/queue
// Returns today's unified queue (walk-ins + checked-in appointments) plus deposit reminders.
func (a *App) KioskQueue(w http.ResponseWriter, r *http.Request) {
	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	now := time.Now()
	var items []kioskQueueItem

	// Walk-ins
	wRows, err := a.DB.QueryContext(r.Context(), `
		SELECT w.id, w.client_id, w.name, w.phone,
		       COALESCE(w.service_names,''),
		       w.assigned_staff_id, COALESCE(w.assigned_staff_name,''),
		       w.status, COALESCE(w.notes,''),
		       w.checked_in_at, w.started_at, w.completed_at,
		       COALESCE(c.total_visits, 0)
		FROM walk_in_queue w
		LEFT JOIN clients c ON c.id = w.client_id AND c.salon_id = w.salon_id
		WHERE w.salon_id = ? AND DATE(w.checked_in_at) = CURDATE()
		  AND w.status NOT IN ('cancelled','no_show')
		ORDER BY w.checked_in_at ASC`, salonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer wRows.Close()
	for wRows.Next() {
		var item kioskQueueItem
		var startedAt, completedAt *time.Time
		wRows.Scan(&item.ID, &item.ClientID, &item.Name, &item.Phone,
			&item.Services, &item.AssignedStaffID, &item.AssignedStaffName,
			&item.Status, &item.Notes,
			&item.CheckedInAt, &startedAt, &completedAt,
			&item.LoyaltyStars)
		item.Type = "walkin"
		item.StartedAt = startedAt
		item.CompletedAt = completedAt
		switch item.Status {
		case "waiting":
			item.WaitMinutes = int(now.Sub(item.CheckedInAt).Minutes())
		case "in_service":
			if startedAt != nil {
				item.WaitMinutes = int(now.Sub(*startedAt).Minutes())
			}
		}
		items = append(items, item)
	}

	// Appointments (checked_in, in_service, completed today)
	aRows, err := a.DB.QueryContext(r.Context(), `
		SELECT ap.id, ap.client_id,
		       CONCAT(TRIM(c.first_name),' ',TRIM(c.last_name)),
		       c.phone,
		       COALESCE(
		         (SELECT GROUP_CONCAT(sv2.name ORDER BY aps2.id SEPARATOR ', ')
		          FROM appointment_services aps2
		          JOIN services sv2 ON sv2.id = aps2.service_id
		          WHERE aps2.appointment_id = ap.id),
		         ''
		       ),
		       ap.staff_id,
		       TRIM(COALESCE(CONCAT(u.first_name,' ',u.last_name),'')),
		       ap.status,
		       COALESCE(ap.notes,''),
		       COALESCE(ap.checked_in_at, ap.start_at),
		       ap.start_at,
		       ap.checked_out_at,
		       COALESCE(c.total_visits, 0),
		       IF(ap.recurring_frequency IS NOT NULL AND ap.recurring_frequency != '', 1, 0)
		FROM appointments ap
		JOIN clients c ON c.id = ap.client_id AND c.salon_id = ap.salon_id
		LEFT JOIN staff_profiles sp ON sp.id = ap.staff_id
		LEFT JOIN users u ON u.id = sp.user_id
		WHERE ap.salon_id = ?
		  AND DATE(ap.start_at) = CURDATE()
		  AND ap.status IN ('checked_in','in_service','completed')
		ORDER BY ap.start_at ASC`, salonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer aRows.Close()
	for aRows.Next() {
		var item kioskQueueItem
		var staffID *uint
		var checkedOutAt *time.Time
		var startAt, checkedInAt time.Time
		var rawStatus string
		var isRecurringInt int
		aRows.Scan(&item.ID, &item.ClientID,
			&item.Name, &item.Phone, &item.Services,
			&staffID, &item.AssignedStaffName,
			&rawStatus, &item.Notes,
			&checkedInAt, &startAt, &checkedOutAt,
			&item.LoyaltyStars, &isRecurringInt)
		item.Type = "appointment"
		item.AssignedStaffID = staffID
		item.IsRecurring = isRecurringInt == 1
		item.CompletedAt = checkedOutAt
		item.CheckedInAt = checkedInAt
		switch rawStatus {
		case "checked_in":
			item.Status = "waiting"
			item.WaitMinutes = int(now.Sub(checkedInAt).Minutes())
		case "in_service":
			item.Status = "in_service"
			item.StartedAt = &startAt
			item.WaitMinutes = int(now.Sub(startAt).Minutes())
		case "completed":
			item.Status = "completed"
		}
		items = append(items, item)
	}

	if items == nil {
		items = []kioskQueueItem{}
	}

	// Deposit reminders — recurring appointments needing deposit confirmation
	var reminders []kioskDepositReminder
	rRows, err := a.DB.QueryContext(r.Context(), `
		SELECT ap.id,
		       CONCAT(TRIM(c.first_name),' ',TRIM(c.last_name)),
		       c.phone,
		       COALESCE(
		         (SELECT GROUP_CONCAT(sv2.name ORDER BY aps2.id SEPARATOR ', ')
		          FROM appointment_services aps2
		          JOIN services sv2 ON sv2.id = aps2.service_id
		          WHERE aps2.appointment_id = ap.id),
		         ''
		       ),
		       ap.start_at,
		       COALESCE(ap.recurring_frequency,'')
		FROM appointments ap
		JOIN clients c ON c.id = ap.client_id AND c.salon_id = ap.salon_id
		WHERE ap.salon_id = ?
		  AND ap.recurring_frequency IS NOT NULL
		  AND ap.recurring_frequency != ''
		  AND ap.notes LIKE '%deposit%'
		  AND ap.status = 'pending'
		  AND ap.start_at > NOW()
		ORDER BY ap.created_at DESC
		LIMIT 20`, salonID)
	if err == nil {
		defer rRows.Close()
		for rRows.Next() {
			var rem kioskDepositReminder
			var startAt time.Time
			rRows.Scan(&rem.ID, &rem.ClientName, &rem.ClientPhone,
				&rem.Services, &startAt, &rem.RecurringFrequency)
			rem.StartAt = startAt.Format(time.RFC3339)
			reminders = append(reminders, rem)
		}
	}
	if reminders == nil {
		reminders = []kioskDepositReminder{}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"queue":             items,
		"deposit_reminders": reminders,
	})
}

// GET /api/public/kiosk/staff
func (a *App) KioskStaff(w http.ResponseWriter, r *http.Request) {
	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT sp.id, TRIM(CONCAT(u.first_name,' ',u.last_name)),
		       COALESCE(sp.color,'#0D9488'), COALESCE(u.avatar_url,''),
		       COALESCE(sp.kiosk_status,'available')
		FROM staff_profiles sp
		JOIN users u ON u.id = sp.user_id
		WHERE sp.salon_id=? AND u.is_active=1
		ORDER BY u.first_name`, salonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var staff []kioskStaffItem
	for rows.Next() {
		var s kioskStaffItem
		rows.Scan(&s.ID, &s.Name, &s.Color, &s.AvatarURL, &s.KioskStatus)
		staff = append(staff, s)
	}
	if staff == nil {
		staff = []kioskStaffItem{}
	}
	a.JSON(w, http.StatusOK, staff)
}

// PATCH /api/public/kiosk/staff/{id}/status
// Body: { "status": "available" | "busy" | "break" }
func (a *App) KioskSetStaffStatus(w http.ResponseWriter, r *http.Request) {
	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	switch req.Status {
	case "available", "busy", "break":
	default:
		a.Error(w, http.StatusBadRequest, "invalid status: must be available, busy, or break")
		return
	}

	var prevStatus string
	a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(kiosk_status,'available') FROM staff_profiles WHERE id=? AND salon_id=?`,
		id, salonID).Scan(&prevStatus)

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE staff_profiles SET kiosk_status=? WHERE id=? AND salon_id=?`,
		req.Status, id, salonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Auto-log break start/end so it can be reported on later.
	if req.Status == "break" && prevStatus != "break" {
		a.DB.ExecContext(r.Context(),
			`INSERT INTO staff_breaks (salon_id, staff_id, start_at) VALUES (?,?,NOW())`,
			salonID, id)
	} else if req.Status != "break" && prevStatus == "break" {
		a.DB.ExecContext(r.Context(), `
			UPDATE staff_breaks SET end_at=NOW()
			WHERE staff_id=? AND salon_id=? AND end_at IS NULL
			ORDER BY start_at DESC LIMIT 1`,
			id, salonID)
	}

	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}

// PATCH /api/public/kiosk/walkin/{id}/status — no auth, for the staff kiosk tablet
// Body: { "status": "in_service"|"completed"|"cancelled", "assigned_staff_id": N }
func (a *App) KioskUpdateWalkInStatus(w http.ResponseWriter, r *http.Request) {
	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req struct {
		Status          string `json:"status"`
		AssignedStaffID *uint  `json:"assigned_staff_id"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	switch req.Status {
	case "in_service":
		var staffName string
		if req.AssignedStaffID != nil {
			a.DB.QueryRowContext(r.Context(),
				`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name))
				 FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
				 WHERE sp.id=?`, *req.AssignedStaffID).Scan(&staffName)
		}
		a.DB.ExecContext(r.Context(),
			`UPDATE walk_in_queue
			 SET status='in_service', started_at=NOW(),
			     assigned_staff_id=COALESCE(?,assigned_staff_id),
			     assigned_staff_name=COALESCE(NULLIF(?,''),assigned_staff_name)
			 WHERE id=? AND salon_id=?`,
			req.AssignedStaffID, staffName, id, salonID)
	case "completed":
		a.DB.ExecContext(r.Context(),
			`UPDATE walk_in_queue SET status='completed', completed_at=NOW() WHERE id=? AND salon_id=?`,
			id, salonID)
	case "cancelled", "no_show":
		a.DB.ExecContext(r.Context(),
			`UPDATE walk_in_queue SET status=? WHERE id=? AND salon_id=?`,
			req.Status, id, salonID)
	default:
		a.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}

// PATCH /api/public/kiosk/appointment/{id}/status — no auth, for the staff kiosk tablet
// Body: { "status": "in_service"|"completed"|"cancelled" }
func (a *App) KioskUpdateAppointmentStatus(w http.ResponseWriter, r *http.Request) {
	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	validStatuses := map[string]bool{
		"in_service": true, "completed": true, "cancelled": true, "no_show": true,
	}
	if !validStatuses[req.Status] {
		a.Error(w, http.StatusBadRequest, "invalid status")
		return
	}

	// Verify the appointment belongs to this salon
	var count int
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM appointments WHERE id=? AND salon_id=?`, id, salonID).Scan(&count); err != nil || count == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found")
		return
	}

	switch req.Status {
	case "completed":
		a.DB.ExecContext(r.Context(),
			`UPDATE appointments SET status='completed', checked_out_at=NOW() WHERE id=? AND salon_id=?`,
			id, salonID)
	default:
		a.DB.ExecContext(r.Context(),
			`UPDATE appointments SET status=? WHERE id=? AND salon_id=?`,
			req.Status, id, salonID)
	}
	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}

// GET /api/public/kiosk/services — service list for the add-walk-in form
func (a *App) KioskServices(w http.ResponseWriter, r *http.Request) {
	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.JSON(w, http.StatusOK, []any{})
		return
	}
	type svc struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, name FROM services WHERE salon_id=? AND is_active=1 ORDER BY name`, salonID)
	if err != nil {
		a.JSON(w, http.StatusOK, []any{})
		return
	}
	defer rows.Close()

	// Try with is_active first; fall back to no filter if column doesn't exist
	var svcs []svc
	for rows.Next() {
		var s svc
		rows.Scan(&s.ID, &s.Name)
		svcs = append(svcs, s)
	}
	if svcs == nil {
		svcs = []svc{}
	}
	a.JSON(w, http.StatusOK, svcs)
}

// kioskSalonIDFromDB is an alias used by deposit-reminder check.
func (a *App) kioskSalonIDFromDB(r *http.Request) uint {
	id, err := a.kioskSalonID(r)
	if err != nil {
		return 0
	}
	return id
}

// POST /api/public/kiosk/walkin — staff adds a walk-in (phone optional)
func (a *App) KioskAddWalkIn(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name             string `json:"name"`
		Phone            string `json:"phone"`
		ServiceIDs       []uint `json:"service_ids"`
		PreferredStaffID *uint  `json:"preferred_staff_id"`
	}
	if err := a.Decode(r, &req); err != nil || strings.TrimSpace(req.Name) == "" {
		a.Error(w, http.StatusBadRequest, "name required")
		return
	}

	salonID, err := a.kioskSalonID(r)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "no salon configured")
		return
	}

	phone := strings.TrimSpace(req.Phone)

	// Look up client by phone (optional)
	var clientID *uint
	if phone != "" {
		var cid uint
		if err2 := a.DB.QueryRowContext(r.Context(),
			`SELECT id FROM clients WHERE phone=? AND salon_id=? LIMIT 1`, phone, salonID).Scan(&cid); err2 == nil {
			clientID = &cid
		} else {
			parts := strings.Fields(strings.TrimSpace(req.Name))
			fn, ln := "", ""
			if len(parts) > 0 {
				fn = parts[0]
			}
			if len(parts) > 1 {
				ln = strings.Join(parts[1:], " ")
			}
			res2, err3 := a.DB.ExecContext(r.Context(),
				`INSERT INTO clients (salon_id, first_name, last_name, phone, sms_consent) VALUES (?,?,?,?,1)`,
				salonID, fn, ln, phone)
			if err3 == nil {
				nid, _ := res2.LastInsertId()
				ncid := uint(nid)
				clientID = &ncid
			}
		}
	}

	// Resolve service names
	var serviceNames []string
	var serviceIDStrs []string
	for _, sid := range req.ServiceIDs {
		var sname string
		if err2 := a.DB.QueryRowContext(r.Context(), `SELECT name FROM services WHERE id=?`, sid).Scan(&sname); err2 == nil {
			serviceNames = append(serviceNames, sname)
		}
		serviceIDStrs = append(serviceIDStrs, fmt.Sprintf("%d", sid))
	}

	// Resolve preferred staff name
	var staffName string
	if req.PreferredStaffID != nil {
		a.DB.QueryRowContext(r.Context(),
			`SELECT CONCAT(first_name,' ',last_name) FROM users WHERE id=?`, *req.PreferredStaffID).Scan(&staffName)
	}

	res, err2 := a.DB.ExecContext(r.Context(),
		`INSERT INTO walk_in_queue
		   (salon_id, client_id, name, phone, service_ids, service_names,
		    preferred_staff_id, preferred_staff_name, status)
		 VALUES (?,?,?,?,?,?,?,?,'waiting')`,
		salonID, clientID, strings.TrimSpace(req.Name), phone,
		strings.Join(serviceIDStrs, ","),
		strings.Join(serviceNames, ", "),
		req.PreferredStaffID, staffName)
	if err2 != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{
		"id":     id,
		"status": "waiting",
		"name":   strings.TrimSpace(req.Name),
	})
}

// Ensure sql import is used.
var _ = sql.ErrNoRows
