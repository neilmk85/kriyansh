package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"time"
)

// RunReminderLoop ticks every 60 s and dispatches T-48h and T-3h SMS reminders.
// Start in a goroutine from main.go.
func (a *App) RunReminderLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(60 * time.Second):
			a.sendReminders(ctx)
		}
	}
}

func (a *App) sendReminders(ctx context.Context) {
	now := time.Now().UTC()

	// ── T-48h window: start_at BETWEEN now+47h and now+49h ──────────────────
	win48Start := now.Add(47 * time.Hour)
	win48End := now.Add(49 * time.Hour)
	a.dispatchReminders(ctx, win48Start, win48End, "reminder_48h", func(firstName, timeStr string) string {
		return fmt.Sprintf(
			"Hi %s! Your appointment at Kriyansh Beauty Bar is tomorrow at %s. Reply YES to confirm or call us to reschedule. See you soon! 💇",
			firstName, timeStr,
		)
	})

	// ── T-3h window: start_at BETWEEN now+2h45m and now+3h15m ───────────────
	win3Start := now.Add(2*time.Hour + 45*time.Minute)
	win3End := now.Add(3*time.Hour + 15*time.Minute)
	a.dispatchReminders(ctx, win3Start, win3End, "reminder_3h", func(firstName, timeStr string) string {
		return fmt.Sprintf(
			"Hi %s! Your appointment at Kriyansh Beauty Bar is in 3 hours at %s. We're looking forward to seeing you! 💇",
			firstName, timeStr,
		)
	})
}

func (a *App) dispatchReminders(
	ctx context.Context,
	windowStart, windowEnd time.Time,
	jobType string,
	buildMsg func(firstName, timeStr string) string,
) {
	rows, err := a.DB.QueryContext(ctx, `
		SELECT a.id, a.salon_id, a.client_id, a.start_at,
		       c.first_name, COALESCE(c.phone,'')
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		WHERE a.start_at BETWEEN ? AND ?
		  AND a.status IN ('scheduled','confirmed','pending')
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.appointment_id = a.id AND sj.job_type = ?
		  )
	`, windowStart, windowEnd, jobType)
	if err != nil {
		slog.Error("reminder query failed", "job_type", jobType, "error", err)
		return
	}
	defer rows.Close()

	type pending struct {
		apptID    int64
		salonID   int64
		clientID  int64
		startAt   time.Time
		firstName string
		phone     string
	}
	var queue []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(&p.apptID, &p.salonID, &p.clientID, &p.startAt, &p.firstName, &p.phone); err != nil {
			slog.Warn("reminder scan error", "error", err)
			continue
		}
		queue = append(queue, p)
	}
	rows.Close()

	for _, p := range queue {
		if p.phone == "" {
			slog.Info("reminder skipped — no phone", "appointment_id", p.apptID)
			continue
		}

		timeStr := p.startAt.Local().Format("3:04 PM")
		msg := buildMsg(p.firstName, timeStr)

		a.Notifier.SendSMS(p.phone, msg)

		_, err := a.DB.ExecContext(ctx, `
			INSERT INTO sms_jobs (salon_id, appointment_id, client_id, job_type, phone, status)
			VALUES (?, ?, ?, ?, ?, 'sent')
		`, p.salonID, p.apptID, p.clientID, jobType, p.phone)
		if err != nil {
			slog.Error("failed to record sms_job", "appointment_id", p.apptID, "job_type", jobType, "error", err)
		} else {
			slog.Info("reminder sent", "job_type", jobType, "appointment_id", p.apptID, "phone", p.phone)
		}
	}
}
