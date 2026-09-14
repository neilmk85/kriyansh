package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// logStockMovement records a stock change. qtyBefore is the stock_qty BEFORE the delta is applied.
// Failures are silently swallowed — movement logging must never break the main operation.
func (a *App) logStockMovement(ctx context.Context, salonID uint, itemID int64, movType string, delta, qtyBefore float64, reason, ref string, costPerUnit float64) {
	a.DB.ExecContext(ctx,
		`INSERT INTO stock_movements
		 (salon_id, inventory_item_id, movement_type, delta, qty_before, qty_after, reason, reference, cost_per_unit)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		salonID, itemID, movType, delta, qtyBefore, qtyBefore+delta, reason, ref, costPerUnit)
}

type inventoryItem struct {
	ID                uint      `json:"id"`
	SalonID           uint      `json:"salon_id"`
	Name              string    `json:"name"`
	Category          string    `json:"category"`
	SKU               string    `json:"sku"`
	Supplier          string    `json:"supplier"`
	ImageURL          string    `json:"image_url"`
	Unit              string    `json:"unit"`
	CostPrice         float64   `json:"cost_price"`
	RetailPrice       float64   `json:"retail_price"`
	StockQty          float64   `json:"stock_qty"`
	LowStockThreshold float64   `json:"low_stock_threshold"`
	IsActive          bool      `json:"is_active"`
	IsLowStock        bool      `json:"is_low_stock"`
	CreatedAt         time.Time `json:"created_at"`
}

func (a *App) ListInventory(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, salon_id, name, COALESCE(category,''), COALESCE(sku,''),
		        COALESCE(supplier,''), COALESCE(image_url,''),
		        unit, cost_price, retail_price, stock_qty, low_stock_threshold, is_active, created_at
		 FROM inventory_items
		 WHERE salon_id=? AND is_active=1
		 ORDER BY created_at DESC`, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	var items []inventoryItem
	for rows.Next() {
		var item inventoryItem
		rows.Scan(&item.ID, &item.SalonID, &item.Name, &item.Category, &item.SKU,
			&item.Supplier, &item.ImageURL,
			&item.Unit, &item.CostPrice, &item.RetailPrice, &item.StockQty,
			&item.LowStockThreshold, &item.IsActive, &item.CreatedAt)
		item.IsLowStock = item.StockQty <= item.LowStockThreshold
		items = append(items, item)
	}
	if items == nil {
		items = []inventoryItem{}
	}
	a.JSON(w, http.StatusOK, items)
}

func (a *App) CreateInventoryItem(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	var item inventoryItem
	if err := a.Decode(r, &item); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	item.SalonID = claims.SalonID
	res, err := a.DB.ExecContext(r.Context(),
		`INSERT INTO inventory_items (salon_id, name, category, sku, supplier, image_url, unit, cost_price, retail_price, stock_qty, low_stock_threshold)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		item.SalonID, item.Name, item.Category, item.SKU, item.Supplier, item.ImageURL, item.Unit,
		item.CostPrice, item.RetailPrice, item.StockQty, item.LowStockThreshold)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	item.ID = uint(id)
	item.IsActive = true
	item.IsLowStock = item.StockQty <= item.LowStockThreshold
	a.JSON(w, http.StatusCreated, item)
}

func (a *App) UpdateInventoryItem(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var item inventoryItem
	if err := a.Decode(r, &item); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE inventory_items SET name=?, category=?, sku=?, supplier=?, image_url=?, unit=?,
		 cost_price=?, retail_price=?, stock_qty=?, low_stock_threshold=?
		 WHERE id=? AND salon_id=?`,
		item.Name, item.Category, item.SKU, item.Supplier, item.ImageURL, item.Unit,
		item.CostPrice, item.RetailPrice, item.StockQty, item.LowStockThreshold,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	item.ID = uint(id)
	item.SalonID = claims.SalonID
	item.IsLowStock = item.StockQty <= item.LowStockThreshold
	a.JSON(w, http.StatusOK, item)
}

func (a *App) AdjustInventoryStock(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Delta float64 `json:"delta"`
		Note  string  `json:"note"`
	}
	if err := a.Decode(r, &body); err != nil {
		a.Error(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Read qty before update for movement log
	var qtyBefore float64
	_ = a.DB.QueryRowContext(r.Context(),
		`SELECT stock_qty FROM inventory_items WHERE id=? AND salon_id=?`, id, claims.SalonID).Scan(&qtyBefore)

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE inventory_items SET stock_qty = stock_qty + ? WHERE id=? AND salon_id=?`,
		body.Delta, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	a.logStockMovement(r.Context(), claims.SalonID, int64(id), "adjustment", body.Delta, qtyBefore, body.Note, "", 0)

	// Return updated item
	var item inventoryItem
	err = a.DB.QueryRowContext(r.Context(),
		`SELECT id, salon_id, name, COALESCE(category,''), COALESCE(sku,''),
		        COALESCE(supplier,''), COALESCE(image_url,''),
		        unit, cost_price, retail_price, stock_qty, low_stock_threshold, is_active, created_at
		 FROM inventory_items WHERE id=? AND salon_id=?`, id, claims.SalonID).
		Scan(&item.ID, &item.SalonID, &item.Name, &item.Category, &item.SKU,
			&item.Supplier, &item.ImageURL,
			&item.Unit, &item.CostPrice, &item.RetailPrice, &item.StockQty,
			&item.LowStockThreshold, &item.IsActive, &item.CreatedAt)
	if err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "item not found")
		return
	}
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	item.IsLowStock = item.StockQty <= item.LowStockThreshold
	a.JSON(w, http.StatusOK, item)
}

func (a *App) DeleteInventoryItem(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE inventory_items SET is_active=0 WHERE id=? AND salon_id=?`,
		id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	a.JSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) UploadInventoryImage(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	// Verify item belongs to salon
	var check int
	if a.DB.QueryRowContext(r.Context(), `SELECT id FROM inventory_items WHERE id=? AND salon_id=? AND is_active=1`, id, claims.SalonID).Scan(&check) != nil {
		a.Error(w, http.StatusNotFound, "item not found")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 8<<20) // 8 MB limit
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		a.Error(w, http.StatusBadRequest, "file too large (max 8MB)")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "no file provided")
		return
	}
	defer file.Close()

	// Validate content type
	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	ct := http.DetectContentType(buf[:n])
	if ct != "image/jpeg" && ct != "image/png" && ct != "image/webp" && ct != "image/gif" {
		a.Error(w, http.StatusBadRequest, "only JPEG, PNG, WebP or GIF images allowed")
		return
	}
	file.Seek(0, 0)

	// Save to disk
	ext := ".jpg"
	switch ct {
	case "image/png":  ext = ".png"
	case "image/webp": ext = ".webp"
	case "image/gif":  ext = ".gif"
	}
	_ = header
	filename := fmt.Sprintf("%d_%d%s", id, time.Now().UnixNano(), ext)
	dir := "/root/Kriyansh/uploads/products"
	os.MkdirAll(dir, 0755)
	dst, err := os.Create(dir + "/" + filename)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "could not save file")
		return
	}
	defer dst.Close()
	io.Copy(dst, file)

	imageURL := "/uploads/products/" + filename
	a.DB.ExecContext(r.Context(), `UPDATE inventory_items SET image_url=? WHERE id=? AND salon_id=?`, imageURL, id, claims.SalonID)

	a.JSON(w, http.StatusOK, map[string]any{"image_url": imageURL})
}

