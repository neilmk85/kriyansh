package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

// ── types ──────────────────────────────────────────────────────────────────

type packageRow struct {
	ID           uint    `json:"id"`
	SalonID      uint    `json:"salon_id"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Price        float64 `json:"price"`
	ValidityDays int     `json:"validity_days"`
	IsActive     bool    `json:"is_active"`
	ServiceCount int     `json:"service_count"`
	ServiceNames string  `json:"service_names"`
}

type packageService struct {
	ID          uint    `json:"id"`
	ServiceID   uint    `json:"service_id"`
	ServiceName string  `json:"name"`
	DurationMin int     `json:"duration_min"`
	UnitPrice   float64 `json:"unit_price"`
	Qty         int     `json:"qty"`
}

// ── ListPackages — GET /api/packages ───────────────────────────────────────

func (a *App) ListPackages(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT p.id, p.salon_id, p.name, COALESCE(p.description,''), p.price, p.validity_days, p.is_active,
		       COUNT(ps.id) as service_count,
		       COALESCE(GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', '), '') as service_names
		FROM packages p
		LEFT JOIN package_services ps ON ps.package_id = p.id
		LEFT JOIN services s ON s.id = ps.service_id
		WHERE p.salon_id=? AND p.is_active=1
		GROUP BY p.id
		ORDER BY p.name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var pkgs []packageRow
	for rows.Next() {
		var p packageRow
		rows.Scan(&p.ID, &p.SalonID, &p.Name, &p.Description, &p.Price, &p.ValidityDays, &p.IsActive,
			&p.ServiceCount, &p.ServiceNames)
		pkgs = append(pkgs, p)
	}
	if pkgs == nil {
		pkgs = []packageRow{}
	}
	a.JSON(w, http.StatusOK, pkgs)
}

// ── GetPackage — GET /api/packages/{id} ────────────────────────────────────

func (a *App) GetPackage(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var p packageRow
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT id, salon_id, name, COALESCE(description,''), price, validity_days, is_active
		FROM packages WHERE id=? AND salon_id=?`, id, claims.SalonID).
		Scan(&p.ID, &p.SalonID, &p.Name, &p.Description, &p.Price, &p.ValidityDays, &p.IsActive)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	svcRows, err := a.DB.QueryContext(r.Context(), `
		SELECT ps.id, ps.service_id, s.name, s.duration_min, s.price as unit_price, ps.qty
		FROM package_services ps
		JOIN services s ON s.id = ps.service_id
		WHERE ps.package_id=?`, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer svcRows.Close()

	var services []packageService
	for svcRows.Next() {
		var s packageService
		svcRows.Scan(&s.ID, &s.ServiceID, &s.ServiceName, &s.DurationMin, &s.UnitPrice, &s.Qty)
		services = append(services, s)
	}
	if services == nil {
		services = []packageService{}
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"package":  p,
		"services": services,
	})
}

// ── CreatePackage — POST /api/packages ─────────────────────────────────────

func (a *App) CreatePackage(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		Name         string `json:"name"`
		Description  string `json:"description"`
		Price        float64 `json:"price"`
		ValidityDays int     `json:"validity_days"`
		Services     []struct {
			ServiceID uint `json:"service_id"`
			Qty       int  `json:"qty"`
		} `json:"services"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Name == "" {
		a.Error(w, http.StatusBadRequest, "name required")
		return
	}
	if body.ValidityDays == 0 {
		body.ValidityDays = 365
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(r.Context(), `
		INSERT INTO packages (salon_id, name, description, price, validity_days)
		VALUES (?,?,?,?,?)`,
		claims.SalonID, body.Name, body.Description, body.Price, body.ValidityDays)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	pkgID, _ := res.LastInsertId()

	for _, svc := range body.Services {
		qty := svc.Qty
		if qty == 0 {
			qty = 1
		}
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO package_services (package_id, service_id, qty) VALUES (?,?,?)`,
			pkgID, svc.ServiceID, qty)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	a.JSON(w, http.StatusCreated, map[string]any{
		"id":            pkgID,
		"salon_id":      claims.SalonID,
		"name":          body.Name,
		"description":   body.Description,
		"price":         body.Price,
		"validity_days": body.ValidityDays,
		"is_active":     true,
	})
}

