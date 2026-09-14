package handlers

import "net/http"

type ServiceCommission struct {
	ServiceID     uint    `json:"service_id"`
	CommissionPct float64 `json:"commission_pct"`
}

// ListStaffCommissions GET /api/staff/{id}/commissions — per-service commission
// overrides for a staff member. Any service not listed here uses the staff
// member's flat commission_pct.
func (a *App) ListStaffCommissions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	staffID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var spID uint
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT id FROM staff_profiles WHERE id=? AND salon_id=?`, staffID, claims.SalonID).Scan(&spID); err != nil {
		a.Error(w, http.StatusNotFound, "staff not found")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT service_id, commission_pct FROM staff_service_commissions WHERE staff_id=?`, staffID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	list := []ServiceCommission{}
	for rows.Next() {
		var sc ServiceCommission
		if err := rows.Scan(&sc.ServiceID, &sc.CommissionPct); err == nil {
			list = append(list, sc)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

// SetStaffCommissions PUT /api/staff/{id}/commissions — replaces all
// per-service commission overrides for a staff member.
// Body: [{ service_id, commission_pct }]
func (a *App) SetStaffCommissions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	staffID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var spID uint
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT id FROM staff_profiles WHERE id=? AND salon_id=?`, staffID, claims.SalonID).Scan(&spID); err != nil {
		a.Error(w, http.StatusNotFound, "staff not found")
		return
	}

	var body []ServiceCommission
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "tx error")
		return
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(r.Context(),
		`DELETE FROM staff_service_commissions WHERE staff_id=?`, staffID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	for _, sc := range body {
		if sc.ServiceID == 0 {
			continue
		}
		if _, err := tx.ExecContext(r.Context(),
			`INSERT INTO staff_service_commissions (staff_id, service_id, commission_pct) VALUES (?,?,?)`,
			staffID, sc.ServiceID, sc.CommissionPct); err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "commit error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"saved": true})
}
