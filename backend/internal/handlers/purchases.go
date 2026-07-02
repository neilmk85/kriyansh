package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// Supplier types
// ─────────────────────────────────────────────────────────────────────────────

type Supplier struct {
	ID           uint      `json:"id"`
	SalonID      uint      `json:"salon_id"`
	Name         string    `json:"name"`
	ContactName  string    `json:"contact_name"`
	Phone        string    `json:"phone"`
	Email        string    `json:"email"`
	Address      string    `json:"address"`
	PaymentTerms string    `json:"payment_terms"`
	Notes        string    `json:"notes"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Order types
// ─────────────────────────────────────────────────────────────────────────────

type POItem struct {
	ID              uint    `json:"id"`
	POID            uint    `json:"po_id"`
	InventoryItemID *uint   `json:"inventory_item_id"`
	ItemName        string  `json:"item_name"`
	SKU             string  `json:"sku"`
	Unit            string  `json:"unit"`
	QtyOrdered      float64 `json:"qty_ordered"`
	QtyReceived     float64 `json:"qty_received"`
	UnitCost        float64 `json:"unit_cost"`
	TotalCost       float64 `json:"total_cost"`
}

type PurchaseOrder struct {
	ID           uint      `json:"id"`
	SalonID      uint      `json:"salon_id"`
	SupplierID   uint      `json:"supplier_id"`
	SupplierName string    `json:"supplier_name"`
	PONumber     string    `json:"po_number"`
	Status       string    `json:"status"`
	OrderDate    string    `json:"order_date"`
	ExpectedDate string    `json:"expected_date"`
	Notes        string    `json:"notes"`
	Subtotal     float64   `json:"subtotal"`
	TaxAmount    float64   `json:"tax_amount"`
	TotalAmount  float64   `json:"total_amount"`
	ItemCount    int       `json:"item_count"`
	Items        []POItem  `json:"items,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Purchase types
// ─────────────────────────────────────────────────────────────────────────────

type DPItem struct {
	ID                uint    `json:"id"`
	DirectPurchaseID  uint    `json:"direct_purchase_id"`
	InventoryItemID   *uint   `json:"inventory_item_id"`
	ItemName          string  `json:"item_name"`
	SKU               string  `json:"sku"`
	Unit              string  `json:"unit"`
	Qty               float64 `json:"qty"`
	UnitCost          float64 `json:"unit_cost"`
	TotalCost         float64 `json:"total_cost"`
}

type DirectPurchase struct {
	ID           uint      `json:"id"`
	SalonID      uint      `json:"salon_id"`
	Reference    string    `json:"reference"`
	SupplierName string    `json:"supplier_name"`
	PurchaseDate string    `json:"purchase_date"`
	Notes        string    `json:"notes"`
	Subtotal     float64   `json:"subtotal"`
	TaxAmount    float64   `json:"tax_amount"`
	TotalAmount  float64   `json:"total_amount"`
	Items        []DPItem  `json:"items,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// ─────────────────────────────────────────────────────────────────────────────
// Suppliers CRUD
// ─────────────────────────────────────────────────────────────────────────────

func (a *App) ListSuppliers(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, COALESCE(contact_name,''), COALESCE(phone,''),
		        COALESCE(email,''), COALESCE(address,''), COALESCE(payment_terms,'Net 30'),
		        COALESCE(notes,''), is_active, created_at
		 FROM suppliers WHERE salon_id=? AND is_active=1 ORDER BY name`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var suppliers []Supplier
	for rows.Next() {
		var s Supplier
		rows.Scan(&s.ID, &s.SalonID, &s.Name, &s.ContactName, &s.Phone,
			&s.Email, &s.Address, &s.PaymentTerms, &s.Notes, &s.IsActive, &s.CreatedAt)
		suppliers = append(suppliers, s)
	}
	if suppliers == nil {
		suppliers = []Supplier{}
	}
	a.JSON(w, http.StatusOK, suppliers)
}

func (a *App) CreateSupplier(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var s Supplier
	if err := a.Decode(r, &s); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	s.SalonID = claims.SalonID
	if s.PaymentTerms == "" {
		s.PaymentTerms = "Net 30"
	}
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO suppliers (salon_id, name, contact_name, phone, email, address, payment_terms, notes)
		 VALUES (?,?,?,?,?,?,?,?)`,
		s.SalonID, s.Name, s.ContactName, s.Phone, s.Email, s.Address, s.PaymentTerms, s.Notes)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	s.ID = uint(id)
	s.IsActive = true
	a.JSON(w, http.StatusCreated, s)
}

func (a *App) UpdateSupplier(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var s Supplier
	if err := a.Decode(r, &s); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	if s.PaymentTerms == "" {
		s.PaymentTerms = "Net 30"
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE suppliers SET name=?, contact_name=?, phone=?, email=?, address=?, payment_terms=?, notes=?
		 WHERE id=? AND salon_id=?`,
		s.Name, s.ContactName, s.Phone, s.Email, s.Address, s.PaymentTerms, s.Notes,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	s.ID = uint(id)
	s.SalonID = claims.SalonID
	a.JSON(w, http.StatusOK, s)
}

func (a *App) DeleteSupplier(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE suppliers SET is_active=0 WHERE id=? AND salon_id=?`, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Orders
// ─────────────────────────────────────────────────────────────────────────────

func (a *App) ListPurchaseOrders(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT po.id, po.salon_id, po.supplier_id, COALESCE(s.name,''),
		        po.po_number, po.status,
		        DATE_FORMAT(po.order_date,'%Y-%m-%d'),
		        COALESCE(DATE_FORMAT(po.expected_date,'%Y-%m-%d'),''),
		        COALESCE(po.notes,''), po.subtotal, po.tax_amount, po.total_amount,
		        (SELECT COUNT(*) FROM purchase_order_items WHERE po_id=po.id),
		        po.created_at
		 FROM purchase_orders po
		 LEFT JOIN suppliers s ON s.id = po.supplier_id
		 WHERE po.salon_id=?
		 ORDER BY po.created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var orders []PurchaseOrder
	for rows.Next() {
		var po PurchaseOrder
		rows.Scan(&po.ID, &po.SalonID, &po.SupplierID, &po.SupplierName,
			&po.PONumber, &po.Status, &po.OrderDate, &po.ExpectedDate,
			&po.Notes, &po.Subtotal, &po.TaxAmount, &po.TotalAmount,
			&po.ItemCount, &po.CreatedAt)
		orders = append(orders, po)
	}
	if orders == nil {
		orders = []PurchaseOrder{}
	}
	a.JSON(w, http.StatusOK, orders)
}

func (a *App) GetPurchaseOrder(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var po PurchaseOrder
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT po.id, po.salon_id, po.supplier_id, COALESCE(s.name,''),
		        po.po_number, po.status,
		        DATE_FORMAT(po.order_date,'%Y-%m-%d'),
		        COALESCE(DATE_FORMAT(po.expected_date,'%Y-%m-%d'),''),
		        COALESCE(po.notes,''), po.subtotal, po.tax_amount, po.total_amount,
		        0, po.created_at
		 FROM purchase_orders po
		 LEFT JOIN suppliers s ON s.id = po.supplier_id
		 WHERE po.id=? AND po.salon_id=?`, id, claims.SalonID).
		Scan(&po.ID, &po.SalonID, &po.SupplierID, &po.SupplierName,
			&po.PONumber, &po.Status, &po.OrderDate, &po.ExpectedDate,
			&po.Notes, &po.Subtotal, &po.TaxAmount, &po.TotalAmount,
			&po.ItemCount, &po.CreatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Load items
	itemRows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, po_id, COALESCE(inventory_item_id,0), item_name, COALESCE(sku,''),
		        COALESCE(unit,'unit'), qty_ordered, qty_received, unit_cost, total_cost
		 FROM purchase_order_items WHERE po_id=? ORDER BY id`, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer itemRows.Close()
	for itemRows.Next() {
		var item POItem
		var invID uint
		itemRows.Scan(&item.ID, &item.POID, &invID, &item.ItemName,
			&item.SKU, &item.Unit, &item.QtyOrdered, &item.QtyReceived,
			&item.UnitCost, &item.TotalCost)
		if invID != 0 {
			item.InventoryItemID = &invID
		}
		po.Items = append(po.Items, item)
	}
	if po.Items == nil {
		po.Items = []POItem{}
	}
	po.ItemCount = len(po.Items)
	a.JSON(w, http.StatusOK, po)
}

func (a *App) CreatePurchaseOrder(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		SupplierID   uint   `json:"supplier_id"`
		OrderDate    string `json:"order_date"`
		ExpectedDate string `json:"expected_date"`
		Notes        string `json:"notes"`
		TaxAmount    float64 `json:"tax_amount"`
		Items        []struct {
			InventoryItemID *uint   `json:"inventory_item_id"`
			ItemName        string  `json:"item_name"`
			SKU             string  `json:"sku"`
			Unit            string  `json:"unit"`
			QtyOrdered      float64 `json:"qty_ordered"`
			UnitCost        float64 `json:"unit_cost"`
		} `json:"items"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Compute subtotal
	var subtotal float64
	for _, it := range body.Items {
		subtotal += it.QtyOrdered * it.UnitCost
	}
	total := subtotal + body.TaxAmount

	// Insert PO with placeholder po_number
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO purchase_orders (salon_id, supplier_id, po_number, order_date, expected_date, notes, subtotal, tax_amount, total_amount)
		 VALUES (?,?,?,?,?,?,?,?,?)`,
		claims.SalonID, body.SupplierID, "TEMP", body.OrderDate, nullableDate(body.ExpectedDate),
		body.Notes, subtotal, body.TaxAmount, total)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	poID, _ := res.LastInsertId()

	// Generate PO number
	year := time.Now().Year()
	poNumber := fmt.Sprintf("PO-%d-%05d", year, poID)
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE purchase_orders SET po_number=? WHERE id=?`, poNumber, poID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Insert items
	for _, it := range body.Items {
		if it.Unit == "" {
			it.Unit = "unit"
		}
		totalCost := it.QtyOrdered * it.UnitCost
		var invID interface{}
		if it.InventoryItemID != nil {
			invID = *it.InventoryItemID
		} else {
			invID = nil
		}
		_, err = a.DB.ExecContext(r.Context(),
			`INSERT INTO purchase_order_items (po_id, inventory_item_id, item_name, sku, unit, qty_ordered, unit_cost, total_cost)
			 VALUES (?,?,?,?,?,?,?,?)`,
			poID, invID, it.ItemName, it.SKU, it.Unit, it.QtyOrdered, it.UnitCost, totalCost)
		if err != nil {
			a.Error(w, http.StatusInternalServerError, "db error")
			return
		}
	}

	// Return the full PO by fetching it directly
	var po PurchaseOrder
	a.DB.QueryRowContext(r.Context(),
		`SELECT po.id, po.salon_id, po.supplier_id, COALESCE(s.name,''),
		        po.po_number, po.status,
		        DATE_FORMAT(po.order_date,'%Y-%m-%d'),
		        COALESCE(DATE_FORMAT(po.expected_date,'%Y-%m-%d'),''),
		        COALESCE(po.notes,''), po.subtotal, po.tax_amount, po.total_amount,
		        0, po.created_at
		 FROM purchase_orders po
		 LEFT JOIN suppliers s ON s.id = po.supplier_id
		 WHERE po.id=?`, poID).
		Scan(&po.ID, &po.SalonID, &po.SupplierID, &po.SupplierName,
			&po.PONumber, &po.Status, &po.OrderDate, &po.ExpectedDate,
			&po.Notes, &po.Subtotal, &po.TaxAmount, &po.TotalAmount,
			&po.ItemCount, &po.CreatedAt)

	itemRows2, _ := a.DB.QueryContext(r.Context(),
		`SELECT id, po_id, COALESCE(inventory_item_id,0), item_name, COALESCE(sku,''),
		        COALESCE(unit,'unit'), qty_ordered, qty_received, unit_cost, total_cost
		 FROM purchase_order_items WHERE po_id=? ORDER BY id`, poID)
	if itemRows2 != nil {
		defer itemRows2.Close()
		for itemRows2.Next() {
			var item POItem
			var invID uint
			itemRows2.Scan(&item.ID, &item.POID, &invID, &item.ItemName,
				&item.SKU, &item.Unit, &item.QtyOrdered, &item.QtyReceived,
				&item.UnitCost, &item.TotalCost)
			if invID != 0 {
				item.InventoryItemID = &invID
			}
			po.Items = append(po.Items, item)
		}
	}
	if po.Items == nil {
		po.Items = []POItem{}
	}
	po.ItemCount = len(po.Items)
	a.JSON(w, http.StatusCreated, po)
}

func (a *App) UpdatePOStatus(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Status string `json:"status"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Verify PO belongs to salon
	var poSalonID uint
	err = a.DB.QueryRowContext(r.Context(), `SELECT salon_id FROM purchase_orders WHERE id=?`, id).Scan(&poSalonID)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "not found")
		return
	}
	if poSalonID != claims.SalonID {
		a.Error(w, http.StatusForbidden, "forbidden")
		return
	}

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE purchase_orders SET status=? WHERE id=? AND salon_id=?`,
		body.Status, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// When status becomes "received", add all items to inventory
	if body.Status == "received" {
		itemRows, err := a.DB.QueryContext(r.Context(),
			`SELECT inventory_item_id, qty_ordered FROM purchase_order_items WHERE po_id=? AND inventory_item_id IS NOT NULL`, id)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				var invID uint
				var qty float64
				itemRows.Scan(&invID, &qty)
				a.DB.ExecContext(r.Context(),
					`UPDATE inventory_items SET stock_qty = stock_qty + ? WHERE id=? AND salon_id=?`,
					qty, invID, claims.SalonID)
			}
		}
	}

	a.JSON(w, http.StatusOK, map[string]any{"status": body.Status})
}

