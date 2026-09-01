package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"salonos/internal/models"
)

func (a *App) ListClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	q := "%" + strings.TrimSpace(r.URL.Query().Get("q")) + "%"
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, first_name, last_name,
		        COALESCE(email,''), COALESCE(phone,''), COALESCE(gender,''),
		        COALESCE(notes,''), loyalty_points, total_visits,
		        total_spend, sms_consent, is_active, last_visit_at, created_at
		 FROM clients
		 WHERE salon_id=? AND is_active=1
		   AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)
		 ORDER BY created_at DESC LIMIT 500`, claims.SalonID, q, q, q, q)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var clients []models.Client
	for rows.Next() {
		var c models.Client
		rows.Scan(&c.ID, &c.SalonID, &c.FirstName, &c.LastName,
			&c.Email, &c.Phone, &c.Gender, &c.Notes,
			&c.LoyaltyPoints, &c.TotalVisits, &c.TotalSpend,
			&c.SMSConsent, &c.IsActive, &c.LastVisitAt, &c.CreatedAt)
		clients = append(clients, c)
	}
	if clients == nil {
		clients = []models.Client{}
	}
	a.JSON(w, http.StatusOK, clients)
}

func (a *App) GetClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var c models.Client
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, first_name, last_name,
		        COALESCE(email,''), COALESCE(phone,''), COALESCE(gender,''),
		        COALESCE(notes,''), loyalty_points, total_visits,
		        total_spend, sms_consent, is_active, last_visit_at, created_at
		 FROM clients WHERE id=? AND salon_id=?`, id, claims.SalonID).
		Scan(&c.ID, &c.SalonID, &c.FirstName, &c.LastName,
			&c.Email, &c.Phone, &c.Gender, &c.Notes,
			&c.LoyaltyPoints, &c.TotalVisits, &c.TotalSpend,
			&c.SMSConsent, &c.IsActive, &c.LastVisitAt, &c.CreatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "client not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, c)
}

func (a *App) CreateClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var c models.Client
	if err := a.Decode(r, &c); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	c.SalonID = claims.SalonID
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO clients (salon_id, first_name, last_name, email, phone, gender, notes, sms_consent)
		 VALUES (?,?,?,?,?,?,?,?)`,
		c.SalonID, c.FirstName, c.LastName, c.Email, c.Phone, c.Gender, c.Notes, c.SMSConsent)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	c.ID = uint(id)
	c.IsActive = true
	a.JSON(w, http.StatusCreated, c)
}

func (a *App) MergeClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var req struct {
		PrimaryID   uint64 `json:"primary_id"`
		SecondaryID uint64 `json:"secondary_id"`
	}
	if err := a.Decode(r, &req); err != nil || req.PrimaryID == 0 || req.SecondaryID == 0 {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.PrimaryID == req.SecondaryID {
		a.Error(w, http.StatusBadRequest, "cannot merge a client with itself")
		return
	}

	// Verify both belong to this salon
	var count int
	a.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM clients WHERE id IN (?,?) AND salon_id=? AND is_active=1`,
		req.PrimaryID, req.SecondaryID, claims.SalonID).Scan(&count)
	if count != 2 {
		a.Error(w, http.StatusNotFound, "one or both clients not found")
		return
	}

	// Re-point all foreign key references from secondary → primary
	fkTables := []struct{ tbl, col string }{
		{"appointments", "client_id"},
		{"transactions", "client_id"},
		{"client_memberships", "client_id"},
	}
	for _, t := range fkTables {
		a.DB.ExecContext(r.Context(),
			fmt.Sprintf(`UPDATE %s SET %s=? WHERE %s=?`, t.tbl, t.col, t.col),
			req.PrimaryID, req.SecondaryID)
	}

	// Merge numeric totals into primary
	a.DB.ExecContext(r.Context(), `
		UPDATE clients p
		JOIN   clients s ON s.id = ?
		SET    p.total_spend    = p.total_spend    + s.total_spend,
		       p.total_visits   = p.total_visits   + s.total_visits,
		       p.loyalty_points = p.loyalty_points + s.loyalty_points
		WHERE  p.id = ? AND p.salon_id = ?`,
		req.SecondaryID, req.PrimaryID, claims.SalonID)

	// Fill blank fields on primary from secondary
	a.DB.ExecContext(r.Context(), `
		UPDATE clients p
		JOIN   clients s ON s.id = ?
		SET    p.email  = IF(p.email  = '' OR p.email  IS NULL, s.email,  p.email),
		       p.phone  = IF(p.phone  = '' OR p.phone  IS NULL, s.phone,  p.phone),
		       p.notes  = IF(p.notes  = '' OR p.notes  IS NULL, s.notes,  p.notes),
		       p.gender = IF(p.gender = '' OR p.gender IS NULL, s.gender, p.gender)
		WHERE  p.id = ? AND p.salon_id = ?`,
		req.SecondaryID, req.PrimaryID, claims.SalonID)

	// Soft-delete secondary
	a.DB.ExecContext(r.Context(),
		`UPDATE clients SET is_active=0 WHERE id=? AND salon_id=?`,
		req.SecondaryID, claims.SalonID)

	a.JSON(w, http.StatusOK, map[string]any{"merged": true, "primary_id": req.PrimaryID})
}

