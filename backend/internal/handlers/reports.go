package handlers

import (
	"fmt"
	"math"
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

// ── Team reports ──────────────────────────────────────────────────────────────

func shiftHours(start, end string) float64 {
	parse := func(t string) float64 {
		if len(t) != 5 {
			return 0
		}
		h, m := float64(0), float64(0)
		fmt.Sscanf(t[:2], "%f", &h)
		fmt.Sscanf(t[3:], "%f", &m)
		return h + m/60
	}
	s, e := parse(start), parse(end)
	if e < s {
		e += 24
	}
	return e - s
}

func (a *App) ReportWorkingHoursActivity(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT sh.id, TRIM(CONCAT(u.first_name,' ',u.last_name)), sh.shift_date, sh.start_time, sh.end_time, COALESCE(sh.notes,'')
		 FROM shifts sh
		 JOIN staff_profiles sp ON sp.id=sh.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE sh.salon_id=? AND sh.shift_date>=? AND sh.shift_date<=?
		 ORDER BY sh.shift_date DESC, TRIM(CONCAT(u.first_name,' ',u.last_name)) ASC`, sid, sid, from, to)
	type shiftRow struct {
		ID        int     `json:"id"`
		Staff     string  `json:"staff"`
		ShiftDate string  `json:"shift_date"`
		StartTime string  `json:"start_time"`
		EndTime   string  `json:"end_time"`
		Hours     float64 `json:"hours"`
		Notes     string  `json:"notes"`
	}
	list := []shiftRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row shiftRow
			rows.Scan(&row.ID, &row.Staff, &row.ShiftDate, &row.StartTime, &row.EndTime, &row.Notes)
			row.Hours = math.Round(shiftHours(row.StartTime, row.EndTime)*10) / 10
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportWorkingHoursSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), COUNT(sh.id) as shifts, sh.start_time, sh.end_time,
		        COALESCE(SUM(t.grand_total),0) as revenue
		 FROM shifts sh
		 JOIN staff_profiles sp ON sp.id=sh.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 LEFT JOIN transactions t ON t.staff_id=sh.staff_id AND t.salon_id=?
		                          AND DATE(t.created_at)=sh.shift_date AND t.status='completed'
		 WHERE sh.salon_id=? AND sh.shift_date>=? AND sh.shift_date<=?
		 GROUP BY sp.id, sh.start_time, sh.end_time
		 ORDER BY revenue DESC`, sid, sid, sid, from, to)
	type sumRow struct {
		Staff      string  `json:"staff"`
		Shifts     int     `json:"shifts"`
		TotalHours float64 `json:"total_hours"`
		AvgHours   float64 `json:"avg_hours"`
		Revenue    float64 `json:"revenue"`
	}
	list := []sumRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row sumRow
			var start, end string
			rows.Scan(&row.Staff, &row.Shifts, &start, &end, &row.Revenue)
			h := math.Round(shiftHours(start, end)*10) / 10
			row.TotalHours = math.Round(h*float64(row.Shifts)*10) / 10
			row.AvgHours = math.Round(h*10) / 10
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportAttendanceSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), COUNT(sh.id) as shifts, sh.start_time, sh.end_time
		 FROM shifts sh
		 JOIN staff_profiles sp ON sp.id=sh.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE sh.salon_id=? AND sh.shift_date>=? AND sh.shift_date<=?
		 GROUP BY sp.id, sh.start_time, sh.end_time ORDER BY TRIM(CONCAT(u.first_name,' ',u.last_name)) ASC`, sid, sid, from, to)
	type attRow struct {
		Staff      string  `json:"staff"`
		Scheduled  int     `json:"scheduled"`
		Worked     int     `json:"worked"`
		TotalHours float64 `json:"total_hours"`
	}
	list := []attRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row attRow
			var start, end string
			rows.Scan(&row.Staff, &row.Scheduled, &start, &end)
			row.Worked = row.Scheduled
			row.TotalHours = math.Round(shiftHours(start, end)*float64(row.Scheduled)*10) / 10
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportScheduledShifts(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT sh.id, TRIM(CONCAT(u.first_name,' ',u.last_name)), sh.shift_date, sh.start_time, sh.end_time
		 FROM shifts sh
		 JOIN staff_profiles sp ON sp.id=sh.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE sh.salon_id=? AND sh.shift_date>=? AND sh.shift_date<=?
		 ORDER BY sh.shift_date ASC, TRIM(CONCAT(u.first_name,' ',u.last_name)) ASC`, sid, sid, from, to)
	type shiftRow struct {
		ID        int     `json:"id"`
		Staff     string  `json:"staff"`
		ShiftDate string  `json:"shift_date"`
		StartTime string  `json:"start_time"`
		EndTime   string  `json:"end_time"`
		Hours     float64 `json:"hours"`
	}
	list := []shiftRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row shiftRow
			rows.Scan(&row.ID, &row.Staff, &row.ShiftDate, &row.StartTime, &row.EndTime)
			row.Hours = math.Round(shiftHours(row.StartTime, row.EndTime)*10) / 10
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportTipsSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var totalTips, avgTip float64
	var staffCount int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(tip_amount),0), COUNT(DISTINCT staff_id), COALESCE(AVG(NULLIF(tip_amount,0)),0)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed' AND tip_amount>0`,
		sid, from, to).Scan(&totalTips, &staffCount, &avgTip)

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), COUNT(*) as cnt, COALESCE(SUM(t.tip_amount),0) as tips, COALESCE(AVG(NULLIF(t.tip_amount,0)),0) as avg_tip
		 FROM transactions t
		 JOIN staff_profiles sp ON sp.id=t.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed' AND t.tip_amount>0
		 GROUP BY sp.id ORDER BY tips DESC`, sid, sid, from, to)
	type staffRow struct {
		Staff  string  `json:"staff"`
		Count  int     `json:"count"`
		Tips   float64 `json:"tips"`
		AvgTip float64 `json:"avg_tip"`
	}
	byStaff := []staffRow{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row staffRow
			rows.Scan(&row.Staff, &row.Count, &row.Tips, &row.AvgTip)
			byStaff = append(byStaff, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"total_tips":  totalTips,
		"avg_tip":     avgTip,
		"staff_count": staffCount,
		"by_staff":    byStaff,
	})
}

func (a *App) ReportTipsDetail(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT t.id, DATE(t.created_at), TRIM(CONCAT(u.first_name,' ',u.last_name)), COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in'), t.payment_method, t.grand_total, t.tip_amount
		 FROM transactions t
		 JOIN staff_profiles sp ON sp.id=t.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 LEFT JOIN clients c ON c.id=t.client_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed' AND t.tip_amount>0
		 ORDER BY t.created_at DESC`, sid, sid, from, to)
	type tipRow struct {
		ID            int     `json:"id"`
		Date          string  `json:"date"`
		Staff         string  `json:"staff"`
		Client        string  `json:"client"`
		PaymentMethod string  `json:"payment_method"`
		SaleTotal     float64 `json:"sale_total"`
		Tip           float64 `json:"tip"`
	}
	list := []tipRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row tipRow
			rows.Scan(&row.ID, &row.Date, &row.Staff, &row.Client, &row.PaymentMethod, &row.SaleTotal, &row.Tip)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportCommissionActivity(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT t.id, DATE(t.created_at), TRIM(CONCAT(u.first_name,' ',u.last_name)), COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in'),
		        t.grand_total, sp.commission_pct,
		        ROUND(t.grand_total * sp.commission_pct / 100, 2) as commission
		 FROM transactions t
		 JOIN staff_profiles sp ON sp.id=t.staff_id AND sp.salon_id=? AND sp.commission_pct>0
		 JOIN users u ON u.id=sp.user_id
		 LEFT JOIN clients c ON c.id=t.client_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed'
		 ORDER BY t.created_at DESC`, sid, sid, from, to)
	type commRow struct {
		ID            int     `json:"id"`
		Date          string  `json:"date"`
		Staff         string  `json:"staff"`
		Client        string  `json:"client"`
		SaleTotal     float64 `json:"sale_total"`
		CommissionPct float64 `json:"commission_pct"`
		Commission    float64 `json:"commission"`
	}
	list := []commRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row commRow
			rows.Scan(&row.ID, &row.Date, &row.Staff, &row.Client, &row.SaleTotal, &row.CommissionPct, &row.Commission)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportCommissionSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), COUNT(*) as sales, COALESCE(SUM(t.grand_total),0) as revenue,
		        sp.commission_pct,
		        ROUND(SUM(t.grand_total) * sp.commission_pct / 100, 2) as commission
		 FROM transactions t
		 JOIN staff_profiles sp ON sp.id=t.staff_id AND sp.salon_id=? AND sp.commission_pct>0
		 JOIN users u ON u.id=sp.user_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed'
		 GROUP BY sp.id ORDER BY commission DESC`, sid, sid, from, to)
	type sumRow struct {
		Staff         string  `json:"staff"`
		Sales         int     `json:"sales"`
		Revenue       float64 `json:"revenue"`
		CommissionPct float64 `json:"commission_pct"`
		Commission    float64 `json:"commission"`
	}
	list := []sumRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row sumRow
			rows.Scan(&row.Staff, &row.Sales, &row.Revenue, &row.CommissionPct, &row.Commission)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportBreakActivity(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT b.id, DATE(b.start_at), TRIM(CONCAT(u.first_name,' ',u.last_name)),
		        b.start_at, b.end_at,
		        CASE WHEN b.end_at IS NULL THEN NULL ELSE TIMESTAMPDIFF(MINUTE, b.start_at, b.end_at) END
		 FROM staff_breaks b
		 JOIN staff_profiles sp ON sp.id=b.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE b.salon_id=? AND b.start_at>=? AND b.start_at<=?
		 ORDER BY b.start_at DESC`, sid, sid, from, to)
	type breakRow struct {
		ID          int        `json:"id"`
		Date        string     `json:"date"`
		Staff       string     `json:"staff"`
		StartAt     time.Time  `json:"start_at"`
		EndAt       *time.Time `json:"end_at"`
		DurationMin *int       `json:"duration_min"`
	}
	list := []breakRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row breakRow
			rows.Scan(&row.ID, &row.Date, &row.Staff, &row.StartAt, &row.EndAt, &row.DurationMin)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportWagesDetail(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), sh.shift_date, sh.start_time, sh.end_time,
		        COALESCE(sp.hourly_rate,0)
		 FROM shifts sh
		 JOIN staff_profiles sp ON sp.id=sh.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE sh.salon_id=? AND sh.shift_date>=? AND sh.shift_date<=?
		 ORDER BY sh.shift_date DESC, u.id ASC`, sid, sid, from, to)
	type wageRow struct {
		Staff      string  `json:"staff"`
		ShiftDate  string  `json:"shift_date"`
		Hours      float64 `json:"hours"`
		HourlyRate float64 `json:"hourly_rate"`
		Wage       float64 `json:"wage"`
	}
	list := []wageRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row wageRow
			var start, end string
			rows.Scan(&row.Staff, &row.ShiftDate, &start, &end, &row.HourlyRate)
			row.Hours = math.Round(shiftHours(start, end)*100) / 100
			row.Wage = math.Round(row.Hours*row.HourlyRate*100) / 100
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportWagesSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	type sumRow struct {
		Staff      string  `json:"staff"`
		Shifts     int     `json:"shifts"`
		TotalHours float64 `json:"total_hours"`
		HourlyRate float64 `json:"hourly_rate"`
		TotalWage  float64 `json:"total_wage"`
	}

	rows2, err2 := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), sh.shift_date, sh.start_time, sh.end_time,
		        COALESCE(sp.hourly_rate,0)
		 FROM shifts sh
		 JOIN staff_profiles sp ON sp.id=sh.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE sh.salon_id=? AND sh.shift_date>=? AND sh.shift_date<=?
		 ORDER BY u.id ASC`, sid, sid, from, to)
	agg := map[string]*sumRow{}
	names := []string{}
	if err2 == nil {
		defer rows2.Close()
		for rows2.Next() {
			var staff, shiftDate, start, end string
			var rate float64
			if rows2.Scan(&staff, &shiftDate, &start, &end, &rate) != nil {
				continue
			}
			row, ok := agg[staff]
			if !ok {
				row = &sumRow{Staff: staff, HourlyRate: rate}
				agg[staff] = row
				names = append(names, staff)
			}
			hours := shiftHours(start, end)
			row.Shifts++
			row.TotalHours += hours
			row.TotalWage += hours * rate
		}
	}
	list := []sumRow{}
	for _, name := range names {
		row := agg[name]
		row.TotalHours = math.Round(row.TotalHours*100) / 100
		row.TotalWage = math.Round(row.TotalWage*100) / 100
		list = append(list, *row)
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportFeeDeductionActivity(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT f.id, DATE(f.created_at), TRIM(CONCAT(u.first_name,' ',u.last_name)), COALESCE(f.reason,''), f.amount
		 FROM fee_deductions f
		 JOIN staff_profiles sp ON sp.id=f.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE f.salon_id=? AND DATE(f.created_at)>=? AND DATE(f.created_at)<=?
		 ORDER BY f.created_at DESC`, sid, sid, from, to)
	type feeRow struct {
		ID     int     `json:"id"`
		Date   string  `json:"date"`
		Staff  string  `json:"staff"`
		Reason string  `json:"reason"`
		Amount float64 `json:"amount"`
	}
	list := []feeRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row feeRow
			rows.Scan(&row.ID, &row.Date, &row.Staff, &row.Reason, &row.Amount)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportFeeDeductionSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name)), COUNT(*) as cnt, COALESCE(SUM(f.amount),0)
		 FROM fee_deductions f
		 JOIN staff_profiles sp ON sp.id=f.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE f.salon_id=? AND DATE(f.created_at)>=? AND DATE(f.created_at)<=?
		 GROUP BY sp.id ORDER BY 3 DESC`, sid, sid, from, to)
	type sumRow struct {
		Staff       string  `json:"staff"`
		Count       int     `json:"count"`
		TotalAmount float64 `json:"total_amount"`
	}
	list := []sumRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row sumRow
			rows.Scan(&row.Staff, &row.Count, &row.TotalAmount)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportPaySummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)
	fromStr, toStr := from.Format("2006-01-02"), to.Format("2006-01-02")

	staffRows, err := a.DB.QueryContext(ctx,
		`SELECT sp.id, TRIM(CONCAT(u.first_name,' ',u.last_name)), COALESCE(sp.hourly_rate,0), COALESCE(sp.commission_pct,0)
		 FROM staff_profiles sp
		 JOIN users u ON u.id=sp.user_id
		 WHERE sp.salon_id=? AND u.is_active=1`, sid)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	type staffEntry struct {
		id            uint
		name          string
		hourlyRate    float64
		commissionPct float64
	}
	var staffList []staffEntry
	for staffRows.Next() {
		var s staffEntry
		staffRows.Scan(&s.id, &s.name, &s.hourlyRate, &s.commissionPct)
		staffList = append(staffList, s)
	}
	staffRows.Close()

	type payRow struct {
		Staff      string  `json:"staff"`
		Wages      float64 `json:"wages"`
		Commission float64 `json:"commission"`
		Tips       float64 `json:"tips"`
		Deductions float64 `json:"deductions"`
		NetPay     float64 `json:"net_pay"`
	}
	list := []payRow{}
	for _, s := range staffList {
		var hoursWorked float64
		a.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE,
			  STR_TO_DATE(CONCAT(shift_date,' ',start_time),'%Y-%m-%d %H:%i'),
			  STR_TO_DATE(CONCAT(shift_date,' ',end_time),'%Y-%m-%d %H:%i')) / 60.0), 0)
			FROM shifts WHERE salon_id=? AND staff_id=? AND shift_date BETWEEN ? AND ?`,
			sid, s.id, fromStr, toStr).Scan(&hoursWorked)
		wages := hoursWorked * s.hourlyRate

		var revenue, tips, deductions float64
		a.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(grand_total),0), COALESCE(SUM(tip_amount),0)
			FROM transactions WHERE salon_id=? AND staff_id=? AND status='completed'
			  AND created_at>=? AND created_at<=?`,
			sid, s.id, from, to).Scan(&revenue, &tips)
		commission := revenue * s.commissionPct / 100.0

		a.DB.QueryRowContext(ctx, `
			SELECT COALESCE(SUM(amount),0) FROM fee_deductions
			WHERE salon_id=? AND staff_id=? AND DATE(created_at) BETWEEN ? AND ?`,
			sid, s.id, fromStr, toStr).Scan(&deductions)

		netPay := wages + commission + tips - deductions
		if wages == 0 && commission == 0 && tips == 0 && deductions == 0 {
			continue
		}
		list = append(list, payRow{
			Staff:      s.name,
			Wages:      math.Round(wages*100) / 100,
			Commission: math.Round(commission*100) / 100,
			Tips:       math.Round(tips*100) / 100,
			Deductions: math.Round(deductions*100) / 100,
			NetPay:     math.Round(netPay*100) / 100,
		})
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportTeamTimeOff(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)
	fromStr, toStr := from.Format("2006-01-02"), to.Format("2006-01-02")

	rows, err := a.DB.QueryContext(ctx,
		`SELECT t.id, TRIM(CONCAT(u.first_name,' ',u.last_name)),
		        DATE_FORMAT(t.start_date,'%Y-%m-%d'), DATE_FORMAT(t.end_date,'%Y-%m-%d'),
		        COALESCE(t.reason,''), t.status
		 FROM time_off_requests t
		 JOIN staff_profiles sp ON sp.id=t.staff_id AND sp.salon_id=?
		 JOIN users u ON u.id=sp.user_id
		 WHERE t.salon_id=? AND t.start_date<=? AND t.end_date>=?
		 ORDER BY t.start_date DESC`, sid, sid, toStr, fromStr)
	type offRow struct {
		ID        int    `json:"id"`
		Staff     string `json:"staff"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Reason    string `json:"reason"`
		Status    string `json:"status"`
	}
	list := []offRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row offRow
			rows.Scan(&row.ID, &row.Staff, &row.StartDate, &row.EndDate, &row.Reason, &row.Status)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

