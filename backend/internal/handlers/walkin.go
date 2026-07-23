package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

type walkInEntry struct {
	ID                  uint       `json:"id"`
	SalonID             uint       `json:"salon_id"`
	ClientID            *uint      `json:"client_id"`
	Name                string     `json:"name"`
	Phone               string     `json:"phone"`
	ServiceIDs          string     `json:"service_ids"`
	ServiceNames        string     `json:"service_names"`
	PreferredStaffID    *uint      `json:"preferred_staff_id"`
	PreferredStaffName  string     `json:"preferred_staff_name"`
	AssignedStaffID     *uint      `json:"assigned_staff_id"`
	AssignedStaffName   string     `json:"assigned_staff_name"`
	Status              string     `json:"status"`
	Notes               string     `json:"notes"`
	CheckedInAt         time.Time  `json:"checked_in_at"`
	StartedAt           *time.Time `json:"started_at"`
	CompletedAt         *time.Time `json:"completed_at"`
	WaitMinutes         int        `json:"wait_minutes"`
}

// POST /api/public/walkin — no auth, called from tablet kiosk
func (a *App) PublicWalkIn(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name             string `json:"name"`
		Phone            string `json:"phone"`
		ServiceIDs       []uint `json:"service_ids"`
		PreferredStaffID *uint  `json:"preferred_staff_id"`
		Notes            string `json:"notes"`
		SMSConsent       *bool  `json:"sms_consent"`
	}
	if err := a.Decode(r, &req); err != nil || strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Phone) == "" {
		a.Error(w, http.StatusBadRequest, "name and phone required")
		return
	}

	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "no salon configured")
		return
	}

	consent := true
	if req.SMSConsent != nil {
		consent = *req.SMSConsent
	}

	// Find or create client by phone
	var clientID *uint
	var cid uint
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT id FROM clients WHERE phone=? AND salon_id=? LIMIT 1`, req.Phone, salonID).Scan(&cid); err == nil {
		clientID = &cid
		if req.SMSConsent != nil {
			a.DB.ExecContext(r.Context(),
				`UPDATE clients SET sms_consent=? WHERE id=? AND salon_id=?`, consent, cid, salonID)
		}
	} else {
		parts := strings.Fields(strings.TrimSpace(req.Name))
		firstName, lastName := "", ""
		if len(parts) > 0 {
			firstName = parts[0]
		}
		if len(parts) > 1 {
			lastName = strings.Join(parts[1:], " ")
		}
		res2, err2 := a.DB.ExecContext(r.Context(),
			`INSERT INTO clients (salon_id, first_name, last_name, phone, sms_consent) VALUES (?, ?, ?, ?, ?)`,
			salonID, firstName, lastName, strings.TrimSpace(req.Phone), consent)
		if err2 == nil {
			newID, _ := res2.LastInsertId()
			newCid := uint(newID)
			clientID = &newCid
		}
	}

	// Resolve service names
	var serviceNames []string
	var serviceIDStrs []string
	for _, sid := range req.ServiceIDs {
		var sname string
		if err := a.DB.QueryRowContext(r.Context(), `SELECT name FROM services WHERE id=?`, sid).Scan(&sname); err == nil {
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

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO walk_in_queue
		   (salon_id, client_id, name, phone, service_ids, service_names,
		    preferred_staff_id, preferred_staff_name, status, notes)
		 VALUES (?,?,?,?,?,?,?,?,'waiting',?)`,
		salonID, clientID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Phone),
		strings.Join(serviceIDStrs, ","),
		strings.Join(serviceNames, ", "),
		req.PreferredStaffID, staffName, strings.TrimSpace(req.Notes))
	if err != nil {
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

// GET /api/public/walkin/lookup?phone=XXXXXXXXXX — check if client exists
func (a *App) PublicWalkInLookup(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	if phone == "" {
		a.Error(w, http.StatusBadRequest, "phone required")
		return
	}
	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.JSON(w, http.StatusOK, map[string]any{"found": false})
		return
	}
	var firstName, lastName string
	var smsConsent bool
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT first_name, last_name, sms_consent FROM clients WHERE phone=? AND salon_id=? LIMIT 1`,
		phone, salonID).Scan(&firstName, &lastName, &smsConsent)
	if err != nil {
		a.JSON(w, http.StatusOK, map[string]any{"found": false})
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"found":       true,
		"first_name":  firstName,
		"last_name":   lastName,
		"sms_consent": smsConsent,
	})
}

// GET /api/walkins?status=waiting — admin: today's queue
func (a *App) ListWalkIns(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	statusFilter := r.URL.Query().Get("status")

	query := `SELECT id, salon_id,
	                 client_id,
	                 name, phone,
	                 COALESCE(service_ids,''), COALESCE(service_names,''),
	                 preferred_staff_id, COALESCE(preferred_staff_name,''),
	                 assigned_staff_id,  COALESCE(assigned_staff_name,''),
	                 status, COALESCE(notes,''),
	                 checked_in_at, started_at, completed_at
	          FROM walk_in_queue
	          WHERE salon_id=? AND DATE(checked_in_at)=CURDATE()`
	args := []any{claims.SalonID}
	if statusFilter != "" && statusFilter != "all" {
		query += " AND status=?"
		args = append(args, statusFilter)
	}
	query += " ORDER BY checked_in_at ASC"

	rows, err := a.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	now := time.Now()
	var entries []walkInEntry
	for rows.Next() {
		var e walkInEntry
		var clientIDVal, prefStaffIDVal, assignedStaffIDVal *uint
		rows.Scan(&e.ID, &e.SalonID,
			&clientIDVal,
			&e.Name, &e.Phone,
			&e.ServiceIDs, &e.ServiceNames,
			&prefStaffIDVal, &e.PreferredStaffName,
			&assignedStaffIDVal, &e.AssignedStaffName,
			&e.Status, &e.Notes,
			&e.CheckedInAt, &e.StartedAt, &e.CompletedAt)
		e.ClientID = clientIDVal
		e.PreferredStaffID = prefStaffIDVal
		e.AssignedStaffID = assignedStaffIDVal
		e.WaitMinutes = int(now.Sub(e.CheckedInAt).Minutes())
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []walkInEntry{}
	}
	a.JSON(w, http.StatusOK, entries)
}

// GET /api/public/appointments/today?phone=X — kiosk: find today's appointments by phone
func (a *App) PublicAppointmentsByPhone(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	if phone == "" {
		a.Error(w, http.StatusBadRequest, "phone required")
		return
	}
	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.JSON(w, http.StatusOK, []any{})
		return
	}
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT ap.id, ap.start_at, ap.status,
		       s.name,
		       CONCAT(u.first_name,' ',u.last_name),
		       CONCAT(c.first_name,' ',c.last_name)
		FROM appointments ap
		JOIN clients c  ON c.id = ap.client_id AND c.salon_id = ap.salon_id
		JOIN services s ON s.id = ap.service_id
		LEFT JOIN users u ON u.id = ap.staff_id
		WHERE c.phone = ?
		  AND ap.salon_id = ?
		  AND DATE(ap.start_at) = CURDATE()
		  AND ap.status IN ('scheduled','confirmed')
		ORDER BY ap.start_at ASC`, phone, salonID)
	if err != nil {
		a.JSON(w, http.StatusOK, []any{})
		return
	}
	defer rows.Close()

	type apptRow struct {
		ID          uint   `json:"id"`
		StartAt     string `json:"start_at"`
		Status      string `json:"status"`
		ServiceName string `json:"service_name"`
		StaffName   string `json:"staff_name"`
		ClientName  string `json:"client_name"`
	}
	var out []apptRow
	for rows.Next() {
		var row apptRow
		var startAt time.Time
		var staffName *string
		if err := rows.Scan(&row.ID, &startAt, &row.Status, &row.ServiceName, &staffName, &row.ClientName); err != nil {
			continue
		}
		row.StartAt = startAt.Format("2006-01-02T15:04:05Z07:00")
		if staffName != nil {
			row.StaffName = *staffName
		}
		out = append(out, row)
	}
	if out == nil {
		out = []apptRow{}
	}
	a.JSON(w, http.StatusOK, out)
}

