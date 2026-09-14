package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"
)

// QueueItem is the unified shape for both walk-ins and today's appointments,
// so a single client (web or mobile) can render one queue regardless of source.
type QueueItem struct {
	ID                 uint       `json:"id"`
	Type               string     `json:"type"`   // "appointment" | "walkin"
	Status             string     `json:"status"` // "upcoming" | "waiting" | "in_service" | "completed" | "cancelled" | "no_show"
	ClientID           *uint      `json:"client_id"`
	Name               string     `json:"name"`
	Phone              string     `json:"phone"`
	Services           string     `json:"services"`
	PreferredStaffName string     `json:"preferred_staff_name"`
	AssignedStaffID    *uint      `json:"assigned_staff_id"`
	AssignedStaffName  string     `json:"assigned_staff_name"`
	Notes              string     `json:"notes"`
	StartAt            *time.Time `json:"start_at"`
	CheckedInAt        *time.Time `json:"checked_in_at"`
	StartedAt          *time.Time `json:"started_at"`
	CompletedAt        *time.Time `json:"completed_at"`
	WaitMinutes        int        `json:"wait_minutes"`
}

// ListQueue GET /api/queue?status=&type= — admin: today's unified queue
// (appointment check-ins + walk-ins), auth-scoped by salon.
func (a *App) ListQueue(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	statusFilter := r.URL.Query().Get("status")
	typeFilter := r.URL.Query().Get("type")
	now := time.Now()

	items := []QueueItem{}

	if typeFilter == "" || typeFilter == "appointment" {
		rows, err := a.DB.QueryContext(r.Context(), `
			SELECT ap.id, ap.client_id,
			       TRIM(CONCAT(c.first_name,' ',c.last_name)),
			       COALESCE(c.phone,''),
			       COALESCE(
			         (SELECT GROUP_CONCAT(sv.name ORDER BY aps.id SEPARATOR ', ')
			          FROM appointment_services aps
			          JOIN services sv ON sv.id = aps.service_id
			          WHERE aps.appointment_id = ap.id),
			         ''
			       ),
			       ap.staff_id,
			       TRIM(COALESCE(CONCAT(u.first_name,' ',u.last_name),'')),
			       ap.status,
			       COALESCE(ap.notes,''),
			       ap.start_at, ap.checked_in_at, ap.checked_out_at
			FROM appointments ap
			JOIN clients c ON c.id = ap.client_id AND c.salon_id = ap.salon_id
			LEFT JOIN staff_profiles sp ON sp.id = ap.staff_id
			LEFT JOIN users u ON u.id = sp.user_id
			WHERE ap.salon_id = ?
			  AND DATE(ap.start_at) = CURDATE()
			  AND ap.status NOT IN ('cancelled','no_show')
			ORDER BY ap.start_at ASC`, claims.SalonID)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
		for rows.Next() {
			var it QueueItem
			var staffID *uint
			var startAt time.Time
			var checkedInAt, checkedOutAt *time.Time
			var rawStatus string
			if err := rows.Scan(&it.ID, &it.ClientID, &it.Name, &it.Phone, &it.Services,
				&staffID, &it.AssignedStaffName, &rawStatus, &it.Notes,
				&startAt, &checkedInAt, &checkedOutAt); err != nil {
				continue
			}
			it.Type = "appointment"
			it.AssignedStaffID = staffID
			it.StartAt = &startAt
			it.CheckedInAt = checkedInAt
			it.CompletedAt = checkedOutAt
			switch rawStatus {
			case "pending", "confirmed":
				it.Status = "upcoming"
			case "checked_in":
				it.Status = "waiting"
				if checkedInAt != nil {
					it.WaitMinutes = int(now.Sub(*checkedInAt).Minutes())
				}
			case "in_service":
				it.Status = "in_service"
				it.StartedAt = checkedInAt
				if checkedInAt != nil {
					it.WaitMinutes = int(now.Sub(*checkedInAt).Minutes())
				}
			case "completed":
				it.Status = "completed"
			default:
				it.Status = rawStatus
			}
			items = append(items, it)
		}
		rows.Close()
	}

	if typeFilter == "" || typeFilter == "walkin" {
		rows, err := a.DB.QueryContext(r.Context(), `
			SELECT w.id, w.client_id, w.name, w.phone,
			       COALESCE(w.service_names,''),
			       COALESCE(w.preferred_staff_name,''),
			       w.assigned_staff_id, COALESCE(w.assigned_staff_name,''),
			       w.status, COALESCE(w.notes,''),
			       w.checked_in_at, w.started_at, w.completed_at
			FROM walk_in_queue w
			WHERE w.salon_id = ? AND DATE(w.checked_in_at) = CURDATE()
			ORDER BY w.checked_in_at ASC`, claims.SalonID)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
		for rows.Next() {
			var it QueueItem
			var checkedInAt time.Time
			var startedAt, completedAt *time.Time
			if err := rows.Scan(&it.ID, &it.ClientID, &it.Name, &it.Phone, &it.Services,
				&it.PreferredStaffName, &it.AssignedStaffID, &it.AssignedStaffName,
				&it.Status, &it.Notes, &checkedInAt, &startedAt, &completedAt); err != nil {
				continue
			}
			it.Type = "walkin"
			it.CheckedInAt = &checkedInAt
			it.StartedAt = startedAt
			it.CompletedAt = completedAt
			switch it.Status {
			case "waiting":
				it.WaitMinutes = int(now.Sub(checkedInAt).Minutes())
			case "in_service":
				if startedAt != nil {
					it.WaitMinutes = int(now.Sub(*startedAt).Minutes())
				}
			}
			items = append(items, it)
		}
		rows.Close()
	}

	if statusFilter != "" && statusFilter != "all" {
		filtered := items[:0]
		for _, it := range items {
			if it.Status == statusFilter {
				filtered = append(filtered, it)
			}
		}
		items = filtered
	}

	a.JSON(w, http.StatusOK, items)
}