// ── Client sub-reports ────────────────────────────────────────────────────────

func (a *App) ReportClientSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	// Unique clients who had appointments in the period
	var total, newClients, returning, walkIns int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT client_id) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<=? AND status='completed'`,
		sid, from, to).Scan(&total)
	// New = created in the period
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clients WHERE salon_id=? AND created_at>=? AND created_at<=? AND is_active=1`,
		sid, from, to).Scan(&newClients)
	returning = total - newClients
	if returning < 0 {
		returning = 0
	}
	// Walk-ins in the period
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM walk_in_queue WHERE salon_id=? AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&walkIns)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(a.start_at) as d,
		        COUNT(DISTINCT CASE WHEN c.created_at>=? THEN a.client_id END) as new_clients,
		        COUNT(DISTINCT CASE WHEN c.created_at<? THEN a.client_id END)  as returning
		 FROM appointments a
		 JOIN clients c ON c.id=a.client_id
		 WHERE a.salon_id=? AND a.start_at>=? AND a.start_at<=? AND a.status='completed'
		 GROUP BY DATE(a.start_at) ORDER BY d ASC`, from, from, sid, from, to)
	type dailyRow struct {
		Date       string `json:"date"`
		NewClients int    `json:"new_clients"`
		Returning  int    `json:"returning"`
	}
	daily := []dailyRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.NewClients, &row.Returning)
			daily = append(daily, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"total":       total,
		"new_clients": newClients,
		"returning":   returning,
		"walk_ins":    walkIns,
		"daily":       daily,
	})
}

func (a *App) ReportClientList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT id, CONCAT(first_name,' ',last_name) as name,
		        phone, COALESCE(email,'') as email,
		        total_visits, COALESCE(total_spend,0), COALESCE(loyalty_points,0),
		        COALESCE(DATE(last_visit_at),'') as last_visit
		 FROM clients WHERE salon_id=? AND is_active=1
		 ORDER BY total_spend DESC`, sid)
	type clientRow struct {
		ID            int     `json:"id"`
		Name          string  `json:"name"`
		Phone         string  `json:"phone"`
		Email         string  `json:"email"`
		TotalVisits   int     `json:"total_visits"`
		TotalSpend    float64 `json:"total_spend"`
		LoyaltyPoints int     `json:"loyalty_points"`
		LastVisit     string  `json:"last_visit"`
	}
	list := []clientRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row clientRow
			rows.Scan(&row.ID, &row.Name, &row.Phone, &row.Email, &row.TotalVisits, &row.TotalSpend, &row.LoyaltyPoints, &row.LastVisit)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportClientInsights(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var active int
	var avgVisits, avgSpend float64
	var loyaltyMembers int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*), COALESCE(AVG(total_visits),0), COALESCE(AVG(total_spend),0),
		        SUM(CASE WHEN loyalty_points>0 THEN 1 ELSE 0 END)
		 FROM clients WHERE salon_id=? AND is_active=1`, sid).Scan(&active, &avgVisits, &avgSpend, &loyaltyMembers)

	now := time.Now().UTC()
	var active30, atRisk, lapsed, lost int
	a.DB.QueryRowContext(ctx,
		`SELECT SUM(CASE WHEN last_visit_at>=? THEN 1 ELSE 0 END),
		        SUM(CASE WHEN last_visit_at>=? AND last_visit_at<? THEN 1 ELSE 0 END),
		        SUM(CASE WHEN last_visit_at>=? AND last_visit_at<? THEN 1 ELSE 0 END),
		        SUM(CASE WHEN last_visit_at<? OR last_visit_at IS NULL THEN 1 ELSE 0 END)
		 FROM clients WHERE salon_id=? AND is_active=1`,
		now.AddDate(0, 0, -30),
		now.AddDate(0, 0, -60), now.AddDate(0, 0, -30),
		now.AddDate(0, 0, -90), now.AddDate(0, 0, -60),
		now.AddDate(0, 0, -90),
		sid).Scan(&active30, &atRisk, &lapsed, &lost)

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT id, CONCAT(first_name,' ',last_name),
		        COALESCE((SELECT COUNT(*) FROM appointments WHERE client_id=c.id AND salon_id=? AND start_at>=? AND start_at<=?),0) as visits,
		        COALESCE(total_spend,0)
		 FROM clients c WHERE salon_id=? AND is_active=1
		 ORDER BY total_spend DESC LIMIT 10`, sid, from, to, sid)
	type spenderRow struct {
		ID     int     `json:"id"`
		Name   string  `json:"name"`
		Visits int     `json:"visits"`
		Spend  float64 `json:"spend"`
	}
	topSpenders := []spenderRow{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row spenderRow
			rows.Scan(&row.ID, &row.Name, &row.Visits, &row.Spend)
			topSpenders = append(topSpenders, row)
		}
	}

	rows2, _ := a.DB.QueryContext(ctx,
		`SELECT COALESCE(referral_source,'Unknown') as src, COUNT(*) as cnt
		 FROM clients WHERE salon_id=? AND is_active=1 AND referral_source IS NOT NULL
		 GROUP BY src ORDER BY cnt DESC`, sid)
	type refRow struct {
		Source string `json:"source"`
		Count  int    `json:"count"`
	}
	refSources := []refRow{}
	if rows2 != nil {
		defer rows2.Close()
		for rows2.Next() {
			var row refRow
			rows2.Scan(&row.Source, &row.Count)
			refSources = append(refSources, row)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"active":           active,
		"avg_visits":       avgVisits,
		"avg_spend":        avgSpend,
		"loyalty_members":  loyaltyMembers,
		"active_30d":       active30,
		"at_risk":          atRisk,
		"lapsed":           lapsed,
		"lost":             lost,
		"top_spenders":     topSpenders,
		"referral_sources": refSources,
	})
}

