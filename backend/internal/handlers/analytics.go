package handlers

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ─── Staff Performance ────────────────────────────────────────────────────────

type staffPerfRow struct {
	ID               int     `json:"id"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	AppointmentCount int     `json:"appointment_count"`
	RevenueEstimate  float64 `json:"revenue_estimate"`
	TotalRevenue     float64 `json:"total_revenue"`
	AvgTicket        float64 `json:"avg_ticket"`
	UniqueClients    int     `json:"unique_clients"`
	RebookingRate    float64 `json:"rebooking_rate"`
	TotalHoursWorked float64 `json:"total_hours_worked"`
	RevenuePerHour   float64 `json:"revenue_per_hour"`
}

func (a *App) StaffPerformance(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID

	periodStr := r.URL.Query().Get("period")
	period := 30
	if periodStr != "" {
		if p, err := strconv.Atoi(periodStr); err == nil && p > 0 {
			period = p
		}
	}

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT sp.id,
		       CONCAT(u.first_name,' ',u.last_name) as name,
		       u.email,
		       COUNT(DISTINCT a.id) as appointment_count,
		       COALESCE(SUM(aps.price * aps.duration_min / 60.0), 0) as revenue_estimate,
		       COALESCE(SUM(aps.price), 0) as total_revenue,
		       COALESCE(AVG(aps.price), 0) as avg_ticket,
		       COUNT(DISTINCT a.client_id) as unique_clients
		FROM staff_profiles sp
		JOIN users u ON u.id = sp.user_id
		LEFT JOIN appointments a ON a.staff_id = sp.id
		  AND a.status IN ('completed','checked_in')
		  AND a.start_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
		LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
		WHERE sp.salon_id = ?
		GROUP BY sp.id, u.first_name, u.last_name, u.email`,
		period, sid)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	staffMap := map[int]*staffPerfRow{}
	var staffList []*staffPerfRow
	for rows.Next() {
		var s staffPerfRow
		rows.Scan(&s.ID, &s.Name, &s.Email, &s.AppointmentCount,
			&s.RevenueEstimate, &s.TotalRevenue, &s.AvgTicket, &s.UniqueClients)
		s.TotalHoursWorked = float64(s.AppointmentCount) * 1.0 // avg 60-min appointment
		s.RevenuePerHour = s.TotalRevenue / math.Max(s.TotalHoursWorked, 1)
		staffMap[s.ID] = &s
		staffList = append(staffList, &s)
	}

	// Rebooking rate per stylist
	rebookRows, err := a.DB.QueryContext(r.Context(), `
		SELECT staff_id, COUNT(*) as repeat_clients FROM (
			SELECT staff_id, client_id FROM appointments
			WHERE salon_id=? AND start_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
			GROUP BY staff_id, client_id HAVING COUNT(*) > 1
		) t GROUP BY staff_id`, sid, period)
	if err == nil {
		defer rebookRows.Close()
		for rebookRows.Next() {
			var staffID, repeatClients int
			rebookRows.Scan(&staffID, &repeatClients)
			if s, ok := staffMap[staffID]; ok && s.UniqueClients > 0 {
				s.RebookingRate = math.Round(float64(repeatClients)/float64(s.UniqueClients)*100*10) / 10
			}
		}
	}

	result := make([]staffPerfRow, 0, len(staffList))
	for _, s := range staffList {
		result = append(result, *s)
	}
	a.JSON(w, http.StatusOK, result)
}

// ─── Appointment Risk Scores ──────────────────────────────────────────────────

type riskAppointment struct {
	AppointmentID int     `json:"appointment_id"`
	ClientName    string  `json:"client_name"`
	StartAt       string  `json:"start_at"`
	StaffName     string  `json:"staff_name"`
	RiskScore     int     `json:"risk_score"`
	RiskLevel     string  `json:"risk_level"`
	LeadHours     float64 `json:"lead_hours"`
}