// CreateWalkIn POST /api/walkins — admin: add a walk-in to today's queue.
// Body: { "name", "phone"?, "service_ids"?, "preferred_staff_id"? }
func (a *App) CreateWalkIn(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var req struct {
		Name             string `json:"name"`
		Phone            string `json:"phone"`
		ServiceIDs       []uint `json:"service_ids"`
		PreferredStaffID *uint  `json:"preferred_staff_id"`
	}
	if err := a.Decode(r, &req); err != nil || strings.TrimSpace(req.Name) == "" {
		a.Error(w, http.StatusBadRequest, "name required")
		return
	}

	phone := strings.TrimSpace(req.Phone)
	var clientID *uint
	if phone != "" {
		var cid uint
		if err := a.DB.QueryRowContext(r.Context(),
			`SELECT id FROM clients WHERE phone=? AND salon_id=? LIMIT 1`, phone, claims.SalonID).Scan(&cid); err == nil {
			clientID = &cid
		} else {
			parts := strings.Fields(strings.TrimSpace(req.Name))
			fn, ln := "", ""
			if len(parts) > 0 {
				fn = parts[0]
			}
			if len(parts) > 1 {
				ln = strings.Join(parts[1:], " ")
			}
			res, err2 := a.DB.ExecContext(r.Context(),
				`INSERT INTO clients (salon_id, first_name, last_name, phone, sms_consent) VALUES (?,?,?,?,1)`,
				claims.SalonID, fn, ln, phone)
			if err2 == nil {
				nid, _ := res.LastInsertId()
				ncid := uint(nid)
				clientID = &ncid
			}
		}
	}

	var serviceNames []string
	var serviceIDStrs []string
	for _, sid := range req.ServiceIDs {
		var sname string
		if err := a.DB.QueryRowContext(r.Context(),
			`SELECT name FROM services WHERE id=? AND salon_id=?`, sid, claims.SalonID).Scan(&sname); err == nil {
			serviceNames = append(serviceNames, sname)
		}
		serviceIDStrs = append(serviceIDStrs, fmt.Sprintf("%d", sid))
	}

	var staffName string
	if req.PreferredStaffID != nil {
		a.DB.QueryRowContext(r.Context(),
			`SELECT TRIM(CONCAT(u.first_name,' ',u.last_name))
			 FROM staff_profiles sp JOIN users u ON u.id = sp.user_id
			 WHERE sp.id=? AND sp.salon_id=?`, *req.PreferredStaffID, claims.SalonID).Scan(&staffName)
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO walk_in_queue
		   (salon_id, client_id, name, phone, service_ids, service_names,
		    preferred_staff_id, preferred_staff_name, status)
		 VALUES (?,?,?,?,?,?,?,?,'waiting')`,
		claims.SalonID, clientID, strings.TrimSpace(req.Name), phone,
		strings.Join(serviceIDStrs, ","), strings.Join(serviceNames, ", "),
		req.PreferredStaffID, staffName)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	a.JSON(w, http.StatusCreated, map[string]any{
		"id":     id,
		"status": "waiting",
		"name":   strings.TrimSpace(req.Name),
	})
}
