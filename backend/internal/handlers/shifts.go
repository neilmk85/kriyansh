package handlers

import (
	"net/http"
	"time"
)

type Shift struct {
	ID        uint   `json:"id"`
	SalonID   uint   `json:"salon_id"`
	StaffID   uint   `json:"staff_id"`
	ShiftDate string `json:"shift_date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Notes     string `json:"notes"`
}

type createShiftRequest struct {
	StaffID   uint   `json:"staff_id"`
	ShiftDate string `json:"shift_date"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Notes     string `json:"notes"`
}

// ListShifts GET /api/shifts?week_start=YYYY-MM-DD
func (a *App) ListShifts(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	weekStart := r.URL.Query().Get("week_start")
	if weekStart == "" {
		now := time.Now()
		sun := now.AddDate(0, 0, -int(now.Weekday()))
		weekStart = sun.Format("2006-01-02")
	}

	start, err := time.Parse("2006-01-02", weekStart)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid week_start: use YYYY-MM-DD")
		return
	}
	end := start.AddDate(0, 0, 6)

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, staff_id,
		        DATE_FORMAT(shift_date,'%Y-%m-%d'),
		        start_time, end_time,
		        COALESCE(notes,'')
		 FROM shifts
		 WHERE salon_id = ? AND shift_date BETWEEN ? AND ?
		 ORDER BY shift_date, start_time`,
		claims.SalonID,
		start.Format("2006-01-02"),
		end.Format("2006-01-02"),
	)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	shifts := []Shift{}
	for rows.Next() {
		var s Shift
		rows.Scan(&s.ID, &s.SalonID, &s.StaffID, &s.ShiftDate, &s.StartTime, &s.EndTime, &s.Notes)
		shifts = append(shifts, s)
	}
	a.JSON(w, http.StatusOK, shifts)
}

// CreateShift POST /api/shifts
func (a *App) CreateShift(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var body createShiftRequest
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.StaffID == 0 {
		a.Error(w, http.StatusBadRequest, "staff_id is required")
		return
	}
	if _, err := time.Parse("2006-01-02", body.ShiftDate); err != nil {
		a.Error(w, http.StatusBadRequest, "shift_date must be YYYY-MM-DD")
		return
	}
	if body.StartTime == "" {
		body.StartTime = "09:00"
	}
	if body.EndTime == "" {
		body.EndTime = "18:00"
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO shifts (salon_id, staff_id, shift_date, start_time, end_time, notes)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		claims.SalonID, body.StaffID, body.ShiftDate, body.StartTime, body.EndTime, body.Notes,
	)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, Shift{
		ID:        uint(id),
		SalonID:   claims.SalonID,
		StaffID:   body.StaffID,
		ShiftDate: body.ShiftDate,
		StartTime: body.StartTime,
		EndTime:   body.EndTime,
		Notes:     body.Notes,
	})
}

// DeleteShift DELETE /api/shifts/{id}
func (a *App) DeleteShift(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`DELETE FROM shifts WHERE id = ? AND salon_id = ?`,
		id, claims.SalonID,
	)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusNotFound, "shift not found")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}
