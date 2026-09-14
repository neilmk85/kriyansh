package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// logActivity records an audit trail entry. Never fails the calling request —
// logging is best-effort.
func (a *App) logActivity(ctx context.Context, salonID, userID uint, action, entity string, entityID uint, meta map[string]any) {
	metaJSON, _ := json.Marshal(meta)
	a.DB.ExecContext(ctx,
		`INSERT INTO audit_logs (salon_id, user_id, action, entity, entity_id, meta) VALUES (?,?,?,?,?,?)`,
		salonID, userID, action, entity, entityID, string(metaJSON))
}

// ListAppointmentActivity GET /api/appointments/{id}/activity
func (a *App) ListAppointmentActivity(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT al.action, COALESCE(al.meta, 'null'), al.created_at,
		       TRIM(COALESCE(CONCAT(u.first_name,' ',u.last_name),''))
		FROM audit_logs al
		LEFT JOIN users u ON u.id = al.user_id
		WHERE al.salon_id=? AND al.entity='appointment' AND al.entity_id=?
		ORDER BY al.created_at DESC
		LIMIT 100`, claims.SalonID, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type entry struct {
		Action    string         `json:"action"`
		Meta      map[string]any `json:"meta"`
		CreatedAt time.Time      `json:"created_at"`
		ActorName string         `json:"actor_name"`
	}
	list := []entry{}
	for rows.Next() {
		var e entry
		var metaRaw string
		if err := rows.Scan(&e.Action, &metaRaw, &e.CreatedAt, &e.ActorName); err != nil {
			continue
		}
		json.Unmarshal([]byte(metaRaw), &e.Meta)
		list = append(list, e)
	}
	a.JSON(w, http.StatusOK, list)
}

// UpdateAppointmentNotes PATCH /api/appointments/{id}/notes — body: { notes }
func (a *App) UpdateAppointmentNotes(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Notes string `json:"notes"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET notes=? WHERE id=? AND salon_id=?`, body.Notes, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	if affected, _ := res.RowsAffected(); affected == 0 {
		a.Error(w, http.StatusNotFound, "appointment not found")
		return
	}
	a.logActivity(r.Context(), claims.SalonID, claims.UserID, "note_updated", "appointment", uint(id), map[string]any{"notes": body.Notes})
	a.JSON(w, http.StatusOK, map[string]any{"notes": body.Notes})
}

// AddServiceToAppointment POST /api/appointments/{id}/services — appends a
// service to an existing appointment and extends end_at by its duration.
// Body: { service_id, price, duration_min }
func (a *App) AddServiceToAppointment(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		ServiceID   uint    `json:"service_id"`
		Price       float64 `json:"price"`
		DurationMin int     `json:"duration_min"`
		ServiceName string  `json:"service_name"`
	}
	if err := a.Decode(r, &body); err != nil || body.ServiceID == 0 || body.DurationMin <= 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	var staffID uint
	var resourceID *uint
	var startAt, endAt time.Time
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT staff_id, resource_id, start_at, end_at FROM appointments WHERE id=? AND salon_id=?`, id, claims.SalonID).
		Scan(&staffID, &resourceID, &startAt, &endAt)
	if err != nil {
		a.Error(w, http.StatusNotFound, "appointment not found")
		return
	}

	newEnd := endAt.Add(time.Duration(body.DurationMin) * time.Minute)

	var conflicts int
	a.DB.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM appointments
		WHERE salon_id=? AND staff_id=? AND id<>?
		  AND status NOT IN ('cancelled','no_show')
		  AND start_at < ? AND end_at > ?`,
		claims.SalonID, staffID, id, newEnd, endAt).Scan(&conflicts)
	if conflicts > 0 {
		a.Error(w, http.StatusConflict, "extending this appointment would overlap the team member's next booking")
		return
	}

	if resourceID != nil {
		conflict, err := a.resourceConflict(r.Context(), claims.SalonID, *resourceID, uint64(id), endAt, newEnd)
		if err == nil && conflict {
			a.Error(w, http.StatusConflict, "extending this appointment would overlap the resource's next booking")
			return
		}
	}

	if _, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO appointment_services (appointment_id, service_id, price, duration_min) VALUES (?,?,?,?)`,
		id, body.ServiceID, body.Price, body.DurationMin); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := a.DB.ExecContext(r.Context(),
		`UPDATE appointments SET end_at=? WHERE id=? AND salon_id=?`, newEnd, id, claims.SalonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	a.logActivity(r.Context(), claims.SalonID, claims.UserID, "service_added", "appointment", uint(id), map[string]any{
		"service_id": body.ServiceID, "service_name": body.ServiceName, "duration_min": body.DurationMin,
	})
	a.JSON(w, http.StatusOK, map[string]any{"end_at": newEnd})
}
