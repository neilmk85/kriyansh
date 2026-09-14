package handlers

import (
	"context"
	"log/slog"
	"time"

	"salonos/internal/notify"
)

// RunReminderLoop ticks every 60 s and dispatches all automated notifications.
func (a *App) RunReminderLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(60 * time.Second):
			a.sendAppointmentReminders(ctx)
			a.sendExpiryAlerts(ctx)
			a.sendBirthdayGreetings(ctx)
			a.sendRebookingReminders(ctx)
			a.sendInactiveCustomerAlerts(ctx)
		}
	}
}

// ── Appointment reminders ─────────────────────────────────────────────────────

func (a *App) sendAppointmentReminders(ctx context.Context) {
	now := time.Now().UTC()

	// T-24h window (±1h around the 24h mark)
	a.dispatchApptReminder(ctx, now.Add(23*time.Hour), now.Add(25*time.Hour), "reminder_24h", func(info notify.ApptInfo) {
		a.Notifier.NotifyAppointmentTomorrow(info)
	})

	// T-3h window (±15 min around the 3h mark)
	a.dispatchApptReminder(ctx, now.Add(2*time.Hour+45*time.Minute), now.Add(3*time.Hour+15*time.Minute), "reminder_3h", func(info notify.ApptInfo) {
		timeStr := info.StartAt.Local().Format("3:04 PM")
		msg := "Hi " + info.ClientName + "! Your appointment at Kriyansh Beauty Bar is in 3 hours at " + timeStr + ". We're looking forward to seeing you! 💇"
		a.Notifier.SendSMS(info.Phone, msg)
	})
}

func (a *App) dispatchApptReminder(ctx context.Context, windowStart, windowEnd time.Time, jobType string, send func(notify.ApptInfo)) {
	rows, err := a.DB.QueryContext(ctx, `
		SELECT a.id, a.salon_id, a.client_id, a.start_at,
		       c.first_name,
		       COALESCE(c.phone,''), COALESCE(c.email,''),
		       COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '),'Appointment') AS service_name,
		       COALESCE(CONCAT(u.first_name,' ',u.last_name),'') AS staff_name
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
		LEFT JOIN services s ON s.id = aps.service_id
		LEFT JOIN staff_profiles sp ON sp.id = a.staff_id
		LEFT JOIN users u ON u.id = sp.user_id
		WHERE a.start_at BETWEEN ? AND ?
		  AND a.status IN ('scheduled','confirmed','pending')
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.appointment_id = a.id AND sj.job_type = ?
		  )
		GROUP BY a.id, a.salon_id, a.client_id, a.start_at,
		         c.first_name, c.phone, c.email, u.first_name, u.last_name
	`, windowStart, windowEnd, jobType)
	if err != nil {
		slog.Error("reminder query failed", "job_type", jobType, "error", err)
		return
	}
	defer rows.Close()

	type row struct {
		apptID    int64
		salonID   int64
		clientID  int64
		info      notify.ApptInfo
	}
	var queue []row
	for rows.Next() {
		var r row
		if err := rows.Scan(
			&r.apptID, &r.salonID, &r.clientID, &r.info.StartAt,
			&r.info.ClientName, &r.info.Phone, &r.info.Email,
			&r.info.ServiceName, &r.info.StaffName,
		); err != nil {
			slog.Warn("reminder scan error", "error", err)
			continue
		}
		queue = append(queue, r)
	}
	rows.Close()

	for _, q := range queue {
		if q.info.Phone == "" {
			slog.Info("reminder skipped — no phone", "appointment_id", q.apptID)
			continue
		}
		send(q.info)
		_, err := a.DB.ExecContext(ctx, `
			INSERT INTO sms_jobs (salon_id, appointment_id, client_id, job_type, phone, status)
			VALUES (?, ?, ?, ?, ?, 'sent')
		`, q.salonID, q.apptID, q.clientID, jobType, q.info.Phone)
		if err != nil {
			slog.Error("failed to record sms_job", "appointment_id", q.apptID, "job_type", jobType, "error", err)
		} else {
			slog.Info("reminder dispatched", "job_type", jobType, "appointment_id", q.apptID)
		}
	}
}

// ── Expiry alerts ─────────────────────────────────────────────────────────────

