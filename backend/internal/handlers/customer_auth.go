package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"salonos/internal/auth"
	"golang.org/x/crypto/bcrypt"
)

type customerAuthReq struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Password  string `json:"password"`
}

type customerAuthResp struct {
	Token  string         `json:"token"`
	Client customerPublic `json:"client"`
}

type customerPublic struct {
	ID        uint   `json:"id"`
	SalonID   uint   `json:"salon_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
}

func (a *App) CustomerRegister(w http.ResponseWriter, r *http.Request) {
	var req customerAuthReq
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Phone == "" {
		a.Error(w, http.StatusBadRequest, "phone is required")
		return
	}
	if len(req.Password) < 6 {
		a.Error(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "server error")
		return
	}

	// Find the salon to associate this client with (use first salon)
	var salonID uint
	if err := a.DB.QueryRowContext(r.Context(), `SELECT id FROM salons ORDER BY id LIMIT 1`).Scan(&salonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "no salon configured")
		return
	}

	// Upsert client: if phone exists in this salon update credentials, else create
	var client customerPublic
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, first_name, last_name, COALESCE(email,''), phone
		 FROM clients WHERE phone=? AND salon_id=?`, req.Phone, salonID).
		Scan(&client.ID, &client.SalonID, &client.FirstName, &client.LastName, &client.Email, &client.Phone)

	if err == sql.ErrNoRows {
		// Create new client
		res, err := a.DB.ExecContext(r.Context(),
			`INSERT INTO clients (salon_id, first_name, last_name, email, phone, password_hash, portal_enabled, sms_consent)
			 VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
			salonID, req.FirstName, req.LastName, req.Email, req.Phone, string(hash))
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
		id, _ := res.LastInsertId()
		client = customerPublic{
			ID: uint(id), SalonID: salonID,
			FirstName: req.FirstName, LastName: req.LastName,
			Email: req.Email, Phone: req.Phone,
		}
	} else if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	} else {
		// Client exists — check if already has portal credentials
		var existing string
		_ = a.DB.QueryRowContext(r.Context(),
			`SELECT COALESCE(password_hash,'') FROM clients WHERE id=?`, client.ID).Scan(&existing)
		if existing != "" {
			a.Error(w, http.StatusConflict, "account already exists for this phone number")
			return
		}
		// Link portal credentials to existing client
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE clients SET password_hash=?, portal_enabled=1, email=COALESCE(NULLIF(email,''),?) WHERE id=?`,
			string(hash), req.Email, client.ID)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	token, err := auth.GenerateCustomerToken(
		auth.NewCustomerClaims(client.ID, client.SalonID, client.Email, client.Phone),
		a.Secret,
	)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "token error")
		return
	}
	a.JSON(w, http.StatusCreated, customerAuthResp{Token: token, Client: client})
}

func (a *App) CustomerLogin(w http.ResponseWriter, r *http.Request) {
	var req customerAuthReq
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var client customerPublic
	var hashStr string

	// Allow login by phone or email
	var row *sql.Row
	if req.Phone != "" {
		row = a.DB.QueryRowContext(r.Context(),
			`SELECT id, salon_id, first_name, last_name, COALESCE(email,''), phone, COALESCE(password_hash,'')
			 FROM clients WHERE phone=? AND portal_enabled=1 ORDER BY id LIMIT 1`, req.Phone)
	} else {
		row = a.DB.QueryRowContext(r.Context(),
			`SELECT id, salon_id, first_name, last_name, COALESCE(email,''), phone, COALESCE(password_hash,'')
			 FROM clients WHERE email=? AND portal_enabled=1 ORDER BY id LIMIT 1`, req.Email)
	}
	err := row.Scan(&client.ID, &client.SalonID, &client.FirstName, &client.LastName,
		&client.Email, &client.Phone, &hashStr)
	if err == sql.ErrNoRows || hashStr == "" {
		a.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashStr), []byte(req.Password)); err != nil {
		a.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := auth.GenerateCustomerToken(
		auth.NewCustomerClaims(client.ID, client.SalonID, client.Email, client.Phone),
		a.Secret,
	)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "token error")
		return
	}
	a.JSON(w, http.StatusOK, customerAuthResp{Token: token, Client: client})
}