// BulkImportClients POST /api/clients/import
// Accepts a JSON array of client rows. Upserts by phone:
//   - phone not in DB → INSERT new client
//   - phone exists   → UPDATE name/email/notes (skip if nothing to merge)
// Returns { created, updated, skipped, errors: [{row, reason}] }
func (a *App) BulkImportClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var req struct {
		Clients []struct {
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
			Email     string `json:"email"`
			Phone     string `json:"phone"`
			Gender    string `json:"gender"`
			DOB       string `json:"dob"`
			Notes     string `json:"notes"`
			SMSConsent bool  `json:"sms_consent"`
		} `json:"clients"`
		OnDuplicate string `json:"on_duplicate"` // "skip" | "update"
	}
	if err := a.Decode(r, &req); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.OnDuplicate == "" {
		req.OnDuplicate = "skip"
	}

	type rowError struct {
		Row    int    `json:"row"`
		Reason string `json:"reason"`
	}
	created, updated, skipped := 0, 0, 0
	var errs []rowError

	for i, c := range req.Clients {
		c.Phone = strings.TrimSpace(c.Phone)
		c.Email = strings.ToLower(strings.TrimSpace(c.Email))
		c.FirstName = strings.TrimSpace(c.FirstName)
		c.LastName  = strings.TrimSpace(c.LastName)

		if c.Phone == "" && c.Email == "" {
			errs = append(errs, rowError{i + 1, "phone or email required"})
			continue
		}

		// Check duplicate by phone (primary) or email
		var existingID uint
		if c.Phone != "" {
			a.DB.QueryRowContext(r.Context(),
				`SELECT id FROM clients WHERE salon_id=? AND phone=? LIMIT 1`,
				claims.SalonID, c.Phone).Scan(&existingID)
		}
		if existingID == 0 && c.Email != "" {
			a.DB.QueryRowContext(r.Context(),
				`SELECT id FROM clients WHERE salon_id=? AND email=? LIMIT 1`,
				claims.SalonID, c.Email).Scan(&existingID)
		}

		if existingID != 0 {
			if req.OnDuplicate == "skip" {
				skipped++
				continue
			}
			// update mode — only update blank fields
			dob := sql.NullString{}
			if c.DOB != "" {
				dob = sql.NullString{String: c.DOB, Valid: true}
			}
			_, err := a.DB.ExecContext(r.Context(), `
				UPDATE clients SET
				  first_name = IF(first_name='' OR first_name IS NULL, ?, first_name),
				  last_name  = IF(last_name ='' OR last_name  IS NULL, ?, last_name),
				  email      = IF(email=''      OR email      IS NULL, ?, email),
				  gender     = IF(gender=''     OR gender     IS NULL, ?, gender),
				  date_of_birth = IF(date_of_birth IS NULL AND ? IS NOT NULL, ?, date_of_birth),
				  notes      = IF(notes=''      OR notes      IS NULL, ?, notes)
				WHERE id=? AND salon_id=?`,
				c.FirstName, c.LastName, c.Email, c.Gender,
				dob, dob, c.Notes, existingID, claims.SalonID)
			if err != nil {
				errs = append(errs, rowError{i + 1, "update failed"})
			} else {
				updated++
			}
			continue
		}

		// Insert new
		dob := sql.NullString{}
		if c.DOB != "" {
			dob = sql.NullString{String: c.DOB, Valid: true}
		}
		_, err := a.DB.ExecContext(r.Context(),
			`INSERT INTO clients (salon_id, first_name, last_name, email, phone, gender, date_of_birth, notes, sms_consent)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			claims.SalonID, c.FirstName, c.LastName, c.Email, c.Phone,
			c.Gender, dob, c.Notes, c.SMSConsent)
		if err != nil {
			errs = append(errs, rowError{i + 1, fmt.Sprintf("insert failed: %v", err)})
		} else {
			created++
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"created": created,
		"updated": updated,
		"skipped": skipped,
		"errors":  errs,
	})
}

// ExportClients GET /api/clients/export
// Returns CSV of all clients for this salon.
func (a *App) ExportClients(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT first_name, last_name, COALESCE(email,''), phone,
		       COALESCE(gender,''), COALESCE(date_of_birth,''), COALESCE(notes,''),
		       COALESCE(referral_source,''),
		       COALESCE(total_visits,0), COALESCE(total_spend,0), COALESCE(loyalty_points,0),
		       IF(sms_consent=1,'yes','no'),
		       DATE_FORMAT(created_at,'%Y-%m-%d')
		FROM clients WHERE salon_id=? AND is_active=1
		ORDER BY last_name, first_name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var sb strings.Builder
	sb.WriteString("First Name,Last Name,Email,Phone,Gender,Date of Birth,Notes,Referral Source,Total Visits,Total Spend,Loyalty Points,SMS Consent,Created At\n")
	for rows.Next() {
		var (
			fn, ln, email, phone, gender, dob, notes, ref string
			visits                                         int
			spend, loyalty                                 float64
			sms, createdAt                                 string
		)
		rows.Scan(&fn, &ln, &email, &phone, &gender, &dob, &notes, &ref, &visits, &spend, &loyalty, &sms, &createdAt)
		row := []string{fn, ln, email, phone, gender, dob, notes, ref,
			fmt.Sprintf("%d", visits), fmt.Sprintf("%.2f", spend), fmt.Sprintf("%.0f", loyalty), sms, createdAt}
		for i, v := range row {
			if i > 0 {
				sb.WriteByte(',')
			}
			sb.WriteByte('"')
			sb.WriteString(strings.ReplaceAll(v, `"`, `""`))
			sb.WriteByte('"')
		}
		sb.WriteByte('\n')
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="clients.csv"`)
	w.Write([]byte(sb.String()))
}

func (a *App) UpdateClient(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var c models.Client
	if err := a.Decode(r, &c); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE clients SET first_name=?, last_name=?, email=?, phone=?,
		 gender=?, notes=?, sms_consent=? WHERE id=? AND salon_id=?`,
		c.FirstName, c.LastName, c.Email, c.Phone,
		c.Gender, c.Notes, c.SMSConsent, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	c.ID = uint(id)
	c.SalonID = claims.SalonID
	a.JSON(w, http.StatusOK, c)
}