func (a *App) ReceivePOItems(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	poID, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Items []struct {
			ID          uint    `json:"id"`
			QtyReceived float64 `json:"qty_received"`
		} `json:"items"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Verify PO belongs to salon
	var poSalonID uint
	err = a.DB.QueryRowContext(r.Context(), `SELECT salon_id FROM purchase_orders WHERE id=?`, poID).Scan(&poSalonID)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "not found")
		return
	}
	if poSalonID != claims.SalonID {
		a.Error(w, http.StatusForbidden, "forbidden")
		return
	}

	for _, it := range body.Items {
		// Get current qty_received and inventory_item_id
		var prevQty float64
		var invID sql.NullInt64
		err := a.DB.QueryRowContext(r.Context(),
			`SELECT qty_received, inventory_item_id FROM purchase_order_items WHERE id=? AND po_id=?`,
			it.ID, poID).Scan(&prevQty, &invID)
		if err != nil {
			continue
		}

		// Update qty_received on item
		_, err = a.DB.ExecContext(r.Context(),
			`UPDATE purchase_order_items SET qty_received=? WHERE id=? AND po_id=?`,
			it.QtyReceived, it.ID, poID)
		if err != nil {
			continue
		}

		// Add delta to inventory stock
		delta := it.QtyReceived - prevQty
		if delta > 0 && invID.Valid {
			a.DB.ExecContext(r.Context(),
				`UPDATE inventory_items SET stock_qty = stock_qty + ? WHERE id=? AND salon_id=?`,
				delta, invID.Int64, claims.SalonID)
		}
	}

	// Determine new PO status: received if all items fully received, else partial
	var totalOrdered, totalReceived float64
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT COALESCE(SUM(qty_ordered),0), COALESCE(SUM(qty_received),0)
		 FROM purchase_order_items WHERE po_id=?`, poID).Scan(&totalOrdered, &totalReceived)
	if err == nil && totalOrdered > 0 {
		newStatus := "partial"
		if totalReceived >= totalOrdered {
			newStatus = "received"
		}
		a.DB.ExecContext(r.Context(),
			`UPDATE purchase_orders SET status=? WHERE id=? AND salon_id=?`,
			newStatus, poID, claims.SalonID)
	}

	a.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ─────────────────────────────────────────────────────────────────────────────
