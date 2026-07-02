package handlers

import (
	"database/sql"
	"net/http"
	"salonos/internal/auth"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string      `json:"token"`
	User  userPayload `json:"user"`
}

type userPayload struct {
	ID        uint   `json:"id"`
	SalonID   uint   `json:"salon_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
}

func (a *App) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var u userPayload
	var hash string
	err := a.DB.QueryRowContext(r.Context(), `
		SELECT id, salon_id, first_name, last_name, email, role, password_hash
		FROM users WHERE email = ? AND is_active = 1 LIMIT 1`, req.Email).
		Scan(&u.ID, &u.SalonID, &u.FirstName, &u.LastName, &u.Email, &u.Role, &hash)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		a.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// Update last login
	a.DB.ExecContext(r.Context(), `UPDATE users SET last_login_at=? WHERE id=?`, time.Now().UTC(), u.ID)

	claims := auth.NewAccessClaims(u.ID, u.SalonID, u.Role, u.Email)
	token, err := auth.GenerateToken(claims, a.Secret)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "token error")
		return
	}

	a.JSON(w, http.StatusOK, loginResponse{Token: token, User: u})
}

type registerRequest struct {
	SalonID   uint   `json:"salon_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Phone     string `json:"phone"`
	Role      string `json:"role"`
}

func (a *App) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Password == "" || len(req.Password) < 6 {
		a.Error(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}
	if req.Role == "" {
		req.Role = "stylist"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "hash error")
		return
	}

	res, err := a.DB.ExecContext(r.Context(), `
		INSERT INTO users (salon_id, first_name, last_name, email, phone, password_hash, role)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		req.SalonID, req.FirstName, req.LastName, req.Email, req.Phone, string(hash), req.Role)
	if err != nil {
		a.Error(w, http.StatusConflict, "email already exists")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{"id": id, "message": "user created"})
}

func (a *App) Me(w http.ResponseWriter, r *http.Request) {
	type me struct {
		ID        uint   `json:"id"`
		SalonID   uint   `json:"salon_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Role      string `json:"role"`
		Phone     string `json:"phone"`
		AvatarURL string `json:"avatar_url"`
	}
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	claims, _ := auth.ValidateToken(token, a.Secret)

	var u me
	err := a.DB.QueryRowContext(r.Context(), `
		SELECT id, salon_id, first_name, last_name, email, role,
		       COALESCE(phone,''), COALESCE(avatar_url,'')
		FROM users WHERE id = ?`, claims.UserID).
		Scan(&u.ID, &u.SalonID, &u.FirstName, &u.LastName, &u.Email, &u.Role, &u.Phone, &u.AvatarURL)
	if err != nil {
		a.Error(w, http.StatusNotFound, "user not found")
		return
	}
	a.JSON(w, http.StatusOK, u)
}

// PUT /api/auth/me — update own name / email / phone
func (a *App) UpdateMe(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	claims, _ := auth.ValidateToken(token, a.Secret)

	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		Phone     string `json:"phone"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err := a.DB.ExecContext(r.Context(),
		`UPDATE users SET first_name=?, last_name=?, email=?, phone=? WHERE id=?`,
		req.FirstName, req.LastName, req.Email, req.Phone, claims.UserID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// PUT /api/auth/password — change own password
func (a *App) ChangePassword(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	claims, _ := auth.ValidateToken(token, a.Secret)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := a.Decode(r, &req); err != nil || req.NewPassword == "" {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	var hash string
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT password_hash FROM users WHERE id=?`, claims.UserID).Scan(&hash); err != nil {
		a.Error(w, http.StatusNotFound, "user not found")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.CurrentPassword)); err != nil {
		a.Error(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "hash error")
		return
	}
	a.DB.ExecContext(r.Context(), `UPDATE users SET password_hash=? WHERE id=?`, string(newHash), claims.UserID)
	a.JSON(w, http.StatusOK, map[string]string{"status": "password changed"})
}
