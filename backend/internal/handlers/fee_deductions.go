package handlers

import "net/http"

type FeeDeduction struct {
	ID        uint    `json:"id"`
	StaffID   uint    `json:"staff_id"`
	StaffName string  `json:"staff_name"`
	Amount    float64 `json:"amount"`
	Reason    string  `json:"reason"`
	CreatedAt string  `json:"created_at"`
}

// ListFeeDeductions GET /api/fee-deductions — optionally filtered by ?from=&to=
func (a *App) ListFeeDeductions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	query := `
		SELECT f.id, f.staff_id, TRIM(CONCAT(u.first_name,' ',u.last_name)),
		       f.amount, COALESCE(f.reason,''), DATE_FORMAT(f.created_at,'%Y-%m-%dT%H:%i:%sZ')
		FROM fee_deductions f
		JOIN staff_profiles sp ON sp.id = f.staff_id
		JOIN users u ON u.id = sp.user_id
		WHERE f.salon_id = ?`
	args := []any{claims.SalonID}

	if from := r.URL.Query().Get("from"); from != "" {
		if to := r.URL.Query().Get("to"); to != "" {
			query += ` AND DATE(f.created_at) BETWEEN ? AND ?`
			args = append(args, from, to)
		}
	}
	query += ` ORDER BY f.created_at DESC`

	rows, err := a.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	list := []FeeDeduction{}
	for rows.Next() {
		var f FeeDeduction
		if rows.Scan(&f.ID, &f.StaffID, &f.StaffName, &f.Amount, &f.Reason, &f.CreatedAt) == nil {
			list = append(list, f)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

// CreateFeeDeduction POST /api/fee-deductions — body: { staff_id, amount, reason }
func (a *App) CreateFeeDeduction(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		StaffID uint    `json:"staff_id"`
		Amount  float64 `json:"amount"`
		Reason  string  `json:"reason"`
	}
	if err := a.Decode(r, &body); err != nil || body.StaffID == 0 || body.Amount <= 0 {
		a.Error(w, http.StatusBadRequest, "staff_id and a positive amount are required")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO fee_deductions (salon_id, staff_id, amount, reason) VALUES (?,?,?,?)`,
		claims.SalonID, body.StaffID, body.Amount, body.Reason)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{"id": id})
}

// DeleteFeeDeduction DELETE /api/fee-deductions/{id}
func (a *App) DeleteFeeDeduction(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if _, err := a.DB.ExecContext(r.Context(),
		`DELETE FROM fee_deductions WHERE id=? AND salon_id=?`, id, claims.SalonID); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}
