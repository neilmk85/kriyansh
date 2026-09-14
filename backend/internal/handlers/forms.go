package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// ── Forms ─────────────────────────────────────────────────────────────────────

type Form struct {
	ID        int             `json:"id"`
	SalonID   uint            `json:"salon_id"`
	Name      string          `json:"name"`
	Fields    json.RawMessage `json:"fields"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type FormResponse struct {
	ID          int             `json:"id"`
	FormID      int             `json:"form_id"`
	ClientID    *int            `json:"client_id,omitempty"`
	Responses   json.RawMessage `json:"responses"`
	SubmittedAt time.Time       `json:"submitted_at"`
}

// ListForms GET /api/forms
func (a *App) ListForms(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, fields, created_at, updated_at
		 FROM forms WHERE salon_id = ? ORDER BY created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	out := []Form{}
	for rows.Next() {
		var f Form
		if err := rows.Scan(&f.ID, &f.SalonID, &f.Name, &f.Fields, &f.CreatedAt, &f.UpdatedAt); err != nil {
			continue
		}
		out = append(out, f)
	}
	a.JSON(w, http.StatusOK, out)
}

// CreateForm POST /api/forms
func (a *App) CreateForm(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var req struct {
		Name   string          `json:"name"`
		Fields json.RawMessage `json:"fields"`
	}
	if err := a.Decode(r, &req); err != nil || req.Name == "" || len(req.Fields) == 0 {
		a.Error(w, http.StatusBadRequest, "name and fields required")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO forms (salon_id, name, fields) VALUES (?, ?, ?)`,
		claims.SalonID, req.Name, req.Fields)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()

	var f Form
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, name, fields, created_at, updated_at FROM forms WHERE id = ?`, id).
		Scan(&f.ID, &f.SalonID, &f.Name, &f.Fields, &f.CreatedAt, &f.UpdatedAt)

	a.JSON(w, http.StatusCreated, f)
}

// UpdateForm PUT /api/forms/{id}
func (a *App) UpdateForm(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req struct {
		Name   string          `json:"name"`
		Fields json.RawMessage `json:"fields"`
	}
	if err := a.Decode(r, &req); err != nil || req.Name == "" || len(req.Fields) == 0 {
		a.Error(w, http.StatusBadRequest, "name and fields required")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE forms SET name = ?, fields = ? WHERE id = ? AND salon_id = ?`,
		req.Name, req.Fields, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusNotFound, "form not found")
		return
	}

	var f Form
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, name, fields, created_at, updated_at FROM forms WHERE id = ?`, id).
		Scan(&f.ID, &f.SalonID, &f.Name, &f.Fields, &f.CreatedAt, &f.UpdatedAt)

	a.JSON(w, http.StatusOK, f)
}

// DeleteForm DELETE /api/forms/{id}
func (a *App) DeleteForm(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`DELETE FROM forms WHERE id = ? AND salon_id = ?`, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		a.Error(w, http.StatusNotFound, "form not found")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ListFormResponses GET /api/forms/{id}/responses
func (a *App) ListFormResponses(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	formID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Verify form belongs to salon
	var salonID uint
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT salon_id FROM forms WHERE id = ?`, formID).Scan(&salonID)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "form not found")
		return
	}
	if err != nil || salonID != claims.SalonID {
		a.Error(w, http.StatusForbidden, "forbidden")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, form_id, client_id, responses, submitted_at
		 FROM form_responses WHERE form_id = ? ORDER BY submitted_at DESC`, formID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	out := []FormResponse{}
	for rows.Next() {
		var fr FormResponse
		var clientID sql.NullInt64
		if err := rows.Scan(&fr.ID, &fr.FormID, &clientID, &fr.Responses, &fr.SubmittedAt); err != nil {
			continue
		}
		if clientID.Valid {
			v := int(clientID.Int64)
			fr.ClientID = &v
		}
		out = append(out, fr)
	}
	a.JSON(w, http.StatusOK, out)
}

// SubmitForm POST /api/public/forms/{id}/submit
func (a *App) SubmitForm(w http.ResponseWriter, r *http.Request) {
	formID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Verify form exists
	var exists int
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM forms WHERE id = ?`, formID).Scan(&exists)
	if err != nil || exists == 0 {
		a.Error(w, http.StatusNotFound, "form not found")
		return
	}

	var req struct {
		ClientID  *int            `json:"client_id"`
		Responses json.RawMessage `json:"responses"`
	}
	if err := a.Decode(r, &req); err != nil || len(req.Responses) == 0 {
		a.Error(w, http.StatusBadRequest, "responses required")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO form_responses (form_id, client_id, responses) VALUES (?, ?, ?)`,
		formID, req.ClientID, req.Responses)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{"id": id, "submitted": true})
}
