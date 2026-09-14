package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

// ── Tracking helpers ──────────────────────────────────────────────────────────

// trackWASend inserts a whatsapp_messages row before sending a WhatsApp.
// Returns a unique token and the full click-tracking URL to embed in the message.
func (a *App) trackWASend(ctx context.Context, salonID uint, clientID *uint, phone, messageType, redirectURL string) (token, trackingURL string) {
	b := make([]byte, 16)
	rand.Read(b)
	token = hex.EncodeToString(b)
	trackingURL = fmt.Sprintf("%s/t/%s", a.AppURL, token)
	_, err := a.DB.ExecContext(ctx, `
		INSERT INTO whatsapp_messages
			(salon_id, client_id, phone, message_type, tracking_token, redirect_url)
		VALUES (?,?,?,?,?,?)`,
		salonID, clientID, phone, messageType, token, redirectURL)
	if err != nil {
		slog.Error("trackWASend insert failed", "error", err)
	}
	return
}

// recordConversion links the most-recent clicked WhatsApp for a client (within 48h)
// to the booking or payment that followed.
func (a *App) recordConversion(ctx context.Context, clientID uint, convType string, convID int64, revenue float64) {
	_, err := a.DB.ExecContext(ctx, `
		UPDATE whatsapp_messages
		SET converted_at        = NOW(),
		    conversion_type     = ?,
		    conversion_id       = ?,
		    revenue_attributed  = ?
		WHERE client_id = ?
		  AND clicked_at    IS NOT NULL
		  AND converted_at  IS NULL
		  AND clicked_at > DATE_SUB(NOW(), INTERVAL 48 HOUR)
		ORDER BY clicked_at DESC
		LIMIT 1`,
		convType, convID, revenue, clientID)
	if err != nil {
		slog.Warn("recordConversion failed", "client_id", clientID, "error", err)
	}
}

// ── Public redirect endpoint ──────────────────────────────────────────────────

// TrackRedirect GET /t/{token} — records the click then redirects to the real URL.
func (a *App) TrackRedirect(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	if token == "" {
		http.NotFound(w, r)
		return
	}
	var redirectURL string
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT redirect_url FROM whatsapp_messages WHERE tracking_token=?`, token).
		Scan(&redirectURL)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	// First click wins — subsequent clicks on the same link don't reset the timestamp.
	a.DB.ExecContext(r.Context(),
		`UPDATE whatsapp_messages SET clicked_at=COALESCE(clicked_at,NOW()) WHERE tracking_token=?`, token)
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// ── Performance dashboard endpoint ───────────────────────────────────────────

// WhatsAppPerformance GET /api/v1/whatsapp/performance?days=30
func (a *App) WhatsAppPerformance(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	days := 30
	if d, err := strconv.Atoi(r.URL.Query().Get("days")); err == nil && d > 0 && d <= 365 {
		days = d
	}

	// ── Aggregate totals ──────────────────────────────────────────────────
	type totals struct {
		MessagesSent        int     `json:"messages_sent"`
		Clicked             int     `json:"clicked"`
		BookingsGenerated   int     `json:"bookings_generated"`
		ReactivatedCustomers int    `json:"reactivated_customers"`
		MembershipRenewals  int    `json:"membership_renewals"`
		RevenueAttributed   float64 `json:"revenue_attributed"`
		ClickRate           float64 `json:"click_rate"`
		ConversionRate      float64 `json:"conversion_rate"`
	}
	var t totals
	a.DB.QueryRowContext(r.Context(), `
		SELECT
			COUNT(*)                                                     AS messages_sent,
			SUM(clicked_at IS NOT NULL)                                  AS clicked,
			SUM(conversion_type = 'booking')                             AS bookings_generated,
			SUM(message_type IN ('rebooking_reminder','inactive_customer')
			    AND converted_at IS NOT NULL)                            AS reactivated_customers,
			SUM(message_type = 'membership_expiry_7d'
			    AND converted_at IS NOT NULL)                            AS membership_renewals,
			COALESCE(SUM(revenue_attributed),0)                         AS revenue_attributed
		FROM whatsapp_messages
		WHERE salon_id = ?
		  AND sent_at > DATE_SUB(NOW(), INTERVAL ? DAY)`,
		claims.SalonID, days,
	).Scan(
		&t.MessagesSent, &t.Clicked,
		&t.BookingsGenerated, &t.ReactivatedCustomers,
		&t.MembershipRenewals, &t.RevenueAttributed,
	)
	if t.MessagesSent > 0 {
		t.ClickRate = float64(t.Clicked) / float64(t.MessagesSent)
	}
	clicked := t.Clicked
	if clicked > 0 {
		var converted int
		a.DB.QueryRowContext(r.Context(), `
			SELECT COUNT(*) FROM whatsapp_messages
			WHERE salon_id=? AND clicked_at IS NOT NULL AND converted_at IS NOT NULL
			  AND sent_at > DATE_SUB(NOW(), INTERVAL ? DAY)`,
			claims.SalonID, days).Scan(&converted)
		t.ConversionRate = float64(converted) / float64(clicked)
	}

	// ── Per-type breakdown ────────────────────────────────────────────────
	type typeRow struct {
		MessageType    string  `json:"message_type"`
		Sent           int     `json:"sent"`
		Clicked        int     `json:"clicked"`
		Converted      int     `json:"converted"`
		Revenue        float64 `json:"revenue"`
		ClickRate      float64 `json:"click_rate"`
		ConversionRate float64 `json:"conversion_rate"`
	}
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT message_type,
		       COUNT(*)                              AS sent,
		       SUM(clicked_at IS NOT NULL)           AS clicked,
		       SUM(converted_at IS NOT NULL)         AS converted,
		       COALESCE(SUM(revenue_attributed),0)   AS revenue
		FROM whatsapp_messages
		WHERE salon_id=?
		  AND sent_at > DATE_SUB(NOW(), INTERVAL ? DAY)
		GROUP BY message_type
		ORDER BY sent DESC`,
		claims.SalonID, days)
	byType := []typeRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row typeRow
			rows.Scan(&row.MessageType, &row.Sent, &row.Clicked, &row.Converted, &row.Revenue)
			if row.Sent > 0 {
				row.ClickRate = float64(row.Clicked) / float64(row.Sent)
			}
			if row.Clicked > 0 {
				row.ConversionRate = float64(row.Converted) / float64(row.Clicked)
			}
			byType = append(byType, row)
		}
	}

	// ── Daily trend (last N days) ─────────────────────────────────────────
	type dayRow struct {
		Date      string `json:"date"`
		Sent      int    `json:"sent"`
		Clicked   int    `json:"clicked"`
		Converted int    `json:"converted"`
	}
	trendRows, _ := a.DB.QueryContext(r.Context(), `
		SELECT DATE(sent_at) AS day,
		       COUNT(*),
		       SUM(clicked_at IS NOT NULL),
		       SUM(converted_at IS NOT NULL)
		FROM whatsapp_messages
		WHERE salon_id=?
		  AND sent_at > DATE_SUB(NOW(), INTERVAL ? DAY)
		GROUP BY day ORDER BY day ASC`,
		claims.SalonID, days)
	trend := []dayRow{}
	if trendRows != nil {
		defer trendRows.Close()
		for trendRows.Next() {
			var dr dayRow
			var d time.Time
			trendRows.Scan(&d, &dr.Sent, &dr.Clicked, &dr.Converted)
			dr.Date = d.Format("2006-01-02")
			trend = append(trend, dr)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"period_days": days,
		"totals":      t,
		"by_type":     byType,
		"trend":       trend,
	})
}
