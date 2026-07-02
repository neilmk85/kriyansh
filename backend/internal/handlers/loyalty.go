package handlers

import (
	"context"
	"database/sql"
	"math"
	"net/http"
	"time"
)

// ── Loyalty Tiers ─────────────────────────────────────────────────────────────

type loyaltyTier struct {
	ID          uint    `json:"id"`
	SalonID     uint    `json:"salon_id"`
	Name        string  `json:"name"`
	MinPoints   int     `json:"min_points"`
	DiscountPct float64 `json:"discount_pct"`
	Color       string  `json:"color"`
	SortOrder   int     `json:"sort_order"`
}

func (a *App) ListLoyaltyTiers(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, min_points, discount_pct, color, sort_order
		 FROM loyalty_tiers WHERE salon_id=? ORDER BY sort_order`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var tiers []loyaltyTier
	for rows.Next() {
		var t loyaltyTier
		rows.Scan(&t.ID, &t.SalonID, &t.Name, &t.MinPoints, &t.DiscountPct, &t.Color, &t.SortOrder)
		tiers = append(tiers, t)
	}
	if tiers == nil {
		tiers = []loyaltyTier{}
	}
	a.JSON(w, http.StatusOK, tiers)
}

// ── Client Loyalty ────────────────────────────────────────────────────────────

type clientLoyaltyResponse struct {
	ClientID       uint    `json:"client_id"`
	Balance        int     `json:"balance"`
	LifetimePoints int     `json:"lifetime_points"`
	TierID         *uint   `json:"tier_id"`
	TierName       string  `json:"tier_name"`
	TierColor      string  `json:"tier_color"`
	NextTierName   string  `json:"next_tier_name"`
	PointsToNext   int     `json:"points_to_next"`
}

func (a *App) GetClientLoyalty(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Get or default loyalty balance
	var balance, lifetimePoints int
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT balance, lifetime_points FROM client_loyalty
		 WHERE client_id=? AND salon_id=?`, clientID, claims.SalonID).
		Scan(&balance, &lifetimePoints)
	if err != nil && err != sql.ErrNoRows {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Get all tiers ordered by min_points DESC
	tiers, err := a.fetchTiers(r, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	resp := clientLoyaltyResponse{
		ClientID:       uint(clientID),
		Balance:        balance,
		LifetimePoints: lifetimePoints,
		TierName:       "Bronze",
		TierColor:      "#CD7F32",
	}

	// Find current tier (highest tier where balance >= min_points)
	for i, t := range tiers {
		if balance >= t.MinPoints {
			resp.TierID = &tiers[i].ID
			resp.TierName = t.Name
			resp.TierColor = t.Color
			// Find next tier
			if i > 0 {
				next := tiers[i-1]
				resp.NextTierName = next.Name
				resp.PointsToNext = next.MinPoints - balance
			}
			break
		}
	}

	a.JSON(w, http.StatusOK, resp)
}

type fetchedTier struct {
	ID        uint
	Name      string
	MinPoints int
	Color     string
}

func (a *App) fetchTiers(r *http.Request, salonID uint) ([]fetchedTier, error) {
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, name, min_points, color FROM loyalty_tiers
		 WHERE salon_id=? ORDER BY min_points DESC`, salonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tiers []fetchedTier
	for rows.Next() {
		var t fetchedTier
		rows.Scan(&t.ID, &t.Name, &t.MinPoints, &t.Color)
		tiers = append(tiers, t)
	}
	return tiers, nil
}

func (a *App) getClientLoyaltyData(r *http.Request, clientID uint64, salonID uint) (clientLoyaltyResponse, error) {
	var balance, lifetimePoints int
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT balance, lifetime_points FROM client_loyalty
		 WHERE client_id=? AND salon_id=?`, clientID, salonID).
		Scan(&balance, &lifetimePoints)
	if err != nil && err != sql.ErrNoRows {
		return clientLoyaltyResponse{}, err
	}

	tiers, err := a.fetchTiers(r, salonID)
	if err != nil {
		return clientLoyaltyResponse{}, err
	}

	resp := clientLoyaltyResponse{
		ClientID:       uint(clientID),
		Balance:        balance,
		LifetimePoints: lifetimePoints,
		TierName:       "Bronze",
		TierColor:      "#CD7F32",
	}

	for i, t := range tiers {
		if balance >= t.MinPoints {
			resp.TierID = &tiers[i].ID
			resp.TierName = t.Name
			resp.TierColor = t.Color
			if i > 0 {
				next := tiers[i-1]
				resp.NextTierName = next.Name
				resp.PointsToNext = next.MinPoints - balance
			}
			break
		}
	}
	return resp, nil
}