// ── Finance reports ───────────────────────────────────────────────────────────

func (a *App) ReportFinanceSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var totalRevenue, totalPayments float64
	var txCount int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0), COALESCE(SUM(grand_total),0), COUNT(*)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'`,
		sid, from, to).Scan(&totalRevenue, &totalPayments, &txCount)

	var refunds float64
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='refunded'`,
		sid, from, to).Scan(&refunds)

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT payment_method, COUNT(*), COALESCE(SUM(grand_total),0) FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed' GROUP BY payment_method`, sid, from, to)
	type pmRow struct {
		Method string  `json:"method"`
		Count  int     `json:"count"`
		Amount float64 `json:"amount"`
	}
	pmBreakdown := []pmRow{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row pmRow
			rows.Scan(&row.Method, &row.Count, &row.Amount)
			pmBreakdown = append(pmBreakdown, row)
		}
	}

	var gcBalance, pkgBalance float64
	var gcCount, pkgCount int
	a.DB.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(initial_amount-redeemed_amount),0) FROM gift_cards WHERE salon_id=? AND status='active'`, sid).Scan(&gcCount, &gcBalance)
	a.DB.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(price_paid),0) FROM client_packages WHERE salon_id=? AND status='active'`, sid).Scan(&pkgCount, &pkgBalance)

	type liabRow struct {
		Type   string  `json:"type"`
		Amount float64 `json:"amount"`
	}
	liabBreakdown := []liabRow{
		{Type: "Gift Cards", Amount: gcBalance},
		{Type: "Packages", Amount: pkgBalance},
	}
	totalLiab := gcBalance + pkgBalance

	a.JSON(w, http.StatusOK, map[string]any{
		"total_revenue":       totalRevenue,
		"total_payments":      totalPayments,
		"net_revenue":         totalRevenue - refunds,
		"total_liabilities":   totalLiab,
		"payment_breakdown":   pmBreakdown,
		"liability_breakdown": liabBreakdown,
	})
}