// Direct Purchases
// ─────────────────────────────────────────────────────────────────────────────

func (a *App) ListDirectPurchases(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, COALESCE(reference,''), COALESCE(supplier_name,''),
		        DATE_FORMAT(purchase_date,'%Y-%m-%d'), COALESCE(notes,''),
		        subtotal, tax_amount, total_amount, created_at
		 FROM direct_purchases WHERE salon_id=? ORDER BY created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	var purchases []DirectPurchase
	for rows.Next() {
		var dp DirectPurchase
		rows.Scan(&dp.ID, &dp.SalonID, &dp.Reference, &dp.SupplierName,
			&dp.PurchaseDate, &dp.Notes, &dp.Subtotal, &dp.TaxAmount,
			&dp.TotalAmount, &dp.CreatedAt)
		purchases = append(purchases, dp)
	}
	if purchases == nil {
		purchases = []DirectPurchase{}
	}
	a.JSON(w, http.StatusOK, purchases)
}

func (a *App) GetDirectPurchase(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var dp DirectPurchase
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, COALESCE(reference,''), COALESCE(supplier_name,''),
		        DATE_FORMAT(purchase_date,'%Y-%m-%d'), COALESCE(notes,''),
		        subtotal, tax_amount, total_amount, created_at
		 FROM direct_purchases WHERE id=? AND salon_id=?`, id, claims.SalonID).
		Scan(&dp.ID, &dp.SalonID, &dp.Reference, &dp.SupplierName,
			&dp.PurchaseDate, &dp.Notes, &dp.Subtotal, &dp.TaxAmount,
			&dp.TotalAmount, &dp.CreatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	// Load items
	itemRows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, direct_purchase_id, COALESCE(inventory_item_id,0), item_name,
		        COALESCE(sku,''), COALESCE(unit,'unit'), qty, unit_cost, total_cost
		 FROM direct_purchase_items WHERE direct_purchase_id=? ORDER BY id`, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer itemRows.Close()
	for itemRows.Next() {
		var item DPItem
		var invID uint
		itemRows.Scan(&item.ID, &item.DirectPurchaseID, &invID, &item.ItemName,
			&item.SKU, &item.Unit, &item.Qty, &item.UnitCost, &item.TotalCost)
		if invID != 0 {
			item.InventoryItemID = &invID
		}
		dp.Items = append(dp.Items, item)
	}
	if dp.Items == nil {
		dp.Items = []DPItem{}
	}
	a.JSON(w, http.StatusOK, dp)
}

