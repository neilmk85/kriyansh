package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"salonos/internal/models"
)

// ─── types ───────────────────────────────────────────────────────────────────

type clientSegment struct {
	ID          uint            `json:"id"`
	SalonID     uint            `json:"salon_id,omitempty"`
	SegKey      string          `json:"seg_key,omitempty"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	SegType     string          `json:"type"`
	Icon        string          `json:"icon"`
	Count       int             `json:"count"`
	Rules       json.RawMessage `json:"rules,omitempty"`
	SortOrder   int             `json:"sort_order"`
	CreatedAt   time.Time       `json:"created_at"`
}

type segmentRule struct {
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
}

// ─── standard segment seed definitions ───────────────────────────────────────

type stdDef struct {
	Key         string
	Name        string
	Description string
	Icon        string
	SortOrder   int
}

var standardDefs = []stdDef{
	{"new_clients", "New clients", "Clients added in the last 30 days", "user-plus", 1},
	{"recent_clients", "Recent clients", "Clients with appointments in the last 30 days", "calendar-check", 2},
	{"first_visit", "First visit", "Clients with no appointments in the past, and with appointments in the future", "sparkles", 3},
	{"loyal_clients", "Loyal clients", "Clients with 2 or more sales in the last 5 months", "crown", 4},
	{"lapsed_clients", "Lapsed clients", "Clients with 3 or more sales in the last 12 months, and with no sales in the last 2 months", "clock", 5},
	{"high_spenders", "High spenders", "Clients with more than $760 in sales in the last 12 months", "trending-up", 6},
	{"upcoming_birthdays", "Upcoming birthdays", "Clients with birthdays in the next 30 days", "cake", 7},
}

// ─── seed helper ─────────────────────────────────────────────────────────────

func (a *App) seedStdSegments(r *http.Request, salonID uint) {
	var cnt int
	a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM client_segments WHERE salon_id=? AND seg_type='standard'`,
		salonID).Scan(&cnt)
	if cnt > 0 {
		return
	}
	for _, d := range standardDefs {
		a.DB.ExecContext(r.Context(),
			`INSERT IGNORE INTO client_segments (salon_id, seg_key, name, description, seg_type, icon, sort_order)
			 VALUES (?,?,?,?,?,?,?)`,
			salonID, d.Key, d.Name, d.Description, "standard", d.Icon, d.SortOrder)
	}
}

// ─── count helpers ────────────────────────────────────────────────────────────

func (a *App) countStdSegment(r *http.Request, key string, salonID uint) int {
	var n int
	switch key {
	case "new_clients":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
			salonID).Scan(&n)

	case "recent_clients":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(DISTINCT client_id) FROM appointments
			 WHERE salon_id=? AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
			   AND status NOT IN ('cancelled','no_show')`,
			salonID).Scan(&n)

	case "first_visit":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(DISTINCT a1.client_id) FROM appointments a1
			 WHERE a1.salon_id=? AND a1.start_time > NOW()
			   AND NOT EXISTS (
			     SELECT 1 FROM appointments a2
			     WHERE a2.client_id=a1.client_id AND a2.salon_id=?
			       AND a2.start_time <= NOW() AND a2.status='completed'
			   )`,
			salonID, salonID).Scan(&n)

	case "loyal_clients":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM (
			   SELECT client_id FROM transactions
			   WHERE salon_id=? AND status='completed'
			     AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MONTH)
			   GROUP BY client_id HAVING COUNT(*) >= 2
			 ) t`,
			salonID).Scan(&n)

	case "lapsed_clients":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients c
			 WHERE c.salon_id=? AND c.is_active=1
			   AND (SELECT COUNT(*) FROM transactions t
			        WHERE t.client_id=c.id AND t.status='completed'
			          AND t.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)) >= 3
			   AND (SELECT COUNT(*) FROM transactions t
			        WHERE t.client_id=c.id AND t.status='completed'
			          AND t.created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH)) = 0`,
			salonID).Scan(&n)

	case "high_spenders":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM (
			   SELECT client_id FROM transactions
			   WHERE salon_id=? AND status='completed'
			     AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
			   GROUP BY client_id HAVING SUM(grand_total) >= 760
			 ) t`,
			salonID).Scan(&n)

	case "upcoming_birthdays":
		a.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM clients
			 WHERE salon_id=? AND is_active=1 AND date_of_birth IS NOT NULL
			   AND (
			     CASE
			       WHEN MONTH(NOW()) = MONTH(DATE_ADD(NOW(), INTERVAL 30 DAY))
			       THEN MONTH(date_of_birth)=MONTH(NOW())
			            AND DAY(date_of_birth) BETWEEN DAY(NOW()) AND DAY(DATE_ADD(NOW(), INTERVAL 30 DAY))
			       ELSE
			         (MONTH(date_of_birth)=MONTH(NOW()) AND DAY(date_of_birth)>=DAY(NOW()))
			         OR (MONTH(date_of_birth)=MONTH(DATE_ADD(NOW(), INTERVAL 30 DAY))
			             AND DAY(date_of_birth)<=DAY(DATE_ADD(NOW(), INTERVAL 30 DAY)))
			     END
			   )`,
			salonID).Scan(&n)
	}
	return n
}