func (a *App) sendExpiryAlerts(ctx context.Context) {
	now := time.Now().UTC()
	in7Start := now.Add(6*24*time.Hour + 23*time.Hour)
	in7End := now.Add(7*24*time.Hour + 1*time.Hour)

	// Memberships expiring in ~7 days
	memRows, err := a.DB.QueryContext(ctx, `
		SELECT cm.id, cm.salon_id, cm.client_id,
		       c.first_name, COALESCE(c.phone,''), COALESCE(c.email,''),
		       mp.name, cm.expires_at
		FROM client_memberships cm
		JOIN clients c ON c.id = cm.client_id
		JOIN membership_plans mp ON mp.id = cm.plan_id
		WHERE cm.status = 'active'
		  AND cm.expires_at BETWEEN ? AND ?
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.client_id = cm.client_id AND sj.job_type = 'membership_expiry_7d'
		        AND DATE(sj.sent_at) = CURDATE()
		  )
	`, in7Start, in7End)
	if err != nil {
		slog.Error("membership expiry query failed", "error", err)
	} else {
		defer memRows.Close()
		for memRows.Next() {
			var cmID, salonID, clientID int64
			var info notify.ExpiryInfo
			if err := memRows.Scan(&cmID, &salonID, &clientID, &info.ClientName, &info.Phone, &info.Email, &info.ItemName, &info.ExpiresAt); err != nil {
				continue
			}
			if info.Phone == "" {
				continue
			}
			a.Notifier.NotifyMembershipExpiring(info)
			a.DB.ExecContext(ctx, `INSERT INTO sms_jobs (salon_id, client_id, job_type, phone, status) VALUES (?,?,?,?,'sent')`,
				salonID, clientID, "membership_expiry_7d", info.Phone)
			slog.Info("membership expiry alert sent", "client_id", clientID)
		}
	}

	// Packages expiring in ~7 days
	pkgRows, err := a.DB.QueryContext(ctx, `
		SELECT cp.id, cp.salon_id, cp.client_id,
		       c.first_name, COALESCE(c.phone,''), COALESCE(c.email,''),
		       p.name, cp.expires_at
		FROM client_packages cp
		JOIN clients c ON c.id = cp.client_id
		JOIN packages p ON p.id = cp.package_id
		WHERE cp.status = 'active'
		  AND cp.expires_at BETWEEN ? AND ?
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.client_id = cp.client_id AND sj.job_type = 'package_expiry_7d'
		        AND DATE(sj.sent_at) = CURDATE()
		  )
	`, in7Start, in7End)
	if err != nil {
		slog.Error("package expiry query failed", "error", err)
	} else {
		defer pkgRows.Close()
		for pkgRows.Next() {
			var cpID, salonID, clientID int64
			var info notify.ExpiryInfo
			if err := pkgRows.Scan(&cpID, &salonID, &clientID, &info.ClientName, &info.Phone, &info.Email, &info.ItemName, &info.ExpiresAt); err != nil {
				continue
			}
			if info.Phone == "" {
				continue
			}
			a.Notifier.NotifyPackageExpiring(info)
			a.DB.ExecContext(ctx, `INSERT INTO sms_jobs (salon_id, client_id, job_type, phone, status) VALUES (?,?,?,?,'sent')`,
				salonID, clientID, "package_expiry_7d", info.Phone)
			slog.Info("package expiry alert sent", "client_id", clientID)
		}
	}
}

// ── Birthday greetings ────────────────────────────────────────────────────────

