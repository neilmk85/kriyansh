package handlers

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// nextRecurringDate computes the next appointment date from a base time and frequency string.
func nextRecurringDate(base time.Time, frequency string) time.Time {
	switch strings.ToLower(strings.TrimSpace(frequency)) {
	case "every 2 weeks":
		return base.AddDate(0, 0, 14)
	case "monthly":
		return base.AddDate(0, 1, 0)
	default: // "weekly" or unknown
		return base.AddDate(0, 0, 7)
	}
}

// GET /api/public/appointments/current?phone=X
// Returns the most recent today-appointment (checked_in/in_progress/completed)
// that has a recurring_frequency and has not yet been confirmed at the kiosk.
func (a *App) PublicCurrentAppointment(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	if phone == "" {
		a.Error(w, http.StatusBadRequest, "phone required")
		return
	}
	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.JSON(w, http.StatusOK, nil)
		return
	}

	type result struct {
		ID                 uint   `json:"id"`
		StartAt            string `json:"start_at"`
		Status             string `json:"status"`
		ServiceName        string `json:"service_name"`
		StaffName          string `json:"staff_name"`
		StaffID            uint   `json:"staff_id"`
		ClientName         string `json:"client_name"`
		ClientPhone        string `json:"client_phone"`
		RecurringFrequency string `json:"recurring_frequency"`
		NextDate           string `json:"next_date"`
		NextTime           string `json:"next_time"`
	}

	var appt result
	var startAt time.Time
	var staffName sql.NullString
	var staffID sql.NullInt64

	err := a.DB.QueryRowContext(r.Context(), `
		SELECT ap.id, ap.start_at, ap.status,
		       COALESCE(s.name, ''),
		       CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')),
		       COALESCE(sp.id, 0),
		       CONCAT(c.first_name, ' ', c.last_name),
		       c.phone,
		       ap.recurring_frequency
		FROM appointments ap
		JOIN clients c ON c.id = ap.client_id AND c.salon_id = ap.salon_id
		LEFT JOIN services s ON s.id = ap.service_id
		LEFT JOIN staff_profiles sp ON sp.id = ap.staff_id
		LEFT JOIN users u ON u.id = sp.user_id
		WHERE c.phone = ?
		  AND ap.salon_id = ?
		  AND DATE(ap.start_at) = CURDATE()
		  AND ap.status IN ('checked_in','in_progress','completed')
		  AND ap.recurring_frequency IS NOT NULL
		  AND ap.recurring_frequency != ''
		  AND COALESCE(ap.recurring_confirmed, 0) = 0
		ORDER BY ap.start_at DESC
		LIMIT 1`, phone, salonID).
		Scan(&appt.ID, &startAt, &appt.Status, &appt.ServiceName,
			&staffName, &staffID, &appt.ClientName, &appt.ClientPhone,
			&appt.RecurringFrequency)

	if err == sql.ErrNoRows {
		a.JSON(w, http.StatusOK, nil)
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	appt.StartAt = startAt.Format(time.RFC3339)
	appt.StaffName = strings.TrimSpace(staffName.String)
	if staffID.Valid {
		appt.StaffID = uint(staffID.Int64)
	}

	next := nextRecurringDate(startAt, appt.RecurringFrequency)
	appt.NextDate = next.Format(time.RFC3339)
	appt.NextTime = startAt.Format("15:04") // same time-of-day

	a.JSON(w, http.StatusOK, &appt)
}

