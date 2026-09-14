package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"salonos/internal/notify"
)

// ── Public: customer submits a review ─────────────────────────────────────────

// GetReviewPage GET /api/public/review/:token
// Returns enough info to render the rating page (salon name, whether already submitted).
func (a *App) GetReviewPage(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")

	var salonID int
	var clientID int
	var status string
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT rr.salon_id, rr.client_id, rr.status
		 FROM review_requests rr WHERE rr.token = ?`, token).
		Scan(&salonID, &clientID, &status)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "review link not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Check if already responded
	var alreadyDone bool
	var existingRating int
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT rating FROM review_responses WHERE review_request_id =
		 (SELECT id FROM review_requests WHERE token = ?)`, token).
		Scan(&existingRating)
	if existingRating > 0 {
		alreadyDone = true
	}

	var salonName, yelpURL, googleURL string
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(name,''), COALESCE(yelp_url,''), COALESCE(google_review_url,'')
		 FROM salon_settings WHERE salon_id = ?`, salonID).
		Scan(&salonName, &yelpURL, &googleURL)

	var clientName string
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT CONCAT(first_name,' ',last_name) FROM clients WHERE id = ?`, clientID).
		Scan(&clientName)

	a.JSON(w, http.StatusOK, map[string]any{
		"salon_name":        salonName,
		"client_name":       clientName,
		"yelp_url":          yelpURL,
		"google_review_url": googleURL,
		"already_submitted": alreadyDone,
		"existing_rating":   existingRating,
	})
}

// SubmitReview POST /api/public/review/:token
func (a *App) SubmitReview(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")

	var req struct {
		Rating  int    `json:"rating"`
		Comment string `json:"comment"`
	}
	if err := a.Decode(r, &req); err != nil || req.Rating < 1 || req.Rating > 5 {
		a.Error(w, http.StatusBadRequest, "rating must be 1–5")
		return
	}

	var reqID, salonID, clientID int
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, client_id FROM review_requests WHERE token = ?`, token).
		Scan(&reqID, &salonID, &clientID)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "review link not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Idempotent — ignore if already submitted
	var existing int
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM review_responses WHERE review_request_id = ?`, reqID).Scan(&existing)
	if existing > 0 {
		a.JSON(w, http.StatusOK, map[string]any{"already_submitted": true})
		return
	}

	isPublic := req.Rating >= 4
	_, err = a.DB.ExecContext(r.Context(),
		`INSERT INTO review_responses (review_request_id, salon_id, client_id, rating, comment, is_public)
		 VALUES (?,?,?,?,?,?)`,
		reqID, salonID, clientID, req.Rating, req.Comment, isPublic)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Return redirect URLs so frontend can send high-raters to Yelp/Google
	var yelpURL, googleURL string
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(yelp_url,''), COALESCE(google_review_url,'')
		 FROM salon_settings WHERE salon_id = ?`, salonID).
		Scan(&yelpURL, &googleURL)

	a.JSON(w, http.StatusCreated, map[string]any{
		"rating":            req.Rating,
		"is_public":         isPublic,
		"yelp_url":          yelpURL,
		"google_review_url": googleURL,
	})
}

// ── Internal: list private feedback for the dashboard ─────────────────────────

// ListReviewResponses GET /api/reviews  (auth required)
func (a *App) ListReviewResponses(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT rr2.rating, COALESCE(rr2.comment,''), rr2.is_public,
		        CONCAT(c.first_name,' ',c.last_name) as client_name,
		        rr2.created_at
		 FROM review_responses rr2
		 JOIN review_requests rr ON rr.id = rr2.review_request_id
		 JOIN clients c ON c.id = rr2.client_id
		 WHERE rr2.salon_id = ?
		 ORDER BY rr2.created_at DESC
		 LIMIT 50`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type ReviewItem struct {
		Rating     int       `json:"rating"`
		Comment    string    `json:"comment"`
		IsPublic   bool      `json:"is_public"`
		ClientName string    `json:"client_name"`
		CreatedAt  time.Time `json:"created_at"`
	}
	var items []ReviewItem
	for rows.Next() {
		var it ReviewItem
		rows.Scan(&it.Rating, &it.Comment, &it.IsPublic, &it.ClientName, &it.CreatedAt)
		items = append(items, it)
	}
	if items == nil {
		items = []ReviewItem{}
	}
	a.JSON(w, http.StatusOK, items)
}

