package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
)

// CheckLoyaltyMilestone fires asynchronously after every successful checkout.
//
//   - 9 stars  → "almost there" SMS with 2-3 services above the client's avg price
//   - 10 stars (and every multiple of 10) → 10% discount reward issued to client
func (a *App) CheckLoyaltyMilestone(ctx context.Context, salonID, clientID, txnID uint) {
	var visits int
	var firstName string
	var phone sql.NullString
	var smsConsent sql.NullBool

	err := a.DB.QueryRowContext(ctx,
		`SELECT total_visits, first_name, phone, sms_consent
		 FROM clients WHERE id = ? AND salon_id = ?`, clientID, salonID).
		Scan(&visits, &firstName, &phone, &smsConsent)
	if err != nil {
		slog.Warn("loyalty stars: client lookup failed", "client_id", clientID, "err", err)
		return
	}

	stars := visits

	// 9th star — teaser SMS
	if stars%10 == 9 && phone.Valid && phone.String != "" && smsConsent.Bool {
		a.sendNinthStarSMS(ctx, salonID, clientID, firstName, phone.String)
	}

	// 10th star (every multiple) — discount reward
	if stars > 0 && stars%10 == 0 {
		a.grantStarReward(ctx, salonID, clientID, txnID)
	}
}

// sendNinthStarSMS sends an "almost there" SMS with 2-3 services priced above
// the client's historical average service price.
func (a *App) sendNinthStarSMS(ctx context.Context, salonID, clientID uint, firstName, phone string) {
	// Client's average price across all their past service transactions
	var avgPrice float64
	_ = a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(ti.price), 0)
		 FROM transaction_items ti
		 JOIN transactions t ON t.id = ti.transaction_id
		 WHERE t.client_id = ? AND t.salon_id = ? AND ti.service_id IS NOT NULL`,
		clientID, salonID).Scan(&avgPrice)

	// 2-3 active services above their average (cheapest upgrades first)
	rows, err := a.DB.QueryContext(ctx,
		`SELECT name, price FROM services
		 WHERE salon_id = ? AND is_active = 1 AND price > ?
		 ORDER BY price ASC LIMIT 3`,
		salonID, avgPrice)
	if err != nil {
		slog.Warn("loyalty stars: service fetch failed", "err", err)
		return
	}
	defer rows.Close()

	type rec struct {
		Name  string
		Price float64
	}
	var recs []rec
	for rows.Next() {
		var r rec
		if rows.Scan(&r.Name, &r.Price) == nil {
			recs = append(recs, r)
		}
	}

	var svcLines string
	for _, r := range recs {
		svcLines += fmt.Sprintf("\n• %s — $%.0f", r.Name, r.Price)
	}

	var msg string
	if len(recs) > 0 {
		msg = fmt.Sprintf(
			"Hi %s! You've earned 9 loyalty stars at Kriyansh Beauty Bar! "+
				"Just 1 more visit unlocks your exclusive discount. "+
				"Ready to treat yourself?%s "+
				"Book now: store.kriyanshbeautybar.com",
			firstName, svcLines)
	} else {
		msg = fmt.Sprintf(
			"Hi %s! You've earned 9 loyalty stars at Kriyansh Beauty Bar! "+
				"Just 1 more visit and you unlock an exclusive discount. See you soon!",
			firstName)
	}

	a.Notifier.SendSMS(phone, msg)
	slog.Info("loyalty stars: 9-star SMS sent", "client_id", clientID)
}

// grantStarReward ensures a "10-Star Loyalty Discount" reward template exists
// for the salon, then issues an available copy to the client.
func (a *App) grantStarReward(ctx context.Context, salonID, clientID, txnID uint) {
	var rewardID int64
	err := a.DB.QueryRowContext(ctx,
		`SELECT id FROM loyalty_rewards
		 WHERE salon_id = ? AND name = '10-Star Loyalty Discount' LIMIT 1`, salonID).
		Scan(&rewardID)

	if err == sql.ErrNoRows {
		res, insErr := a.DB.ExecContext(ctx,
			`INSERT INTO loyalty_rewards (salon_id, name, reward_type, value, trigger_type, trigger_value, is_active)
			 VALUES (?, '10-Star Loyalty Discount', 'percent_off', 10, 'manual', 0, 1)`, salonID)
		if insErr != nil {
			slog.Warn("loyalty stars: reward template insert failed", "err", insErr)
			return
		}
		rewardID, _ = res.LastInsertId()
	} else if err != nil {
		slog.Warn("loyalty stars: reward lookup failed", "err", err)
		return
	}

	_, err = a.DB.ExecContext(ctx,
		`INSERT INTO client_rewards (salon_id, client_id, reward_id, status, reference_id)
		 VALUES (?, ?, ?, 'available', ?)`,
		salonID, clientID, rewardID, txnID)
	if err != nil {
		slog.Warn("loyalty stars: failed to grant reward", "client_id", clientID, "err", err)
		return
	}
	slog.Info("loyalty stars: 10-star discount granted", "client_id", clientID, "reward_id", rewardID)
}
