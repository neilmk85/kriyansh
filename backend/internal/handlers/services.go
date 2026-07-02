package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"salonos/internal/auth"
	"salonos/internal/middleware"
	"salonos/internal/models"
)

// ── Service Categories ─────────────────────────────────────────────────────

func (a *App) ListCategories(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, color, sort_order FROM service_categories
		 WHERE salon_id=? ORDER BY sort_order, name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var cats []models.ServiceCategory
	for rows.Next() {
		var c models.ServiceCategory
		rows.Scan(&c.ID, &c.SalonID, &c.Name, &c.Color, &c.SortOrder)
		cats = append(cats, c)
	}
	if cats == nil {
		cats = []models.ServiceCategory{}
	}
	a.JSON(w, http.StatusOK, cats)
}

func (a *App) CreateCategory(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var c models.ServiceCategory
	if err := a.Decode(r, &c); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	c.SalonID = claims.SalonID
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO service_categories (salon_id, name, color, sort_order) VALUES (?,?,?,?)`,
		c.SalonID, c.Name, c.Color, c.SortOrder)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	c.ID = uint(id)
	a.JSON(w, http.StatusCreated, c)
}

// ── Services ───────────────────────────────────────────────────────────────

func (a *App) ListServices(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT s.id, s.salon_id, s.category_id, s.name,
		        COALESCE(s.description,''), s.duration_min, s.price,
		        COALESCE(s.price_type,'fixed'), s.deposit_amt,
		        COALESCE(s.gender,'any'), s.is_active
		 FROM services s WHERE s.salon_id=? ORDER BY s.name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var svcs []models.Service
	for rows.Next() {
		var s models.Service
		rows.Scan(&s.ID, &s.SalonID, &s.CategoryID, &s.Name, &s.Description,
			&s.DurationMin, &s.Price, &s.PriceType, &s.DepositAmt, &s.Gender, &s.IsActive)
		svcs = append(svcs, s)
	}
	if svcs == nil {
		svcs = []models.Service{}
	}
	a.JSON(w, http.StatusOK, svcs)
}

func (a *App) CreateService(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var s models.Service
	if err := a.Decode(r, &s); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.SalonID = claims.SalonID
	if s.PriceType == "" {
		s.PriceType = "fixed"
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO services (salon_id, category_id, name, description, duration_min, price, price_type, deposit_amt, gender)
		 VALUES (?,?,?,?,?,?,?,?,?)`,
		s.SalonID, s.CategoryID, s.Name, s.Description, s.DurationMin, s.Price, s.PriceType, s.DepositAmt, s.Gender)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	s.ID = uint(id)
	s.IsActive = true
	a.JSON(w, http.StatusCreated, s)
}

func (a *App) UpdateService(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var s models.Service
	if err := a.Decode(r, &s); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if s.PriceType == "" {
		s.PriceType = "fixed"
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE services SET category_id=?, name=?, description=?, duration_min=?,
		 price=?, price_type=?, deposit_amt=?, gender=?, is_active=?
		 WHERE id=? AND salon_id=?`,
		s.CategoryID, s.Name, s.Description, s.DurationMin,
		s.Price, s.PriceType, s.DepositAmt, s.Gender, s.IsActive, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	s.ID = uint(id)
	s.SalonID = claims.SalonID
	a.JSON(w, http.StatusOK, s)
}

func (a *App) DeleteService(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	// Soft delete
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE services SET is_active=0 WHERE id=? AND salon_id=?`, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil { a.Error(w, http.StatusBadRequest, "invalid id"); return }
	var c models.ServiceCategory
	if err := a.Decode(r, &c); err != nil { a.Error(w, http.StatusBadRequest, "invalid body"); return }
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE service_categories SET name=?, color=? WHERE id=? AND salon_id=?`,
		c.Name, c.Color, id, claims.SalonID)
	if err != nil { a.Error(w, http.StatusInternalServerError, "db error"); return }
	c.ID = uint(id)
	a.JSON(w, http.StatusOK, c)
}

func (a *App) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil { a.Error(w, http.StatusBadRequest, "invalid id"); return }
	// Unlink services first
	a.DB.ExecContext(r.Context(), `UPDATE services SET category_id=NULL WHERE category_id=? AND salon_id=?`, id, claims.SalonID)
	_, err = a.DB.ExecContext(r.Context(), `DELETE FROM service_categories WHERE id=? AND salon_id=?`, id, claims.SalonID)
	if err != nil { a.Error(w, http.StatusInternalServerError, "db error"); return }
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ── Public endpoints (no auth — customer landing page) ─────────────────────

// PublicListCategories GET /api/public/categories — returns categories with service counts for salon 1
func (a *App) PublicListCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT sc.id, sc.name, COALESCE(sc.color,'#0D9488'),
		        COUNT(s.id) as service_count
		 FROM service_categories sc
		 LEFT JOIN services s ON s.category_id = sc.id AND s.is_active = 1
		 WHERE sc.salon_id = 1
		 GROUP BY sc.id, sc.name, sc.color
		 ORDER BY sc.sort_order, sc.name`)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	type PublicCategory struct {
		ID           uint   `json:"id"`
		Name         string `json:"name"`
		Color        string `json:"color"`
		ServiceCount int    `json:"service_count"`
	}
	var cats []PublicCategory
	for rows.Next() {
		var c PublicCategory
		rows.Scan(&c.ID, &c.Name, &c.Color, &c.ServiceCount)
		cats = append(cats, c)
	}
	if cats == nil {
		cats = []PublicCategory{}
	}
	a.JSON(w, http.StatusOK, cats)
}

// PublicListServices GET /api/public/services — returns all active services for salon 1
func (a *App) PublicListServices(w http.ResponseWriter, r *http.Request) {
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT s.id, s.name, COALESCE(s.description,''),
		        s.duration_min, s.price, COALESCE(s.price_type,'fixed'),
		        COALESCE(sc.name,'') as category_name, COALESCE(sc.color,'#0D9488') as category_color,
		        COALESCE(s.gender,'any')
		 FROM services s
		 LEFT JOIN service_categories sc ON sc.id = s.category_id
		 WHERE s.salon_id = 1 AND s.is_active = 1
		 ORDER BY sc.sort_order, s.name`)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	type PublicService struct {
		ID            uint    `json:"id"`
		Name          string  `json:"name"`
		Description   string  `json:"description"`
		DurationMin   int     `json:"duration_min"`
		Price         float64 `json:"price"`
		PriceType     string  `json:"price_type"`
		CategoryName  string  `json:"category_name"`
		CategoryColor string  `json:"category_color"`
		Gender        string  `json:"gender"`
	}
	var svcs []PublicService
	for rows.Next() {
		var s PublicService
		rows.Scan(&s.ID, &s.Name, &s.Description, &s.DurationMin, &s.Price, &s.PriceType, &s.CategoryName, &s.CategoryColor, &s.Gender)
		svcs = append(svcs, s)
	}
	if svcs == nil {
		svcs = []PublicService{}
	}
	a.JSON(w, http.StatusOK, svcs)
}

// ── helpers ────────────────────────────────────────────────────────────────

func claimsFrom(r *http.Request) *auth.Claims {
	if c, ok := r.Context().Value(middleware.ClaimsKey).(*auth.Claims); ok {
		return c
	}
	return &auth.Claims{}
}

func pathID(r *http.Request, key string) (uint64, error) {
	val := r.PathValue(key)
	return strconv.ParseUint(val, 10, 64)
}

var _ = sql.ErrNoRows // used in auth.go