// ── Earn Points ───────────────────────────────────────────────────────────────

func (a *App) AddLoyaltyPoints(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		ClientID    uint   `json:"client_id"`
		Points      int    `json:"points"`
		ReferenceID *int   `json:"reference_id"`
		Note        string `json:"note"`
	}
	if err := a.Decode(r, &body); err != nil || body.ClientID == 0 || body.Points <= 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "tx error")
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(),
		`INSERT INTO client_loyalty (salon_id, client_id, balance, lifetime_points)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   balance = balance + VALUES(balance),
		   lifetime_points = lifetime_points + VALUES(lifetime_points)`,
		claims.SalonID, body.ClientID, body.Points, body.Points)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	_, err = tx.ExecContext(r.Context(),
		`INSERT INTO loyalty_transactions (salon_id, client_id, points, type, reference_id, note)
		 VALUES (?, ?, ?, 'earn', ?, ?)`,
		claims.SalonID, body.ClientID, body.Points, body.ReferenceID, body.Note)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "commit error")
		return
	}

	resp, err := a.getClientLoyaltyData(r, uint64(body.ClientID), claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, resp)
}

// ── Redeem Points ─────────────────────────────────────────────────────────────

func (a *App) RedeemLoyaltyPoints(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		ClientID uint   `json:"client_id"`
		Points   int    `json:"points"`
		Note     string `json:"note"`
	}
	if err := a.Decode(r, &body); err != nil || body.ClientID == 0 || body.Points <= 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Check balance
	var balance int
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT balance FROM client_loyalty WHERE client_id=? AND salon_id=?`,
		body.ClientID, claims.SalonID).Scan(&balance)
	if err == sql.ErrNoRows || balance < body.Points {
		a.Error(w, http.StatusBadRequest, "insufficient points")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "tx error")
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(),
		`UPDATE client_loyalty SET balance = balance - ? WHERE client_id=? AND salon_id=?`,
		body.Points, body.ClientID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	_, err = tx.ExecContext(r.Context(),
		`INSERT INTO loyalty_transactions (salon_id, client_id, points, type, note)
		 VALUES (?, ?, ?, 'redeem', ?)`,
		claims.SalonID, body.ClientID, -body.Points, body.Note)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "commit error")
		return
	}

	resp, err := a.getClientLoyaltyData(r, uint64(body.ClientID), claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, resp)
}

// ── Loyalty Transactions History ──────────────────────────────────────────────

type loyaltyTransaction struct {
	ID          uint      `json:"id"`
	SalonID     uint      `json:"salon_id"`
	ClientID    uint      `json:"client_id"`
	Points      int       `json:"points"`
	Type        string    `json:"type"`
	ReferenceID *int      `json:"reference_id"`
	Note        string    `json:"note"`
	CreatedAt   time.Time `json:"created_at"`
}

func (a *App) ListLoyaltyTransactions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, client_id, points, type, reference_id, COALESCE(note,''), created_at
		 FROM loyalty_transactions
		 WHERE client_id=? AND salon_id=?
		 ORDER BY created_at DESC LIMIT 50`, clientID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var txns []loyaltyTransaction
	for rows.Next() {
		var t loyaltyTransaction
		rows.Scan(&t.ID, &t.SalonID, &t.ClientID, &t.Points, &t.Type, &t.ReferenceID, &t.Note, &t.CreatedAt)
		txns = append(txns, t)
	}
	if txns == nil {
		txns = []loyaltyTransaction{}
	}
	a.JSON(w, http.StatusOK, txns)
}