func (a *App) ReportPaymentsSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var total, avg float64
	var count int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0), COUNT(*), COALESCE(AVG(grand_total),0)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'`,
		sid, from, to).Scan(&total, &count, &avg)

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT payment_method, COUNT(*), COALESCE(SUM(grand_total),0), COALESCE(SUM(tip_amount),0), COALESCE(SUM(grand_total),0)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'
		 GROUP BY payment_method ORDER BY SUM(grand_total) DESC`, sid, from, to)
	type mRow struct {
		Method string  `json:"method"`
		Count  int     `json:"count"`
		Amount float64 `json:"amount"`
		Tips   float64 `json:"tips"`
		Total  float64 `json:"total"`
	}
	byMethod := []mRow{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row mRow
			rows.Scan(&row.Method, &row.Count, &row.Amount, &row.Tips, &row.Total)
			byMethod = append(byMethod, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{"total": total, "count": count, "avg": avg, "by_method": byMethod})
}

func (a *App) ReportPaymentTransactions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT t.id, DATE(t.created_at), COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in'),
		        t.payment_method, t.status, t.subtotal, t.tax_amount, t.tip_amount, t.grand_total
		 FROM transactions t
		 LEFT JOIN clients c ON c.id=t.client_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=?
		 ORDER BY t.created_at DESC`, sid, from, to)
	type txRow struct {
		ID            int     `json:"id"`
		Date          string  `json:"date"`
		Client        string  `json:"client"`
		PaymentMethod string  `json:"payment_method"`
		Status        string  `json:"status"`
		Subtotal      float64 `json:"subtotal"`
		Tax           float64 `json:"tax"`
		Tips          float64 `json:"tips"`
		Total         float64 `json:"total"`
	}
	list := []txRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row txRow
			rows.Scan(&row.ID, &row.Date, &row.Client, &row.PaymentMethod, &row.Status, &row.Subtotal, &row.Tax, &row.Tips, &row.Total)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportCashFlowSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var inflow, outflow float64
	var count int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(CASE WHEN status='completed' THEN grand_total ELSE 0 END),0),
		        COALESCE(SUM(CASE WHEN status='refunded'  THEN grand_total ELSE 0 END),0),
		        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&inflow, &outflow, &count)

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as d,
		        COALESCE(SUM(CASE WHEN status='completed' THEN grand_total ELSE 0 END),0) as inflow,
		        COALESCE(SUM(CASE WHEN status='refunded'  THEN grand_total ELSE 0 END),0) as outflow
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=?
		 GROUP BY DATE(created_at) ORDER BY d ASC`, sid, from, to)
	type dailyRow struct {
		Date    string  `json:"date"`
		Inflow  float64 `json:"inflow"`
		Outflow float64 `json:"outflow"`
	}
	daily := []dailyRow{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.Inflow, &row.Outflow)
			daily = append(daily, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"inflow":  inflow,
		"outflow": outflow,
		"net":     inflow - outflow,
		"count":   count,
		"daily":   daily,
	})
}

func (a *App) ReportCashFlowStatement(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as d,
		        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as transactions,
		        COALESCE(SUM(CASE WHEN status='completed' THEN grand_total ELSE 0 END),0) as inflow,
		        COALESCE(SUM(CASE WHEN status='refunded'  THEN grand_total ELSE 0 END),0) as outflow,
		        COALESCE(SUM(CASE WHEN status='completed' THEN tax_amount  ELSE 0 END),0) as tax,
		        COALESCE(SUM(CASE WHEN status='completed' THEN tip_amount  ELSE 0 END),0) as tips,
		        COALESCE(SUM(CASE WHEN status='completed' THEN grand_total ELSE -grand_total END),0) as net
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=?
		 GROUP BY DATE(created_at) ORDER BY d ASC`, sid, from, to)
	type stmtRow struct {
		Date         string  `json:"date"`
		Transactions int     `json:"transactions"`
		Inflow       float64 `json:"inflow"`
		Outflow      float64 `json:"outflow"`
		Tax          float64 `json:"tax"`
		Tips         float64 `json:"tips"`
		Net          float64 `json:"net"`
	}
	list := []stmtRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row stmtRow
			rows.Scan(&row.Date, &row.Transactions, &row.Inflow, &row.Outflow, &row.Tax, &row.Tips, &row.Net)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportServiceCharges(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT s.name, COALESCE(sc.name,'Uncategorised') as category,
		        COUNT(aps.id) as bookings,
		        COALESCE(SUM(s.price),0) as revenue,
		        COALESCE(AVG(s.price),0) as avg_price
		 FROM appointment_services aps
		 JOIN services s ON s.id=aps.service_id AND s.salon_id=?
		 LEFT JOIN service_categories sc ON sc.id=s.category_id
		 JOIN appointments a ON a.id=aps.appointment_id AND a.salon_id=? AND a.start_at>=? AND a.start_at<=? AND a.status='completed'
		 GROUP BY s.id ORDER BY revenue DESC`, sid, sid, from, to)
	type scRow struct {
		Name     string  `json:"name"`
		Category string  `json:"category"`
		Bookings int     `json:"bookings"`
		Revenue  float64 `json:"revenue"`
		AvgPrice float64 `json:"avg_price"`
	}
	list := []scRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row scRow
			rows.Scan(&row.Name, &row.Category, &row.Bookings, &row.Revenue, &row.AvgPrice)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportLiabilitySummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	var gcBalance float64
	var gcCount int
	a.DB.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(initial_amount-redeemed_amount),0) FROM gift_cards WHERE salon_id=? AND status='active'`, sid).Scan(&gcCount, &gcBalance)

	var pkgBalance float64
	var pkgCount int
	a.DB.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(price_paid),0) FROM client_packages WHERE salon_id=? AND status='active'`, sid).Scan(&pkgCount, &pkgBalance)

	var memCount int
	var memBalance float64
	a.DB.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(mp.price),0) FROM client_memberships cm JOIN membership_plans mp ON mp.id=cm.plan_id WHERE cm.salon_id=? AND cm.status='active'`, sid).Scan(&memCount, &memBalance)

	a.JSON(w, http.StatusOK, map[string]any{
		"gift_cards":        gcBalance,
		"gift_cards_count":  gcCount,
		"packages":          pkgBalance,
		"packages_count":    pkgCount,
		"memberships":       memBalance,
		"memberships_count": memCount,
	})
}

