package handlers

import (
	"net/http"
	"strconv"
)

type serviceAddon struct {
	ID          int     `json:"id"`
	SalonID     int     `json:"salon_id"`
	ServiceID   int     `json:"service_id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	DurationMin int     `json:"duration_min"`
	IsActive    bool    `json:"is_active"`
}

// GET /api/v1/services/{id}/addons
func (a *App) ListAddons(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	serviceID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid service id")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, service_id, name, price, duration_min, is_active
		 FROM service_addons
		 WHERE service_id=? AND salon_id=? AND is_active=1
		 ORDER BY name`, serviceID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var list []serviceAddon
	for rows.Next() {
		var a serviceAddon
		rows.Scan(&a.ID, &a.SalonID, &a.ServiceID, &a.Name, &a.Price, &a.DurationMin, &a.IsActive)
		list = append(list, a)
	}
	if list == nil {
		list = []serviceAddon{}
	}
	w.Header().Set("Content-Type", "application/json")
	a.JSON(w, http.StatusOK, list)
}

// POST /api/v1/services/{id}/addons
func (a *App) CreateAddon(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	serviceID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid service id")
		return
	}

	var body struct {
		Name        string  `json:"name"`
		Price       float64 `json:"price"`
		DurationMin int     `json:"duration_min"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO service_addons (salon_id, service_id, name, price, duration_min)
		 VALUES (?,?,?,?,?)`,
		claims.SalonID, serviceID, body.Name, body.Price, body.DurationMin)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, serviceAddon{
		ID: int(id), SalonID: int(claims.SalonID), ServiceID: int(serviceID),
		Name: body.Name, Price: body.Price, DurationMin: body.DurationMin, IsActive: true,
	})
}

// PUT /api/v1/services/{id}/addons/{addonId}
func (a *App) UpdateAddon(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	serviceID, _ := pathID(r, "id")
	addonID, err := strconv.ParseInt(r.PathValue("addonId"), 10, 64)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid addon id")
		return
	}

	var body struct {
		Name        string  `json:"name"`
		Price       float64 `json:"price"`
		DurationMin int     `json:"duration_min"`
		IsActive    bool    `json:"is_active"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE service_addons SET name=?, price=?, duration_min=?, is_active=?
		 WHERE id=? AND service_id=? AND salon_id=?`,
		body.Name, body.Price, body.DurationMin, body.IsActive,
		addonID, serviceID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"updated": true})
}

// DELETE /api/v1/services/{id}/addons/{addonId}
func (a *App) DeleteAddon(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	serviceID, _ := pathID(r, "id")
	addonID, err := strconv.ParseInt(r.PathValue("addonId"), 10, 64)
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid addon id")
		return
	}

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE service_addons SET is_active=0 WHERE id=? AND service_id=? AND salon_id=?`,
		addonID, serviceID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// PATCH /api/v1/services/{id}/toggle — toggle active/inactive
func (a *App) ToggleService(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE services SET is_active = NOT is_active WHERE id=? AND salon_id=?`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	var isActive bool
	a.DB.QueryRowContext(r.Context(), `SELECT is_active FROM services WHERE id=?`, id).Scan(&isActive)
	a.JSON(w, http.StatusOK, map[string]any{"id": id, "is_active": isActive})
}