func (a *App) sendBirthdayGreetings(ctx context.Context) {
	// Match on month+day only, ignoring year
	rows, err := a.DB.QueryContext(ctx, `
		SELECT c.id, c.salon_id,
		       c.first_name, COALESCE(c.phone,''), COALESCE(c.email,'')
		FROM clients c
		WHERE c.date_of_birth IS NOT NULL
		  AND MONTH(c.date_of_birth) = MONTH(CURDATE())
		  AND DAY(c.date_of_birth) = DAY(CURDATE())
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.client_id = c.id AND sj.job_type = 'birthday'
		        AND DATE(sj.sent_at) = CURDATE()
		  )
	`)
	if err != nil {
		slog.Error("birthday query failed", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var clientID, salonID int64
		var name, phone, email string
		if err := rows.Scan(&clientID, &salonID, &name, &phone, &email); err != nil {
			continue
		}
		if phone == "" {
			continue
		}
		a.Notifier.NotifyBirthday(name, phone, email)
		a.DB.ExecContext(ctx, `INSERT INTO sms_jobs (salon_id, client_id, job_type, phone, status) VALUES (?,?,?,?,'sent')`,
			salonID, clientID, "birthday", phone)
		slog.Info("birthday greeting sent", "client_id", clientID)
	}
}

// ── Rebooking reminder (last visit >30 days, no future booking) ──────────────

func (a *App) sendRebookingReminders(ctx context.Context) {
	rows, err := a.DB.QueryContext(ctx, `
		SELECT c.id, c.salon_id,
		       c.first_name, COALESCE(c.phone,''), COALESCE(c.email,''),
		       COALESCE(s.name,'our services'), DATEDIFF(NOW(), c.last_visit_at)
		FROM clients c
		LEFT JOIN (
		    SELECT a.client_id, sv.name
		    FROM appointments a
		    JOIN appointment_services aps ON aps.appointment_id = a.id
		    JOIN services sv ON sv.id = aps.service_id
		    WHERE a.start_at = (
		        SELECT MAX(a2.start_at) FROM appointments a2
		        WHERE a2.client_id = a.client_id AND a2.status = 'completed'
		    )
		    GROUP BY a.client_id, sv.name
		    LIMIT 1
		) s ON s.client_id = c.id
		WHERE c.is_active = 1
		  AND c.last_visit_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
		  AND c.last_visit_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
		  AND NOT EXISTS (
		      SELECT 1 FROM appointments a2
		      WHERE a2.client_id = c.id AND a2.start_at > NOW()
		        AND a2.status NOT IN ('cancelled','no_show')
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.client_id = c.id AND sj.job_type = 'rebooking_reminder'
		        AND DATE(sj.sent_at) = CURDATE()
		  )
	`)
	if err != nil {
		slog.Error("rebooking reminder query failed", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var clientID, salonID int64
		var info notify.RetentionInfo
		if err := rows.Scan(&clientID, &salonID, &info.ClientName, &info.Phone, &info.Email, &info.ServiceName, &info.DaysSince); err != nil {
			continue
		}
		if info.Phone == "" {
			continue
		}
		info.BookingURL = a.AppURL + "/booking"
		a.Notifier.NotifyRebookingReminder(info)
		a.DB.ExecContext(ctx, `INSERT INTO sms_jobs (salon_id, client_id, job_type, phone, status) VALUES (?,?,?,?,'sent')`,
			salonID, clientID, "rebooking_reminder", info.Phone)
		slog.Info("rebooking reminder sent", "client_id", clientID)
	}
}

// ── Inactive customer alert (last visit >60 days) ────────────────────────────

func (a *App) sendInactiveCustomerAlerts(ctx context.Context) {
	rows, err := a.DB.QueryContext(ctx, `
		SELECT c.id, c.salon_id,
		       c.first_name, COALESCE(c.phone,''), COALESCE(c.email,''),
		       COALESCE(s.name,'our services'), DATEDIFF(NOW(), c.last_visit_at)
		FROM clients c
		LEFT JOIN (
		    SELECT a.client_id, sv.name
		    FROM appointments a
		    JOIN appointment_services aps ON aps.appointment_id = a.id
		    JOIN services sv ON sv.id = aps.service_id
		    WHERE a.start_at = (
		        SELECT MAX(a2.start_at) FROM appointments a2
		        WHERE a2.client_id = a.client_id AND a2.status = 'completed'
		    )
		    GROUP BY a.client_id, sv.name
		    LIMIT 1
		) s ON s.client_id = c.id
		WHERE c.is_active = 1
		  AND c.last_visit_at < DATE_SUB(NOW(), INTERVAL 60 DAY)
		  AND NOT EXISTS (
		      SELECT 1 FROM appointments a2
		      WHERE a2.client_id = c.id AND a2.start_at > NOW()
		        AND a2.status NOT IN ('cancelled','no_show')
		  )
		  AND NOT EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.client_id = c.id AND sj.job_type = 'inactive_customer'
		        AND sj.sent_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
		  )
	`)
	if err != nil {
		slog.Error("inactive customer query failed", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var clientID, salonID int64
		var info notify.RetentionInfo
		if err := rows.Scan(&clientID, &salonID, &info.ClientName, &info.Phone, &info.Email, &info.ServiceName, &info.DaysSince); err != nil {
			continue
		}
		if info.Phone == "" {
			continue
		}
		info.BookingURL = a.AppURL + "/booking"
		a.Notifier.NotifyInactiveCustomer(info)
		a.DB.ExecContext(ctx, `INSERT INTO sms_jobs (salon_id, client_id, job_type, phone, status) VALUES (?,?,?,?,'sent')`,
			salonID, clientID, "inactive_customer", info.Phone)
		slog.Info("inactive customer alert sent", "client_id", clientID)
	}
}
