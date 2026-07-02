package handlers

import (
	"database/sql"
	"net/http"

	"salonos/internal/models"
)

func (a *App) ListStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT sp.id, sp.user_id, sp.salon_id,
		        u.first_name, u.last_name, u.email,
		        COALESCE(sp.bio,''), COALESCE(sp.specializations,''),
		        sp.commission_pct, sp.accepts_online,
		        COALESCE(sp.color,'#0D9488'), COALESCE(u.avatar_url,'')
		 FROM staff_profiles sp
		 JOIN users u ON u.id = sp.user_id
		 WHERE sp.salon_id=? AND u.is_active=1
		 ORDER BY u.first_name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var staff []models.StaffProfile
	for rows.Next() {
		var s models.StaffProfile
		rows.Scan(&s.ID, &s.UserID, &s.SalonID,
			&s.FirstName, &s.LastName, &s.Email,
			&s.Bio, &s.Specializations,
			&s.CommissionPct, &s.AcceptsOnline,
			&s.Color, &s.AvatarURL)
		staff = append(staff, s)
	}
	if staff == nil {
		staff = []models.StaffProfile{}
	}
	a.JSON(w, http.StatusOK, staff)
}

func (a *App) GetStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var s models.StaffProfile
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT sp.id, sp.user_id, sp.salon_id,
		        u.first_name, u.last_name, u.email,
		        COALESCE(sp.bio,''), COALESCE(sp.specializations,''),
		        sp.commission_pct, sp.accepts_online,
		        COALESCE(sp.color,'#0D9488'), COALESCE(u.avatar_url,'')
		 FROM staff_profiles sp
		 JOIN users u ON u.id = sp.user_id
		 WHERE sp.id=? AND sp.salon_id=?`, id, claims.SalonID).
		Scan(&s.ID, &s.UserID, &s.SalonID,
			&s.FirstName, &s.LastName, &s.Email,
			&s.Bio, &s.Specializations,
			&s.CommissionPct, &s.AcceptsOnline,
			&s.Color, &s.AvatarURL)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "staff not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, s)
}

func (a *App) UpdateStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var s models.StaffProfile
	if err := a.Decode(r, &s); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE staff_profiles SET bio=?, specializations=?, commission_pct=?,
		 accepts_online=?, color=? WHERE id=? AND salon_id=?`,
		s.Bio, s.Specializations, s.CommissionPct,
		s.AcceptsOnline, s.Color, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	s.ID = uint(id)
	s.SalonID = claims.SalonID
	a.JSON(w, http.StatusOK, s)
}