// ─── custom segment WHERE builder ─────────────────────────────────────────────

func safeOp(op string) string {
	switch op {
	case "gt":
		return ">"
	case "lt":
		return "<"
	case "gte":
		return ">="
	case "lte":
		return "<="
	case "neq":
		return "!="
	default:
		return "="
	}
}

func buildCustomWhere(rules []segmentRule) (string, []any) {
	var parts []string
	var args []any
	for _, r := range rules {
		switch r.Field {
		case "total_spend":
			v, _ := strconv.ParseFloat(r.Value, 64)
			parts = append(parts, fmt.Sprintf("total_spend %s ?", safeOp(r.Operator)))
			args = append(args, v)
		case "total_visits":
			v, _ := strconv.Atoi(r.Value)
			parts = append(parts, fmt.Sprintf("total_visits %s ?", safeOp(r.Operator)))
			args = append(args, v)
		case "loyalty_points":
			v, _ := strconv.Atoi(r.Value)
			parts = append(parts, fmt.Sprintf("loyalty_points %s ?", safeOp(r.Operator)))
			args = append(args, v)
		case "created_days_ago":
			v, _ := strconv.Atoi(r.Value)
			if r.Operator == "lte" {
				parts = append(parts, "created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)")
			} else {
				parts = append(parts, "created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)")
			}
			args = append(args, v)
		case "last_visit_days_ago":
			v, _ := strconv.Atoi(r.Value)
			if r.Operator == "lte" {
				parts = append(parts, "last_visit_at >= DATE_SUB(NOW(), INTERVAL ? DAY)")
			} else {
				parts = append(parts, "(last_visit_at IS NULL OR last_visit_at <= DATE_SUB(NOW(), INTERVAL ? DAY))")
			}
			args = append(args, v)
		case "gender":
			parts = append(parts, "gender = ?")
			args = append(args, r.Value)
		case "sms_consent":
			if r.Value == "true" {
				parts = append(parts, "sms_consent = 1")
			} else {
				parts = append(parts, "sms_consent = 0")
			}
		}
	}
	if len(parts) == 0 {
		return "1=1", nil
	}
	return strings.Join(parts, " AND "), args
}

func (a *App) countCustomSegment(r *http.Request, salonID uint, rules []segmentRule) int {
	where, args := buildCustomWhere(rules)
	q := fmt.Sprintf(`SELECT COUNT(*) FROM clients WHERE salon_id=? AND is_active=1 AND (%s)`, where)
	allArgs := append([]any{salonID}, args...)
	var n int
	a.DB.QueryRowContext(r.Context(), q, allArgs...).Scan(&n)
	return n
}

// ─── scanSegment helper ───────────────────────────────────────────────────────