func (a *App) CreateDirectPurchase(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var body struct {
		SupplierName string  `json:"supplier_name"`
		Reference    string  `json:"reference"`
		PurchaseDate string  `json:"purchase_date"`
		Notes        string  `json:"notes"`
		TaxAmount    float64 `json:"tax_amount"`
		Items        []struct {
			InventoryItemID *uint   `json:"inventory_item_id"`
			ItemName        string  `json:"item_name"`
			SKU             string  `json:"sku"`
			Unit            string  `json:"unit"`
			Qty             float64 `json:"qty"`
			UnitCost        float64 `json:"unit_cost"`
		} `json:"items"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Compute subtotal
	var subtotal float64
	for _, it := range body.Items {
		subtotal += it.Qty * it.UnitCost
	}
	total := subtotal + body.TaxAmount

	if body.PurchaseDate == "" {
		body.PurchaseDate = time.Now().Format("2006-01-02")
	}

	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO direct_purchases (salon_id, reference, supplier_name, purchase_date, notes, subtotal, tax_amount, total_amount)
		 VALUES (?,?,?,?,?,?,?,?)`,
		claims.SalonID, body.Reference, body.SupplierName, body.PurchaseDate,
		body.Notes, subtotal, body.TaxAmount, total)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	dpID, _ := res.LastInsertId()

	for _, it := range body.Items {
		if it.Unit == "" {
			it.Unit = "unit"
		}
		totalCost := it.Qty * it.UnitCost
		var invID interface{}
		if it.InventoryItemID != nil {
			invID = *it.InventoryItemID
		} else {
			invID = nil
		}
		_, err = a.DB.ExecContext(r.Context(),
			`INSERT INTO direct_purchase_items (direct_purchase_id, inventory_item_id, item_name, sku, unit, qty, unit_cost, total_cost)
			 VALUES (?,?,?,?,?,?,?,?)`,
			dpID, invID, it.ItemName, it.SKU, it.Unit, it.Qty, it.UnitCost, totalCost)
		if err != nil {
			continue
		}

		// Update inventory stock and cost_price (latest cost approach)
		if it.InventoryItemID != nil {
			a.DB.ExecContext(r.Context(),
				`UPDATE inventory_items SET stock_qty = stock_qty + ?, cost_price=? WHERE id=? AND salon_id=?`,
				it.Qty, it.UnitCost, *it.InventoryItemID, claims.SalonID)
		}
	}

	// Fetch and return
	var dp DirectPurchase
	a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, COALESCE(reference,''), COALESCE(supplier_name,''),
		        DATE_FORMAT(purchase_date,'%Y-%m-%d'), COALESCE(notes,''),
		        subtotal, tax_amount, total_amount, created_at
		 FROM direct_purchases WHERE id=?`, dpID).
		Scan(&dp.ID, &dp.SalonID, &dp.Reference, &dp.SupplierName,
			&dp.PurchaseDate, &dp.Notes, &dp.Subtotal, &dp.TaxAmount,
			&dp.TotalAmount, &dp.CreatedAt)
	a.JSON(w, http.StatusCreated, dp)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func nullableDate(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