func (a *App) ReportLiabilityActivity(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	type actRow struct {
		Date        string  `json:"date"`
		Type        string  `json:"type"`
		Client      string  `json:"client"`
		Description string  `json:"description"`
		Amount      float64 `json:"amount"`
	}
	list := []actRow{}

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT DATE(issued_at), 'Gift Card Issued', COALESCE(sender_name,'Unknown'), code, initial_amount
		 FROM gift_cards WHERE salon_id=? AND issued_at>=? AND issued_at<=? ORDER BY issued_at DESC`, sid, from, to)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row actRow
			rows.Scan(&row.Date, &row.Type, &row.Client, &row.Description, &row.Amount)
			list = append(list, row)
		}
	}

	rows2, _ := a.DB.QueryContext(ctx,
		`SELECT DATE(cp.purchased_at), 'Package Sold', COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Unknown'), p.name, cp.price_paid
		 FROM client_packages cp JOIN packages p ON p.id=cp.package_id LEFT JOIN clients c ON c.id=cp.client_id
		 WHERE cp.salon_id=? AND cp.purchased_at>=? AND cp.purchased_at<=? ORDER BY cp.purchased_at DESC`, sid, from, to)
	if rows2 != nil {
		defer rows2.Close()
		for rows2.Next() {
			var row actRow
			rows2.Scan(&row.Date, &row.Type, &row.Client, &row.Description, &row.Amount)
			list = append(list, row)
		}
	}

	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportPrepaymentsByPeriod(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var total, avg float64
	var count int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(deposit_paid),0), COUNT(*), COALESCE(AVG(deposit_paid),0)
		 FROM appointments WHERE salon_id=? AND deposit_paid>0 AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&total, &count, &avg)

	rows, _ := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as d, COALESCE(SUM(deposit_paid),0) as total
		 FROM appointments WHERE salon_id=? AND deposit_paid>0 AND created_at>=? AND created_at<=?
		 GROUP BY DATE(created_at) ORDER BY d ASC`, sid, from, to)
	type dailyRow struct {
		Date  string  `json:"date"`
		Total float64 `json:"total"`
	}
	daily := []dailyRow{}
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.Total)
			daily = append(daily, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{"total": total, "count": count, "avg": avg, "daily": daily})
}

func (a *App) ReportPrepaymentList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT a.id, COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in') as client,
		        DATE(a.start_at) as date,
		        COALESCE(GROUP_CONCAT(DISTINCT s.name SEPARATOR ', '),'—') as services,
		        COALESCE(st.name,'—') as staff,
		        a.deposit_paid,
		        a.status
		 FROM appointments a
		 LEFT JOIN clients c ON c.id=a.client_id
		 LEFT JOIN staff_profiles st ON st.id=a.staff_id
		 LEFT JOIN appointment_services aps ON aps.appointment_id=a.id
		 LEFT JOIN services s ON s.id=aps.service_id
		 WHERE a.salon_id=? AND a.deposit_paid>0
		 GROUP BY a.id ORDER BY a.start_at DESC`, sid)
	type ppRow struct {
		ID          int     `json:"id"`
		Client      string  `json:"client"`
		Date        string  `json:"date"`
		Services    string  `json:"services"`
		Staff       string  `json:"staff"`
		DepositPaid float64 `json:"deposit_paid"`
		Status      string  `json:"status"`
	}
	list := []ppRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row ppRow
			rows.Scan(&row.ID, &row.Client, &row.Date, &row.Services, &row.Staff, &row.DepositPaid, &row.Status)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportTaxesList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT t.id, DATE(t.created_at), COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in'), t.payment_method, t.subtotal, t.tax_amount, t.grand_total
		 FROM transactions t
		 LEFT JOIN clients c ON c.id=t.client_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=? AND t.status='completed' AND t.tax_amount>0
		 ORDER BY t.created_at DESC`, sid, from, to)
	type taxRow struct {
		ID            int     `json:"id"`
		Date          string  `json:"date"`
		Client        string  `json:"client"`
		PaymentMethod string  `json:"payment_method"`
		Subtotal      float64 `json:"subtotal"`
		Tax           float64 `json:"tax"`
		Total         float64 `json:"total"`
	}
	list := []taxRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row taxRow
			rows.Scan(&row.ID, &row.Date, &row.Client, &row.PaymentMethod, &row.Subtotal, &row.Tax, &row.Total)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

// ── Sales sub-reports ─────────────────────────────────────────────────────────