// ── Loyalty Stats ─────────────────────────────────────────────────────────────

func (a *App) LoyaltyStats(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	today := time.Now().Format("2006-01-02")

	var issuedToday, redeemedToday, totalMembers int
	a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(SUM(points),0) FROM loyalty_transactions
		 WHERE salon_id=? AND type='earn' AND DATE(created_at)=?`, claims.SalonID, today).Scan(&issuedToday)
	a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(SUM(ABS(points)),0) FROM loyalty_transactions
		 WHERE salon_id=? AND type='redeem' AND DATE(created_at)=?`, claims.SalonID, today).Scan(&redeemedToday)
	a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM client_loyalty WHERE salon_id=? AND balance > 0`, claims.SalonID).Scan(&totalMembers)

	a.JSON(w, http.StatusOK, map[string]any{
		"issued_today":    issuedToday,
		"redeemed_today":  redeemedToday,
		"total_members":   totalMembers,
	})
}

// ── Loyalty Settings ──────────────────────────────────────────────────────────

type loyaltySettings struct {
	ID                   uint    `json:"id"`
	SalonID              uint    `json:"salon_id"`
	EarnPerDollar        float64 `json:"earn_per_dollar"`
	EarnPerVisit         int     `json:"earn_per_visit"`
	EarnPerVisitMode     string  `json:"earn_per_visit_mode"`
	EarnPerReview        int     `json:"earn_per_review"`
	EarnPerBooking       int     `json:"earn_per_booking"`
	EarnPerBookingMode   string  `json:"earn_per_booking_mode"`
	MinSpendThreshold    float64 `json:"min_spend_threshold"`
	PointsExpiryMonths   int     `json:"points_expiry_months"`
	EligibleAllServices  bool    `json:"eligible_all_services"`
	Terms                string  `json:"terms"`
}

func (a *App) GetLoyaltySettings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var s loyaltySettings
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, earn_per_dollar, earn_per_visit,
		        COALESCE(earn_per_visit_mode,'every'),
		        earn_per_review, earn_per_booking,
		        COALESCE(earn_per_booking_mode,'every'),
		        min_spend_threshold, points_expiry_months,
		        eligible_all_services, COALESCE(terms,'')
		 FROM loyalty_settings WHERE salon_id=?`, claims.SalonID).
		Scan(&s.ID, &s.SalonID, &s.EarnPerDollar, &s.EarnPerVisit, &s.EarnPerVisitMode,
			&s.EarnPerReview, &s.EarnPerBooking, &s.EarnPerBookingMode,
			&s.MinSpendThreshold, &s.PointsExpiryMonths,
			&s.EligibleAllServices, &s.Terms)
	if err == sql.ErrNoRows {
		a.JSON(w, http.StatusOK, loyaltySettings{
			SalonID: claims.SalonID, EarnPerDollar: 1.0, PointsExpiryMonths: 12,
			EligibleAllServices: true, EarnPerVisitMode: "every", EarnPerBookingMode: "every",
		})
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, s)
}

