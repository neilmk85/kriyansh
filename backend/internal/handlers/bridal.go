package handlers

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"time"
)

// Default milestone schedule (days before wedding date → label).
var defaultMilestones = []struct {
	DaysBefore int
	Label      string
}{
	{90, "Skin Preparation"},
	{60, "Hair Treatment"},
	{30, "Facial"},
	{7, "Final Grooming"},
	{1, "Touch-up"},
}

// ── Types ─────────────────────────────────────────────────────────────────────

type bridalJourney struct {
	ID          int              `json:"id"`
	SalonID     int              `json:"salon_id"`
	ClientID    int              `json:"client_id"`
	ClientName  string           `json:"client_name"`
	ClientPhone string           `json:"client_phone"`
	WeddingDate string           `json:"wedding_date"`
	DaysLeft    int              `json:"days_left"`
	Notes       string           `json:"notes"`
	Status      string           `json:"status"`
	CreatedAt   time.Time        `json:"created_at"`
	Milestones  []bridalMilestone `json:"milestones,omitempty"`
}

type bridalMilestone struct {
	ID            int    `json:"id"`
	JourneyID     int    `json:"journey_id"`
	DaysBefore    int    `json:"days_before"`
	Label         string `json:"label"`
	ScheduledDate string `json:"scheduled_date"`
	AppointmentID *int   `json:"appointment_id"`
	Status        string `json:"status"`
	ReminderSent  bool   `json:"reminder_sent"`
}

// ── List ──────────────────────────────────────────────────────────────────────

func (a *App) ListBridalJourneys(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT bj.id, bj.salon_id, bj.client_id,
		       CONCAT(c.first_name,' ',c.last_name),
		       COALESCE(c.phone,''),
		       bj.wedding_date, bj.notes, bj.status, bj.created_at,
		       DATEDIFF(bj.wedding_date, CURDATE())
		FROM bridal_journeys bj
		JOIN clients c ON c.id = bj.client_id
		WHERE bj.salon_id = ?
		ORDER BY bj.wedding_date ASC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var journeys []bridalJourney
	for rows.Next() {
		var j bridalJourney
		var wd time.Time
		rows.Scan(&j.ID, &j.SalonID, &j.ClientID, &j.ClientName, &j.ClientPhone,
			&wd, &j.Notes, &j.Status, &j.CreatedAt, &j.DaysLeft)
		j.WeddingDate = wd.Format("2006-01-02")
		journeys = append(journeys, j)
	}
	if journeys == nil {
		journeys = []bridalJourney{}
	}
	a.JSON(w, http.StatusOK, journeys)
}

// ── Get (with milestones) ────────────────────────────────────────────────────

func (a *App) GetBridalJourney(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var j bridalJourney
	var wd time.Time
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT bj.id, bj.salon_id, bj.client_id,
		       CONCAT(c.first_name,' ',c.last_name),
		       COALESCE(c.phone,''),
		       bj.wedding_date, bj.notes, bj.status, bj.created_at,
		       DATEDIFF(bj.wedding_date, CURDATE())
		FROM bridal_journeys bj
		JOIN clients c ON c.id = bj.client_id
		WHERE bj.id = ? AND bj.salon_id = ?`, id, claims.SalonID).
		Scan(&j.ID, &j.SalonID, &j.ClientID, &j.ClientName, &j.ClientPhone,
			&wd, &j.Notes, &j.Status, &j.CreatedAt, &j.DaysLeft)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "journey not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	j.WeddingDate = wd.Format("2006-01-02")

	mRows, err := a.DB.QueryContext(r.Context(), `
		SELECT id, journey_id, days_before, label, scheduled_date,
		       appointment_id, status, reminder_sent
		FROM bridal_milestones WHERE journey_id = ?
		ORDER BY days_before DESC`, id)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var m bridalMilestone
			var sd time.Time
			var sent int
			mRows.Scan(&m.ID, &m.JourneyID, &m.DaysBefore, &m.Label, &sd,
				&m.AppointmentID, &m.Status, &sent)
			m.ScheduledDate = sd.Format("2006-01-02")
			m.ReminderSent = sent == 1
			j.Milestones = append(j.Milestones, m)
		}
	}
	if j.Milestones == nil {
		j.Milestones = []bridalMilestone{}
	}

	a.JSON(w, http.StatusOK, j)
}

// ── Create ────────────────────────────────────────────────────────────────────

func (a *App) CreateBridalJourney(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		ClientID    int    `json:"client_id"`
		WeddingDate string `json:"wedding_date"` // YYYY-MM-DD
		Notes       string `json:"notes"`
	}
	if err := a.Decode(r, &body); err != nil || body.ClientID == 0 || body.WeddingDate == "" {
		a.Error(w, http.StatusBadRequest, "client_id and wedding_date required")
		return
	}

	weddingDate, err := time.Parse("2006-01-02", body.WeddingDate)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "wedding_date must be YYYY-MM-DD")
		return
	}
	if weddingDate.Before(time.Now().Add(7 * 24 * time.Hour)) {
		a.Error(w, http.StatusBadRequest, "wedding_date must be at least 7 days in the future")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO bridal_journeys (salon_id, client_id, wedding_date, notes)
		 VALUES (?,?,?,?)`,
		claims.SalonID, body.ClientID, weddingDate.Format("2006-01-02"), body.Notes)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	journeyID, _ := res.LastInsertId()

	// Insert default milestones
	for _, ms := range defaultMilestones {
		scheduledDate := weddingDate.AddDate(0, 0, -ms.DaysBefore)
		if scheduledDate.Before(time.Now()) {
			// Skip milestones that are already in the past
			continue
		}
		a.DB.ExecContext(r.Context(),
			`INSERT INTO bridal_milestones (journey_id, days_before, label, scheduled_date)
			 VALUES (?,?,?,?)`,
			journeyID, ms.DaysBefore, ms.Label, scheduledDate.Format("2006-01-02"))
	}

	// Notify client via WhatsApp
	go a.notifyBridalJourneyCreated(context.Background(), int(journeyID), claims.SalonID)

	a.JSON(w, http.StatusCreated, map[string]any{
		"id":      journeyID,
		"status":  "active",
		"message": "Bridal journey created with milestone schedule",
	})
}