// RespondToReview PUT /api/reviews/{id}/respond  (auth required)
// Saves or updates the owner's public response to a review.
func (a *App) RespondToReview(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	reviewID := r.PathValue("id")

	var req struct {
		Response string `json:"response"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid request")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE review_responses SET owner_response = ? WHERE id = ? AND salon_id = ?`,
		req.Response, reviewID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		a.Error(w, http.StatusNotFound, "review not found")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ── Background worker ─────────────────────────────────────────────────────────

// ScheduleReviewRequest inserts a pending review_request row after a transaction.
// Called from CreateTransaction when a client is attached.
func (a *App) ScheduleReviewRequest(ctx context.Context, salonID uint, clientID uint, txnID int64) {
	// Read delay hours and channel from salon_settings
	var delayHours int
	var channel string
	var enabled bool
	err := a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(review_enabled,0), COALESCE(review_channel,'sms'), COALESCE(review_delay_hours,2)
		 FROM salon_settings WHERE salon_id = ?`, salonID).
		Scan(&enabled, &channel, &delayHours)
	if err != nil || !enabled {
		return
	}

	token, err := generateToken()
	if err != nil {
		slog.Error("review token generation failed", "error", err)
		return
	}

	sendAfter := time.Now().Add(time.Duration(delayHours) * time.Hour)
	_, err = a.DB.ExecContext(ctx,
		`INSERT INTO review_requests (salon_id, client_id, transaction_id, token, channel, status, send_after)
		 VALUES (?,?,?,?,?,?,?)`,
		salonID, clientID, txnID, token, channel, "scheduled", sendAfter)
	if err != nil {
		slog.Error("failed to schedule review request", "error", err)
	}
}

// RunReviewSender polls every 60 s and dispatches any due review requests.
// Start this in a goroutine from main.go.
func (a *App) RunReviewSender(appURL string) {
	for {
		time.Sleep(60 * time.Second)
		a.dispatchDueReviews(appURL)
	}
}

func (a *App) dispatchDueReviews(appURL string) {
	rows, err := a.DB.Query(
		`SELECT rr.id, rr.salon_id, rr.client_id, rr.token, rr.channel
		 FROM review_requests rr
		 WHERE rr.status = 'scheduled' AND rr.send_after <= NOW()
		 LIMIT 20`)
	if err != nil {
		slog.Error("review dispatch query failed", "error", err)
		return
	}
	defer rows.Close()

	type pending struct {
		id       int
		salonID  int
		clientID int
		token    string
		channel  string
	}
	var queue []pending
	for rows.Next() {
		var p pending
		rows.Scan(&p.id, &p.salonID, &p.clientID, &p.token, &p.channel)
		queue = append(queue, p)
	}
	rows.Close()

	for _, p := range queue {
		// Fetch client phone + email
		var phone, email, firstName, lastName string
		_ = a.DB.QueryRow(
			`SELECT COALESCE(phone,''), COALESCE(email,''), first_name, last_name
			 FROM clients WHERE id = ?`, p.clientID).
			Scan(&phone, &email, &firstName, &lastName)
		clientName := firstName + " " + lastName

		// Fetch salon name
		var salonName string
		_ = a.DB.QueryRow(
			`SELECT COALESCE(name,'Kriyansh Salon') FROM salon_settings WHERE salon_id = ?`, p.salonID).
			Scan(&salonName)

		reviewURL := appURL + "/review/" + p.token
		status := "sent"

		if phone == "" && email == "" {
			status = "failed"
			slog.Warn("review skipped — no contact info", "client_id", p.clientID)
		} else {
			a.Notifier.SendReviewRequest(
				notify.Channel(p.channel),
				phone, email, clientName, salonName, reviewURL,
			)
		}

		_, _ = a.DB.Exec(
			`UPDATE review_requests SET status=?, sent_at=NOW() WHERE id=?`, status, p.id)
	}
}

// ── Admin: Online Reputation dashboard ───────────────────────────────────────

// GetOnlineReputation GET /api/reputation
// Returns aggregated review stats + per-review list for the salon.
func (a *App) GetOnlineReputation(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	// review_responses has salon_id directly — use it for all queries
	var avgRating float64
	var total int
	_ = a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(rating),0), COUNT(*)
		 FROM review_responses
		 WHERE salon_id = ? AND is_public = 1`, sid).
		Scan(&avgRating, &total)

	distRows, err := a.DB.QueryContext(ctx,
		`SELECT rating, COUNT(*) as cnt
		 FROM review_responses
		 WHERE salon_id = ? AND is_public = 1
		 GROUP BY rating`, sid)
	dist := map[string]int{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
	if err == nil {
		defer distRows.Close()
		for distRows.Next() {
			var star, cnt int
			if distRows.Scan(&star, &cnt) == nil {
				dist[fmt.Sprintf("%d", star)] = cnt
			}
		}
	}

	type reviewRow struct {
		ID            int    `json:"id"`
		ClientName    string `json:"client_name"`
		Rating        int    `json:"rating"`
		Comment       string `json:"comment"`
		CreatedAt     string `json:"created_at"`
		Service       string `json:"service"`
		OwnerResponse string `json:"owner_response"`
	}

	rows, err := a.DB.QueryContext(ctx,
		`SELECT rr.id,
		        CONCAT(c.first_name, ' ', LEFT(c.last_name,1), '.') AS client_name,
		        rr.rating,
		        COALESCE(rr.comment,''),
		        DATE_FORMAT(rr.created_at,'%Y-%m-%d'),
		        '',
		        COALESCE(rr.owner_response,'')
		 FROM review_responses rr
		 JOIN clients c ON c.id = rr.client_id
		 WHERE rr.salon_id = ? AND rr.is_public = 1
		 ORDER BY rr.created_at DESC`, sid)
	var reviews []reviewRow
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var rv reviewRow
			if rows.Scan(&rv.ID, &rv.ClientName, &rv.Rating, &rv.Comment, &rv.CreatedAt, &rv.Service, &rv.OwnerResponse) == nil {
				reviews = append(reviews, rv)
			}
		}
	}
	if reviews == nil {
		reviews = []reviewRow{}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"avg_rating":    avgRating,
		"total_reviews": total,
		"distribution":  dist,
		"reviews":       reviews,
	})
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