func (a *App) ReportSalesByPeriod(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as period,
		        COUNT(*) as transactions,
		        COALESCE(SUM(subtotal),0)    as revenue,
		        COALESCE(SUM(tax_amount),0)  as tax,
		        COALESCE(SUM(tip_amount),0)  as tips,
		        COALESCE(SUM(discount),0)    as discounts,
		        COALESCE(SUM(grand_total - tax_amount - tip_amount),0) as net
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'
		 GROUP BY DATE(created_at) ORDER BY period ASC`, sid, from, to)
	type periodRow struct {
		Period       string  `json:"period"`
		Transactions int     `json:"transactions"`
		Revenue      float64 `json:"revenue"`
		Tax          float64 `json:"tax"`
		Tips         float64 `json:"tips"`
		Discounts    float64 `json:"discounts"`
		Net          float64 `json:"net"`
	}
	list := []periodRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row periodRow
			rows.Scan(&row.Period, &row.Transactions, &row.Revenue, &row.Tax, &row.Tips, &row.Discounts, &row.Net)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportSalesList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT t.id,
		        DATE(t.created_at) as date,
		        COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in') as client,
		        COALESCE(st.name,'—') as staff,
		        t.payment_method,
		        t.status,
		        t.subtotal, t.tip_amount, t.tax_amount, t.grand_total
		 FROM transactions t
		 LEFT JOIN clients c  ON c.id=t.client_id
		 LEFT JOIN staff_profiles st ON st.id=t.staff_id
		 WHERE t.salon_id=? AND t.created_at>=? AND t.created_at<=?
		 ORDER BY t.created_at DESC`, sid, from, to)
	type txRow struct {
		ID            int     `json:"id"`
		Date          string  `json:"date"`
		Client        string  `json:"client"`
		Staff         string  `json:"staff"`
		PaymentMethod string  `json:"payment_method"`
		Status        string  `json:"status"`
		Subtotal      float64 `json:"subtotal"`
		Tips          float64 `json:"tips"`
		Tax           float64 `json:"tax"`
		Total         float64 `json:"total"`
	}
	list := []txRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row txRow
			rows.Scan(&row.ID, &row.Date, &row.Client, &row.Staff, &row.PaymentMethod, &row.Status,
				&row.Subtotal, &row.Tips, &row.Tax, &row.Total)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportSalesLogDetail(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT ti.id,
		        DATE(t.created_at) as date,
		        COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in') as client,
		        ti.name as item_name,
		        ti.item_type,
		        ti.quantity,
		        ti.unit_price,
		        ti.discount,
		        ti.total
		 FROM transaction_items ti
		 JOIN transactions t ON t.id=ti.transaction_id AND t.salon_id=?
		 LEFT JOIN clients c ON c.id=t.client_id
		 WHERE t.created_at>=? AND t.created_at<=?
		 ORDER BY t.created_at DESC, ti.id ASC`, sid, from, to)
	type lineRow struct {
		ID        int     `json:"id"`
		Date      string  `json:"date"`
		Client    string  `json:"client"`
		ItemName  string  `json:"item_name"`
		ItemType  string  `json:"item_type"`
		Quantity  int     `json:"quantity"`
		UnitPrice float64 `json:"unit_price"`
		Discount  float64 `json:"discount"`
		Total     float64 `json:"total"`
	}
	list := []lineRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row lineRow
			rows.Scan(&row.ID, &row.Date, &row.Client, &row.ItemName, &row.ItemType, &row.Quantity, &row.UnitPrice, &row.Discount, &row.Total)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportGiftCardsByPeriod(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var issued int
	var totalValue, totalRedeemed float64
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*), COALESCE(SUM(initial_amount),0), COALESCE(SUM(redeemed_amount),0)
		 FROM gift_cards WHERE salon_id=? AND issued_at>=? AND issued_at<=?`,
		sid, from, to).Scan(&issued, &totalValue, &totalRedeemed)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(issued_at) as date,
		        COUNT(*) as issued,
		        COALESCE(SUM(initial_amount),0)  as issued_value,
		        COALESCE(SUM(redeemed_amount),0) as redeemed
		 FROM gift_cards WHERE salon_id=? AND issued_at>=? AND issued_at<=?
		 GROUP BY DATE(issued_at) ORDER BY date ASC`, sid, from, to)
	type dailyRow struct {
		Date        string  `json:"date"`
		Issued      int     `json:"issued"`
		IssuedValue float64 `json:"issued_value"`
		Redeemed    float64 `json:"redeemed"`
	}
	daily := []dailyRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.Issued, &row.IssuedValue, &row.Redeemed)
			daily = append(daily, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"issued":            issued,
		"total_value":       totalValue,
		"total_redeemed":    totalRedeemed,
		"total_outstanding": totalValue - totalRedeemed,
		"daily":             daily,
	})
}

func (a *App) ReportGiftCardsList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT id, code, COALESCE(recipient_name,''), COALESCE(sender_name,''),
		        initial_amount, redeemed_amount,
		        initial_amount - redeemed_amount as balance, status,
		        DATE(issued_at)
		 FROM gift_cards WHERE salon_id=? ORDER BY issued_at DESC`, sid)
	type gcRow struct {
		ID             int     `json:"id"`
		Code           string  `json:"code"`
		Recipient      string  `json:"recipient"`
		Sender         string  `json:"sender"`
		InitialAmount  float64 `json:"initial_amount"`
		RedeemedAmount float64 `json:"redeemed_amount"`
		Balance        float64 `json:"balance"`
		Status         string  `json:"status"`
		IssuedAt       string  `json:"issued_at"`
	}
	list := []gcRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row gcRow
			rows.Scan(&row.ID, &row.Code, &row.Recipient, &row.Sender,
				&row.InitialAmount, &row.RedeemedAmount, &row.Balance, &row.Status, &row.IssuedAt)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportMembershipsList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT cm.id, COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'') as client, mp.name as plan,
		        mp.billing_cycle, mp.price, cm.status,
		        DATE(cm.started_at) as started_at,
		        COALESCE(DATE(cm.next_billing_at),'') as next_billing_at
		 FROM client_memberships cm
		 JOIN membership_plans mp ON mp.id=cm.plan_id
		 LEFT JOIN clients c ON c.id=cm.client_id
		 WHERE cm.salon_id=? ORDER BY cm.started_at DESC`, sid)
	type memRow struct {
		ID            int     `json:"id"`
		Client        string  `json:"client"`
		Plan          string  `json:"plan"`
		BillingCycle  string  `json:"billing_cycle"`
		Price         float64 `json:"price"`
		Status        string  `json:"status"`
		StartedAt     string  `json:"started_at"`
		NextBillingAt string  `json:"next_billing_at"`
	}
	list := []memRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row memRow
			rows.Scan(&row.ID, &row.Client, &row.Plan, &row.BillingCycle, &row.Price, &row.Status, &row.StartedAt, &row.NextBillingAt)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportPackagesList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT cp.id, COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'') as client, p.name as package_name,
		        cp.price_paid,
		        COALESCE(SUM(pr.id),0) as sessions_used,
		        cp.status,
		        DATE(cp.purchased_at) as purchased_at,
		        COALESCE(DATE(cp.expires_at),'') as expires_at
		 FROM client_packages cp
		 JOIN packages p ON p.id=cp.package_id
		 LEFT JOIN clients c ON c.id=cp.client_id
		 LEFT JOIN package_redemptions pr ON pr.client_package_id=cp.id
		 WHERE cp.salon_id=?
		 GROUP BY cp.id ORDER BY cp.purchased_at DESC`, sid)
	type pkgRow struct {
		ID                int     `json:"id"`
		Client            string  `json:"client"`
		PackageName       string  `json:"package_name"`
		PricePaid         float64 `json:"price_paid"`
		SessionsUsed      int     `json:"sessions_used"`
		SessionsRemaining *int    `json:"sessions_remaining"`
		Status            string  `json:"status"`
		PurchasedAt       string  `json:"purchased_at"`
		ExpiresAt         string  `json:"expires_at"`
	}
	list := []pkgRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row pkgRow
			rows.Scan(&row.ID, &row.Client, &row.PackageName, &row.PricePaid, &row.SessionsUsed,
				&row.Status, &row.PurchasedAt, &row.ExpiresAt)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportPackagesSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT p.name as package_name,
		        COUNT(cp.id) as sold,
		        COALESCE(SUM(cp.price_paid),0) as revenue,
		        COALESCE(SUM(pr_count.used),0) as sessions_used,
		        COALESCE(AVG(cp.price_paid),0) as avg_price
		 FROM client_packages cp
		 JOIN packages p ON p.id=cp.package_id
		 LEFT JOIN (SELECT client_package_id, COUNT(*) as used FROM package_redemptions GROUP BY client_package_id) pr_count ON pr_count.client_package_id=cp.id
		 WHERE cp.salon_id=? AND cp.purchased_at>=? AND cp.purchased_at<=?
		 GROUP BY p.id ORDER BY revenue DESC`, sid, from, to)
	type sumRow struct {
		PackageName       string  `json:"package_name"`
		Sold              int     `json:"sold"`
		Revenue           float64 `json:"revenue"`
		SessionsUsed      int     `json:"sessions_used"`
		SessionsRemaining int     `json:"sessions_remaining"`
		AvgPrice          float64 `json:"avg_price"`
	}
	list := []sumRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row sumRow
			rows.Scan(&row.PackageName, &row.Sold, &row.Revenue, &row.SessionsUsed, &row.AvgPrice)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportPackagesBenefits(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT pr.id,
		        DATE(pr.redeemed_at) as date,
		        COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'') as client,
		        p.name as package_name,
		        COALESCE(s.name,'') as service,
		        COALESCE(st.name,'') as staff,
		        COALESCE(s.price,0) as value
		 FROM package_redemptions pr
		 JOIN client_packages cp ON cp.id=pr.client_package_id AND cp.salon_id=?
		 JOIN packages p ON p.id=cp.package_id
		 LEFT JOIN clients c ON c.id=cp.client_id
		 LEFT JOIN services s ON s.id=pr.service_id
		 LEFT JOIN staff_profiles st ON st.id=pr.staff_id
		 WHERE pr.redeemed_at>=? AND pr.redeemed_at<=?
		 ORDER BY pr.redeemed_at DESC`, sid, from, to)
	type benefitRow struct {
		ID          int     `json:"id"`
		Date        string  `json:"date"`
		Client      string  `json:"client"`
		PackageName string  `json:"package_name"`
		Service     string  `json:"service"`
		Staff       string  `json:"staff"`
		Value       float64 `json:"value"`
	}
	list := []benefitRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row benefitRow
			rows.Scan(&row.ID, &row.Date, &row.Client, &row.PackageName, &row.Service, &row.Staff, &row.Value)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportDiscountsSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var totalDiscount float64
	var txWithDiscount int
	var avgDiscount float64
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(discount),0), COUNT(*), COALESCE(AVG(NULLIF(discount,0)),0)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'`,
		sid, from, to).Scan(&totalDiscount, &txWithDiscount, &avgDiscount)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as date, COALESCE(SUM(discount),0) as discount
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed' AND discount>0
		 GROUP BY DATE(created_at) ORDER BY date ASC`, sid, from, to)
	type dailyRow struct {
		Date     string  `json:"date"`
		Discount float64 `json:"discount"`
	}
	daily := []dailyRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.Discount)
			daily = append(daily, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"total_discount":   totalDiscount,
		"tx_with_discount": txWithDiscount,
		"avg_discount":     avgDiscount,
		"daily":            daily,
	})
}

func (a *App) ReportTaxesSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var totalTax, taxableRevenue float64
	var taxableTx int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(tax_amount),0), COALESCE(SUM(subtotal),0), COUNT(*)
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed' AND tax_amount>0`,
		sid, from, to).Scan(&totalTax, &taxableRevenue, &taxableTx)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as date, COALESCE(SUM(tax_amount),0) as tax
		 FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<=? AND status='completed'
		 GROUP BY DATE(created_at) ORDER BY date ASC`, sid, from, to)
	type dailyRow struct {
		Date string  `json:"date"`
		Tax  float64 `json:"tax"`
	}
	daily := []dailyRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.Tax)
			daily = append(daily, row)
		}
	}
	a.JSON(w, http.StatusOK, map[string]any{
		"total_tax":       totalTax,
		"taxable_revenue": taxableRevenue,
		"taxable_tx":      taxableTx,
		"daily":           daily,
	})
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

// ── Appointments List ─────────────────────────────────────────────────────────

type apptListRow struct {
	ID       int     `json:"id"`
	Date     string  `json:"date"`
	Client   string  `json:"client"`
	Services string  `json:"services"`
	Staff    string  `json:"staff"`
	Status   string  `json:"status"`
	Total    float64 `json:"total"`
}

func (a *App) ReportAppointmentsList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT a.id,
		        DATE(a.start_at) as date,
		        COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Walk-in') as client,
		        COALESCE(GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', '),'—') as services,
		        COALESCE(st.name,'—') as staff,
		        a.status,
		        COALESCE(SUM(DISTINCT t.amount),0) as total
		 FROM appointments a
		 LEFT JOIN clients c  ON c.id=a.client_id
		 LEFT JOIN staff st   ON st.id=a.staff_id
		 LEFT JOIN appointment_services aps ON aps.appointment_id=a.id
		 LEFT JOIN services s ON s.id=aps.service_id
		 LEFT JOIN transactions t ON t.appointment_id=a.id AND t.salon_id=a.salon_id
		 WHERE a.salon_id=? AND a.start_at>=? AND a.start_at<=?
		 GROUP BY a.id ORDER BY a.start_at DESC`, sid, from, to)
	list := []apptListRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row apptListRow
			rows.Scan(&row.ID, &row.Date, &row.Client, &row.Services, &row.Staff, &row.Status, &row.Total)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
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
	Quantity     float64 `json:"quantity"`
	MinQuantity  float64 `json:"min_quantity"`
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
		        stock_qty, low_stock_threshold,
		        COALESCE(cost_price,0), COALESCE(retail_price,0)
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