// ── UpdatePackage — PUT /api/packages/{id} ─────────────────────────────────

func (a *App) UpdatePackage(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body struct {
		Name         string  `json:"name"`
		Description  string  `json:"description"`
		Price        float64 `json:"price"`
		ValidityDays int     `json:"validity_days"`
		Services     []struct {
			ServiceID uint `json:"service_id"`
			Qty       int  `json:"qty"`
		} `json:"services"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	tx, err := a.DB.BeginTx(r.Context(), nil)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(), `
		UPDATE packages SET name=?, description=?, price=?, validity_days=?
		WHERE id=? AND salon_id=?`,
		body.Name, body.Description, body.Price, body.ValidityDays, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	_, err = tx.ExecContext(r.Context(), `DELETE FROM package_services WHERE package_id=?`, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	for _, svc := range body.Services {
		qty := svc.Qty
		if qty == 0 {
			qty = 1
		}
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO package_services (package_id, service_id, qty) VALUES (?,?,?)`,
			id, svc.ServiceID, qty)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	a.JSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

// ── DeletePackage — DELETE /api/packages/{id} ──────────────────────────────

func (a *App) DeletePackage(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = a.DB.ExecContext(r.Context(), `
		UPDATE packages SET is_active=0 WHERE id=? AND salon_id=?`, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ── SellPackage — POST /api/packages/{id}/sell ─────────────────────────────

func (a *App) SellPackage(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body struct {
		ClientID      uint     `json:"client_id"`
		PurchasePrice *float64 `json:"purchase_price"`
	}
	if err := a.Decode(r, &body); err != nil || body.ClientID == 0 {
		a.Error(w, http.StatusBadRequest, "client_id required")
		return
	}

	var pkgPrice float64
	var validityDays int
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT price, validity_days FROM packages WHERE id=? AND salon_id=? AND is_active=1`,
		id, claims.SalonID).Scan(&pkgPrice, &validityDays)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "package not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	purchasePrice := pkgPrice
	if body.PurchasePrice != nil {
		purchasePrice = *body.PurchasePrice
	}

	expiresAt := time.Now().UTC().AddDate(0, 0, validityDays)

	res, err := a.DB.ExecContext(r.Context(), `
		INSERT INTO client_packages (salon_id, client_id, package_id, purchase_price, expires_at)
		VALUES (?,?,?,?,?)`,
		claims.SalonID, body.ClientID, id, purchasePrice, expiresAt)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	cpID, _ := res.LastInsertId()

	a.JSON(w, http.StatusCreated, map[string]any{
		"client_package_id": cpID,
		"expires_at":        expiresAt.Format(time.RFC3339),
	})
}

// ── GetClientPackages — GET /api/clients/{id}/packages ─────────────────────

type clientPackageService struct {
	ServiceID    uint   `json:"service_id"`
	ServiceName  string `json:"service_name"`
	TotalQty     int    `json:"total_qty"`
	RemainingQty int    `json:"remaining_qty"`
}

type clientPackageResult struct {
	ClientPackageID uint                   `json:"client_package_id"`
	PackageID       uint                   `json:"package_id"`
	PackageName     string                 `json:"package_name"`
	Status          string                 `json:"status"`
	PurchasedAt     time.Time              `json:"purchased_at"`
	ExpiresAt       *time.Time             `json:"expires_at"`
	PurchasePrice   float64                `json:"purchase_price"`
	Services        []clientPackageService `json:"services"`
	TotalRemaining  int                    `json:"total_remaining"`
}

func (a *App) GetClientPackages(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT cp.id as client_package_id, cp.package_id, p.name as package_name,
		       cp.status, cp.purchased_at, cp.expires_at, cp.purchase_price,
		       ps.service_id, s.name as service_name, ps.qty as total_qty,
		       (ps.qty - COALESCE(used.cnt,0)) as remaining_qty
		FROM client_packages cp
		JOIN packages p ON p.id = cp.package_id
		JOIN package_services ps ON ps.package_id = cp.package_id
		JOIN services s ON s.id = ps.service_id
		LEFT JOIN (
		  SELECT client_package_id, service_id, COUNT(*) as cnt
		  FROM package_redemptions
		  GROUP BY client_package_id, service_id
		) used ON used.client_package_id = cp.id AND used.service_id = ps.service_id
		WHERE cp.client_id=? AND cp.salon_id=?
		ORDER BY (cp.status='active') DESC, cp.expires_at ASC`,
		clientID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	ordered := []uint{}
	grouped := map[uint]*clientPackageResult{}

	for rows.Next() {
		var (
			cpID          uint
			pkgID         uint
			pkgName       string
			status        string
			purchasedAt   time.Time
			expiresAt     *time.Time
			purchasePrice float64
			serviceID     uint
			serviceName   string
			totalQty      int
			remainingQty  int
		)
		rows.Scan(&cpID, &pkgID, &pkgName, &status, &purchasedAt, &expiresAt, &purchasePrice,
			&serviceID, &serviceName, &totalQty, &remainingQty)

		if _, exists := grouped[cpID]; !exists {
			grouped[cpID] = &clientPackageResult{
				ClientPackageID: cpID,
				PackageID:       pkgID,
				PackageName:     pkgName,
				Status:          status,
				PurchasedAt:     purchasedAt,
				ExpiresAt:       expiresAt,
				PurchasePrice:   purchasePrice,
				Services:        []clientPackageService{},
			}
			ordered = append(ordered, cpID)
		}

		cp := grouped[cpID]
		cp.Services = append(cp.Services, clientPackageService{
			ServiceID:    serviceID,
			ServiceName:  serviceName,
			TotalQty:     totalQty,
			RemainingQty: remainingQty,
		})
		if remainingQty > 0 {
			cp.TotalRemaining += remainingQty
		}
	}

	// Update statuses
	now := time.Now().UTC()
	for cpID, cp := range grouped {
		if cp.Status == "active" {
			if cp.ExpiresAt != nil && cp.ExpiresAt.Before(now) {
				a.DB.ExecContext(r.Context(), `UPDATE client_packages SET status='expired' WHERE id=?`, cpID)
				cp.Status = "expired"
			} else if cp.TotalRemaining == 0 && len(cp.Services) > 0 {
				a.DB.ExecContext(r.Context(), `UPDATE client_packages SET status='exhausted' WHERE id=?`, cpID)
				cp.Status = "exhausted"
			}
		}
	}

	result := make([]*clientPackageResult, 0, len(ordered))
	for _, cpID := range ordered {
		result = append(result, grouped[cpID])
	}

	a.JSON(w, http.StatusOK, result)
}

// ── RedeemPackageService — POST /api/packages/redeem ──────────────────────

func (a *App) RedeemPackageService(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		ClientPackageID uint   `json:"client_package_id"`
		ServiceID       uint   `json:"service_id"`
		AppointmentID   *int   `json:"appointment_id"`
		TransactionID   *int   `json:"transaction_id"`
		Notes           string `json:"notes"`
	}
	if err := a.Decode(r, &body); err != nil || body.ClientPackageID == 0 || body.ServiceID == 0 {
		a.Error(w, http.StatusBadRequest, "client_package_id and service_id required")
		return
	}

	// Check package exists, belongs to salon, and is active/not expired
	var status string
	var expiresAt *time.Time
	err := a.DB.QueryRowContext(r.Context(), `
		SELECT cp.status, cp.expires_at
		FROM client_packages cp
		WHERE cp.id=? AND cp.salon_id=?`, body.ClientPackageID, claims.SalonID).
		Scan(&status, &expiresAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "client package not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	if status != "active" {
		a.Error(w, http.StatusBadRequest, "package is not active")
		return
	}
	if expiresAt != nil && expiresAt.Before(time.Now().UTC()) {
		a.DB.ExecContext(r.Context(), `UPDATE client_packages SET status='expired' WHERE id=?`, body.ClientPackageID)
		a.Error(w, http.StatusBadRequest, "package has expired")
		return
	}

	// Check remaining qty
	var totalQty int
	err = a.DB.QueryRowContext(r.Context(), `
		SELECT qty FROM package_services ps
		JOIN client_packages cp ON cp.package_id = ps.package_id
		WHERE cp.id=? AND ps.service_id=?`, body.ClientPackageID, body.ServiceID).Scan(&totalQty)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusBadRequest, "service not in package")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	var usedQty int
	a.DB.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM package_redemptions
		WHERE client_package_id=? AND service_id=?`, body.ClientPackageID, body.ServiceID).Scan(&usedQty)

	remaining := totalQty - usedQty
	if remaining <= 0 {
		a.Error(w, http.StatusBadRequest, "no remaining credits for this service")
		return
	}

	// INSERT redemption
	_, err = a.DB.ExecContext(r.Context(), `
		INSERT INTO package_redemptions (client_package_id, service_id, appointment_id, transaction_id, notes)
		VALUES (?,?,?,?,?)`,
		body.ClientPackageID, body.ServiceID, body.AppointmentID, body.TransactionID, body.Notes)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	remainingAfter := remaining - 1

	// Check if all services are now exhausted
	var totalServices int
	var exhaustedServices int
	a.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM package_services ps JOIN client_packages cp ON cp.package_id=ps.package_id WHERE cp.id=?`, body.ClientPackageID).Scan(&totalServices)
	a.DB.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM package_services ps
		JOIN client_packages cp ON cp.package_id = ps.package_id
		LEFT JOIN (
		  SELECT service_id, COUNT(*) as cnt FROM package_redemptions WHERE client_package_id=? GROUP BY service_id
		) used ON used.service_id = ps.service_id
		WHERE cp.id=? AND (ps.qty - COALESCE(used.cnt,0)) <= 0`, body.ClientPackageID, body.ClientPackageID).Scan(&exhaustedServices)

	if totalServices > 0 && exhaustedServices == totalServices {
		a.DB.ExecContext(r.Context(), `UPDATE client_packages SET status='exhausted' WHERE id=?`, body.ClientPackageID)
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"redeemed":      true,
		"remaining_qty": remainingAfter,
	})
}

// ── ListClientPackageRedemptions — GET /api/clients/{id}/packages/history ──

func (a *App) ListClientPackageRedemptions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	clientID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(), `
		SELECT pr.id, pr.client_package_id, pr.service_id, pr.appointment_id, pr.transaction_id,
		       pr.redeemed_at, COALESCE(pr.notes,''),
		       p.name as package_name, s.name as service_name
		FROM package_redemptions pr
		JOIN client_packages cp ON cp.id = pr.client_package_id
		JOIN packages p ON p.id = cp.package_id
		JOIN services s ON s.id = pr.service_id
		WHERE cp.client_id=? AND cp.salon_id=?
		ORDER BY pr.redeemed_at DESC LIMIT 50`,
		clientID, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type redemptionRow struct {
		ID              uint       `json:"id"`
		ClientPackageID uint       `json:"client_package_id"`
		ServiceID       uint       `json:"service_id"`
		AppointmentID   *int       `json:"appointment_id"`
		TransactionID   *int       `json:"transaction_id"`
		RedeemedAt      time.Time  `json:"redeemed_at"`
		Notes           string     `json:"notes"`
		PackageName     string     `json:"package_name"`
		ServiceName     string     `json:"service_name"`
	}

	var result []redemptionRow
	for rows.Next() {
		var row redemptionRow
		rows.Scan(&row.ID, &row.ClientPackageID, &row.ServiceID, &row.AppointmentID, &row.TransactionID,
			&row.RedeemedAt, &row.Notes, &row.PackageName, &row.ServiceName)
		result = append(result, row)
	}
	if result == nil {
		result = []redemptionRow{}
	}

	a.JSON(w, http.StatusOK, result)
}
