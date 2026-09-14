package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

type salonSettings struct {
	ID      uint   `json:"id"`
	SalonID uint   `json:"salon_id"`
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Address string `json:"address"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`

	Timezone string  `json:"timezone"`
	Currency string  `json:"currency"`
	TaxRate  float64 `json:"tax_rate"`

	// Logo & branding
	LogoURL string `json:"logo_url"`

	// Australian tax
	ABN           string `json:"abn"`
	GSTRegistered bool   `json:"gst_registered"`

	// Social & online presence
	WebsiteURL   string `json:"website_url"`
	InstagramURL string `json:"instagram_url"`
	FacebookURL  string `json:"facebook_url"`

	// Opening hours (flat columns)
	MonOpen   string `json:"mon_open"`
	MonClose  string `json:"mon_close"`
	MonClosed bool   `json:"mon_closed"`
	TueOpen   string `json:"tue_open"`
	TueClose  string `json:"tue_close"`
	TueClosed bool   `json:"tue_closed"`
	WedOpen   string `json:"wed_open"`
	WedClose  string `json:"wed_close"`
	WedClosed bool   `json:"wed_closed"`
	ThuOpen   string `json:"thu_open"`
	ThuClose  string `json:"thu_close"`
	ThuClosed bool   `json:"thu_closed"`
	FriOpen   string `json:"fri_open"`
	FriClose  string `json:"fri_close"`
	FriClosed bool   `json:"fri_closed"`
	SatOpen   string `json:"sat_open"`
	SatClose  string `json:"sat_close"`
	SatClosed bool   `json:"sat_closed"`
	SunOpen   string `json:"sun_open"`
	SunClose  string `json:"sun_close"`
	SunClosed bool   `json:"sun_closed"`

	// Review automation
	ReviewEnabled    bool   `json:"review_enabled"`
	ReviewChannel    string `json:"review_channel"`
	ReviewDelayHours int    `json:"review_delay_hours"`
	YelpURL          string `json:"yelp_url"`
	GoogleReviewURL  string `json:"google_review_url"`

	UpdatedAt time.Time `json:"updated_at"`
}

const settingsSelectCols = `id, salon_id, name,
	COALESCE(phone,''), COALESCE(email,''), COALESCE(address,''),
	COALESCE(city,'Melbourne'), COALESCE(state,'VIC'), COALESCE(zip,''),
	COALESCE(timezone,'Australia/Melbourne'), COALESCE(currency,'AUD'), tax_rate,
	COALESCE(logo_url,''),
	COALESCE(abn,''), COALESCE(gst_registered,0),
	COALESCE(website_url,''), COALESCE(instagram_url,''), COALESCE(facebook_url,''),
	mon_open, mon_close, mon_closed,
	tue_open, tue_close, tue_closed,
	wed_open, wed_close, wed_closed,
	thu_open, thu_close, thu_closed,
	fri_open, fri_close, fri_closed,
	sat_open, sat_close, sat_closed,
	sun_open, sun_close, sun_closed,
	COALESCE(review_enabled,0), COALESCE(review_channel,'sms'), COALESCE(review_delay_hours,2),
	COALESCE(yelp_url,''), COALESCE(google_review_url,''),
	updated_at`

func scanSettings(row *sql.Row, s *salonSettings) error {
	return row.Scan(
		&s.ID, &s.SalonID, &s.Name,
		&s.Phone, &s.Email, &s.Address,
		&s.City, &s.State, &s.Zip,
		&s.Timezone, &s.Currency, &s.TaxRate,
		&s.LogoURL,
		&s.ABN, &s.GSTRegistered,
		&s.WebsiteURL, &s.InstagramURL, &s.FacebookURL,
		&s.MonOpen, &s.MonClose, &s.MonClosed,
		&s.TueOpen, &s.TueClose, &s.TueClosed,
		&s.WedOpen, &s.WedClose, &s.WedClosed,
		&s.ThuOpen, &s.ThuClose, &s.ThuClosed,
		&s.FriOpen, &s.FriClose, &s.FriClosed,
		&s.SatOpen, &s.SatClose, &s.SatClosed,
		&s.SunOpen, &s.SunClose, &s.SunClosed,
		&s.ReviewEnabled, &s.ReviewChannel, &s.ReviewDelayHours,
		&s.YelpURL, &s.GoogleReviewURL,
		&s.UpdatedAt,
	)
}