// POST /api/public/appointments/{id}/book-next
// Confirms the next recurring appointment, sends an SMS to the client, and marks
// the original appointment as recurring_confirmed = 1.
func (a *App) PublicBookNext(w http.ResponseWriter, r *http.Request) {
	apptID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Load the original appointment
	var startAt time.Time
	var recurringFrequency, clientPhone, clientFirstName, staffName string
	var clientID, staffProfileID, salonID uint
	var serviceID sql.NullInt64

	err = a.DB.QueryRowContext(r.Context(), `
		SELECT ap.start_at, ap.recurring_frequency,
		       ap.client_id, ap.staff_id, ap.salon_id, ap.service_id,
		       c.phone, c.first_name,
		       COALESCE(CONCAT(u.first_name,' ',u.last_name), 'any stylist')
		FROM appointments ap
		JOIN clients c ON c.id = ap.client_id AND c.salon_id = ap.salon_id
		LEFT JOIN staff_profiles sp ON sp.id = ap.staff_id
		LEFT JOIN users u ON u.id = sp.user_id
		WHERE ap.id = ?`, apptID).
		Scan(&startAt, &recurringFrequency, &clientID, &staffProfileID, &salonID, &serviceID,
			&clientPhone, &clientFirstName, &staffName)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "appointment not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Fetch all services for the original appointment (prefer appointment_services)
	type svcRow struct {
		ServiceID   int
		Price       float64
		DurationMin int
	}
	var services []svcRow
	svcRows, err := a.DB.QueryContext(r.Context(),
		`SELECT service_id, price, duration_min FROM appointment_services WHERE appointment_id = ?`, apptID)
	if err == nil {
		defer svcRows.Close()
		for svcRows.Next() {
			var s svcRow
			if svcRows.Scan(&s.ServiceID, &s.Price, &s.DurationMin) == nil {
				services = append(services, s)
			}
		}
	}
	// Fallback to single service_id on the appointment row
	if len(services) == 0 && serviceID.Valid {
		var price float64
		var dur int
		_ = a.DB.QueryRowContext(r.Context(),
			`SELECT price, duration_min FROM services WHERE id = ?`, serviceID.Int64).
			Scan(&price, &dur)
		services = append(services, svcRow{int(serviceID.Int64), price, dur})
	}

	// Calculate next date (same time-of-day)
	nextStart := nextRecurringDate(startAt, recurringFrequency)
	totalDur := 0
	for _, s := range services {
		totalDur += s.DurationMin
	}
	if totalDur == 0 {
		totalDur = 60
	}
	nextEnd := nextStart.Add(time.Duration(totalDur) * time.Minute)

	// Create the next appointment (source = 'recurring' so admin can identify it)
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO appointments
		   (salon_id, client_id, staff_id, start_at, end_at, status, notes, source, recurring_frequency)
		 VALUES (?, ?, ?, ?, ?, 'scheduled', 'Recurring booking — deposit pending', 'recurring', ?)`,
		salonID, clientID, staffProfileID, nextStart, nextEnd, recurringFrequency)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	newApptID, _ := res.LastInsertId()

	// Link services to the new appointment
	for _, s := range services {
		a.DB.ExecContext(r.Context(),
			`INSERT INTO appointment_services (appointment_id, service_id, price, duration_min)
			 VALUES (?, ?, ?, ?)`,
			newApptID, s.ServiceID, s.Price, s.DurationMin)
	}

	// Also set service_id on the new appointment row for compatibility
	if len(services) > 0 {
		a.DB.ExecContext(r.Context(),
			`UPDATE appointments SET service_id = ? WHERE id = ?`, services[0].ServiceID, newApptID)
	}

	// Mark the original appointment as recurring_confirmed
	a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET recurring_confirmed = 1 WHERE id = ?`, apptID)

	// Send confirmation SMS
	if clientPhone != "" {
		staffDisplay := strings.TrimSpace(staffName)
		if staffDisplay == "" {
			staffDisplay = "any available stylist"
		}
		msg := fmt.Sprintf(
			"Hi %s! Your next %s appointment at Kriyansh Beauty Bar is confirmed for %s at %s with %s. "+
				"A deposit secures your spot — our team will be in touch shortly. See you then! "+
				"Reply STOP to opt out.",
			clientFirstName,
			recurringFrequency,
			nextStart.Format("Monday, Jan 2"),
			nextStart.Format("3:04 PM"),
			staffDisplay,
		)
		a.Notifier.SendSMS(clientPhone, msg)
	}

	slog.Info("recurring booking created",
		"original_appt", apptID, "new_appt", newApptID,
		"client_id", clientID, "next_start", nextStart)

	a.JSON(w, http.StatusCreated, map[string]any{
		"new_appointment_id": newApptID,
		"next_start":         nextStart.Format(time.RFC3339),
		"next_end":           nextEnd.Format(time.RFC3339),
		"frequency":          recurringFrequency,
		"staff_name":         strings.TrimSpace(staffName),
		"sms_sent":           clientPhone != "",
	})
}
