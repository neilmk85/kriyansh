package handlers

import "net/http"

type Resource struct {
	ID       uint   `json:"id"`
	SalonID  uint   `json:"salon_id"`
	Name     string `json:"name"`
	Icon     string `json:"icon"`
	IsActive bool   `json:"is_active"`
}

// ListResources GET /api/resources
func (a *App) ListResources(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, icon, is_active FROM resources WHERE salon_id=? AND is_active=1 ORDER BY name`,
		claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	list := []Resource{}
	for rows.Next() {
		var res Resource
		rows.Scan(&res.ID, &res.SalonID, &res.Name, &res.Icon, &res.IsActive)
		list = append(list, res)
	}
	a.JSON(w, http.StatusOK, list)
}

// CreateResource POST /api/resources — body: { name, icon }
func (a *App) CreateResource(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if body.Icon == "" {
		body.Icon = "armchair"
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO resources (salon_id, name, icon) VALUES (?,?,?)`, claims.SalonID, body.Name, body.Icon)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, Resource{ID: uint(id), SalonID: claims.SalonID, Name: body.Name, Icon: body.Icon, IsActive: true})
}

// UpdateResource PUT /api/resources/{id}
func (a *App) UpdateResource(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if _, err := a.DB.ExecContext(r.Context(),
		`UPDATE resources SET name=?, icon=? WHERE id=? AND salon_id=?`, body.Name, body.Icon, id, claims.SalonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}

// DeleteResource DELETE /api/resources/{id} — soft delete
func (a *App) DeleteResource(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if _, err := a.DB.ExecContext(r.Context(),
		`UPDATE resources SET is_active=0 WHERE id=? AND salon_id=?`, id, claims.SalonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}