// POST /api/public/appointments/{id}/checkin — kiosk: mark appointment checked_in
func (a *App) PublicAppointmentCheckin(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	result, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET status='checked_in', checked_in_at=NOW()
		 WHERE id=? AND status IN ('scheduled','confirmed')`, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found or already checked in")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// GET /api/public/queue — no auth, TV display: today's waiting + in_service entries (sanitised)
func (a *App) PublicQueueDisplay(w http.ResponseWriter, r *http.Request) {
	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "no salon configured")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT id, name, COALESCE(service_names,''), status, checked_in_at, started_at
		FROM walk_in_queue
		WHERE salon_id=? AND DATE(checked_in_at)=CURDATE()
		  AND status IN ('waiting','in_service')
		ORDER BY checked_in_at ASC`, salonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type queueEntry struct {
		ID           uint   `json:"id"`
		FirstName    string `json:"first_name"`
		ServiceNames string `json:"service_names"`
		Status       string `json:"status"`
		WaitMinutes  int    `json:"wait_minutes"`
	}

	now := time.Now()
	var entries []queueEntry
	for rows.Next() {
		var id uint
		var name, serviceNames, status string
		var checkedInAt time.Time
		var startedAt *time.Time
		if err := rows.Scan(&id, &name, &serviceNames, &status, &checkedInAt, &startedAt); err != nil {
			continue
		}
		firstName := strings.SplitN(strings.TrimSpace(name), " ", 2)[0]
		var waitMins int
		if status == "in_service" && startedAt != nil {
			waitMins = int(now.Sub(*startedAt).Minutes())
		} else {
			waitMins = int(now.Sub(checkedInAt).Minutes())
		}
		entries = append(entries, queueEntry{
			ID:           id,
			FirstName:    firstName,
			ServiceNames: serviceNames,
			Status:       status,
			WaitMinutes:  waitMins,
		})
	}
	if entries == nil {
		entries = []queueEntry{}
	}
	a.JSON(w, http.StatusOK, entries)
}

// PATCH /api/walkins/{id}/status — admin: update queue entry status
func (a *App) UpdateWalkInStatus(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
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
				`SELECT CONCAT(first_name,' ',last_name) FROM users WHERE id=?`, *req.AssignedStaffID).Scan(&staffName)
		}
		a.DB.ExecContext(r.Context(),
			`UPDATE walk_in_queue
			 SET status='in_service', started_at=NOW(),
			     assigned_staff_id=COALESCE(?,assigned_staff_id),
			     assigned_staff_name=COALESCE(NULLIF(?,''),assigned_staff_name)
			 WHERE id=? AND salon_id=?`,
			req.AssignedStaffID, staffName, id, claims.SalonID)
	case "completed":
		a.DB.ExecContext(r.Context(),
			`UPDATE walk_in_queue SET status='completed', completed_at=NOW() WHERE id=? AND salon_id=?`,
			id, claims.SalonID)
	case "cancelled", "no_show":
		a.DB.ExecContext(r.Context(),
			`UPDATE walk_in_queue SET status=? WHERE id=? AND salon_id=?`,
			req.Status, id, claims.SalonID)
	default:
		a.Error(w, http.StatusBadRequest, "invalid status")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}