// ── Update milestone status ───────────────────────────────────────────────────

func (a *App) UpdateBridalMilestone(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	journeyID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid journey id")
		return
	}
	milestoneID, err := pathID(r, "mid")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid milestone id")
		return
	}

	var body struct {
		Status        string `json:"status"`
		AppointmentID *int   `json:"appointment_id"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Verify milestone belongs to a journey owned by this salon
	var check int
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM bridal_milestones bm
		JOIN bridal_journeys bj ON bj.id = bm.journey_id
		WHERE bm.id=? AND bm.journey_id=? AND bj.salon_id=?`,
		milestoneID, journeyID, claims.SalonID).Scan(&check)
	if err != nil || check == 0 {
		a.Error(w, http.StatusNotFound, "milestone not found")
		return
	}

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE bridal_milestones SET status=?, appointment_id=? WHERE id=?`,
		body.Status, body.AppointmentID, milestoneID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}

// ── Cancel journey ────────────────────────────────────────────────────────────

func (a *App) CancelBridalJourney(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE bridal_journeys SET status='cancelled' WHERE id=? AND salon_id=?`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "journey not found")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"cancelled": true})
}

// ── Notification helpers ──────────────────────────────────────────────────────

func (a *App) notifyBridalJourneyCreated(ctx context.Context, journeyID int, salonID uint) {
	var clientName, phone, weddingDateStr string
	err := a.DB.QueryRowContext(ctx, `
		SELECT c.first_name, COALESCE(c.phone,''), bj.wedding_date
		FROM bridal_journeys bj JOIN clients c ON c.id = bj.client_id
		WHERE bj.id = ?`, journeyID).
		Scan(&clientName, &phone, &weddingDateStr)
	if err != nil || phone == "" {
		return
	}
	wd, _ := time.Parse("2006-01-02", weddingDateStr)
	msg := "💍 Hi " + clientName + "! Your bridal journey at Kriyansh Beauty Bar has been set up for your wedding on " +
		wd.Format("2 January 2006") + ".\n\n" +
		"Your personalised milestone schedule:\n" +
		"• 90 days: Skin Preparation\n" +
		"• 60 days: Hair Treatment\n" +
		"• 30 days: Facial\n" +
		"• 7 days: Final Grooming\n" +
		"• 1 day: Touch-up\n\n" +
		"We'll remind you before each session. Congratulations! 🌸"
	a.Notifier.SendSMS(phone, msg)
	if a.Notifier.HasWhatsApp() {
		a.Notifier.SendWhatsApp(phone, msg)
	}
}

// sendBridalMilestoneReminders is called by the reminder loop.
// Fires day-before reminders for milestones due tomorrow.
func (a *App) sendBridalMilestoneReminders(ctx context.Context) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	rows, err := a.DB.QueryContext(ctx, `
		SELECT bm.id, bj.salon_id,
		       c.first_name, COALESCE(c.phone,''),
		       bm.label, bm.scheduled_date, bm.days_before
		FROM bridal_milestones bm
		JOIN bridal_journeys bj ON bj.id = bm.journey_id
		JOIN clients c ON c.id = bj.client_id
		WHERE bm.scheduled_date = ?
		  AND bm.status = 'pending'
		  AND bm.reminder_sent = 0
		  AND bj.status = 'active'`, tomorrow)
	if err != nil {
		slog.Error("bridal milestone reminder query failed", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var milestoneID, salonID int
		var clientName, phone, label, dateStr string
		var daysBefore int
		if err := rows.Scan(&milestoneID, &salonID, &clientName, &phone, &label, &dateStr, &daysBefore); err != nil {
			continue
		}
		if phone == "" {
			continue
		}
		sd, _ := time.Parse("2006-01-02", dateStr)
		msg := "💍 Hi " + clientName + "! A reminder: your *" + label + "* appointment is scheduled for tomorrow, " +
			sd.Format("2 January") + " — " + daysLabel(daysBefore) + " before your wedding day. " +
			"Please call us to confirm your slot! 🌸"
		a.Notifier.SendSMS(phone, msg)
		if a.Notifier.HasWhatsApp() {
			a.Notifier.SendWhatsApp(phone, msg)
		}
		a.DB.ExecContext(ctx, `UPDATE bridal_milestones SET reminder_sent=1 WHERE id=?`, milestoneID)
		slog.Info("bridal milestone reminder sent", "milestone_id", milestoneID, "client", clientName)
	}
}

func daysLabel(days int) string {
	switch days {
	case 1:
		return "1 day"
	case 7:
		return "1 week"
	case 30:
		return "1 month"
	case 60:
		return "2 months"
	case 90:
		return "3 months"
	default:
		return ""
	}
}