// GET /api/v1/settings
func (a *App) GetSettings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var s salonSettings
	err := scanSettings(a.DB.QueryRowContext(r.Context(),
		`SELECT `+settingsSelectCols+` FROM salon_settings WHERE salon_id = ?`, claims.SalonID), &s)

	if err == sql.ErrNoRows {
		_, iErr := a.DB.ExecContext(r.Context(),
			`INSERT INTO salon_settings (salon_id) VALUES (?) ON DUPLICATE KEY UPDATE salon_id=salon_id`,
			claims.SalonID)
		if iErr != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
		err = scanSettings(a.DB.QueryRowContext(r.Context(),
			`SELECT `+settingsSelectCols+` FROM salon_settings WHERE salon_id = ?`, claims.SalonID), &s)
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, s)
}

const updateSettingsSQL = `UPDATE salon_settings SET
	name=?, phone=?, email=?, address=?, city=?, state=?, zip=?,
	timezone=?, currency=?, tax_rate=?,
	logo_url=?,
	abn=?, gst_registered=?,
	website_url=?, instagram_url=?, facebook_url=?,
	mon_open=?, mon_close=?, mon_closed=?,
	tue_open=?, tue_close=?, tue_closed=?,
	wed_open=?, wed_close=?, wed_closed=?,
	thu_open=?, thu_close=?, thu_closed=?,
	fri_open=?, fri_close=?, fri_closed=?,
	sat_open=?, sat_close=?, sat_closed=?,
	sun_open=?, sun_close=?, sun_closed=?,
	review_enabled=?, review_channel=?, review_delay_hours=?,
	yelp_url=?, google_review_url=?
WHERE salon_id=?`

func updateSettingsArgs(req salonSettings, salonID uint) []any {
	return []any{
		req.Name, req.Phone, req.Email, req.Address, req.City, req.State, req.Zip,
		req.Timezone, req.Currency, req.TaxRate,
		req.LogoURL,
		req.ABN, req.GSTRegistered,
		req.WebsiteURL, req.InstagramURL, req.FacebookURL,
		req.MonOpen, req.MonClose, req.MonClosed,
		req.TueOpen, req.TueClose, req.TueClosed,
		req.WedOpen, req.WedClose, req.WedClosed,
		req.ThuOpen, req.ThuClose, req.ThuClosed,
		req.FriOpen, req.FriClose, req.FriClosed,
		req.SatOpen, req.SatClose, req.SatClosed,
		req.SunOpen, req.SunClose, req.SunClosed,
		req.ReviewEnabled, req.ReviewChannel, req.ReviewDelayHours,
		req.YelpURL, req.GoogleReviewURL,
		salonID,
	}
}

// PUT /api/v1/settings
func (a *App) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var req salonSettings
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	res, err := a.DB.ExecContext(r.Context(), updateSettingsSQL, updateSettingsArgs(req, claims.SalonID)...)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		_, _ = a.DB.ExecContext(r.Context(),
			`INSERT INTO salon_settings (salon_id) VALUES (?) ON DUPLICATE KEY UPDATE salon_id=salon_id`,
			claims.SalonID)
		_, err = a.DB.ExecContext(r.Context(), updateSettingsSQL, updateSettingsArgs(req, claims.SalonID)...)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	var s salonSettings
	err = scanSettings(a.DB.QueryRowContext(r.Context(),
		`SELECT `+settingsSelectCols+` FROM salon_settings WHERE salon_id = ?`, claims.SalonID), &s)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, s)
}
