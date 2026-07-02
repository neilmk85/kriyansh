package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"salonos/internal/models"
)

func (a *App) ListClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	q := "%" + strings.TrimSpace(r.URL.Query().Get("q")) + "%"
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, first_name, last_name,
		        COALESCE(email,''), COALESCE(phone,''), COALESCE(gender,''),
		        COALESCE(notes,''), loyalty_points, total_visits,
		        total_spend, sms_consent, is_active, last_visit_at, created_at
		 FROM clients
		 WHERE salon_id=? AND is_active=1
		   AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)
		 ORDER BY created_at DESC LIMIT 500`, claims.SalonID, q, q, q, q)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
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

func (a *App) GetClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var c models.Client
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, first_name, last_name,
		        COALESCE(email,''), COALESCE(phone,''), COALESCE(gender,''),
		        COALESCE(notes,''), loyalty_points, total_visits,
		        total_spend, sms_consent, is_active, last_visit_at, created_at
		 FROM clients WHERE id=? AND salon_id=?`, id, claims.SalonID).
		Scan(&c.ID, &c.SalonID, &c.FirstName, &c.LastName,
			&c.Email, &c.Phone, &c.Gender, &c.Notes,
			&c.LoyaltyPoints, &c.TotalVisits, &c.TotalSpend,
			&c.SMSConsent, &c.IsActive, &c.LastVisitAt, &c.CreatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "client not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, c)
}

func (a *App) CreateClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var c models.Client
	if err := a.Decode(r, &c); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	c.SalonID = claims.SalonID
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO clients (salon_id, first_name, last_name, email, phone, gender, notes, sms_consent)
		 VALUES (?,?,?,?,?,?,?,?)`,
		c.SalonID, c.FirstName, c.LastName, c.Email, c.Phone, c.Gender, c.Notes, c.SMSConsent)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	c.ID = uint(id)
	c.IsActive = true
	a.JSON(w, http.StatusCreated, c)
}

func (a *App) MergeClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var req struct {
		PrimaryID   uint64 `json:"primary_id"`
		SecondaryID uint64 `json:"secondary_id"`
	}
	if err := a.Decode(r, &req); err != nil || req.PrimaryID == 0 || req.SecondaryID == 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.PrimaryID == req.SecondaryID {
		a.Error(w, http.StatusBadRequest, "cannot merge a client with itself")
		return
	}

	// Verify both belong to this salon
	var count int
	a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM clients WHERE id IN (?,?) AND salon_id=? AND is_active=1`,
		req.PrimaryID, req.SecondaryID, claims.SalonID).Scan(&count)
	if count != 2 {
		a.Error(w, http.StatusNotFound, "one or both clients not found")
		return
	}

	// Re-point all foreign key references from secondary → primary
	fkTables := []struct{ tbl, col string }{
		{"appointments", "client_id"},
		{"transactions", "client_id"},
		{"client_memberships", "client_id"},
	}
	for _, t := range fkTables {
		a.DB.ExecContext(r.Context(),
			fmt.Sprintf(`UPDATE %s SET %s=? WHERE %s=?`, t.tbl, t.col, t.col),
			req.PrimaryID, req.SecondaryID)
	}

	// Merge numeric totals into primary
	a.DB.ExecContext(r.Context(), `
		UPDATE clients p
		JOIN   clients s ON s.id = ?
		SET    p.total_spend    = p.total_spend    + s.total_spend,
		       p.total_visits   = p.total_visits   + s.total_visits,
		       p.loyalty_points = p.loyalty_points + s.loyalty_points
		WHERE  p.id = ? AND p.salon_id = ?`,
		req.SecondaryID, req.PrimaryID, claims.SalonID)

	// Fill blank fields on primary from secondary
	a.DB.ExecContext(r.Context(), `
		UPDATE clients p
		JOIN   clients s ON s.id = ?
		SET    p.email  = IF(p.email  = '' OR p.email  IS NULL, s.email,  p.email),
		       p.phone  = IF(p.phone  = '' OR p.phone  IS NULL, s.phone,  p.phone),
		       p.notes  = IF(p.notes  = '' OR p.notes  IS NULL, s.notes,  p.notes),
		       p.gender = IF(p.gender = '' OR p.gender IS NULL, s.gender, p.gender)
		WHERE  p.id = ? AND p.salon_id = ?`,
		req.SecondaryID, req.PrimaryID, claims.SalonID)

	// Soft-delete secondary
	a.DB.ExecContext(r.Context(),
		`UPDATE clients SET is_active=0 WHERE id=? AND salon_id=?`,
		req.SecondaryID, claims.SalonID)

	a.JSON(w, http.StatusOK, map[string]any{"merged": true, "primary_id": req.PrimaryID})
}

func (a *App) UpdateClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var c models.Client
	if err := a.Decode(r, &c); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE clients SET first_name=?, last_name=?, email=?, phone=?,
		 gender=?, notes=?, sms_consent=? WHERE id=? AND salon_id=?`,
		c.FirstName, c.LastName, c.Email, c.Phone,
		c.Gender, c.Notes, c.SMSConsent, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	c.ID = uint(id)
	c.SalonID = claims.SalonID
	a.JSON(w, http.StatusOK, c)
}
