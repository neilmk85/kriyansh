package handlers

import (
	"net/http"
)

type upsellPair struct {
	ID                uint   `json:"id"`
	SalonID           uint   `json:"salon_id"`
	ServiceID         uint   `json:"service_id"`
	ServiceName       string `json:"service_name"`
	UpsellServiceID   uint   `json:"upsell_service_id"`
	UpsellServiceName string `json:"upsell_service_name"`
	Message           string `json:"message"`
	IsActive          bool   `json:"is_active"`
}

func (a *App) ListUpsells(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT up.id, up.salon_id, up.service_id, s1.name,
		        up.upsell_service_id, s2.name, up.message, up.is_active
		 FROM upsell_pairs up
		 JOIN services s1 ON s1.id = up.service_id
		 JOIN services s2 ON s2.id = up.upsell_service_id
		 WHERE up.salon_id=? AND up.is_active=1
		 ORDER BY s1.name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var pairs []upsellPair
	for rows.Next() {
		var p upsellPair
		rows.Scan(&p.ID, &p.SalonID, &p.ServiceID, &p.ServiceName,
			&p.UpsellServiceID, &p.UpsellServiceName, &p.Message, &p.IsActive)
		pairs = append(pairs, p)
	}
	if pairs == nil {
		pairs = []upsellPair{}
	}
	a.JSON(w, http.StatusOK, pairs)
}

func (a *App) GetUpsellsForService(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	serviceID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT up.id, up.salon_id, up.service_id, s1.name,
		        up.upsell_service_id, s2.name, up.message, up.is_active
		 FROM upsell_pairs up
		 JOIN services s1 ON s1.id = up.service_id
		 JOIN services s2 ON s2.id = up.upsell_service_id
		 WHERE up.salon_id=? AND up.service_id=? AND up.is_active=1`, claims.SalonID, serviceID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var pairs []upsellPair
	for rows.Next() {
		var p upsellPair
		rows.Scan(&p.ID, &p.SalonID, &p.ServiceID, &p.ServiceName,
			&p.UpsellServiceID, &p.UpsellServiceName, &p.Message, &p.IsActive)
		pairs = append(pairs, p)
	}
	if pairs == nil {
		pairs = []upsellPair{}
	}
	a.JSON(w, http.StatusOK, pairs)
}

func (a *App) CreateUpsell(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		ServiceID       uint   `json:"service_id"`
		UpsellServiceID uint   `json:"upsell_service_id"`
		Message         string `json:"message"`
	}
	if err := a.Decode(r, &body); err != nil || body.ServiceID == 0 || body.UpsellServiceID == 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Message == "" {
		body.Message = "Customers who add this love the combo!"
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO upsell_pairs (salon_id, service_id, upsell_service_id, message)
		 VALUES (?,?,?,?)`,
		claims.SalonID, body.ServiceID, body.UpsellServiceID, body.Message)
	if err != nil {
		a.Error(w, http.StatusConflict, "upsell pair already exists or db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{
		"id":                id,
		"salon_id":          claims.SalonID,
		"service_id":        body.ServiceID,
		"upsell_service_id": body.UpsellServiceID,
		"message":           body.Message,
	})
}

func (a *App) DeleteUpsell(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE upsell_pairs SET is_active=0 WHERE id=? AND salon_id=?`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}
