package handlers

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"
)

// paxPost sends a POSLINK HTTP request to the PAX terminal and returns
// the parsed key=value response. The caller supplies the full endpoint URL.
func paxPost(endpoint string, params url.Values, timeout time.Duration) (url.Values, error) {
	client := &http.Client{Timeout: timeout}

	resp, err := client.PostForm(endpoint, params)
	if err != nil {
		return nil, fmt.Errorf("terminal unreachable: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read terminal response: %w", err)
	}

	result, err := url.ParseQuery(string(body))
	if err != nil {
		return nil, fmt.Errorf("parse terminal response: %w", err)
	}
	return result, nil
}

// getPAXConfig fetches the terminal IP and port for the requesting salon.
func (a *App) getPAXConfig(r *http.Request, salonID uint) (ip string, port int, err error) {
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(pax_terminal_ip,''), COALESCE(pax_terminal_port, 10009)
		 FROM salon_settings WHERE salon_id = ?`, salonID).Scan(&ip, &port)
	return
}

// POST /api/v1/pax/charge
//
// Sends a DoCredit (sale) request to the configured PAX terminal and waits
// for the customer to tap/insert their card. Blocks until the terminal
// responds (can take up to ~120 s). The frontend should show a "waiting…"
// spinner for the duration.
func (a *App) PAXCharge(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var req struct {
		Amount     float64 `json:"amount"`
		RefNum     string  `json:"ref_num"`
		TenderType string  `json:"tender_type"` // CREDIT | DEBIT (default: CREDIT)
	}
	if err := a.Decode(r, &req); err != nil || req.Amount <= 0 {
		a.Error(w, http.StatusBadRequest, "amount > 0 required")
		return
	}

	ip, port, err := a.getPAXConfig(r, claims.SalonID)
	if err != nil || ip == "" {
		a.Error(w, http.StatusBadRequest, "PAX terminal IP not configured — add it in Settings → Terminal")
		return
	}

	if req.TenderType == "" {
		req.TenderType = "CREDIT"
	}
	if req.RefNum == "" {
		req.RefNum = fmt.Sprintf("KS%d", time.Now().UnixMilli())
	}

	endpoint := fmt.Sprintf("http://%s:%d/", ip, port)
	params := url.Values{
		"Type":        {"33"},           // DoCredit
		"CommandType": {"D"},            // Start
		"Sequence":    {"000001"},
		"Timeout":     {"120"},          // 2-minute customer timeout
		"Amount":      {fmt.Sprintf("%.2f", req.Amount)},
		"TransType":   {"01"},           // Sale
		"TenderType":  {req.TenderType},
		"ECRRefNum":   {req.RefNum},
	}

	result, err := paxPost(endpoint, params, 150*time.Second)
	if err != nil {
		a.Error(w, http.StatusBadGateway, err.Error())
		return
	}

	approved := result.Get("ResultCode") == "000000"
	a.JSON(w, http.StatusOK, map[string]any{
		"approved":    approved,
		"result_code": result.Get("ResultCode"),
		"auth_code":   result.Get("AuthCode"),
		"message":     result.Get("Message"),
		"ref_num":     result.Get("ECRRefNum"),
		"card_type":   result.Get("CardType"),
		"masked_pan":  result.Get("MaskedPAN"),
		"host_code":   result.Get("HostCode"),
	})
}

// POST /api/v1/pax/void
//
// Voids the most recent terminal transaction (same amount, same ref).
func (a *App) PAXVoid(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var req struct {
		OrigRefNum string  `json:"orig_ref_num"`
		Amount     float64 `json:"amount"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	ip, port, err := a.getPAXConfig(r, claims.SalonID)
	if err != nil || ip == "" {
		a.Error(w, http.StatusBadRequest, "PAX terminal not configured")
		return
	}

	endpoint := fmt.Sprintf("http://%s:%d/", ip, port)
	params := url.Values{
		"Type":        {"33"},
		"CommandType": {"D"},
		"Sequence":    {"000002"},
		"Timeout":     {"60"},
		"Amount":      {fmt.Sprintf("%.2f", req.Amount)},
		"TransType":   {"02"}, // Void
		"TenderType":  {"CREDIT"},
		"OrigRefNum":  {req.OrigRefNum},
	}

	result, err := paxPost(endpoint, params, 75*time.Second)
	if err != nil {
		a.Error(w, http.StatusBadGateway, err.Error())
		return
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"approved":    result.Get("ResultCode") == "000000",
		"result_code": result.Get("ResultCode"),
		"message":     result.Get("Message"),
	})
}

// GET /api/v1/pax/ping
//
// Checks whether the PAX terminal is reachable on the local network.
// Uses a TCP dial (3-second timeout) — much faster than a full POSLINK round-trip.
func (a *App) PAXPing(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	ip, port, err := a.getPAXConfig(r, claims.SalonID)
	if err != nil || ip == "" {
		a.JSON(w, http.StatusOK, map[string]any{
			"online": false,
			"reason": "not configured",
		})
		return
	}

	addr := fmt.Sprintf("%s:%d", ip, port)
	conn, err := net.DialTimeout("tcp", addr, 3*time.Second)
	if err != nil {
		a.JSON(w, http.StatusOK, map[string]any{
			"online": false,
			"reason": err.Error(),
			"ip":     ip,
			"port":   port,
		})
		return
	}
	conn.Close()

	a.JSON(w, http.StatusOK, map[string]any{
		"online": true,
		"ip":     ip,
		"port":   port,
	})
}

// GET /api/v1/pax/settings
func (a *App) GetPAXSettings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	ip, port, _ := a.getPAXConfig(r, claims.SalonID)
	a.JSON(w, http.StatusOK, map[string]any{
		"pax_terminal_ip":   ip,
		"pax_terminal_port": port,
	})
}

// PUT /api/v1/pax/settings
func (a *App) UpdatePAXSettings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)

	var req struct {
		IP   string `json:"pax_terminal_ip"`
		Port int    `json:"pax_terminal_port"`
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Port == 0 {
		req.Port = 10009
	}

	_, err := a.DB.ExecContext(r.Context(),
		`UPDATE salon_settings SET pax_terminal_ip=?, pax_terminal_port=? WHERE salon_id=?`,
		req.IP, req.Port, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"pax_terminal_ip":   req.IP,
		"pax_terminal_port": req.Port,
	})
}