func scanSegment(row interface {
	Scan(...any) error
}) (clientSegment, string, error) {
	var s clientSegment
	var rulesStr string
	err := row.Scan(&s.ID, &s.SegKey, &s.Name, &s.Description, &s.SegType,
		&s.Icon, &s.SortOrder, &rulesStr, &s.CreatedAt)
	return s, rulesStr, err
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

func (a *App) ListSegments(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	a.seedStdSegments(r, claims.SalonID)

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, COALESCE(seg_key,''), name, COALESCE(description,''), seg_type, icon, sort_order,
		        COALESCE(rules,''), created_at
		 FROM client_segments
		 WHERE salon_id=?
		 ORDER BY seg_type, sort_order, id`,
		claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var segs []clientSegment
	for rows.Next() {
		s, rulesStr, err := scanSegment(rows)
		if err != nil {
			continue
		}
		if s.SegType == "standard" {
			s.Count = a.countStdSegment(r, s.SegKey, claims.SalonID)
		} else if rulesStr != "" && rulesStr != "null" {
			var rules []segmentRule
			if json.Unmarshal([]byte(rulesStr), &rules) == nil {
				s.Count = a.countCustomSegment(r, claims.SalonID, rules)
				s.Rules = json.RawMessage(rulesStr)
			}
		}
		segs = append(segs, s)
	}
	if segs == nil {
		segs = []clientSegment{}
	}
	a.JSON(w, http.StatusOK, segs)
}

// ─── CREATE (custom only) ─────────────────────────────────────────────────────

func (a *App) CreateSegment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Icon        string          `json:"icon"`
		Rules       json.RawMessage `json:"rules"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Icon == "" {
		body.Icon = "users"
	}
	rulesStr := "[]"
	if body.Rules != nil {
		rulesStr = string(body.Rules)
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO client_segments (salon_id, name, description, seg_type, icon, rules, sort_order)
		 VALUES (?, ?, ?, 'custom', ?, ?, 100)`,
		claims.SalonID, body.Name, body.Description, body.Icon, rulesStr)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()

	var seg clientSegment
	var rs string
	row := a.DB.QueryRowContext(r.Context(),
		`SELECT id, COALESCE(seg_key,''), name, COALESCE(description,''), seg_type, icon, sort_order,
		        COALESCE(rules,''), created_at
		 FROM client_segments WHERE id=?`, id)
	seg, rs, _ = scanSegment(row)
	if rs != "" && rs != "null" {
		seg.Rules = json.RawMessage(rs)
	}
	a.JSON(w, http.StatusCreated, seg)
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

func (a *App) UpdateSegment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Icon        string          `json:"icon"`
		Rules       json.RawMessage `json:"rules"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Icon == "" {
		body.Icon = "users"
	}

	// Fetch current seg_type
	var segType string
	a.DB.QueryRowContext(r.Context(),
		`SELECT seg_type FROM client_segments WHERE id=? AND salon_id=?`,
		id, claims.SalonID).Scan(&segType)
	if segType == "" {
		a.Error(w, http.StatusNotFound, "segment not found")
		return
	}

	if segType == "standard" {
		// For standard segments, only allow name/description/icon edits (not rules)
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE client_segments SET name=?, description=?, icon=? WHERE id=? AND salon_id=?`,
			body.Name, body.Description, body.Icon, id, claims.SalonID)
	} else {
		rulesStr := "[]"
		if body.Rules != nil {
			rulesStr = string(body.Rules)
		}
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE client_segments SET name=?, description=?, icon=?, rules=? WHERE id=? AND salon_id=?`,
			body.Name, body.Description, body.Icon, rulesStr, id, claims.SalonID)
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	var seg clientSegment
	var rs string
	row := a.DB.QueryRowContext(r.Context(),
		`SELECT id, COALESCE(seg_key,''), name, COALESCE(description,''), seg_type, icon, sort_order,
		        COALESCE(rules,''), created_at
		 FROM client_segments WHERE id=?`, id)
	seg, rs, _ = scanSegment(row)
	if rs != "" && rs != "null" {
		seg.Rules = json.RawMessage(rs)
	}
	a.JSON(w, http.StatusOK, seg)
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

func (a *App) DeleteSegment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	// Only allow deleting custom segments
	res, err := a.DB.ExecContext(r.Context(),
		`DELETE FROM client_segments WHERE id=? AND salon_id=? AND seg_type='custom'`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusNotFound, "segment not found or is a standard segment")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ─── DUPLICATE ────────────────────────────────────────────────────────────────

func (a *App) DuplicateSegment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var orig clientSegment
	var rs string
	row := a.DB.QueryRowContext(r.Context(),
		`SELECT id, COALESCE(seg_key,''), name, COALESCE(description,''), seg_type, icon, sort_order,
		        COALESCE(rules,''), created_at
		 FROM client_segments WHERE id=? AND salon_id=?`, id, claims.SalonID)
	orig, rs, err = scanSegment(row)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "segment not found")
		return
	}

	rulesStr := rs
	if rulesStr == "" || rulesStr == "null" {
		rulesStr = "[]"
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO client_segments (salon_id, name, description, seg_type, icon, rules, sort_order)
		 VALUES (?, ?, ?, 'custom', ?, ?, ?)`,
		claims.SalonID,
		orig.Name+" (Copy)",
		orig.Description,
		orig.Icon,
		rulesStr,
		orig.SortOrder+1)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	newID, _ := res.LastInsertId()

	var seg clientSegment
	var newRS string
	row2 := a.DB.QueryRowContext(r.Context(),
		`SELECT id, COALESCE(seg_key,''), name, COALESCE(description,''), seg_type, icon, sort_order,
		        COALESCE(rules,''), created_at
		 FROM client_segments WHERE id=?`, newID)
	seg, newRS, _ = scanSegment(row2)
	if newRS != "" && newRS != "null" {
		seg.Rules = json.RawMessage(newRS)
	}
	a.JSON(w, http.StatusCreated, seg)
}

// ─── GET CLIENTS IN SEGMENT ───────────────────────────────────────────────────

func (a *App) GetSegmentClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var segKey, segType, rulesStr string
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(seg_key,''), seg_type, COALESCE(rules,'')
		 FROM client_segments WHERE id=? AND salon_id=?`,
		id, claims.SalonID).Scan(&segKey, &segType, &rulesStr)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "segment not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	const baseSelect = `SELECT id, salon_id, first_name, last_name,
	       COALESCE(email,''), COALESCE(phone,''), COALESCE(gender,''),
	       COALESCE(notes,''), loyalty_points, total_visits,
	       total_spend, sms_consent, is_active, last_visit_at, created_at
	       FROM clients`

	var rows *sql.Rows

	if segType == "standard" {
		rows, err = a.stdSegmentClients(r, segKey, claims.SalonID, baseSelect)
	} else if rulesStr != "" && rulesStr != "null" {
		var rules []segmentRule
		if jerr := json.Unmarshal([]byte(rulesStr), &rules); jerr == nil {
			where, args := buildCustomWhere(rules)
			q := fmt.Sprintf("%s WHERE salon_id=? AND is_active=1 AND (%s) LIMIT 500", baseSelect, where)
			allArgs := append([]any{claims.SalonID}, args...)
			rows, err = a.DB.QueryContext(r.Context(), q, allArgs...)
		}
	}

	if rows == nil || err != nil {
		a.JSON(w, http.StatusOK, []models.Client{})
		return
	}
	defer rows.Close()

	var clients []models.Client
	for rows.Next() {
		var c models.Client
		rows.Scan(&c.ID, &c.SalonID, &c.FirstName, &c.LastName,
			&c.Email, &c.Phone, &c.Gender, &c.Notes,
			&c.LoyaltyPoints, &c.TotalVisits, &c.TotalSpend,
			&c.SMSConsent, &c.IsActive, &c.LastVisitAt, &c.CreatedAt)
		clients = append(clients, c)
	}
	if clients == nil {
		clients = []models.Client{}
	}
	a.JSON(w, http.StatusOK, clients)
}

func (a *App) stdSegmentClients(r *http.Request, key string, salonID uint, baseSelect string) (*sql.Rows, error) {
	base := baseSelect + " WHERE salon_id=? AND is_active=1"
	switch key {
	case "new_clients":
		return a.DB.QueryContext(r.Context(),
			base+" AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) LIMIT 500",
			salonID)
	case "recent_clients":
		return a.DB.QueryContext(r.Context(),
			base+" AND id IN (SELECT DISTINCT client_id FROM appointments WHERE salon_id=? AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status NOT IN ('cancelled','no_show')) LIMIT 500",
			salonID, salonID)
	case "first_visit":
		return a.DB.QueryContext(r.Context(),
			base+" AND id IN (SELECT DISTINCT a1.client_id FROM appointments a1 WHERE a1.salon_id=? AND a1.start_time > NOW() AND NOT EXISTS (SELECT 1 FROM appointments a2 WHERE a2.client_id=a1.client_id AND a2.salon_id=? AND a2.start_time <= NOW() AND a2.status='completed')) LIMIT 500",
			salonID, salonID, salonID)
	case "loyal_clients":
		return a.DB.QueryContext(r.Context(),
			base+" AND id IN (SELECT client_id FROM transactions WHERE salon_id=? AND status='completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MONTH) GROUP BY client_id HAVING COUNT(*) >= 2) LIMIT 500",
			salonID, salonID)
	case "lapsed_clients":
		return a.DB.QueryContext(r.Context(),
			base+" AND (SELECT COUNT(*) FROM transactions t WHERE t.client_id=clients.id AND t.status='completed' AND t.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)) >= 3 AND (SELECT COUNT(*) FROM transactions t WHERE t.client_id=clients.id AND t.status='completed' AND t.created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH)) = 0 LIMIT 500",
			salonID)
	case "high_spenders":
		return a.DB.QueryContext(r.Context(),
			base+" AND id IN (SELECT client_id FROM transactions WHERE salon_id=? AND status='completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY client_id HAVING SUM(grand_total) >= 760) LIMIT 500",
			salonID, salonID)
	case "upcoming_birthdays":
		return a.DB.QueryContext(r.Context(),
			base+` AND date_of_birth IS NOT NULL AND (CASE WHEN MONTH(NOW())=MONTH(DATE_ADD(NOW(), INTERVAL 30 DAY)) THEN MONTH(date_of_birth)=MONTH(NOW()) AND DAY(date_of_birth) BETWEEN DAY(NOW()) AND DAY(DATE_ADD(NOW(), INTERVAL 30 DAY)) ELSE (MONTH(date_of_birth)=MONTH(NOW()) AND DAY(date_of_birth)>=DAY(NOW())) OR (MONTH(date_of_birth)=MONTH(DATE_ADD(NOW(), INTERVAL 30 DAY)) AND DAY(date_of_birth)<=DAY(DATE_ADD(NOW(), INTERVAL 30 DAY))) END) LIMIT 500`,
			salonID)
	}
	return nil, nil
}
