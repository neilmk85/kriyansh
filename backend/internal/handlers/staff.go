package handlers

import (
	"crypto/rand"
	"database/sql"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"salonos/internal/models"
)

const staffSelect = `
	SELECT sp.id, sp.user_id, sp.salon_id,
	       u.first_name, u.last_name, u.email, COALESCE(u.phone,''), COALESCE(u.role,'staff'),
	       COALESCE(sp.bio,''), COALESCE(sp.specializations,''),
	       sp.commission_pct, sp.accepts_online,
	       COALESCE(sp.color,'#0D9488'), COALESCE(u.avatar_url,'')`

func scanStaff(rows interface {
	Scan(...any) error
}, s *models.StaffProfile) error {
	return rows.Scan(
		&s.ID, &s.UserID, &s.SalonID,
		&s.FirstName, &s.LastName, &s.Email, &s.Phone, &s.Role,
		&s.Bio, &s.Specializations,
		&s.CommissionPct, &s.AcceptsOnline,
		&s.Color, &s.AvatarURL,
	)
}

// ListStaff GET /api/staff?service_ids=1,2 — when service_ids is given, only
// staff eligible for EVERY listed service are returned (a service with no
// staff_services rows is unrestricted).
func (a *App) ListStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	query := staffSelect + `
		 FROM staff_profiles sp
		 JOIN users u ON u.id = sp.user_id
		 WHERE sp.salon_id=? AND u.is_active=1`
	args := []any{claims.SalonID}
	for _, sid := range parseUintCSV(r.URL.Query().Get("service_ids")) {
		query += ` AND (
			NOT EXISTS (SELECT 1 FROM staff_services WHERE service_id = ?)
			OR EXISTS (SELECT 1 FROM staff_services WHERE service_id = ? AND staff_id = sp.id)
		)`
		args = append(args, sid, sid)
	}
	query += ` ORDER BY u.first_name`

	rows, err := a.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var staff []models.StaffProfile
	for rows.Next() {
		var s models.StaffProfile
		scanStaff(rows, &s)
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
	row := a.DB.QueryRowContext(r.Context(),
		staffSelect+`
		 FROM staff_profiles sp
		 JOIN users u ON u.id = sp.user_id
		 WHERE sp.id=? AND sp.salon_id=?`, id, claims.SalonID)
	if err := scanStaff(row, &s); err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "staff not found")
		return
	} else if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, s)
}

func (a *App) CreateStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var req struct {
		FirstName       string  `json:"first_name"`
		LastName        string  `json:"last_name"`
		Email           string  `json:"email"`
		Phone           string  `json:"phone"`
		Specializations string  `json:"specializations"`
		Color           string  `json:"color"`
		Bio             string  `json:"bio"`
		Role            string  `json:"role"`
		AcceptsOnline   bool    `json:"accepts_online"`
		CommissionPct   float64 `json:"commission_pct"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.FirstName == "" || req.Email == "" {
		a.Error(w, http.StatusBadRequest, "first_name and email required")
		return
	}
	if req.Role == "" {
		req.Role = "staff"
	}
	if req.Color == "" {
		req.Color = "#0D9488"
	}

	// Generate a temporary password
	tmpPwd := randomPassword(12)
	hash, err := bcrypt.GenerateFromPassword([]byte(tmpPwd), bcrypt.DefaultCost)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "hash error")
		return
	}

	// Insert user
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO users (salon_id, first_name, last_name, email, phone, password_hash, role, is_active)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
		claims.SalonID, req.FirstName, req.LastName, req.Email, req.Phone, string(hash), req.Role)
	if err != nil {
		a.Error(w, http.StatusConflict, "email already exists")
		return
	}
	userID, _ := res.LastInsertId()

	// Insert staff_profile
	spRes, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO staff_profiles (user_id, salon_id, specializations, bio, color, accepts_online, commission_pct)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID, claims.SalonID, req.Specializations, req.Bio, req.Color, req.AcceptsOnline, req.CommissionPct)
	if err != nil {
		// Roll back the user insert on failure
		a.DB.ExecContext(r.Context(), `DELETE FROM users WHERE id=?`, userID)
		a.Error(w, http.StatusInternalServerError, "db error creating staff profile")
		return
	}
	spID, _ := spRes.LastInsertId()

	s := models.StaffProfile{
		ID:              uint(spID),
		UserID:          uint(userID),
		SalonID:         claims.SalonID,
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		Email:           req.Email,
		Phone:           req.Phone,
		Role:            req.Role,
		Bio:             req.Bio,
		Specializations: req.Specializations,
		CommissionPct:   req.CommissionPct,
		AcceptsOnline:   req.AcceptsOnline,
		Color:           req.Color,
	}
	a.JSON(w, http.StatusCreated, s)
}

func (a *App) UpdateStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req struct {
		FirstName       string  `json:"first_name"`
		LastName        string  `json:"last_name"`
		Email           string  `json:"email"`
		Phone           string  `json:"phone"`
		Bio             string  `json:"bio"`
		Specializations string  `json:"specializations"`
		CommissionPct   float64 `json:"commission_pct"`
		AcceptsOnline   bool    `json:"accepts_online"`
		Color           string  `json:"color"`
		Role            string  `json:"role"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Get user_id for this staff profile
	var userID uint
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT user_id FROM staff_profiles WHERE id=? AND salon_id=?`,
		id, claims.SalonID).Scan(&userID)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "staff not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Update staff_profiles
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE staff_profiles SET bio=?, specializations=?, commission_pct=?,
		 accepts_online=?, color=? WHERE id=? AND salon_id=?`,
		req.Bio, req.Specializations, req.CommissionPct,
		req.AcceptsOnline, req.Color, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Update users if user-level fields provided
	if req.FirstName != "" || req.LastName != "" || req.Email != "" || req.Phone != "" || req.Role != "" {
		a.DB.ExecContext(r.Context(),
			`UPDATE users SET
			   first_name = CASE WHEN ? != '' THEN ? ELSE first_name END,
			   last_name  = CASE WHEN ? != '' THEN ? ELSE last_name  END,
			   email      = CASE WHEN ? != '' THEN ? ELSE email      END,
			   phone      = CASE WHEN ? != '' THEN ? ELSE phone      END,
			   role       = CASE WHEN ? != '' THEN ? ELSE role       END
			 WHERE id=? AND salon_id=?`,
			req.FirstName, req.FirstName,
			req.LastName, req.LastName,
			req.Email, req.Email,
			req.Phone, req.Phone,
			req.Role, req.Role,
			userID, claims.SalonID)
	}

	req2 := models.StaffProfile{
		ID:              uint(id),
		SalonID:         claims.SalonID,
		UserID:          userID,
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		Email:           req.Email,
		Phone:           req.Phone,
		Role:            req.Role,
		Bio:             req.Bio,
		Specializations: req.Specializations,
		CommissionPct:   req.CommissionPct,
		AcceptsOnline:   req.AcceptsOnline,
		Color:           req.Color,
	}
	a.JSON(w, http.StatusOK, req2)
}

func (a *App) DeleteStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Look up user_id, verify salon ownership
	var userID uint
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT user_id FROM staff_profiles WHERE id=? AND salon_id=?`,
		id, claims.SalonID).Scan(&userID)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "staff not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Soft-delete: deactivate the user
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE users SET is_active=0 WHERE id=? AND salon_id=?`,
		userID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func randomPassword(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	rand.Read(b)
	for i, v := range b {
		b[i] = chars[int(v)%len(chars)]
	}
	return string(b)
}