func (a *App) AppointmentRiskScores(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	showAll := r.URL.Query().Get("all") == "true"

	now := time.Now().UTC()
	sevenDaysLater := now.Add(7 * 24 * time.Hour)

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT a.id,
		       CONCAT(c.first_name,' ',c.last_name),
		       a.start_at,
		       a.status,
		       c.total_visits,
		       CONCAT(u.first_name,' ',u.last_name)
		FROM appointments a
		JOIN clients c ON c.id = a.client_id
		JOIN staff_profiles sp ON sp.id = a.staff_id
		JOIN users u ON u.id = sp.user_id
		WHERE a.salon_id=?
		  AND a.status IN ('scheduled','confirmed')
		  AND a.start_at BETWEEN ? AND ?
		ORDER BY a.start_at ASC`,
		sid, now, sevenDaysLater)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var results []riskAppointment
	for rows.Next() {
		var apptID int
		var clientName, staffName, status string
		var startAt time.Time
		var totalVisits int
		rows.Scan(&apptID, &clientName, &startAt, &status, &totalVisits, &staffName)

		leadHours := startAt.Sub(now).Hours()

		score := 0
		if leadHours < 24 {
			score += 35
		} else if leadHours < 48 {
			score += 20
		} else if leadHours < 72 {
			score += 10
		}

		if totalVisits == 0 {
			score += 30
		} else if totalVisits <= 2 {
			score += 15
		}

		if status == "scheduled" {
			score += 15
		}

		hour := startAt.Hour()
		if hour < 10 || hour >= 17 {
			score += 10
		}

		riskLevel := "low"
		if score >= 60 {
			riskLevel = "high"
		} else if score >= 35 {
			riskLevel = "medium"
		}

		if !showAll && score < 35 {
			continue
		}

		results = append(results, riskAppointment{
			AppointmentID: apptID,
			ClientName:    clientName,
			StartAt:       startAt.Format(time.RFC3339),
			StaffName:     staffName,
			RiskScore:     score,
			RiskLevel:     riskLevel,
			LeadHours:     math.Round(leadHours*10) / 10,
		})
	}

	if results == nil {
		results = []riskAppointment{}
	}
	a.JSON(w, http.StatusOK, results)
}

// ─── Schedule Gaps ────────────────────────────────────────────────────────────

type heatmapCell struct {
	Day         int     `json:"day"`
	Hour        int     `json:"hour"`
	Count       int     `json:"count"`
	Utilization float64 `json:"utilization"`
}

type gapSuggestion struct {
	DayName        string  `json:"day_name"`
	HourLabel      string  `json:"hour_label"`
	UtilizationPct float64 `json:"utilization_pct"`
	Suggestion     string  `json:"suggestion"`
}

func formatHourLabel(h int) string {
	if h < 12 {
		return fmt.Sprintf("%d:00 AM", h)
	} else if h == 12 {
		return "12:00 PM"
	}
	return fmt.Sprintf("%d:00 PM", h-12)
}

func (a *App) ScheduleGaps(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID

	// Step 1: get staff count
	var staffCount int
	a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM staff_profiles WHERE salon_id=?`, sid).Scan(&staffCount)
	if staffCount == 0 {
		staffCount = 1
	}

	// Step 2: query appointment frequency
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT DAYOFWEEK(start_at)-1 as dow, HOUR(start_at) as hour, COUNT(*) as appt_count
		FROM appointments
		WHERE salon_id=? AND start_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		  AND status NOT IN ('cancelled','no_show')
		GROUP BY DAYOFWEEK(start_at), HOUR(start_at)`, sid)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	// 7 days x 12 hours (9-20)
	grid := [7][12]int{}
	for rows.Next() {
		var dow, hour, count int
		rows.Scan(&dow, &hour, &count)
		if hour >= 9 && hour <= 20 {
			grid[dow][hour-9] = count
		}
	}

	dayNames := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}

	// Build heatmap and collect gaps
	type gapCandidate struct {
		dayIdx      int
		hourIdx     int
		utilization float64
		count       int
	}
	var heatmap []heatmapCell
	var gaps []gapCandidate

	for d := 0; d < 7; d++ {
		for hi := 0; hi < 12; hi++ {
			count := grid[d][hi]
			util := math.Min(float64(count)/float64(staffCount*4), 1.0)
			heatmap = append(heatmap, heatmapCell{
				Day:         d,
				Hour:        9 + hi,
				Count:       count,
				Utilization: math.Round(util*1000) / 1000,
			})
			if util < 0.4 {
				gaps = append(gaps, gapCandidate{d, hi, util, count})
			}
		}
	}

	// Sort gaps by utilization ascending
	for i := 0; i < len(gaps); i++ {
		for j := i + 1; j < len(gaps); j++ {
			if gaps[j].utilization < gaps[i].utilization {
				gaps[i], gaps[j] = gaps[j], gaps[i]
			}
		}
	}

	suggestions := []gapSuggestion{}
	limit := 5
	if len(gaps) < limit {
		limit = len(gaps)
	}
	for _, g := range gaps[:limit] {
		dn := dayNames[g.dayIdx]
		hl := formatHourLabel(9 + g.hourIdx)
		suggestions = append(suggestions, gapSuggestion{
			DayName:        dn,
			HourLabel:      hl,
			UtilizationPct: math.Round(g.utilization*1000) / 10,
			Suggestion:     fmt.Sprintf("Consider a flash discount for %s %s slots", dn, hl),
		})
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"suggestions": suggestions,
		"heatmap":     heatmap,
	})
}

// ─── Top Clients ──────────────────────────────────────────────────────────────

type topClient struct {
	Rank             int     `json:"rank"`
	ID               int     `json:"id"`
	Name             string  `json:"name"`
	Phone            string  `json:"phone"`
	Email            string  `json:"email"`
	TotalVisits      int     `json:"total_visits"`
	TotalSpend       float64 `json:"total_spend"`
	AvgSpendPerVisit float64 `json:"avg_spend_per_visit"`
	LastVisitAt      *string `json:"last_visit_at"`
}

func (a *App) TopClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT id,
		       CONCAT(first_name,' ',last_name) as name,
		       COALESCE(phone,''),
		       COALESCE(email,''),
		       COALESCE(total_visits,0),
		       COALESCE(total_spend,0),
		       COALESCE(total_spend/NULLIF(total_visits,0), 0) as avg_spend_per_visit,
		       last_visit_at
		FROM clients
		WHERE salon_id=? AND is_active=1
		ORDER BY total_spend DESC
		LIMIT 10`, sid)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var clients []topClient
	rank := 1
	for rows.Next() {
		var c topClient
		var lastVisit *time.Time
		rows.Scan(&c.ID, &c.Name, &c.Phone, &c.Email,
			&c.TotalVisits, &c.TotalSpend, &c.AvgSpendPerVisit, &lastVisit)
		c.Rank = rank
		if lastVisit != nil {
			s := lastVisit.Format(time.RFC3339)
			c.LastVisitAt = &s
		}
		clients = append(clients, c)
		rank++
	}
	if clients == nil {
		clients = []topClient{}
	}
	a.JSON(w, http.StatusOK, clients)
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

