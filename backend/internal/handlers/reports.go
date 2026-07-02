package handlers

import (
	"net/http"
	"time"
)

// ── helpers ───────────────────────────────────────────────────────────────────

func parseDateRange(r *http.Request) (from, to time.Time) {
	now := time.Now().UTC()
	to = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
	from = to.AddDate(0, 0, -29).Truncate(24 * time.Hour)

	if f := r.URL.Query().Get("from"); f != "" {
		if t, err := time.Parse("2006-01-02", f); err == nil {
			from = t
		}
	}
	if t := r.URL.Query().Get("to"); t != "" {
		if parsed, err := time.Parse("2006-01-02", t); err == nil {
			to = time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 23, 59, 59, 0, time.UTC)
		}
	}
	return
}

// ── Sales ─────────────────────────────────────────────────────────────────────

type salesDailySeries struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	Count   int     `json:"count"`
}

type salesTopService struct {
	Name     string  `json:"name"`
	Bookings int     `json:"bookings"`
	Revenue  float64 `json:"revenue"`
}

type salesPaymentMethod struct {
	Method  string  `json:"method"`
	Count   int     `json:"count"`
	Revenue float64 `json:"revenue"`
}

func (a *App) ReportSales(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	// Summary totals
	var totalRevenue, totalTips, avgTicket float64
	var totalTx int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0), COALESCE(SUM(tip_amount),0),
		        COALESCE(AVG(grand_total),0), COUNT(*)
		 FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'`,
		sid, from, to).Scan(&totalRevenue, &totalTips, &avgTicket, &totalTx)

	// Daily series
	dailyRows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as d, COALESCE(SUM(grand_total),0), COUNT(*)
		 FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'
		 GROUP BY DATE(created_at) ORDER BY d ASC`, sid, from, to)
	daily := []salesDailySeries{}
	if err == nil {
		defer dailyRows.Close()
		for dailyRows.Next() {
			var row salesDailySeries
			dailyRows.Scan(&row.Date, &row.Revenue, &row.Count)
			daily = append(daily, row)
		}
	}

	// Top 10 services by revenue
	svcRows, err := a.DB.QueryContext(ctx,
		`SELECT ti.name, COUNT(*), COALESCE(SUM(ti.subtotal),0)
		 FROM transaction_items ti
		 JOIN transactions t ON t.id=ti.transaction_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed'
		 GROUP BY ti.name ORDER BY SUM(ti.subtotal) DESC LIMIT 10`, sid, from, to)
	topServices := []salesTopService{}
	if err == nil {
		defer svcRows.Close()
		for svcRows.Next() {
			var row salesTopService
			svcRows.Scan(&row.Name, &row.Bookings, &row.Revenue)
			topServices = append(topServices, row)
		}
	}

	// Revenue by payment method
	pmRows, err := a.DB.QueryContext(ctx,
		`SELECT COALESCE(payment_method,'other'), COUNT(*), COALESCE(SUM(grand_total),0)
		 FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'
		 GROUP BY payment_method ORDER BY SUM(grand_total) DESC`, sid, from, to)
	paymentMethods := []salesPaymentMethod{}
	if err == nil {
		defer pmRows.Close()
		for pmRows.Next() {
			var row salesPaymentMethod
			pmRows.Scan(&row.Method, &row.Count, &row.Revenue)
			paymentMethods = append(paymentMethods, row)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"total_revenue":   totalRevenue,
		"total_tips":      totalTips,
		"avg_ticket":      avgTicket,
		"total_tx":        totalTx,
		"daily":           daily,
		"top_services":    topServices,
		"payment_methods": paymentMethods,
	})
}

// ── Appointments ──────────────────────────────────────────────────────────────

type apptDailyBreakdown struct {
	Date      string `json:"date"`
	Total     int    `json:"total"`
	Completed int    `json:"completed"`
	Cancelled int    `json:"cancelled"`
	NoShow    int    `json:"no_show"`
}

func (a *App) ReportAppointments(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	// Totals
	var total, completed, cancelled, noShows int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<=?`,
		sid, from, to).Scan(&total)
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<=? AND status='completed'`,
		sid, from, to).Scan(&completed)
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<=? AND status='cancelled'`,
		sid, from, to).Scan(&cancelled)
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<=? AND status='no_show'`,
		sid, from, to).Scan(&noShows)

	completionRate := 0.0
	if total > 0 {
		completionRate = float64(completed) / float64(total) * 100
	}

	// Daily breakdown
	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(start_at) as d,
		        COUNT(*) as total,
		        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),
		        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END),
		        SUM(CASE WHEN status='no_show'   THEN 1 ELSE 0 END)
		 FROM appointments
		 WHERE salon_id=? AND start_at>=? AND start_at<=?
		 GROUP BY DATE(start_at) ORDER BY d ASC`, sid, from, to)
	daily := []apptDailyBreakdown{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row apptDailyBreakdown
			rows.Scan(&row.Date, &row.Total, &row.Completed, &row.Cancelled, &row.NoShow)
			daily = append(daily, row)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"total":           total,
		"completed":       completed,
		"cancelled":       cancelled,
		"no_shows":        noShows,
		"completion_rate": completionRate,
		"daily":           daily,
	})
}

