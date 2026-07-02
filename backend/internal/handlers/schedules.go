package handlers

import (
	"net/http"
)

type staffScheduleDay struct {
	ID         uint   `json:"id,omitempty"`
	StaffID    uint   `json:"staff_id,omitempty"`
	DayOfWeek  int    `json:"day_of_week"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	IsWorking  bool   `json:"is_working"`
}

// defaultSchedule returns the 7-day default schedule for a staff member.
// Mon-Fri: working 09:00-18:00, Sat: 10:00-16:00, Sun: off.
func defaultSchedule(staffID uint) []staffScheduleDay {
	days := []staffScheduleDay{
		{StaffID: staffID, DayOfWeek: 0, StartTime: "10:00", EndTime: "16:00", IsWorking: false}, // Sun
		{StaffID: staffID, DayOfWeek: 1, StartTime: "09:00", EndTime: "18:00", IsWorking: true},  // Mon
		{StaffID: staffID, DayOfWeek: 2, StartTime: "09:00", EndTime: "18:00", IsWorking: true},  // Tue
		{StaffID: staffID, DayOfWeek: 3, StartTime: "09:00", EndTime: "18:00", IsWorking: true},  // Wed
		{StaffID: staffID, DayOfWeek: 4, StartTime: "09:00", EndTime: "18:00", IsWorking: true},  // Thu
		{StaffID: staffID, DayOfWeek: 5, StartTime: "09:00", EndTime: "18:00", IsWorking: true},  // Fri
		{StaffID: staffID, DayOfWeek: 6, StartTime: "10:00", EndTime: "16:00", IsWorking: true},  // Sat
	}
	return days
}

// GetStaffSchedule GET /api/staff/{id}/schedule
func (a *App) GetStaffSchedule(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	staffID := uint(id)

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, staff_id, day_of_week, start_time, end_time, is_working
		 FROM staff_schedules WHERE staff_id = ? ORDER BY day_of_week`, staffID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var schedule []staffScheduleDay
	for rows.Next() {
		var d staffScheduleDay
		rows.Scan(&d.ID, &d.StaffID, &d.DayOfWeek, &d.StartTime, &d.EndTime, &d.IsWorking)
		schedule = append(schedule, d)
	}

	// If no rows stored, return defaults
	if len(schedule) == 0 {
		schedule = defaultSchedule(staffID)
	}

	a.JSON(w, http.StatusOK, schedule)
}

// UpdateStaffSchedule PUT /api/staff/{id}/schedule
func (a *App) UpdateStaffSchedule(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	staffID := uint(id)

	var days []staffScheduleDay
	if err := a.Decode(r, &days); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	for _, d := range days {
		_, err := a.DB.ExecContext(r.Context(),
			`INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time, is_working)
			 VALUES (?,?,?,?,?)
			 ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time), is_working=VALUES(is_working)`,
			staffID, d.DayOfWeek, d.StartTime, d.EndTime, d.IsWorking)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	// Return updated schedule
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, staff_id, day_of_week, start_time, end_time, is_working
		 FROM staff_schedules WHERE staff_id = ? ORDER BY day_of_week`, staffID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var schedule []staffScheduleDay
	for rows.Next() {
		var d staffScheduleDay
		rows.Scan(&d.ID, &d.StaffID, &d.DayOfWeek, &d.StartTime, &d.EndTime, &d.IsWorking)
		schedule = append(schedule, d)
	}
	if schedule == nil {
		schedule = []staffScheduleDay{}
	}

	a.JSON(w, http.StatusOK, schedule)
}