func (a *App) UpdateLoyaltySettings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body loyaltySettings
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.EarnPerVisitMode == "" {
		body.EarnPerVisitMode = "every"
	}
	if body.EarnPerBookingMode == "" {
		body.EarnPerBookingMode = "every"
	}
	_, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO loyalty_settings
		   (salon_id, earn_per_dollar, earn_per_visit, earn_per_visit_mode,
		    earn_per_review, earn_per_booking, earn_per_booking_mode,
		    min_spend_threshold, points_expiry_months, eligible_all_services, terms)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)
		 ON DUPLICATE KEY UPDATE
		   earn_per_dollar=VALUES(earn_per_dollar),
		   earn_per_visit=VALUES(earn_per_visit),
		   earn_per_visit_mode=VALUES(earn_per_visit_mode),
		   earn_per_review=VALUES(earn_per_review),
		   earn_per_booking=VALUES(earn_per_booking),
		   earn_per_booking_mode=VALUES(earn_per_booking_mode),
		   min_spend_threshold=VALUES(min_spend_threshold),
		   points_expiry_months=VALUES(points_expiry_months),
		   eligible_all_services=VALUES(eligible_all_services),
		   terms=VALUES(terms)`,
		claims.SalonID, body.EarnPerDollar, body.EarnPerVisit, body.EarnPerVisitMode,
		body.EarnPerReview, body.EarnPerBooking, body.EarnPerBookingMode,
		body.MinSpendThreshold, body.PointsExpiryMonths,
		body.EligibleAllServices, body.Terms)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.GetLoyaltySettings(w, r)
}

// ── Loyalty Rewards Catalog ───────────────────────────────────────────────────

type loyaltyReward struct {
	ID          uint    `json:"id"`
	SalonID     uint    `json:"salon_id"`
	Name        string  `json:"name"`
	RewardType  string  `json:"reward_type"`
	Value       float64 `json:"value"`
	TriggerType string  `json:"trigger_type"`
	TriggerValue int    `json:"trigger_value"`
	ServiceID   *int    `json:"service_id"`
	ProductID   *int    `json:"product_id"`
	IsActive    bool    `json:"is_active"`
}

func (a *App) ListRewards(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, reward_type, value, trigger_type, trigger_value,
		        service_id, product_id, is_active
		 FROM loyalty_rewards WHERE salon_id=? ORDER BY id DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var rewards []loyaltyReward
	for rows.Next() {
		var rw loyaltyReward
		rows.Scan(&rw.ID, &rw.SalonID, &rw.Name, &rw.RewardType, &rw.Value,
			&rw.TriggerType, &rw.TriggerValue, &rw.ServiceID, &rw.ProductID, &rw.IsActive)
		rewards = append(rewards, rw)
	}
	if rewards == nil {
		rewards = []loyaltyReward{}
	}
	a.JSON(w, http.StatusOK, rewards)
}

func (a *App) CreateReward(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body loyaltyReward
	if err := a.Decode(r, &body); err != nil || body.Name == "" {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO loyalty_rewards (salon_id, name, reward_type, value, trigger_type, trigger_value, service_id, product_id, is_active)
		 VALUES (?,?,?,?,?,?,?,?,1)`,
		claims.SalonID, body.Name, body.RewardType, body.Value,
		body.TriggerType, body.TriggerValue, body.ServiceID, body.ProductID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	body.ID = uint(id)
	body.SalonID = claims.SalonID
	body.IsActive = true
	a.JSON(w, http.StatusCreated, body)
}

func (a *App) UpdateReward(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body loyaltyReward
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE loyalty_rewards SET name=?, reward_type=?, value=?, trigger_type=?,
		        trigger_value=?, service_id=?, product_id=?, is_active=?
		 WHERE id=? AND salon_id=?`,
		body.Name, body.RewardType, body.Value, body.TriggerType,
		body.TriggerValue, body.ServiceID, body.ProductID, body.IsActive, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	body.ID = uint(id)
	a.JSON(w, http.StatusOK, body)
}

func (a *App) DeleteReward(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	a.DB.ExecContext(r.Context(), `DELETE FROM loyalty_rewards WHERE id=? AND salon_id=?`, id, claims.SalonID)
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ── Client Rewards Wallet ─────────────────────────────────────────────────────

type clientReward struct {
	ID         uint      `json:"id"`
	RewardID   uint      `json:"reward_id"`
	RewardName string    `json:"reward_name"`
	RewardType string    `json:"reward_type"`
	Value      float64   `json:"value"`
	Status     string    `json:"status"`
	GrantedAt  time.Time `json:"granted_at"`
	UsedAt     *time.Time `json:"used_at"`
}

func (a *App) ListClientRewards(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT cr.id, cr.reward_id, lr.name, lr.reward_type, lr.value, cr.status, cr.granted_at, cr.used_at
		 FROM client_rewards cr
		 JOIN loyalty_rewards lr ON lr.id = cr.reward_id
		 WHERE cr.client_id=? AND cr.salon_id=?
		 ORDER BY cr.granted_at DESC`, clientID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var rewards []clientReward
	for rows.Next() {
		var cr clientReward
		rows.Scan(&cr.ID, &cr.RewardID, &cr.RewardName, &cr.RewardType, &cr.Value, &cr.Status, &cr.GrantedAt, &cr.UsedAt)
		rewards = append(rewards, cr)
	}
	if rewards == nil {
		rewards = []clientReward{}
	}
	a.JSON(w, http.StatusOK, rewards)
}