// ── Staff ─────────────────────────────────────────────────────────────────────

type staffReportRow struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	Color        string  `json:"color"`
	Appointments int     `json:"appointments"`
	Completed    int     `json:"completed"`
	Revenue      float64 `json:"revenue"`
	Tips         float64 `json:"tips"`
	AvgTicket    float64 `json:"avg_ticket"`
}

func (a *App) ReportStaff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	// Appointment counts per staff
	apptRows, err := a.DB.QueryContext(ctx,
		`SELECT sp.id,
		        CONCAT(u.first_name,' ',u.last_name),
		        COALESCE(sp.color,'#6366F1'),
		        COUNT(*) as total,
		        SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END)
		 FROM staff_profiles sp
		 JOIN users u ON u.id=sp.user_id
		 LEFT JOIN appointments a ON a.staff_id=sp.id
		   AND a.start_at>=? AND a.start_at<=?
		 WHERE sp.salon_id=?
		 GROUP BY sp.id, u.first_name, u.last_name, sp.color
		 ORDER BY total DESC`, from, to, sid)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer apptRows.Close()

	type staffKey struct {
		id    int
		name  string
		color string
	}
	staffMap := map[int]*staffReportRow{}
	var staffList []*staffReportRow
	for apptRows.Next() {
		var row staffReportRow
		apptRows.Scan(&row.ID, &row.Name, &row.Color, &row.Appointments, &row.Completed)
		staffMap[row.ID] = &row
		staffList = append(staffList, &row)
	}

	// Revenue and tips from transactions (staff_id on transactions)
	txRows, err := a.DB.QueryContext(ctx,
		`SELECT sp.id,
		        COALESCE(SUM(t.grand_total),0),
		        COALESCE(SUM(t.tip_amount),0)
		 FROM staff_profiles sp
		 JOIN transactions t ON t.staff_id=sp.id
		   AND t.created_at>=? AND t.created_at<=? AND t.status='completed'
		 WHERE sp.salon_id=?
		 GROUP BY sp.id`, from, to, sid)
	if err == nil {
		defer txRows.Close()
		for txRows.Next() {
			var id int
			var rev, tips float64
			txRows.Scan(&id, &rev, &tips)
			if s, ok := staffMap[id]; ok {
				s.Revenue = rev
				s.Tips = tips
				if s.Completed > 0 {
					s.AvgTicket = rev / float64(s.Completed)
				}
			}
		}
	}

	result := make([]staffReportRow, 0, len(staffList))
	for _, s := range staffList {
		result = append(result, *s)
	}
	a.JSON(w, http.StatusOK, result)
}

