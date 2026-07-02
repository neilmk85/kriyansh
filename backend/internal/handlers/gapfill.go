package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// TriggerGapFill is called in a goroutine after an appointment is cancelled.
// It notifies waitlist clients or at-risk clients about the freed slot.
func (a *App) TriggerGapFill(ctx context.Context, salonID uint, appointmentID uint64) {
	// Load the cancelled appointment details
	var startAt time.Time
	var staffID int64
	var staffName string
	err := a.DB.QueryRowContext(ctx, `
		SELECT a.start_at, a.staff_id, CONCAT(u.first_name,' ',u.last_name)
		FROM appointments a
		JOIN staff_profiles sp ON sp.id = a.staff_id
		JOIN users u ON u.id = sp.user_id
		WHERE a.id = ? AND a.salon_id = ?
	`, appointmentID, salonID).Scan(&startAt, &staffID, &staffName)
	if err != nil {
		slog.Warn("gap-fill: failed to load appointment", "id", appointmentID, "error", err)
		return
	}

	// Get first service name for this appointment
	var serviceName string
	_ = a.DB.QueryRowContext(ctx, `
		SELECT COALESCE(s.name, '')
		FROM appointment_services aps
		JOIN services s ON s.id = aps.service_id
		WHERE aps.appointment_id = ?
		LIMIT 1
	`, appointmentID).Scan(&serviceName)

	dateStr := startAt.Local().Format("Mon Jan 2")
	timeStr := startAt.Local().Format("3:04 PM")
	bookURL := a.AppURL + "/booking"
	msg := fmt.Sprintf(
		"Great news! A slot just opened at Kriyansh Beauty Bar on %s at %s with %s. Call us or book online to grab it: %s",
		dateStr, timeStr, staffName, bookURL,
	)

	// Try waitlist first
	dayOfWeek := int(startAt.Weekday()) // 0=Sun
	timeHHMM := startAt.UTC().Format("15:04")
	wlRows, err := a.DB.QueryContext(ctx, `
		SELECT we.client_id, c.first_name, COALESCE(c.phone,'')
		FROM waitlist_entries we
		JOIN clients c ON c.id = we.client_id
		WHERE we.salon_id = ?
		  AND we.status = 'waiting'
		  AND (we.preferred_day_of_week IS NULL OR we.preferred_day_of_week = ?)
		  AND (we.preferred_time_start IS NULL OR we.preferred_time_start <= ?)
		  AND (we.preferred_time_end IS NULL OR we.preferred_time_end >= ?)
		  AND c.phone != ''
		ORDER BY we.created_at ASC
		LIMIT 3
	`, salonID, dayOfWeek, timeHHMM, timeHHMM)

	var recipients []struct {
		clientID  int64
		firstName string
		phone     string
	}

	if err == nil {
		defer wlRows.Close()
		for wlRows.Next() {
			var r struct {
				clientID  int64
				firstName string
				phone     string
			}
			if scanErr := wlRows.Scan(&r.clientID, &r.firstName, &r.phone); scanErr == nil && r.phone != "" {
				recipients = append(recipients, r)
			}
		}
		wlRows.Close()
	}

	// If no waitlist matches, fall back to at-risk clients
	if len(recipients) == 0 {
		atRiskRows, err2 := a.DB.QueryContext(ctx, `
			SELECT c.id, c.first_name, c.phone
			FROM clients c
			LEFT JOIN (
			    SELECT client_id, MAX(created_at) last_visit
			    FROM transactions
			    WHERE salon_id = ?
			    GROUP BY client_id
			) v ON v.client_id = c.id
			WHERE c.salon_id = ?
			  AND c.phone != ''
			  AND (v.last_visit IS NULL OR v.last_visit < DATE_SUB(NOW(), INTERVAL 45 DAY))
			ORDER BY RAND()
			LIMIT 5
		`, salonID, salonID)
		if err2 != nil {
			slog.Warn("gap-fill: at-risk query failed", "error", err2)
			return
		}
		defer atRiskRows.Close()
		for atRiskRows.Next() {
			var r struct {
				clientID  int64
				firstName string
				phone     string
			}
			if scanErr := atRiskRows.Scan(&r.clientID, &r.firstName, &r.phone); scanErr == nil && r.phone != "" {
				recipients = append(recipients, r)
			}
		}
		atRiskRows.Close()
	}

	for _, r := range recipients {
		a.Notifier.SendSMS(r.phone, msg)
		_, err := a.DB.ExecContext(ctx, `
			INSERT INTO sms_jobs (salon_id, appointment_id, client_id, job_type, phone, status)
			VALUES (?, ?, ?, 'gap_fill', ?, 'sent')
		`, salonID, appointmentID, r.clientID, r.phone)
		if err != nil {
			slog.Error("gap-fill: failed to record sms_job", "client_id", r.clientID, "error", err)
		}
	}

	if len(recipients) > 0 {
		slog.Info("gap-fill SMS sent", "appointment_id", appointmentID, "recipients", len(recipients))
	}
}