func (a *App) GrantReward(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		RewardID uint `json:"reward_id"`
	}
	if err := a.Decode(r, &body); err != nil || body.RewardID == 0 {
		a.Error(w, http.StatusBadRequest, "reward_id required")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO client_rewards (salon_id, client_id, reward_id) VALUES (?,?,?)`,
		claims.SalonID, clientID, body.RewardID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{"id": id, "status": "available"})
}

func (a *App) UseReward(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		ClientID    uint `json:"client_id"`
		ReferenceID *int `json:"reference_id"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE client_rewards SET status='used', used_at=NOW(), reference_id=?
		 WHERE id=? AND salon_id=? AND status='available'`,
		body.ReferenceID, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"used": true})
}

// ── Loyalty Referrals ─────────────────────────────────────────────────────────

type loyaltyReferral struct {
	ID                uint      `json:"id"`
	SalonID           uint      `json:"salon_id"`
	ReferrerClientID  uint      `json:"referrer_client_id"`
	ReferrerName      string    `json:"referrer_name"`
	ReferredClientID  uint      `json:"referred_client_id"`
	ReferredName      string    `json:"referred_name"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
}

func (a *App) ListReferrals(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT r.id, r.salon_id, r.referrer_client_id,
		        CONCAT(c1.first_name,' ',c1.last_name),
		        r.referred_client_id,
		        CONCAT(c2.first_name,' ',c2.last_name),
		        r.status, r.created_at
		 FROM loyalty_referrals r
		 JOIN clients c1 ON c1.id = r.referrer_client_id
		 JOIN clients c2 ON c2.id = r.referred_client_id
		 WHERE r.salon_id=? ORDER BY r.created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var refs []loyaltyReferral
	for rows.Next() {
		var ref loyaltyReferral
		rows.Scan(&ref.ID, &ref.SalonID, &ref.ReferrerClientID, &ref.ReferrerName,
			&ref.ReferredClientID, &ref.ReferredName, &ref.Status, &ref.CreatedAt)
		refs = append(refs, ref)
	}
	if refs == nil {
		refs = []loyaltyReferral{}
	}
	a.JSON(w, http.StatusOK, refs)
}

