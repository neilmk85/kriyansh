package handlers

import (
	"context"
	"net/http"
	"time"
)

type dashboardStats struct {
	TodayRevenue      float64 `json:"today_revenue"`
	TodayAppointments int     `json:"today_appointments"`
	WeekRevenue       float64 `json:"week_revenue"`
	MonthRevenue      float64 `json:"month_revenue"`
	ActiveClients     int     `json:"active_clients"`
	TotalStaff        int     `json:"total_staff"`
	PendingAppts      int     `json:"pending_appointments"`
	AvgTicket         float64 `json:"avg_ticket"`
}

type upcomingAppt struct {
	ID          uint      `json:"id"`
	ClientName  string    `json:"client_name"`
	StaffName   string    `json:"staff_name"`
	StartAt     time.Time `json:"start_at"`
	Status      string    `json:"status"`
	ServiceList string    `json:"services"`
}

type weeklyChartEntry struct {
	Day     string  `json:"day"`
	Revenue float64 `json:"revenue"`
}

func (a *App) Dashboard(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	ctx := r.Context()
	sid := claims.SalonID

	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	todayEnd := todayStart.Add(24 * time.Hour)
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	var stats dashboardStats

	// Today appointments count
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments
		 WHERE salon_id=? AND start_at>=? AND start_at<? AND status NOT IN ('cancelled','no_show')`,
		sid, todayStart, todayEnd).Scan(&stats.TodayAppointments)

	// Today revenue
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions
		 WHERE salon_id=? AND created_at>=? AND created_at<? AND status='completed'`,
		sid, todayStart, todayEnd).Scan(&stats.TodayRevenue)

	// Week revenue
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions
		 WHERE salon_id=? AND created_at>=? AND status='completed'`,
		sid, weekStart).Scan(&stats.WeekRevenue)

	// Month revenue
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(grand_total),0) FROM transactions
		 WHERE salon_id=? AND created_at>=? AND status='completed'`,
		sid, monthStart).Scan(&stats.MonthRevenue)

	// Active clients
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM clients WHERE salon_id=? AND is_active=1`, sid).
		Scan(&stats.ActiveClients)

	// Total active staff
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM staff_profiles sp
		 JOIN users u ON u.id=sp.user_id
		 WHERE sp.salon_id=? AND u.is_active=1`, sid).
		Scan(&stats.TotalStaff)

	// Pending / scheduled appointments today
	a.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM appointments
		 WHERE salon_id=? AND start_at>=? AND start_at<? AND status IN ('scheduled','confirmed')`,
		sid, todayStart, todayEnd).Scan(&stats.PendingAppts)

	// Avg ticket this month
	a.DB.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(grand_total),0) FROM transactions
		 WHERE salon_id=? AND created_at>=? AND status='completed'`,
		sid, monthStart).Scan(&stats.AvgTicket)

	// Weekly chart — last 7 days revenue grouped by date
	weeklyChart := a.buildWeeklyChart(ctx, sid)

	// Upcoming appointments (next 8)
	rows, err := a.DB.QueryContext(ctx,
		`SELECT a.id,
		        CONCAT(c.first_name,' ',c.last_name),
		        CONCAT(u.first_name,' ',u.last_name),
		        a.start_at, a.status,
		        COALESCE(GROUP_CONCAT(s.name SEPARATOR ', '),'')
		 FROM appointments a
		 JOIN clients c ON c.id=a.client_id
		 JOIN staff_profiles sp ON sp.id=a.staff_id
		 JOIN users u ON u.id=sp.user_id
		 LEFT JOIN appointment_services aps ON aps.appointment_id=a.id
		 LEFT JOIN services s ON s.id=aps.service_id
		 WHERE a.salon_id=? AND a.start_at>=? AND a.status IN ('scheduled','confirmed')
		 GROUP BY a.id ORDER BY a.start_at LIMIT 8`, sid, now)
	var upcoming []upcomingAppt
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var u upcomingAppt
			rows.Scan(&u.ID, &u.ClientName, &u.StaffName, &u.StartAt, &u.Status, &u.ServiceList)
			upcoming = append(upcoming, u)
		}
	}
	if upcoming == nil {
		upcoming = []upcomingAppt{}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"stats":        stats,
		"upcoming":     upcoming,
		"weekly_chart": weeklyChart,
	})
}

func (a *App) buildWeeklyChart(ctx context.Context, sid uint) []weeklyChartEntry {
	revenueByDate := map[string]float64{}

	rows, err := a.DB.QueryContext(ctx,
		`SELECT DATE(created_at) as day, COALESCE(SUM(grand_total),0) as revenue
		 FROM transactions
		 WHERE salon_id=? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status='completed'
		 GROUP BY DATE(created_at)
		 ORDER BY day ASC`, sid)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var dayStr string
			var rev float64
			rows.Scan(&dayStr, &rev)
			revenueByDate[dayStr] = rev
		}
	}

	dayNames := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	now := time.Now().UTC()
	chart := make([]weeklyChartEntry, 7)
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i)
		dateStr := d.Format("2006-01-02")
		chart[6-i] = weeklyChartEntry{
			Day:     dayNames[d.Weekday()],
			Revenue: revenueByDate[dateStr],
		}
	}
	return chart
}
