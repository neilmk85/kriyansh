package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

// Business represents the top-level business entity above locations (salons).
type Business struct {
	ID        int        `json:"id"`
	Name      string     `json:"name"`
	Email     *string    `json:"email,omitempty"`
	Phone     *string    `json:"phone,omitempty"`
	Website   *string    `json:"website,omitempty"`
	LogoURL   *string    `json:"logo_url,omitempty"`
	Country   string     `json:"country"`
	Timezone  string     `json:"timezone"`
	Currency  string     `json:"currency"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// Location is a salon/branch belonging to a business.
type Location struct {
	ID         int     `json:"id"`
	BusinessID int     `json:"business_id"`
	Name       string  `json:"name"`
	Phone      *string `json:"phone,omitempty"`
	Email      *string `json:"email,omitempty"`
	Address    *string `json:"address,omitempty"`
	City       *string `json:"city,omitempty"`
	State      *string `json:"state,omitempty"`
	Zip        *string `json:"zip,omitempty"`
	Timezone   string  `json:"timezone"`
	Currency   string  `json:"currency"`
}

// GET /api/v1/business
// Returns the business that owns the calling salon.
func (a *App) GetBusiness(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims.SalonID == 0 {
		a.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var businessID int
	err := a.DB.QueryRow(`SELECT COALESCE(business_id, 1) FROM salons WHERE id = ?`, claims.SalonID).Scan(&businessID)
	if err != nil {
		a.Error(w, http.StatusNotFound, "salon not found")
		return
	}

	var b Business
	err = a.DB.QueryRow(`
		SELECT id, name, COALESCE(email,''), COALESCE(phone,''), COALESCE(website,''),
		       COALESCE(logo_url,''), country, timezone, currency, created_at, updated_at
		FROM businesses WHERE id = ?`, businessID).
		Scan(&b.ID, &b.Name, new(string), new(string), new(string),
			new(string), &b.Country, &b.Timezone, &b.Currency, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "business not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	// re-query with nullable pointers for proper omitempty
	row := a.DB.QueryRow(`
		SELECT id, name, email, phone, website, logo_url, country, timezone, currency, created_at, updated_at
		FROM businesses WHERE id = ?`, businessID)
	var biz Business
	if err := row.Scan(&biz.ID, &biz.Name, &biz.Email, &biz.Phone, &biz.Website,
		&biz.LogoURL, &biz.Country, &biz.Timezone, &biz.Currency, &biz.CreatedAt, &biz.UpdatedAt); err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	a.JSON(w, http.StatusOK, biz)
}

// PUT /api/v1/business
// Updates the business that owns the calling salon.
func (a *App) UpdateBusiness(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims.SalonID == 0 {
		a.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		Name     string  `json:"name"`
		Email    *string `json:"email"`
		Phone    *string `json:"phone"`
		Website  *string `json:"website"`
		LogoURL  *string `json:"logo_url"`
		Country  *string `json:"country"`
		Timezone *string `json:"timezone"`
		Currency *string `json:"currency"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	var businessID int
	if err := a.DB.QueryRow(`SELECT COALESCE(business_id, 1) FROM salons WHERE id = ?`, claims.SalonID).
		Scan(&businessID); err != nil {
		a.Error(w, http.StatusNotFound, "salon not found")
		return
	}

	_, err := a.DB.Exec(`
		UPDATE businesses SET
			name = COALESCE(NULLIF(?, ''), name),
			email = COALESCE(?, email),
			phone = COALESCE(?, phone),
			website = COALESCE(?, website),
			logo_url = COALESCE(?, logo_url),
			country = COALESCE(?, country),
			timezone = COALESCE(?, timezone),
			currency = COALESCE(?, currency)
		WHERE id = ?`,
		body.Name, body.Email, body.Phone, body.Website, body.LogoURL,
		body.Country, body.Timezone, body.Currency, businessID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	a.GetBusiness(w, r)
}

// GET /api/v1/business/locations
// Lists all salons (locations) under the same business as the calling salon.
func (a *App) ListLocations(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims.SalonID == 0 {
		a.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var businessID int
	if err := a.DB.QueryRow(`SELECT COALESCE(business_id, 1) FROM salons WHERE id = ?`, claims.SalonID).
		Scan(&businessID); err != nil {
		a.Error(w, http.StatusNotFound, "salon not found")
		return
	}

	rows, err := a.DB.Query(`
		SELECT s.id, COALESCE(s.business_id, 1), ss.name, ss.phone, ss.email,
		       ss.address, ss.city, ss.state, ss.zip,
		       COALESCE(ss.timezone, 'Australia/Melbourne'), COALESCE(ss.currency, 'AUD')
		FROM salons s
		LEFT JOIN salon_settings ss ON ss.salon_id = s.id
		WHERE COALESCE(s.business_id, 1) = ?
		ORDER BY s.id`, businessID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var locations []Location
	for rows.Next() {
		var l Location
		if err := rows.Scan(&l.ID, &l.BusinessID, &l.Name, &l.Phone, &l.Email,
			&l.Address, &l.City, &l.State, &l.Zip, &l.Timezone, &l.Currency); err != nil {
			continue
		}
		locations = append(locations, l)
	}
	if locations == nil {
		locations = []Location{}
	}
	a.JSON(w, http.StatusOK, locations)
}

// POST /api/v1/business/locations
// Creates a new salon (location) under the same business as the calling salon.
func (a *App) CreateLocation(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims.SalonID == 0 {
		a.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		Name     string  `json:"name"`
		Phone    *string `json:"phone"`
		Email    *string `json:"email"`
		Address  *string `json:"address"`
		City     *string `json:"city"`
		State    *string `json:"state"`
		Zip      *string `json:"zip"`
		Timezone *string `json:"timezone"`
		Currency *string `json:"currency"`
	}
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	var businessID int
	if err := a.DB.QueryRow(`SELECT COALESCE(business_id, 1) FROM salons WHERE id = ?`, claims.SalonID).
		Scan(&businessID); err != nil {
		a.Error(w, http.StatusNotFound, "salon not found")
		return
	}

	// Create the salon row
	res, err := a.DB.Exec(`INSERT INTO salons (business_id) VALUES (?)`, businessID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	newSalonID, _ := res.LastInsertId()

	tz := "Australia/Melbourne"
	if body.Timezone != nil && *body.Timezone != "" {
		tz = *body.Timezone
	}
	cur := "AUD"
	if body.Currency != nil && *body.Currency != "" {
		cur = *body.Currency
	}

	// Create salon_settings for the new location
	_, err = a.DB.Exec(`
		INSERT INTO salon_settings (salon_id, name, phone, email, address, city, state, zip, timezone, currency)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		newSalonID, body.Name, body.Phone, body.Email,
		body.Address, body.City, body.State, body.Zip, tz, cur)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	a.JSON(w, http.StatusCreated, map[string]any{
		"id":          newSalonID,
		"business_id": businessID,
		"name":        body.Name,
		"timezone":    tz,
		"currency":    cur,
	})
}