// ── Services ──────────────────────────────────────────────────────────────────

type serviceReportRow struct {
	Name     string  `json:"name"`
	Category string  `json:"category"`
	Bookings int     `json:"bookings"`
	Revenue  float64 `json:"revenue"`
	AvgPrice float64 `json:"avg_price"`
}

func (a *App) ReportServices(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT ti.name,
		        COALESCE(sc.name,'Uncategorized'),
		        COUNT(*),
		        COALESCE(SUM(ti.subtotal),0),
		        COALESCE(AVG(ti.price),0)
		 FROM transaction_items ti
		 JOIN transactions t ON t.id=ti.transaction_id
		 LEFT JOIN services s ON s.id=ti.service_id
		 LEFT JOIN service_categories sc ON sc.id=s.category_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed'
		 GROUP BY ti.name, sc.name
		 ORDER BY SUM(ti.subtotal) DESC`, sid, from, to)
	result := []serviceReportRow{}
	if err != nil {
		a.JSON(w, http.StatusOK, result)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var row serviceReportRow
		rows.Scan(&row.Name, &row.Category, &row.Bookings, &row.Revenue, &row.AvgPrice)
		result = append(result, row)
	}
	a.JSON(w, http.StatusOK, result)
}

// ── Clients ───────────────────────────────────────────────────────────────────

type clientReportTopRow struct {
	Rank        int     `json:"rank"`
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	TotalVisits int     `json:"total_visits"`
	TotalSpend  float64 `json:"total_spend"`
	AvgPerVisit float64 `json:"avg_per_visit"`
	LastVisit   *string `json:"last_visit"`
}

func (a *App) ReportClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	// New clients (created_at in range)
	var newClients int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clients WHERE salon_id=? AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&newClients)

	// Returning clients (visit in range AND created_at before range)
	var returning int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT c.id) FROM clients c
		 JOIN appointments a ON a.client_id=c.id
		 WHERE c.salon_id=? AND a.start_at>=? AND a.start_at<=?
		   AND a.status='completed' AND c.created_at<?`,
		sid, from, to, from).Scan(&returning)

	// At-risk: no visit in 45+ days
	now := time.Now().UTC()
	cutoff45 := now.AddDate(0, 0, -45)
	cutoff90 := now.AddDate(0, 0, -90)

	var atRisk int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clients
		 WHERE salon_id=? AND is_active=1
		   AND (last_visit_at IS NULL OR last_visit_at < ?)
		   AND (last_visit_at IS NULL OR last_visit_at >= ?)`,
		sid, cutoff45, cutoff90).Scan(&atRisk)

	var lapsed int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clients
		 WHERE salon_id=? AND is_active=1
		   AND (last_visit_at IS NULL OR last_visit_at < ?)`,
		sid, cutoff90).Scan(&lapsed)

	// Top 10 by spend
	topRows, err := a.DB.QueryContext(ctx,
		`SELECT id, CONCAT(first_name,' ',last_name),
		        COALESCE(total_visits,0), COALESCE(total_spend,0),
		        COALESCE(total_spend/NULLIF(total_visits,0),0),
		        last_visit_at
		 FROM clients WHERE salon_id=? AND is_active=1
		 ORDER BY total_spend DESC LIMIT 10`, sid)
	topClients := []clientReportTopRow{}
	if err == nil {
		defer topRows.Close()
		rank := 1
		for topRows.Next() {
			var row clientReportTopRow
			var lv *time.Time
			topRows.Scan(&row.ID, &row.Name, &row.TotalVisits, &row.TotalSpend, &row.AvgPerVisit, &lv)
			row.Rank = rank
			if lv != nil {
				s := lv.Format("2006-01-02")
				row.LastVisit = &s
			}
			topClients = append(topClients, row)
			rank++
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"new_clients": newClients,
		"returning":   returning,
		"at_risk":     atRisk,
		"lapsed":      lapsed,
		"top_clients": topClients,
	})
}