// ── Waitlist ──────────────────────────────────────────────────────────────────

type waitlistDetailRow struct {
	ID           int    `json:"id"`
	Client       string `json:"client"`
	Service      string `json:"service"`
	PreferredDay *int   `json:"preferred_day"`
	TimeStart    string `json:"time_start"`
	TimeEnd      string `json:"time_end"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
}

func (a *App) ReportWaitlistDetail(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT we.id,
		        COALESCE(TRIM(CONCAT(c.first_name,' ',c.last_name)),'Unknown') as client,
		        COALESCE(s.name,'')        as service,
		        we.preferred_day_of_week,
		        COALESCE(we.preferred_time_start,'') as time_start,
		        COALESCE(we.preferred_time_end,'')   as time_end,
		        we.status,
		        DATE(we.created_at) as created_at
		 FROM waitlist_entries we
		 LEFT JOIN clients c ON c.id=we.client_id
		 LEFT JOIN services s ON s.id=we.service_id
		 WHERE we.salon_id=? AND we.created_at>=? AND we.created_at<=?
		 ORDER BY we.created_at DESC`, sid, from, to)
	list := []waitlistDetailRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row waitlistDetailRow
			rows.Scan(&row.ID, &row.Client, &row.Service, &row.PreferredDay,
				&row.TimeStart, &row.TimeEnd, &row.Status, &row.CreatedAt)
			list = append(list, row)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportWaitlistSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var total, booked, expired, waiting int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*),
		        SUM(CASE WHEN status='booked'  THEN 1 ELSE 0 END),
		        SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END),
		        SUM(CASE WHEN status='waiting' THEN 1 ELSE 0 END)
		 FROM waitlist_entries WHERE salon_id=? AND created_at>=? AND created_at<=?`,
		sid, from, to).Scan(&total, &booked, &expired, &waiting)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as d,
		        COUNT(*) as added,
		        SUM(CASE WHEN status='booked' THEN 1 ELSE 0 END) as booked
		 FROM waitlist_entries
		 WHERE salon_id=? AND created_at>=? AND created_at<=?
		 GROUP BY DATE(created_at) ORDER BY d ASC`, sid, from, to)
	type dailyRow struct {
		Date   string `json:"date"`
		Added  int    `json:"added"`
		Booked int    `json:"booked"`
	}
	daily := []dailyRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var row dailyRow
			rows.Scan(&row.Date, &row.Added, &row.Booked)
			daily = append(daily, row)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"total":   total,
		"booked":  booked,
		"expired": expired,
		"waiting": waiting,
		"daily":   daily,
	})
}

