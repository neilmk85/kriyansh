package handlers

import "net/http"

type TimeOffRequest struct {
	ID        uint   `json:"id"`
	StaffID   uint   `json:"staff_id"`
	StaffName string `json:"staff_name"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Reason    string `json:"reason"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// ListTimeOff GET /api/time-off — optionally filtered by ?from=&to= (overlap with range)
func (a *App) ListTimeOff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	query := `
		SELECT t.id, t.staff_id, TRIM(CONCAT(u.first_name,' ',u.last_name)),
		       DATE_FORMAT(t.start_date,'%Y-%m-%d'), DATE_FORMAT(t.end_date,'%Y-%m-%d'),
		       COALESCE(t.reason,''), t.status, DATE_FORMAT(t.created_at,'%Y-%m-%dT%H:%i:%sZ')
		FROM time_off_requests t
		JOIN staff_profiles sp ON sp.id = t.staff_id
		JOIN users u ON u.id = sp.user_id
		WHERE t.salon_id = ?`
	args := []any{claims.SalonID}

	if from := r.URL.Query().Get("from"); from != "" {
		if to := r.URL.Query().Get("to"); to != "" {
			query += ` AND t.start_date <= ? AND t.end_date >= ?`
			args = append(args, to, from)
		}
	}
	query += ` ORDER BY t.start_date DESC`

	rows, err := a.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	list := []TimeOffRequest{}
	for rows.Next() {
		var t TimeOffRequest
		if rows.Scan(&t.ID, &t.StaffID, &t.StaffName, &t.StartDate, &t.EndDate, &t.Reason, &t.Status, &t.CreatedAt) == nil {
			list = append(list, t)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

// CreateTimeOff POST /api/time-off — body: { staff_id, start_date, end_date, reason }
func (a *App) CreateTimeOff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		StaffID   uint   `json:"staff_id"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Reason    string `json:"reason"`
	}
	if err := a.Decode(r, &body); err != nil || body.StaffID == 0 || body.StartDate == "" || body.EndDate == "" {
		a.Error(w, http.StatusBadRequest, "staff_id, start_date and end_date are required")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO time_off_requests (salon_id, staff_id, start_date, end_date, reason) VALUES (?,?,?,?,?)`,
		claims.SalonID, body.StaffID, body.StartDate, body.EndDate, body.Reason)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{"id": id})
}

// DeleteTimeOff DELETE /api/time-off/{id}
func (a *App) DeleteTimeOff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if _, err := a.DB.ExecContext(r.Context(),
		`DELETE FROM time_off_requests WHERE id=? AND salon_id=?`, id, claims.SalonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}