// POST /api/v1/inventory/{id}/wastage
// Records product wastage — deducts stock and logs a 'wastage' movement.
func (a *App) WastageInventoryStock(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		Qty    float64 `json:"qty"`
		Reason string  `json:"reason"`
	}
	if err := a.Decode(r, &body); err != nil || body.Qty <= 0 {
		a.Error(w, http.StatusBadRequest, "qty > 0 required")
		return
	}

	var qtyBefore float64
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT stock_qty FROM inventory_items WHERE id=? AND salon_id=?`, id, claims.SalonID).Scan(&qtyBefore); err == sql.ErrNoRows {
		a.Error(w, http.StatusNotFound, "item not found")
		return
	}

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE inventory_items SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id=? AND salon_id=?`,
		body.Qty, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

	delta := -body.Qty
	if qtyBefore < body.Qty {
		delta = -qtyBefore // can't go below 0
	}
	a.logStockMovement(r.Context(), claims.SalonID, int64(id), "wastage", delta, qtyBefore, body.Reason, "", 0)

	a.JSON(w, http.StatusOK, map[string]any{"ok": true, "qty_after": qtyBefore + delta})
}

// GET /api/v1/inventory/{id}/movements
// Returns the stock movement log for a single inventory item.
func (a *App) GetItemMovements(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	id, err := pathID(r, "id")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "invalid id")
		return
	}

	rows, err := a.DB.QueryContext(r.Context(),
		`SELECT id, movement_type, delta, qty_before, qty_after, reason, reference, cost_per_unit, created_at
		 FROM stock_movements
		 WHERE salon_id=? AND inventory_item_id=?
		 ORDER BY created_at DESC
		 LIMIT 200`, claims.SalonID, id)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type movement struct {
		ID           int       `json:"id"`
		MovementType string    `json:"movement_type"`
		Delta        float64   `json:"delta"`
		QtyBefore    float64   `json:"qty_before"`
		QtyAfter     float64   `json:"qty_after"`
		Reason       string    `json:"reason"`
		Reference    string    `json:"reference"`
		CostPerUnit  float64   `json:"cost_per_unit"`
		CreatedAt    time.Time `json:"created_at"`
	}
	result := []movement{}
	for rows.Next() {
		var m movement
		rows.Scan(&m.ID, &m.MovementType, &m.Delta, &m.QtyBefore, &m.QtyAfter, &m.Reason, &m.Reference, &m.CostPerUnit, &m.CreatedAt)
		result = append(result, m)
	}
	a.JSON(w, http.StatusOK, result)
}
