package handlers

import (
	"database/sql"
	"net/http"
	"time"
)

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

	_, err = a.DB.ExecContext(r.Context(),
		`UPDATE inventory_items SET stock_qty = stock_qty + ? WHERE id=? AND salon_id=?`,
		body.Delta, id, claims.SalonID)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "db error")
		return
	}

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
