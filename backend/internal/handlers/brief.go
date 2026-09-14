package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// ── Structs ───────────────────────────────────────────────────────────────────

type BriefInsight struct {
	Priority string `json:"priority"` // "red" | "yellow" | "fyi"
	Emoji    string `json:"emoji"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	Action   string `json:"action,omitempty"` // deep-link label
	ActionURL string `json:"action_url,omitempty"`
}

type DailyBriefData struct {
	SalonID    int            `json:"salon_id"`
	Date       string         `json:"date"`         // YYYY-MM-DD
	SalonName  string         `json:"salon_name"`
	Insights   []BriefInsight `json:"insights"`
	GeneratedAt time.Time     `json:"generated_at"`

	// Snapshot stats for dashboard display
	YesterdayRevenue  float64 `json:"yesterday_revenue"`
	LastWeekSameDay   float64 `json:"last_week_same_day"`
	TodayAppointments int     `json:"today_appointments"`
	EmptySlots48h     int     `json:"empty_slots_48h"`
	UnrespondedBadReviews int `json:"unresponded_bad_reviews"`
	RebookingDue      int     `json:"rebooking_due"`
	ExpiringMemberships int   `json:"expiring_memberships"`
	ExpiringPackages  int     `json:"expiring_packages"`
	BirthdayClients   int     `json:"birthday_clients"`
}

// ── Rules engine ─────────────────────────────────────────────────────────────

func (a *App) assembleBrief(ctx context.Context, salonID int, salonName string) DailyBriefData {
	now := time.Now()
	today := now.Format("2006-01-02")
	yesterday := now.AddDate(0, 0, -1).Format("2006-01-02")
	lastWeekSameDay := now.AddDate(0, 0, -7).Format("2006-01-02")
	in7Days := now.AddDate(0, 0, 7).Format("2006-01-02")
	next48h := now.Add(48 * time.Hour)

	data := DailyBriefData{
		SalonID:     salonID,
		Date:        today,
		SalonName:   salonName,
		GeneratedAt: now,
	}

	// ── 1. Yesterday's revenue vs same day last week ──────────────────────────
	var yestRevenue, lastWeekRevenue float64
	a.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(total_amount),0) FROM transactions
		WHERE salon_id=? AND DATE(created_at)=? AND status='completed'
	`, salonID, yesterday).Scan(&yestRevenue)
	a.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(total_amount),0) FROM transactions
		WHERE salon_id=? AND DATE(created_at)=? AND status='completed'
	`, salonID, lastWeekSameDay).Scan(&lastWeekRevenue)

	data.YesterdayRevenue = yestRevenue
	data.LastWeekSameDay = lastWeekRevenue

	pctChange := 0.0
	if lastWeekRevenue > 0 {
		pctChange = ((yestRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
	}
	if yestRevenue > 0 || lastWeekRevenue > 0 {
		dir, arrow := "up", "📈"
		if pctChange < 0 {
			dir, arrow = "down", "📉"
		}
		body := fmt.Sprintf("Yesterday: $%.0f | Same day last week: $%.0f (%.0f%% %s)",
			yestRevenue, lastWeekRevenue, abs(pctChange), dir)
		priority := "fyi"
		if pctChange <= -20 {
			priority = "yellow"
		}
		data.Insights = append(data.Insights, BriefInsight{
			Priority: priority,
			Emoji:    arrow,
			Title:    "Revenue Yesterday",
			Body:     body,
			Action:   "View Reports",
			ActionURL: "/admin/reports",
		})
	}

	// ── 2. Today's appointment count ─────────────────────────────────────────
	var todayAppts int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM appointments
		WHERE salon_id=? AND DATE(start_at)=? AND status NOT IN ('cancelled','no_show')
	`, salonID, today).Scan(&todayAppts)
	data.TodayAppointments = todayAppts
	data.Insights = append(data.Insights, BriefInsight{
		Priority:  "fyi",
		Emoji:     "📅",
		Title:     "Today's Appointments",
		Body:      fmt.Sprintf("%d appointments scheduled for today", todayAppts),
		Action:    "View Schedule",
		ActionURL: "/admin/appointments",
	})

	// ── 3. Empty slots next 48h (staff scheduled, no appointment in that hour) ─
	var emptySlots int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM (
			SELECT DATE_FORMAT(slot, '%Y-%m-%d %H') AS hour_slot
			FROM (
				SELECT ? + INTERVAL seq HOUR AS slot
				FROM (
					SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
					UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
					UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
					UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
					UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
					UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
					UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27
					UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION SELECT 31
					UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35
					UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39
					UNION SELECT 40 UNION SELECT 41 UNION SELECT 42 UNION SELECT 43
					UNION SELECT 44 UNION SELECT 45 UNION SELECT 46 UNION SELECT 47
				) seqs
			) slots
			WHERE slot BETWEEN NOW() AND ?
			  AND HOUR(slot) BETWEEN 9 AND 19
			  AND EXISTS (
			      SELECT 1 FROM staff_profiles sp
			      WHERE sp.salon_id = ?
			        AND sp.is_active = 1
			  )
			  AND NOT EXISTS (
			      SELECT 1 FROM appointments a
			      WHERE a.salon_id = ?
			        AND a.start_at BETWEEN slot AND slot + INTERVAL 59 MINUTE
			        AND a.status NOT IN ('cancelled','no_show')
			  )
		) free_hours
	`, now, next48h, salonID, salonID).Scan(&emptySlots)
	data.EmptySlots48h = emptySlots
	if emptySlots > 0 {
		priority := "yellow"
		if emptySlots >= 6 {
			priority = "red"
		}
		data.Insights = append(data.Insights, BriefInsight{
			Priority:  priority,
			Emoji:     "🕐",
			Title:     "Empty Slots (Next 48h)",
			Body:      fmt.Sprintf("%d open hours in the next 48h — consider running a last-minute offer or calling rebooking clients", emptySlots),
			Action:    "Send Campaign",
			ActionURL: "/admin/marketing/new",
		})
	}

	// ── 4. Clients due for rebooking (30-60 days, no future booking) ─────────
	var rebookingDue int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM clients c
		WHERE c.salon_id=?
		  AND c.is_active=1
		  AND c.last_visit_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
		  AND c.last_visit_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
		  AND NOT EXISTS (
		      SELECT 1 FROM appointments a
		      WHERE a.client_id=c.id AND a.start_at > NOW()
		        AND a.status NOT IN ('cancelled','no_show')
		  )
	`, salonID).Scan(&rebookingDue)
	data.RebookingDue = rebookingDue
	if rebookingDue > 0 {
		data.Insights = append(data.Insights, BriefInsight{
			Priority:  "yellow",
			Emoji:     "🔄",
			Title:     "Clients Due for Rebooking",
			Body:      fmt.Sprintf("%d clients haven't been in 30-60 days and have no upcoming appointment — send them a friendly nudge", rebookingDue),
			Action:    "View Clients",
			ActionURL: "/admin/clients/segments",
		})
	}

	// ── 5. Memberships expiring in 7 days ────────────────────────────────────
	var expiringMem int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM client_memberships cm
		WHERE cm.salon_id=? AND cm.status='active'
		  AND cm.expires_at BETWEEN CURDATE() AND ?
	`, salonID, in7Days).Scan(&expiringMem)
	data.ExpiringMemberships = expiringMem
	if expiringMem > 0 {
		priority := "yellow"
		if expiringMem >= 3 {
			priority = "red"
		}
		data.Insights = append(data.Insights, BriefInsight{
			Priority:  priority,
			Emoji:     "⏰",
			Title:     "Memberships Expiring Soon",
			Body:      fmt.Sprintf("%d membership(s) expiring within 7 days — call clients to renew before they lapse", expiringMem),
			Action:    "View Memberships",
			ActionURL: "/admin/memberships",
		})
	}

	// ── 6. Packages expiring in 7 days ───────────────────────────────────────
	var expiringPkg int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM client_packages cp
		WHERE cp.salon_id=? AND cp.status='active'
		  AND cp.expires_at BETWEEN CURDATE() AND ?
	`, salonID, in7Days).Scan(&expiringPkg)
	data.ExpiringPackages = expiringPkg
	if expiringPkg > 0 {
		data.Insights = append(data.Insights, BriefInsight{
			Priority:  "yellow",
			Emoji:     "📦",
			Title:     "Packages Expiring Soon",
			Body:      fmt.Sprintf("%d package(s) expiring within 7 days — remind clients to use remaining sessions", expiringPkg),
			Action:    "View Packages",
			ActionURL: "/admin/packages",
		})
	}

	// ── 7. Unresponded reviews with rating ≤ 3 ───────────────────────────────
	var badReviews int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM reviews r
		WHERE r.salon_id=? AND r.rating<=3
		  AND (r.owner_response IS NULL OR r.owner_response='')
	`, salonID).Scan(&badReviews)
	data.UnrespondedBadReviews = badReviews
	if badReviews > 0 {
		data.Insights = append(data.Insights, BriefInsight{
			Priority:  "red",
			Emoji:     "⭐",
			Title:     "Unresponded Low Ratings",
			Body:      fmt.Sprintf("%d negative review(s) waiting for your response — ignoring them damages your reputation", badReviews),
			Action:    "View Reviews",
			ActionURL: "/admin/reputation",
		})
	}

	// ── 8. Birthday clients today ────────────────────────────────────────────
	var birthdays int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM clients c
		WHERE c.salon_id=?
		  AND c.date_of_birth IS NOT NULL
		  AND MONTH(c.date_of_birth)=MONTH(CURDATE())
		  AND DAY(c.date_of_birth)=DAY(CURDATE())
	`, salonID).Scan(&birthdays)
	data.BirthdayClients = birthdays
	if birthdays > 0 {
		data.Insights = append(data.Insights, BriefInsight{
			Priority:  "fyi",
			Emoji:     "🎂",
			Title:     "Birthday Clients Today",
			Body:      fmt.Sprintf("%d client(s) have a birthday today — a personal message or discount goes a long way", birthdays),
			Action:    "View Clients",
			ActionURL: "/admin/clients",
		})
	}

	// ── 9. Closed-loop: did yesterday's rebooking nudge result in a new booking? ─
	// Count bookings created in the last 24h for clients who had no future booking yesterday
	var newBookingsFromNudge int
	a.DB.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM appointments a
		JOIN clients c ON c.id = a.client_id
		WHERE a.salon_id=?
		  AND a.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
		  AND a.status NOT IN ('cancelled','no_show')
		  AND EXISTS (
		      SELECT 1 FROM sms_jobs sj
		      WHERE sj.client_id = c.id
		        AND sj.job_type = 'rebooking_reminder'
		        AND DATE(sj.sent_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
		  )
	`, salonID).Scan(&newBookingsFromNudge)
	if newBookingsFromNudge > 0 {
		data.Insights = append(data.Insights, BriefInsight{
			Priority: "fyi",
			Emoji:    "✅",
			Title:    "Rebooking Nudge Worked!",
			Body:     fmt.Sprintf("%d client(s) booked after yesterday's rebooking reminder — great momentum!", newBookingsFromNudge),
		})
	}

	return data
}

// ── WhatsApp formatter ────────────────────────────────────────────────────────

func formatBriefWhatsApp(data DailyBriefData) string {
	dayName := time.Now().Format("Monday")
	var sb strings.Builder
	fmt.Fprintf(&sb, "*📊 Daily Business Brief — %s*\n", dayName)
	fmt.Fprintf(&sb, "_%s_\n\n", data.SalonName)

	redItems := filterInsights(data.Insights, "red")
	yellowItems := filterInsights(data.Insights, "yellow")
	fyiItems := filterInsights(data.Insights, "fyi")

	if len(redItems) > 0 {
		sb.WriteString("*🔴 Act Today*\n")
		for _, ins := range redItems {
			fmt.Fprintf(&sb, "%s *%s*\n%s\n\n", ins.Emoji, ins.Title, ins.Body)
		}
	}
	if len(yellowItems) > 0 {
		sb.WriteString("*🟡 This Week*\n")
		for _, ins := range yellowItems {
			fmt.Fprintf(&sb, "%s *%s*\n%s\n\n", ins.Emoji, ins.Title, ins.Body)
		}
	}
	if len(fyiItems) > 0 {
		sb.WriteString("*💡 FYI*\n")
		for _, ins := range fyiItems {
			fmt.Fprintf(&sb, "%s *%s*\n%s\n\n", ins.Emoji, ins.Title, ins.Body)
		}
	}

	sb.WriteString("_Reply HELP for support_")
	return sb.String()
}

func filterInsights(ins []BriefInsight, priority string) []BriefInsight {
	var out []BriefInsight
	for _, i := range ins {
		if i.Priority == priority {
			out = append(out, i)
		}
	}
	return out
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

// ── Save + send ───────────────────────────────────────────────────────────────

func (a *App) saveBrief(ctx context.Context, salonID int, data DailyBriefData) error {
	b, err := json.Marshal(data.Insights)
	if err != nil {
		return err
	}
	_, err = a.DB.ExecContext(ctx, `
		INSERT INTO daily_briefs (salon_id, brief_date, insights)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE insights=VALUES(insights)
	`, salonID, data.Date, string(b))
	return err
}

func (a *App) markBriefSent(ctx context.Context, salonID int, date string) {
	a.DB.ExecContext(ctx, `
		UPDATE daily_briefs SET whatsapp_sent=1, sent_at=NOW()
		WHERE salon_id=? AND brief_date=?
	`, salonID, date)
}

// ── Daily Brief Loop ─────────────────────────────────────────────────────────

func (a *App) RunDailyBriefLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(60 * time.Second):
			a.dispatchDailyBriefs(ctx)
		}
	}
}

func (a *App) dispatchDailyBriefs(ctx context.Context) {
	// Query all active salons with their timezone and owner WhatsApp
	rows, err := a.DB.QueryContext(ctx, `
		SELECT s.id, COALESCE(ss.name,'Salon'), COALESCE(ss.timezone,'UTC'),
		       COALESCE(ss.owner_whatsapp, ss.phone, '')
		FROM salons s
		LEFT JOIN salon_settings ss ON ss.salon_id = s.id
		WHERE s.is_active = 1
	`)
	if err != nil {
		slog.Error("daily brief: salon query failed", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var salonID int
		var salonName, tz, ownerPhone string
		if err := rows.Scan(&salonID, &salonName, &tz, &ownerPhone); err != nil {
			continue
		}

		loc, err := time.LoadLocation(tz)
		if err != nil {
			loc = time.UTC
		}
		localNow := time.Now().In(loc)

		// Only fire between 08:00 and 08:59 local time
		if localNow.Hour() != 8 {
			continue
		}

		today := localNow.Format("2006-01-02")

		// Check if already sent today
		var alreadySent int
		a.DB.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM daily_briefs WHERE salon_id=? AND brief_date=? AND whatsapp_sent=1
		`, salonID, today).Scan(&alreadySent)
		if alreadySent > 0 {
			continue
		}

		data := a.assembleBrief(ctx, salonID, salonName)
		if err := a.saveBrief(ctx, salonID, data); err != nil {
			slog.Error("daily brief: save failed", "salon_id", salonID, "error", err)
			continue
		}

		if ownerPhone != "" && a.Notifier.HasWhatsApp() {
			msg := formatBriefWhatsApp(data)
			a.Notifier.SendWhatsApp(ownerPhone, msg)
			a.markBriefSent(ctx, salonID, today)
			slog.Info("daily brief sent via WhatsApp", "salon_id", salonID, "phone", ownerPhone)
		} else {
			slog.Info("daily brief assembled (no WA number configured)", "salon_id", salonID)
		}
	}
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────

