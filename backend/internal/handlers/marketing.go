package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

type marketingCampaign struct {
	ID        uint       `json:"id"`
	SalonID   uint       `json:"salon_id"`
	Name      string     `json:"name"`
	Segment   string     `json:"segment"`
	Channel   string     `json:"channel"`
	Message   string     `json:"message"`
	Status    string     `json:"status"`
	SentCount int        `json:"sent_count"`
	SentAt    *time.Time `json:"sent_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func (a *App) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, segment, channel, message, status, sent_count, sent_at, created_at
		 FROM marketing_campaigns WHERE salon_id=? ORDER BY created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var campaigns []marketingCampaign
	for rows.Next() {
		var c marketingCampaign
		rows.Scan(&c.ID, &c.SalonID, &c.Name, &c.Segment, &c.Channel,
			&c.Message, &c.Status, &c.SentCount, &c.SentAt, &c.CreatedAt)
		campaigns = append(campaigns, c)
	}
	if campaigns == nil {
		campaigns = []marketingCampaign{}
	}
	a.JSON(w, http.StatusOK, campaigns)
}

func (a *App) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		Name    string `json:"name"`
		Segment string `json:"segment"`
		Channel string `json:"channel"`
		Message string `json:"message"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" || body.Message == "" {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Segment == "" {
		body.Segment = "all"
	}
	if body.Channel == "" {
		body.Channel = "sms"
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO marketing_campaigns (salon_id, name, segment, channel, message, status)
		 VALUES (?,?,?,?,?,'draft')`,
		claims.SalonID, body.Name, body.Segment, body.Channel, body.Message)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{
		"id":      id,
		"status":  "draft",
		"name":    body.Name,
		"segment": body.Segment,
		"channel": body.Channel,
		"message": body.Message,
	})
}

func (a *App) GetSegmentCount(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	segment := r.PathValue("segment")

	var count int
	var err error

	switch segment {
	case "all":
		err = a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients WHERE salon_id=? AND is_active=1`, claims.SalonID).Scan(&count)
	case "vip":
		err = a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1
			   AND total_spend > (SELECT AVG(total_spend)*2 FROM clients WHERE salon_id=?)`,
			claims.SalonID, claims.SalonID).Scan(&count)
	case "at_risk":
		err = a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1
			   AND last_visit_at IS NOT NULL
			   AND last_visit_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
			   AND last_visit_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)`,
			claims.SalonID).Scan(&count)
	case "lapsed":
		err = a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1
			   AND last_visit_at < DATE_SUB(NOW(), INTERVAL 60 DAY)`,
			claims.SalonID).Scan(&count)
	case "new":
		err = a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1 AND total_visits <= 2`,
			claims.SalonID).Scan(&count)
	case "regular":
		err = a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1 AND total_visits > 2`,
			claims.SalonID).Scan(&count)
	default:
		a.Error(w, http.StatusBadRequest, "unknown segment")
		return
	}

	if err != nil && err != sql.ErrNoRows {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"segment": segment, "count": count})
}

func (a *App) SendCampaign(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Get campaign
	var segment string
	var status string
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT segment, status FROM marketing_campaigns WHERE id=? AND salon_id=?`,
		id, claims.SalonID).Scan(&segment, &status)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Get segment count by reusing the same logic
	var count int
	switch segment {
	case "all":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients WHERE salon_id=? AND is_active=1`, claims.SalonID).Scan(&count)
	case "vip":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1
			   AND total_spend > (SELECT AVG(total_spend)*2 FROM clients WHERE salon_id=?)`,
			claims.SalonID, claims.SalonID).Scan(&count)
	case "at_risk":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1
			   AND last_visit_at IS NOT NULL
			   AND last_visit_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
			   AND last_visit_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)`,
			claims.SalonID).Scan(&count)
	case "lapsed":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1
			   AND last_visit_at < DATE_SUB(NOW(), INTERVAL 60 DAY)`,
			claims.SalonID).Scan(&count)
	case "new":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1 AND total_visits <= 2`,
			claims.SalonID).Scan(&count)
	case "regular":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1 AND total_visits > 2`,
			claims.SalonID).Scan(&count)
	}

	now := time.Now().UTC()
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE marketing_campaigns SET status='sent', sent_count=?, sent_at=? WHERE id=? AND salon_id=?`,
		count, now, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"sent": true, "sent_count": count})
}