type aiChatRequest struct {
	Message   string `json:"message"`
	SessionID *int   `json:"session_id"`
}

type aiChatResponse struct {
	Response string `json:"response"`
	Intent   string `json:"intent"`
	Data     any    `json:"data,omitempty"`
}

func (a *App) AIChat(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	sid := claims.SalonID
	ctx := r.Context()

	var req aiChatRequest
	if err := a.Decode(r, &req); err != nil || strings.TrimSpace(req.Message) == "" {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	msg := strings.ToLower(req.Message)
	var resp aiChatResponse

	switch {
	// Intent 1: revenue
	case strings.Contains(msg, "revenue") || strings.Contains(msg, "earning") ||
		strings.Contains(msg, "sales") || strings.Contains(msg, "money"):
		resp = a.aiRevenue(ctx, sid)

	// Intent 2: appointments today/tomorrow/how many
	case strings.Contains(msg, "appointment") &&
		(strings.Contains(msg, "today") || strings.Contains(msg, "tomorrow") || strings.Contains(msg, "how many")):
		resp = a.aiAppointments(ctx, sid)

	// Intent 3: top/best/vip clients
	case strings.Contains(msg, "client") &&
		(strings.Contains(msg, "top") || strings.Contains(msg, "best") || strings.Contains(msg, "vip")):
		resp = a.aiTopClients(ctx, sid)

	// Intent 4: popular services
	case strings.Contains(msg, "service") &&
		(strings.Contains(msg, "popular") || strings.Contains(msg, "top") || strings.Contains(msg, "best")):
		resp = a.aiPopularServices(ctx, sid)

	// Intent 5: staff/stylist
	case strings.Contains(msg, "staff") || strings.Contains(msg, "stylist"):
		resp = a.aiStaffToday(ctx, sid)

	// Intent 6: gaps/slow/empty/available
	case strings.Contains(msg, "gap") || strings.Contains(msg, "slow") ||
		strings.Contains(msg, "empty") || strings.Contains(msg, "available"):
		resp = a.aiScheduleGap(ctx, sid)

	// Intent 7: loyalty/points
	case strings.Contains(msg, "loyalty") || strings.Contains(msg, "point"):
		resp = a.aiLoyalty(ctx, sid)

	// Default
	default:
		resp = aiChatResponse{
			Response: "I can help with revenue, appointments, clients, staff performance, and schedule gaps. What would you like to know?",
			Intent:   "unknown",
		}
	}

	// Save to session if session_id provided
	if req.SessionID != nil && *req.SessionID > 0 {
		a.DB.ExecContext(ctx, `
			UPDATE ai_chat_sessions
			SET messages = JSON_ARRAY_APPEND(messages, '$',
			    JSON_OBJECT('role','user','content',?, 'ts', NOW())),
			    updated_at = NOW()
			WHERE id=? AND salon_id=?`, req.Message, *req.SessionID, sid)
		a.DB.ExecContext(ctx, `
			UPDATE ai_chat_sessions
			SET messages = JSON_ARRAY_APPEND(messages, '$',
			    JSON_OBJECT('role','assistant','content',?, 'ts', NOW())),
			    updated_at = NOW()
			WHERE id=? AND salon_id=?`, resp.Response, *req.SessionID, sid)
	}

	a.JSON(w, http.StatusOK, resp)
}

func (a *App) aiRevenue(ctx context.Context, sid uint) aiChatResponse {
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	todayEnd := todayStart.Add(24 * time.Hour)
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	var today, week, month float64
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions WHERE salon_id=? AND created_at>=? AND created_at<? AND status='completed'`,
		sid, todayStart, todayEnd).Scan(&today)
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions WHERE salon_id=? AND created_at>=? AND status='completed'`,
		sid, weekStart).Scan(&week)
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions WHERE salon_id=? AND created_at>=? AND status='completed'`,
		sid, monthStart).Scan(&month)

	return aiChatResponse{
		Intent:   "revenue",
		Response: fmt.Sprintf("Today's revenue is $%.2f. This week: $%.2f. This month: $%.2f.", today, week, month),
		Data:     map[string]float64{"today": today, "week": week, "month": month},
	}
}

func (a *App) aiAppointments(ctx context.Context, sid uint) aiChatResponse {
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	todayEnd := todayStart.Add(24 * time.Hour)
	tomorrowEnd := todayEnd.Add(24 * time.Hour)

	var todayCount, tomorrowCount int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<? AND status NOT IN ('cancelled','no_show')`,
		sid, todayStart, todayEnd).Scan(&todayCount)
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments WHERE salon_id=? AND start_at>=? AND start_at<? AND status NOT IN ('cancelled','no_show')`,
		sid, todayEnd, tomorrowEnd).Scan(&tomorrowCount)

	return aiChatResponse{
		Intent:   "appointments",
		Response: fmt.Sprintf("You have %d appointments today and %d tomorrow.", todayCount, tomorrowCount),
		Data:     map[string]int{"today": todayCount, "tomorrow": tomorrowCount},
	}
}

func (a *App) aiTopClients(ctx context.Context, sid uint) aiChatResponse {
	rows, err := a.DB.QueryContext(ctx,
		`SELECT CONCAT(first_name,' ',last_name), COALESCE(total_spend,0)
		FROM clients WHERE salon_id=? AND is_active=1
		ORDER BY total_spend DESC LIMIT 3`, sid)
	if err != nil {
		return aiChatResponse{Intent: "top_clients", Response: "Unable to retrieve client data right now."}
	}
	defer rows.Close()

	type entry struct {
		name  string
		spend float64
	}
	var list []entry
	for rows.Next() {
		var e entry
		rows.Scan(&e.name, &e.spend)
		list = append(list, e)
	}

	if len(list) == 0 {
		return aiChatResponse{Intent: "top_clients", Response: "No client data found."}
	}

	parts := make([]string, len(list))
	for i, e := range list {
		parts[i] = fmt.Sprintf("%d. %s ($%.2f)", i+1, e.name, e.spend)
	}
	return aiChatResponse{
		Intent:   "top_clients",
		Response: "Your top clients are: " + strings.Join(parts, ", "),
	}
}

func (a *App) aiPopularServices(ctx context.Context, sid uint) aiChatResponse {
	rows, err := a.DB.QueryContext(ctx,
		`SELECT s.name, COUNT(aps.id) as cnt
		FROM appointment_services aps
		JOIN services s ON s.id = aps.service_id
		JOIN appointments a ON a.id = aps.appointment_id
		WHERE a.salon_id=? AND a.start_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		GROUP BY s.id, s.name
		ORDER BY cnt DESC LIMIT 3`, sid)
	if err != nil {
		return aiChatResponse{Intent: "popular_services", Response: "Unable to retrieve service data right now."}
	}
	defer rows.Close()

	type entry struct {
		name string
		cnt  int
	}
	var list []entry
	for rows.Next() {
		var e entry
		rows.Scan(&e.name, &e.cnt)
		list = append(list, e)
	}

	if len(list) == 0 {
		return aiChatResponse{Intent: "popular_services", Response: "No service data found for the last 30 days."}
	}

	parts := make([]string, len(list))
	for i, e := range list {
		parts[i] = fmt.Sprintf("%d. %s (%d bookings)", i+1, e.name, e.cnt)
	}
	return aiChatResponse{
		Intent:   "popular_services",
		Response: "Most popular services: " + strings.Join(parts, ", "),
	}
}

func (a *App) aiStaffToday(ctx context.Context, sid uint) aiChatResponse {
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	todayEnd := todayStart.Add(24 * time.Hour)

	rows, err := a.DB.QueryContext(ctx,
		`SELECT CONCAT(u.first_name,' ',u.last_name), COUNT(a.id)
		FROM staff_profiles sp
		JOIN users u ON u.id = sp.user_id
		LEFT JOIN appointments a ON a.staff_id = sp.id
		  AND a.start_at >= ? AND a.start_at < ?
		  AND a.status NOT IN ('cancelled','no_show')
		WHERE sp.salon_id=?
		GROUP BY sp.id, u.first_name, u.last_name
		ORDER BY COUNT(a.id) DESC`, todayStart, todayEnd, sid)
	if err != nil {
		return aiChatResponse{Intent: "staff", Response: "Unable to retrieve staff data right now."}
	}
	defer rows.Close()

	type entry struct {
		name string
		cnt  int
	}
	var list []entry
	for rows.Next() {
		var e entry
		rows.Scan(&e.name, &e.cnt)
		list = append(list, e)
	}

	if len(list) == 0 {
		return aiChatResponse{Intent: "staff", Response: "No staff data found."}
	}

	parts := make([]string, len(list))
	for i, e := range list {
		parts[i] = fmt.Sprintf("%s (%d appts)", e.name, e.cnt)
	}
	return aiChatResponse{
		Intent:   "staff",
		Response: "Active stylists today: " + strings.Join(parts, ", "),
	}
}

func (a *App) aiScheduleGap(ctx context.Context, sid uint) aiChatResponse {
	var staffCount int
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM staff_profiles WHERE salon_id=?`, sid).Scan(&staffCount)
	if staffCount == 0 {
		staffCount = 1
	}

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DAYOFWEEK(start_at)-1 as dow, HOUR(start_at) as hour, COUNT(*) as appt_count
		FROM appointments
		WHERE salon_id=? AND start_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
		  AND status NOT IN ('cancelled','no_show')
		GROUP BY DAYOFWEEK(start_at), HOUR(start_at)`, sid)
	if err != nil {
		return aiChatResponse{Intent: "schedule_gap", Response: "Unable to retrieve schedule data right now."}
	}
	defer rows.Close()

	grid := [7][12]int{}
	for rows.Next() {
		var dow, hour, count int
		rows.Scan(&dow, &hour, &count)
		if hour >= 9 && hour <= 20 {
			grid[dow][hour-9] = count
		}
	}

	dayNames := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	bestDay, bestHour, bestUtil := 0, 9, 1.0
	for d := 0; d < 7; d++ {
		for hi := 0; hi < 12; hi++ {
			util := math.Min(float64(grid[d][hi])/float64(staffCount*4), 1.0)
			if util < bestUtil {
				bestUtil = util
				bestDay = d
				bestHour = 9 + hi
			}
		}
	}

	return aiChatResponse{
		Intent:   "schedule_gap",
		Response: fmt.Sprintf("Your slowest slot is %s at %s — consider a flash deal.", dayNames[bestDay], formatHourLabel(bestHour)),
		Data:     map[string]any{"day": dayNames[bestDay], "hour": formatHourLabel(bestHour), "utilization": bestUtil},
	}
}

func (a *App) aiLoyalty(ctx context.Context, sid uint) aiChatResponse {
	var totalPoints, clientsWithPoints int
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(lifetime_points),0) FROM client_loyalty WHERE salon_id=?`, sid).Scan(&totalPoints)
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM client_loyalty WHERE salon_id=? AND balance > 0`, sid).Scan(&clientsWithPoints)

	return aiChatResponse{
		Intent:   "loyalty",
		Response: fmt.Sprintf("Total loyalty points issued: %d. Clients with points: %d.", totalPoints, clientsWithPoints),
		Data:     map[string]int{"total_points": totalPoints, "clients_with_points": clientsWithPoints},
	}
}