// ── Inventory ─────────────────────────────────────────────────────────────────

type inventoryReportRow struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	SKU          string  `json:"sku"`
	Category     string  `json:"category"`
	Quantity     int     `json:"quantity"`
	MinQuantity  int     `json:"min_quantity"`
	Status       string  `json:"status"`
	CostPrice    float64 `json:"cost_price"`
	SellingPrice float64 `json:"selling_price"`
}

func (a *App) ReportInventory(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT id, name, COALESCE(sku,''), COALESCE(category,''),
		        quantity, min_quantity,
		        COALESCE(cost_price,0), COALESCE(selling_price,0)
		 FROM inventory_items
		 WHERE salon_id=?
		 ORDER BY name ASC`, sid)
	result := []inventoryReportRow{}
	if err != nil {
		a.JSON(w, http.StatusOK, result)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var row inventoryReportRow
		rows.Scan(&row.ID, &row.Name, &row.SKU, &row.Category,
			&row.Quantity, &row.MinQuantity, &row.CostPrice, &row.SellingPrice)
		switch {
		case row.Quantity == 0:
			row.Status = "out"
		case row.Quantity <= row.MinQuantity:
			row.Status = "low"
		default:
			row.Status = "ok"
		}
		result = append(result, row)
	}
	a.JSON(w, http.StatusOK, result)
}

// ── Loyalty ───────────────────────────────────────────────────────────────────

func (a *App) ReportLoyalty(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var earned, redeemed int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(points),0) FROM loyalty_transactions
		 WHERE salon_id=? AND type='earn' AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&earned)
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(points),0) FROM loyalty_transactions
		 WHERE salon_id=? AND type='redeem' AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&redeemed)

	var activeMembers int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM client_loyalty WHERE salon_id=? AND balance > 0`, sid).Scan(&activeMembers)

	a.JSON(w, http.StatusOK, map[string]any{
		"points_earned":   earned,
		"points_redeemed": redeemed,
		"net_points":      earned - redeemed,
		"active_members":  activeMembers,
	})
}

// ── End of Day ────────────────────────────────────────────────────────────────

type eodPaymentRow struct {
	Method  string  `json:"method"`
	Count   int     `json:"count"`
	Revenue float64 `json:"revenue"`
}

func (a *App) ReportEndOfDay(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	now := time.Now().UTC()
	dateStr := r.URL.Query().Get("date")
	var day time.Time
	if dateStr != "" {
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
			day = t
		}
	}
	if day.IsZero() {
		day = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	}
	dayStart := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, time.UTC)
	dayEnd := dayStart.Add(24 * time.Hour)

	var revenue, tips, tax, discounts float64
	var txCount, uniqueClients int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0), COALESCE(SUM(tip_amount),0),
		        COALESCE(SUM(tax_amount),0), COALESCE(SUM(discount),0),
		        COUNT(*), COUNT(DISTINCT client_id)
		 FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<? AND status='completed'`,
		sid, dayStart, dayEnd).Scan(&revenue, &tips, &tax, &discounts, &txCount, &uniqueClients)

	// Payment method breakdown
	pmRows, err := a.DB.QueryContext(ctx,
		`SELECT COALESCE(payment_method,'other'), COUNT(*), COALESCE(SUM(grand_total),0)
		 FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<? AND status='completed'
		 GROUP BY payment_method ORDER BY SUM(grand_total) DESC`, sid, dayStart, dayEnd)
	payments := []eodPaymentRow{}
	if err == nil {
		defer pmRows.Close()
		for pmRows.Next() {
			var row eodPaymentRow
			pmRows.Scan(&row.Method, &row.Count, &row.Revenue)
			payments = append(payments, row)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"date":           dayStart.Format("2006-01-02"),
		"revenue":        revenue,
		"transactions":   txCount,
		"tips":           tips,
		"tax":            tax,
		"discounts":      discounts,
		"unique_clients": uniqueClients,
		"payments":       payments,
	})
}