// GetDailyBrief GET /api/v1/brief/daily — returns today's brief (assembles fresh if not yet stored)
func (a *App) GetDailyBrief(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	salonID := int(claims.SalonID)
	today := time.Now().Format("2006-01-02")

	var salonName string
	a.DB.QueryRowContext(r.Context(), `SELECT COALESCE(name,'Salon') FROM salon_settings WHERE salon_id=?`, salonID).Scan(&salonName)

	// Try to load stored insights from DB (today's brief may already be assembled)
	var insightsJSON string
	err := a.DB.QueryRowContext(r.Context(), `
		SELECT insights FROM daily_briefs WHERE salon_id=? AND brief_date=?
	`, salonID, today).Scan(&insightsJSON)

	data := a.assembleBrief(r.Context(), salonID, salonName)
	if err == nil {
		// Use stored insights but live KPI stats
		var stored []BriefInsight
		if json.Unmarshal([]byte(insightsJSON), &stored) == nil {
			data.Insights = stored
		}
	} else {
		a.saveBrief(r.Context(), salonID, data) //nolint
	}
	a.JSON(w, http.StatusOK, data)
}

// GetBriefHistory GET /api/v1/brief/history — last 30 briefs
func (a *App) GetBriefHistory(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	salonID := int(claims.SalonID)

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT brief_date, insights, whatsapp_sent, COALESCE(sent_at,'') FROM daily_briefs
		WHERE salon_id=?
		ORDER BY brief_date DESC LIMIT 30
	`, salonID)
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type HistoryEntry struct {
		Date         string         `json:"date"`
		Insights     []BriefInsight `json:"insights"`
		WhatsAppSent bool           `json:"whatsapp_sent"`
		SentAt       string         `json:"sent_at"`
	}
	var history []HistoryEntry
	for rows.Next() {
		var e HistoryEntry
		var insJSON string
		var sent int
		if err := rows.Scan(&e.Date, &insJSON, &sent, &e.SentAt); err != nil {
			continue
		}
		e.WhatsAppSent = sent == 1
		json.Unmarshal([]byte(insJSON), &e.Insights)
		history = append(history, e)
	}
	if history == nil {
		history = []HistoryEntry{}
	}
	a.JSON(w, http.StatusOK, history)
}
