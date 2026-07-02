package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"salonos/internal/notify"
)

type App struct {
	DB        *sql.DB
	Secret    string
	Notifier  *notify.Notifier
	AppURL    string
	StripeKey string
}

func (a *App) JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (a *App) Error(w http.ResponseWriter, status int, msg string) {
	a.JSON(w, status, map[string]string{"error": msg})
}

func (a *App) Decode(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
