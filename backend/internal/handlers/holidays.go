package handlers

import (
	"net/http"
	"strconv"
	"time"
)

type salonHoliday struct {
	ID           int       `json:"id"`
	SalonID      int       `json:"salon_id"`
	Date         string    `json:"date"`
	Name         string    `json:"name"`
	RepeatYearly bool      `json:"repeat_yearly"`
	CreatedAt    time.Time `json:"created_at"`
}

// GET /api/v1/holidays
func (a *App) ListHolidays(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, DATE_FORMAT(date,'%Y-%m-%d'), name, repeat_yearly, created_at
		 FROM salon_holidays WHERE salon_id = ? ORDER BY date ASC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var list []salonHoliday
	for rows.Next() {
		var h salonHoliday
		if err := rows.Scan(&h.ID, &h.SalonID, &h.Date, &h.Name, &h.RepeatYearly, &h.CreatedAt); err != nil {
			continue
		}
		list = append(list, h)
	}
	if list == nil {
		list = []salonHoliday{}
	}
	a.JSON(w, http.StatusOK, list)
}

// POST /api/v1/holidays
func (a *App) CreateHoliday(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var body struct {
		Date         string `json:"date"`
		Name         string `json:"name"`
		RepeatYearly bool   `json:"repeat_yearly"`
	}
	if err := a.Decode(r, &body); err != nil || body.Date == "" || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "date and name are required")
		return
	}
	// Validate date format
	if _, err := time.Parse("2006-01-02", body.Date); err != nil {
		a.Error(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO salon_holidays (salon_id, date, name, repeat_yearly) VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE name=VALUES(name), repeat_yearly=VALUES(repeat_yearly)`,
		claims.SalonID, body.Date, body.Name, body.RepeatYearly)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{
		"id":            id,
		"salon_id":      claims.SalonID,
		"date":          body.Date,
		"name":          body.Name,
		"repeat_yearly": body.RepeatYearly,
	})
}

// DELETE /api/v1/holidays/{id}
func (a *App) DeleteHoliday(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = a.DB.ExecContext(r.Context(),
		`DELETE FROM salon_holidays WHERE id = ? AND salon_id = ?`, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