// ── Inventory reports ─────────────────────────────────────────────────────────

func (a *App) ReportStockOnHand(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT id, name, COALESCE(category,''), COALESCE(sku,''), stock_qty,
		        COALESCE(low_stock_threshold,0), cost_price, retail_price
		 FROM inventory_items WHERE salon_id=? AND is_active=1 ORDER BY name`, sid)
	type row struct {
		ID                int     `json:"id"`
		Name              string  `json:"name"`
		Category          string  `json:"category"`
		SKU               string  `json:"sku"`
		StockQty          int     `json:"stock_qty"`
		LowStockThreshold int     `json:"low_stock_threshold"`
		CostPrice         float64 `json:"cost_price"`
		RetailPrice       float64 `json:"retail_price"`
		Status            string  `json:"status"`
	}
	list := []row{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r row
			rows.Scan(&r.ID, &r.Name, &r.Category, &r.SKU, &r.StockQty, &r.LowStockThreshold, &r.CostPrice, &r.RetailPrice)
			if r.StockQty <= 0 {
				r.Status = "out"
			} else if r.StockQty <= r.LowStockThreshold {
				r.Status = "low"
			} else {
				r.Status = "ok"
			}
			list = append(list, r)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportStockMovementSummary(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	var stockInQty, stockOutQty int
	var purchaseValue float64
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(qty_received),0), COALESCE(SUM(unit_cost*qty_received),0)
		 FROM purchase_order_items poi
		 JOIN purchase_orders po ON po.id=poi.po_id
		 WHERE po.salon_id=? AND po.order_date>=? AND po.order_date<=?`, sid, from, to).
		Scan(&stockInQty, &purchaseValue)

	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(dpi.quantity),0)
		 FROM direct_purchase_items dpi
		 JOIN direct_purchases dp ON dp.id=dpi.purchase_id
		 JOIN appointments a ON a.id=dp.appointment_id
		 WHERE a.salon_id=? AND DATE(a.start_time)>=? AND DATE(a.start_time)<=?`, sid, from, to).
		Scan(&stockOutQty)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT ii.name,
		        COALESCE(SUM(CASE WHEN po.order_date>=? THEN poi.qty_received ELSE 0 END),0) as stock_in,
		        0 as stock_out
		 FROM inventory_items ii
		 LEFT JOIN purchase_order_items poi ON poi.inventory_item_id=ii.id
		 LEFT JOIN purchase_orders po ON po.id=poi.po_id AND po.salon_id=? AND po.order_date<=?
		 WHERE ii.salon_id=?
		 GROUP BY ii.id, ii.name
		 HAVING stock_in > 0
		 ORDER BY stock_in DESC`, from, sid, to, sid)
	type byProd struct {
		Name     string `json:"name"`
		StockIn  int    `json:"stock_in"`
		StockOut int    `json:"stock_out"`
		Net      int    `json:"net"`
	}
	byProduct := []byProd{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p byProd
			rows.Scan(&p.Name, &p.StockIn, &p.StockOut)
			p.Net = p.StockIn - p.StockOut
			byProduct = append(byProduct, p)
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"stock_in_qty":   stockInQty,
		"stock_out_qty":  stockOutQty,
		"purchase_value": purchaseValue,
		"by_product":     byProduct,
	})
}

func (a *App) ReportStockMovementLog(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(po.order_date) as date, 'Stock In' as type,
		        ii.name as product, po.po_number as ref,
		        poi.qty_received as qty, poi.unit_cost,
		        poi.unit_cost * poi.qty_received as total_cost
		 FROM purchase_order_items poi
		 JOIN purchase_orders po ON po.id=poi.po_id
		 JOIN inventory_items ii ON ii.id=poi.inventory_item_id
		 WHERE po.salon_id=? AND po.order_date>=? AND po.order_date<=? AND poi.qty_received>0
		 ORDER BY po.order_date DESC`, sid, from, to)
	type logRow struct {
		Date      string  `json:"date"`
		Type      string  `json:"type"`
		Product   string  `json:"product"`
		Reference string  `json:"reference"`
		Qty       int     `json:"qty"`
		UnitCost  float64 `json:"unit_cost"`
		TotalCost float64 `json:"total_cost"`
	}
	list := []logRow{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r logRow
			rows.Scan(&r.Date, &r.Type, &r.Product, &r.Reference, &r.Qty, &r.UnitCost, &r.TotalCost)
			list = append(list, r)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportProductList(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	rows, err := a.DB.QueryContext(ctx,
		`SELECT id, name, COALESCE(category,''), COALESCE(sku,''),
		        COALESCE(supplier,''), cost_price, retail_price, stock_qty
		 FROM inventory_items WHERE salon_id=? AND is_active=1 ORDER BY name`, sid)
	type row struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		Category    string  `json:"category"`
		SKU         string  `json:"sku"`
		Supplier    string  `json:"supplier"`
		CostPrice   float64 `json:"cost_price"`
		RetailPrice float64 `json:"retail_price"`
		StockQty    int     `json:"stock_qty"`
	}
	list := []row{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r row
			rows.Scan(&r.ID, &r.Name, &r.Category, &r.SKU, &r.Supplier, &r.CostPrice, &r.RetailPrice, &r.StockQty)
			list = append(list, r)
		}
	}
	a.JSON(w, http.StatusOK, list)
}

func (a *App) ReportOrderedStock(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()
	from, to := parseDateRange(r)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT po.id, po.po_number, COALESCE(s.name,'Unknown') as supplier,
		        DATE(po.order_date), COALESCE(DATE(po.expected_date),''),
		        po.status, COUNT(poi.id) as item_count, po.total_amount
		 FROM purchase_orders po
		 LEFT JOIN suppliers s ON s.id=po.supplier_id
		 LEFT JOIN purchase_order_items poi ON poi.po_id=po.id
		 WHERE po.salon_id=? AND po.order_date>=? AND po.order_date<=?
		 GROUP BY po.id
		 ORDER BY po.order_date DESC`, sid, from, to)
	type row struct {
		ID           int     `json:"id"`
		PONumber     string  `json:"po_number"`
		Supplier     string  `json:"supplier"`
		OrderDate    string  `json:"order_date"`
		ExpectedDate string  `json:"expected_date"`
		Status       string  `json:"status"`
		ItemCount    int     `json:"item_count"`
		TotalAmount  float64 `json:"total_amount"`
	}
	list := []row{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r row
			rows.Scan(&r.ID, &r.PONumber, &r.Supplier, &r.OrderDate, &r.ExpectedDate,
				&r.Status, &r.ItemCount, &r.TotalAmount)
			list = append(list, r)
		}
	}
	a.JSON(w, http.StatusOK, list)
}