func (a *App) CreateReferral(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		ReferrerClientID uint `json:"referrer_client_id"`
		ReferredClientID uint `json:"referred_client_id"`
	}
	if err := a.Decode(r, &body); err != nil || body.ReferrerClientID == 0 || body.ReferredClientID == 0 {
		a.Error(w, http.StatusBadRequest, "referrer_client_id and referred_client_id required")
		return
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT IGNORE INTO loyalty_referrals (salon_id, referrer_client_id, referred_client_id)
		 VALUES (?,?,?)`, claims.SalonID, body.ReferrerClientID, body.ReferredClientID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	// Auto-grant referral rewards to referrer
	go a.grantReferralRewards(claims.SalonID, body.ReferrerClientID)
	a.JSON(w, http.StatusCreated, map[string]any{"id": id, "status": "pending"})
}

func (a *App) grantReferralRewards(salonID, clientID uint) {
	ctx := context.Background()
	rows, err := a.DB.QueryContext(ctx,
		`SELECT id FROM loyalty_rewards WHERE salon_id=? AND trigger_type='referral' AND is_active=1`, salonID)
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var rwID uint
		rows.Scan(&rwID)
		a.DB.ExecContext(ctx,
			`INSERT INTO client_rewards (salon_id, client_id, reward_id) VALUES (?,?,?)`,
			salonID, clientID, rwID)
	}
}

// ── Auto Earn Points (called from transactions) ───────────────────────────────

type loyaltyEarnResult struct {
	PointsEarned    int            `json:"loyalty_points_earned"`
	NewBalance      int            `json:"new_balance"`
	RewardsUnlocked []clientReward `json:"rewards_unlocked"`
}

func (a *App) AutoAwardLoyaltyPoints(ctx context.Context, salonID uint, clientID uint, grandTotal float64, txnID int64) *loyaltyEarnResult {
	// Load settings
	var earnPerDollar float64
	var minSpend float64
	err := a.DB.QueryRowContext(ctx,
		`SELECT earn_per_dollar, min_spend_threshold FROM loyalty_settings WHERE salon_id=?`, salonID).
		Scan(&earnPerDollar, &minSpend)
	if err != nil {
		// No settings → use default of 1 pt per dollar
		earnPerDollar = 1.0
		minSpend = 0
	}

	if grandTotal < minSpend || earnPerDollar <= 0 {
		return nil
	}

	pts := int(math.Floor(grandTotal * earnPerDollar))
	if pts <= 0 {
		return nil
	}

	tx, err := a.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`INSERT INTO client_loyalty (salon_id, client_id, balance, lifetime_points)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   balance = balance + VALUES(balance),
		   lifetime_points = lifetime_points + VALUES(lifetime_points)`,
		salonID, clientID, pts, pts)
	if err != nil {
		return nil
	}

	_, err = tx.ExecContext(ctx,
		`INSERT INTO loyalty_transactions (salon_id, client_id, points, type, reference_id, note)
		 VALUES (?, ?, ?, 'earn', ?, 'Auto-earned from sale')`,
		salonID, clientID, pts, txnID)
	if err != nil {
		return nil
	}

	if err := tx.Commit(); err != nil {
		return nil
	}

	// Get new balance
	var newBalance int
	a.DB.QueryRowContext(ctx,
		`SELECT balance FROM client_loyalty WHERE client_id=? AND salon_id=?`, clientID, salonID).
		Scan(&newBalance)

	// Check if any points-threshold rewards are newly unlocked
	unlocked := a.checkAndGrantPointsRewards(ctx, salonID, clientID, newBalance-pts, newBalance)

	return &loyaltyEarnResult{
		PointsEarned:    pts,
		NewBalance:      newBalance,
		RewardsUnlocked: unlocked,
	}
}

// checkAndGrantPointsRewards grants rewards whose points threshold was crossed.
func (a *App) checkAndGrantPointsRewards(ctx context.Context, salonID, clientID uint, prevBalance, newBalance int) []clientReward {
	rows, err := a.DB.QueryContext(ctx,
		`SELECT lr.id, lr.name, lr.reward_type, lr.value
		 FROM loyalty_rewards lr
		 WHERE lr.salon_id=? AND lr.trigger_type='points' AND lr.is_active=1
		   AND lr.trigger_value > ? AND lr.trigger_value <= ?
		   AND NOT EXISTS (
		     SELECT 1 FROM client_rewards cr
		     WHERE cr.client_id=? AND cr.reward_id=lr.id AND cr.status='available'
		   )`, salonID, prevBalance, newBalance, clientID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var unlocked []clientReward
	for rows.Next() {
		var rw clientReward
		rows.Scan(&rw.RewardID, &rw.RewardName, &rw.RewardType, &rw.Value)
		a.DB.ExecContext(ctx,
			`INSERT INTO client_rewards (salon_id, client_id, reward_id) VALUES (?,?,?)`,
			salonID, clientID, rw.RewardID)
		rw.Status = "available"
		unlocked = append(unlocked, rw)
	}
	return unlocked
}
