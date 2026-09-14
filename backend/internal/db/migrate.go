package db

import (
	"database/sql"
	"fmt"
	"log/slog"
)

// addColumnIfNotExists safely adds a column only when it doesn't already exist.
// Works on MySQL 5.7+ (uses information_schema instead of IF NOT EXISTS syntax).
func addColumnIfNotExists(db *sql.DB, table, column, definition string) error {
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		table, column).Scan(&count)
	if err != nil {
		return fmt.Errorf("check column %s.%s: %w", table, column, err)
	}
	if count == 0 {
		_, err = db.Exec(fmt.Sprintf("ALTER TABLE `%s` ADD COLUMN %s %s", table, column, definition))
		if err != nil {
			return fmt.Errorf("add column %s.%s: %w", table, column, err)
		}
	}
	return nil
}

// Migrate runs CREATE TABLE IF NOT EXISTS for all application tables.
func Migrate(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS businesses (
			id INT PRIMARY KEY AUTO_INCREMENT,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255),
			phone VARCHAR(20),
			website VARCHAR(255),
			logo_url VARCHAR(500),
			country VARCHAR(10) DEFAULT 'AU',
			timezone VARCHAR(50) DEFAULT 'Australia/Melbourne',
			currency VARCHAR(10) DEFAULT 'AUD',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT,
			subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
			discount DECIMAL(10,2) NOT NULL DEFAULT 0,
			tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
			tip_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
			grand_total DECIMAL(10,2) NOT NULL DEFAULT 0,
			payment_method ENUM('card','cash','tap') NOT NULL DEFAULT 'card',
			status ENUM('completed','refunded','void') NOT NULL DEFAULT 'completed',
			notes TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS transaction_items (
			id INT PRIMARY KEY AUTO_INCREMENT,
			transaction_id INT NOT NULL,
			service_id INT,
			name VARCHAR(255) NOT NULL,
			price DECIMAL(10,2) NOT NULL,
			qty INT NOT NULL DEFAULT 1,
			subtotal DECIMAL(10,2) NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS salon_settings (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL UNIQUE,
			name VARCHAR(255) NOT NULL DEFAULT 'Kriyansh Salon',
			phone VARCHAR(20),
			email VARCHAR(255),
			address TEXT,
			city VARCHAR(100) DEFAULT 'Beverly Hills',
			state VARCHAR(50) DEFAULT 'CA',
			zip VARCHAR(20),
			timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
			currency VARCHAR(10) DEFAULT 'USD',
			tax_rate DECIMAL(6,4) DEFAULT 0.1025,
			mon_open VARCHAR(5) DEFAULT '09:00', mon_close VARCHAR(5) DEFAULT '18:00', mon_closed BOOLEAN DEFAULT FALSE,
			tue_open VARCHAR(5) DEFAULT '09:00', tue_close VARCHAR(5) DEFAULT '18:00', tue_closed BOOLEAN DEFAULT FALSE,
			wed_open VARCHAR(5) DEFAULT '09:00', wed_close VARCHAR(5) DEFAULT '18:00', wed_closed BOOLEAN DEFAULT FALSE,
			thu_open VARCHAR(5) DEFAULT '09:00', thu_close VARCHAR(5) DEFAULT '18:00', thu_closed BOOLEAN DEFAULT FALSE,
			fri_open VARCHAR(5) DEFAULT '09:00', fri_close VARCHAR(5) DEFAULT '20:00', fri_closed BOOLEAN DEFAULT FALSE,
			sat_open VARCHAR(5) DEFAULT '09:00', sat_close VARCHAR(5) DEFAULT '20:00', sat_closed BOOLEAN DEFAULT FALSE,
			sun_open VARCHAR(5) DEFAULT '10:00', sun_close VARCHAR(5) DEFAULT '16:00', sun_closed BOOLEAN DEFAULT FALSE,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS staff_schedules (
			id INT PRIMARY KEY AUTO_INCREMENT,
			staff_id INT NOT NULL,
			day_of_week TINYINT NOT NULL COMMENT '0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat',
			start_time VARCHAR(5) DEFAULT '09:00',
			end_time VARCHAR(5) DEFAULT '18:00',
			is_working BOOLEAN DEFAULT TRUE,
			UNIQUE KEY uq_staff_day (staff_id, day_of_week)
		)`,
		// ── Phase 2 tables ────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS loyalty_tiers (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			name VARCHAR(50) NOT NULL,
			min_points INT NOT NULL DEFAULT 0,
			discount_pct DECIMAL(5,2) DEFAULT 0,
			color VARCHAR(20) DEFAULT '#94A3B8',
			sort_order INT DEFAULT 0,
			UNIQUE KEY uq_salon_tier (salon_id, name)
		)`,
		`CREATE TABLE IF NOT EXISTS client_loyalty (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT NOT NULL UNIQUE,
			balance INT NOT NULL DEFAULT 0,
			lifetime_points INT NOT NULL DEFAULT 0,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS loyalty_transactions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT NOT NULL,
			points INT NOT NULL,
			type ENUM('earn','redeem','adjustment') NOT NULL DEFAULT 'earn',
			reference_id INT COMMENT 'transaction_id',
			note VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS inventory_items (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			sku VARCHAR(100),
			unit VARCHAR(50) DEFAULT 'unit',
			cost_price DECIMAL(10,2) DEFAULT 0,
			retail_price DECIMAL(10,2) DEFAULT 0,
			stock_qty DECIMAL(10,2) DEFAULT 0,
			low_stock_threshold DECIMAL(10,2) DEFAULT 5,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS membership_plans (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			price DECIMAL(10,2) NOT NULL DEFAULT 0,
			billing_cycle ENUM('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
			service_discount_pct DECIMAL(5,2) DEFAULT 0,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS client_memberships (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT NOT NULL,
			plan_id INT NOT NULL,
			status ENUM('active','paused','cancelled') DEFAULT 'active',
			start_date DATE NOT NULL,
			next_billing_date DATE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS upsell_pairs (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			service_id INT NOT NULL,
			upsell_service_id INT NOT NULL,
			message VARCHAR(255) DEFAULT 'Customers who add this love the combo!',
			is_active BOOLEAN DEFAULT TRUE,
			UNIQUE KEY uq_pair (salon_id, service_id, upsell_service_id)
		)`,
		`CREATE TABLE IF NOT EXISTS marketing_campaigns (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			segment ENUM('all','vip','at_risk','lapsed','new','regular') NOT NULL DEFAULT 'all',
			channel ENUM('sms','email') NOT NULL DEFAULT 'sms',
			message TEXT NOT NULL,
			status ENUM('draft','sent') NOT NULL DEFAULT 'draft',
			sent_count INT DEFAULT 0,
			sent_at TIMESTAMP NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		// (column additions handled below via addColumnIfNotExists)
		// ── Seed data ─────────────────────────────────────────────────────────
		`INSERT IGNORE INTO loyalty_tiers (salon_id, name, min_points, discount_pct, color, sort_order) VALUES
			(1, 'Bronze', 0, 0, '#CD7F32', 1),
			(1, 'Silver', 500, 5, '#94A3B8', 2),
			(1, 'Gold', 1500, 10, '#F59E0B', 3),
			(1, 'Platinum', 3000, 15, '#8B5CF6', 4)`,
		`INSERT IGNORE INTO membership_plans (id, salon_id, name, description, price, billing_cycle, service_discount_pct) VALUES
			(1, 1, 'Essential', 'Monthly plan with 5% off all services', 49.00, 'monthly', 5),
			(2, 1, 'Premium', 'Monthly plan with 10% off + priority booking', 89.00, 'monthly', 10),
			(3, 1, 'VIP Annual', 'Annual plan with 15% off + 1 free service/month', 799.00, 'annual', 15)`,
		// ── Phase 3 tables ────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS waitlist_entries (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT NOT NULL,
			service_id INT,
			preferred_day_of_week TINYINT COMMENT '0=Sun..6=Sat, NULL=any',
			preferred_time_start VARCHAR(5),
			preferred_time_end VARCHAR(5),
			notes TEXT,
			status ENUM('waiting','notified','booked','expired') DEFAULT 'waiting',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS ai_chat_sessions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			user_id INT NOT NULL,
			messages JSON NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		// ── Phase 4: Packages ─────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS packages (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			price DECIMAL(10,2) NOT NULL DEFAULT 0,
			validity_days INT NOT NULL DEFAULT 365,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS package_services (
			id INT PRIMARY KEY AUTO_INCREMENT,
			package_id INT NOT NULL,
			service_id INT NOT NULL,
			qty INT NOT NULL DEFAULT 1,
			UNIQUE KEY uq_pkg_svc (package_id, service_id)
		)`,
		`CREATE TABLE IF NOT EXISTS client_packages (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT NOT NULL,
			package_id INT NOT NULL,
			purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
			purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP NULL,
			status ENUM('active','exhausted','expired','cancelled') DEFAULT 'active'
		)`,
		`CREATE TABLE IF NOT EXISTS package_redemptions (
			id INT PRIMARY KEY AUTO_INCREMENT,
			client_package_id INT NOT NULL,
			service_id INT NOT NULL,
			appointment_id INT,
			transaction_id INT,
			redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			notes VARCHAR(255)
		)`,
		`CREATE TABLE IF NOT EXISTS membership_plan_services (
			id INT PRIMARY KEY AUTO_INCREMENT,
			plan_id INT NOT NULL,
			service_id INT NOT NULL,
			UNIQUE KEY uq_mps (plan_id, service_id)
		)`,
		`INSERT IGNORE INTO packages (id, salon_id, name, description, price, validity_days) VALUES
			(1, 1, 'Colour Care Bundle', '3 Full Colour sessions at a discounted rate', 380.00, 180),
			(2, 1, 'Haircut Series', '5 Haircuts for the price of 4', 180.00, 365),
			(3, 1, 'Treatment Package', '4 Deep Conditioning treatments', 180.00, 120)`,
		// ── Client Segments ───────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS client_segments (
			id          INT PRIMARY KEY AUTO_INCREMENT,
			salon_id    INT NOT NULL,
			seg_key     VARCHAR(50) DEFAULT NULL COMMENT 'null for custom segments',
			name        VARCHAR(255) NOT NULL,
			description TEXT,
			seg_type    ENUM('standard','custom') NOT NULL DEFAULT 'custom',
			icon        VARCHAR(50) DEFAULT 'users',
			rules       TEXT DEFAULT NULL COMMENT 'JSON array of rules for custom segments',
			sort_order  INT DEFAULT 0,
			created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE KEY uq_salon_key (salon_id, seg_key),
			INDEX idx_salon (salon_id)
		)`,
		// ── Loyalty v2 tables ─────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS loyalty_settings (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL UNIQUE,
			earn_per_dollar DECIMAL(6,2) DEFAULT 1.00,
			earn_per_visit INT DEFAULT 0,
			earn_per_review INT DEFAULT 0,
			earn_per_booking INT DEFAULT 0,
			min_spend_threshold DECIMAL(10,2) DEFAULT 0,
			points_expiry_months INT DEFAULT 12,
			eligible_all_services TINYINT DEFAULT 1,
			terms TEXT DEFAULT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS loyalty_rewards (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			name VARCHAR(255) NOT NULL,
			reward_type ENUM('amount_off','percent_off','free_service','free_product') NOT NULL,
			value DECIMAL(10,2) NOT NULL DEFAULT 0,
			trigger_type ENUM('points','tier','referral','manual') NOT NULL DEFAULT 'points',
			trigger_value INT DEFAULT 0,
			service_id INT DEFAULT NULL,
			product_id INT DEFAULT NULL,
			is_active TINYINT DEFAULT 1,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS client_rewards (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			client_id INT NOT NULL,
			reward_id INT NOT NULL,
			status ENUM('available','used','expired') DEFAULT 'available',
			granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			used_at TIMESTAMP NULL,
			reference_id INT DEFAULT NULL,
			INDEX idx_client (salon_id, client_id),
			INDEX idx_status (status)
		)`,
		`CREATE TABLE IF NOT EXISTS loyalty_referrals (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			referrer_client_id INT NOT NULL,
			referred_client_id INT NOT NULL,
			status ENUM('pending','completed') DEFAULT 'pending',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE KEY uq_referred (salon_id, referred_client_id)
		)`,
		`CREATE TABLE IF NOT EXISTS gift_cards (
			id INT PRIMARY KEY AUTO_INCREMENT,
			salon_id INT NOT NULL,
			code VARCHAR(20) NOT NULL UNIQUE,
			initial_amount DECIMAL(10,2) NOT NULL,
			redeemed_amount DECIMAL(10,2) DEFAULT 0,
			status ENUM('active','redeemed','expired') DEFAULT 'active',
			recipient_name VARCHAR(255) DEFAULT '',
			recipient_email VARCHAR(255) DEFAULT '',
			sender_name VARCHAR(255) DEFAULT '',
			message TEXT,
			issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_gc_salon (salon_id),
			INDEX idx_gc_code (code)
		)`,
		`CREATE TABLE IF NOT EXISTS resources (
			id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
			salon_id INT UNSIGNED NOT NULL,
			name VARCHAR(120) NOT NULL,
			icon VARCHAR(40) DEFAULT 'armchair' COMMENT 'chair, room, door, bed, etc.',
			is_active TINYINT(1) DEFAULT 1,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_resources_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS staff_service_commissions (
			staff_id INT UNSIGNED NOT NULL,
			service_id INT UNSIGNED NOT NULL,
			commission_pct DECIMAL(5,2) NOT NULL,
			PRIMARY KEY (staff_id, service_id)
		)`,
		`CREATE TABLE IF NOT EXISTS shifts (
			id         INT PRIMARY KEY AUTO_INCREMENT,
			salon_id   INT NOT NULL,
			staff_id   INT NOT NULL,
			shift_date DATE NOT NULL,
			start_time VARCHAR(5) NOT NULL DEFAULT '09:00',
			end_time   VARCHAR(5) NOT NULL DEFAULT '18:00',
			notes      VARCHAR(500) DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_salon_date (salon_id, shift_date)
		)`,
		`CREATE TABLE IF NOT EXISTS review_requests (
			id             INT PRIMARY KEY AUTO_INCREMENT,
			salon_id       INT NOT NULL,
			client_id      INT NOT NULL,
			transaction_id INT NOT NULL,
			token          VARCHAR(64) NOT NULL UNIQUE,
			channel        ENUM('sms','whatsapp') NOT NULL DEFAULT 'sms',
			status         ENUM('scheduled','sent','failed') NOT NULL DEFAULT 'scheduled',
			send_after     DATETIME NOT NULL,
			sent_at        DATETIME NULL,
			created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_rr_send (status, send_after),
			INDEX idx_rr_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS review_responses (
			id                INT PRIMARY KEY AUTO_INCREMENT,
			review_request_id INT NOT NULL,
			salon_id          INT NOT NULL,
			client_id         INT NOT NULL,
			rating            TINYINT NOT NULL,
			comment           TEXT,
			is_public         TINYINT DEFAULT 0,
			created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_resp_salon (salon_id),
			INDEX idx_resp_req (review_request_id)
		)`,
		// ── Purchases / Procurement ───────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS suppliers (
			id           INT PRIMARY KEY AUTO_INCREMENT,
			salon_id     INT NOT NULL,
			name         VARCHAR(255) NOT NULL,
			contact_name VARCHAR(255) DEFAULT '',
			phone        VARCHAR(30) DEFAULT '',
			email        VARCHAR(255) DEFAULT '',
			address      TEXT,
			payment_terms VARCHAR(100) DEFAULT 'Net 30',
			notes        TEXT,
			is_active    TINYINT DEFAULT 1,
			created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_sup_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS purchase_orders (
			id            INT PRIMARY KEY AUTO_INCREMENT,
			salon_id      INT NOT NULL,
			supplier_id   INT NOT NULL,
			po_number     VARCHAR(50) NOT NULL,
			status        ENUM('draft','ordered','partial','received','cancelled') DEFAULT 'draft',
			order_date    DATE NOT NULL,
			expected_date DATE,
			notes         TEXT,
			subtotal      DECIMAL(10,2) DEFAULT 0,
			tax_amount    DECIMAL(10,2) DEFAULT 0,
			total_amount  DECIMAL(10,2) DEFAULT 0,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_po_salon (salon_id),
			INDEX idx_po_supplier (supplier_id)
		)`,
		`CREATE TABLE IF NOT EXISTS purchase_order_items (
			id                INT PRIMARY KEY AUTO_INCREMENT,
			po_id             INT NOT NULL,
			inventory_item_id INT,
			item_name         VARCHAR(255) NOT NULL,
			sku               VARCHAR(100) DEFAULT '',
			unit              VARCHAR(50) DEFAULT 'unit',
			qty_ordered       DECIMAL(10,2) NOT NULL,
			qty_received      DECIMAL(10,2) DEFAULT 0,
			unit_cost         DECIMAL(10,2) NOT NULL,
			total_cost        DECIMAL(10,2) NOT NULL,
			INDEX idx_poi_po (po_id)
		)`,
		`CREATE TABLE IF NOT EXISTS stocktakes (
			id           INT PRIMARY KEY AUTO_INCREMENT,
			salon_id     INT NOT NULL,
			name         VARCHAR(255) NOT NULL,
			status       ENUM('draft','in_progress','completed') DEFAULT 'draft',
			notes        TEXT,
			completed_at TIMESTAMP NULL,
			created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_st_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS stocktake_items (
			id                 INT PRIMARY KEY AUTO_INCREMENT,
			stocktake_id       INT NOT NULL,
			inventory_item_id  INT NOT NULL,
			product_name       VARCHAR(255) NOT NULL,
			sku                VARCHAR(100) DEFAULT '',
			expected_qty       INT NOT NULL DEFAULT 0,
			counted_qty        INT NULL,
			INDEX idx_sti_stocktake (stocktake_id),
			FOREIGN KEY (stocktake_id) REFERENCES stocktakes(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS direct_purchases (
			id            INT PRIMARY KEY AUTO_INCREMENT,
			salon_id      INT NOT NULL,
			reference     VARCHAR(100) DEFAULT '',
			supplier_name VARCHAR(255) DEFAULT '',
			purchase_date DATE NOT NULL,
			notes         TEXT,
			subtotal      DECIMAL(10,2) DEFAULT 0,
			tax_amount    DECIMAL(10,2) DEFAULT 0,
			total_amount  DECIMAL(10,2) DEFAULT 0,
			created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_dp_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS direct_purchase_items (
			id                  INT PRIMARY KEY AUTO_INCREMENT,
			direct_purchase_id  INT NOT NULL,
			inventory_item_id   INT,
			item_name           VARCHAR(255) NOT NULL,
			sku                 VARCHAR(100) DEFAULT '',
			unit                VARCHAR(50) DEFAULT 'unit',
			qty                 DECIMAL(10,2) NOT NULL,
			unit_cost           DECIMAL(10,2) NOT NULL,
			total_cost          DECIMAL(10,2) NOT NULL,
			INDEX idx_dpi_dp (direct_purchase_id)
		)`,
		// ── Stock Movements ───────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS stock_movements (
			id                INT PRIMARY KEY AUTO_INCREMENT,
			salon_id          INT NOT NULL,
			inventory_item_id INT NOT NULL,
			movement_type     ENUM('purchase','sale','adjustment','wastage','stocktake') NOT NULL,
			delta             DECIMAL(10,3) NOT NULL,
			qty_before        DECIMAL(10,3) NOT NULL DEFAULT 0,
			qty_after         DECIMAL(10,3) NOT NULL DEFAULT 0,
			reason            VARCHAR(500) DEFAULT '',
			reference         VARCHAR(255) DEFAULT '',
			cost_per_unit     DECIMAL(10,4) DEFAULT 0,
			created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_sm_item (salon_id, inventory_item_id),
			INDEX idx_sm_type (salon_id, movement_type),
			INDEX idx_sm_date (salon_id, created_at)
		)`,
		// ── Pay Runs ─────────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS payruns (
			id           INT PRIMARY KEY AUTO_INCREMENT,
			salon_id     INT NOT NULL,
			period_from  DATE NOT NULL,
			period_to    DATE NOT NULL,
			status       ENUM('draft','pending','completed') DEFAULT 'draft',
			total_amount DECIMAL(10,2) DEFAULT 0,
			created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			notes        TEXT,
			INDEX idx_pr_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS payrun_items (
			id           INT PRIMARY KEY AUTO_INCREMENT,
			payrun_id    INT NOT NULL,
			staff_id     INT NOT NULL,
			staff_name   VARCHAR(255),
			hours_worked DECIMAL(8,2) DEFAULT 0,
			hourly_rate  DECIMAL(8,2) DEFAULT 0,
			base_pay     DECIMAL(10,2) DEFAULT 0,
			commission   DECIMAL(10,2) DEFAULT 0,
			tips         DECIMAL(10,2) DEFAULT 0,
			total_pay    DECIMAL(10,2) DEFAULT 0,
			INDEX idx_pri_payrun (payrun_id)
		)`,
		// ── Staff breaks (auto-logged from kiosk status toggle) ────────────────
		`CREATE TABLE IF NOT EXISTS staff_breaks (
			id         INT PRIMARY KEY AUTO_INCREMENT,
			salon_id   INT NOT NULL,
			staff_id   INT NOT NULL,
			start_at   DATETIME NOT NULL,
			end_at     DATETIME NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_sb_salon_staff (salon_id, staff_id),
			INDEX idx_sb_open (staff_id, end_at)
		)`,
		// ── Team time off ────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS time_off_requests (
			id         INT PRIMARY KEY AUTO_INCREMENT,
			salon_id   INT NOT NULL,
			staff_id   INT NOT NULL,
			start_date DATE NOT NULL,
			end_date   DATE NOT NULL,
			reason     VARCHAR(255) DEFAULT '',
			status     ENUM('pending','approved','rejected') DEFAULT 'approved',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_tor_salon_dates (salon_id, start_date, end_date)
		)`,
		// ── Fee deductions applied to staff earnings ────────────────────────────
		`CREATE TABLE IF NOT EXISTS fee_deductions (
			id         INT PRIMARY KEY AUTO_INCREMENT,
			salon_id   INT NOT NULL,
			staff_id   INT NOT NULL,
			amount     DECIMAL(10,2) NOT NULL,
			reason     VARCHAR(255) DEFAULT '',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_fd_salon_staff (salon_id, staff_id),
			INDEX idx_fd_created (created_at)
		)`,
		// ── SMS Jobs ─────────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS sms_jobs (
			id             INT PRIMARY KEY AUTO_INCREMENT,
			salon_id       INT NOT NULL,
			appointment_id INT,
			client_id      INT,
			job_type       VARCHAR(50) NOT NULL COMMENT 'reminder_48h, reminder_3h, gap_fill',
			phone          VARCHAR(30) NOT NULL,
			status         ENUM('sent','failed') NOT NULL DEFAULT 'sent',
			sent_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_sms_appt (appointment_id, job_type),
			INDEX idx_sms_salon (salon_id)
		)`,
		// ── Intake Forms ─────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS forms (
		    id         INT PRIMARY KEY AUTO_INCREMENT,
		    salon_id   INT NOT NULL,
		    name       VARCHAR(255) NOT NULL,
		    fields     JSON NOT NULL,
		    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		    INDEX idx_forms_salon (salon_id)
		)`,
		`CREATE TABLE IF NOT EXISTS form_responses (
		    id           INT PRIMARY KEY AUTO_INCREMENT,
		    form_id      INT NOT NULL,
		    client_id    INT,
		    responses    JSON NOT NULL,
		    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		    INDEX idx_fr_form (form_id)
		)`,
		// ── Walk-in Queue ─────────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS walk_in_queue (
		    id                   INT PRIMARY KEY AUTO_INCREMENT,
		    salon_id             INT NOT NULL,
		    client_id            INT DEFAULT NULL,
		    name                 VARCHAR(255) NOT NULL,
		    phone                VARCHAR(20) NOT NULL,
		    service_ids          TEXT,
		    service_names        TEXT,
		    preferred_staff_id   INT DEFAULT NULL,
		    preferred_staff_name VARCHAR(255) DEFAULT '',
		    assigned_staff_id    INT DEFAULT NULL,
		    assigned_staff_name  VARCHAR(255) DEFAULT '',
		    status               ENUM('waiting','in_service','completed','cancelled','no_show') DEFAULT 'waiting',
		    notes                TEXT,
		    checked_in_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		    started_at           TIMESTAMP NULL,
		    completed_at         TIMESTAMP NULL,
		    INDEX idx_salon_status (salon_id, status),
		    INDEX idx_salon_date   (salon_id, checked_in_at)
		)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}

	// Safe column additions (compatible with MySQL 5.7+)
	colMigrations := []struct{ table, column, def string }{
		{"clients",           "total_spend",              "DECIMAL(10,2) DEFAULT 0"},
		{"clients",           "last_visit_at",            "TIMESTAMP NULL"},
		{"transactions",      "staff_id",                 "INT DEFAULT NULL"},
		{"membership_plans",  "color",                    "VARCHAR(20) DEFAULT '#0D9488'"},
		{"membership_plans",  "payment_type",             "ENUM('one_time','recurring') DEFAULT 'recurring'"},
		{"membership_plans",  "sessions_type",            "ENUM('limited','unlimited') DEFAULT 'unlimited'"},
		{"membership_plans",  "sessions_count",           "INT DEFAULT 0"},
		{"membership_plans",  "validity_days",            "INT DEFAULT 30"},
		{"membership_plans",  "payment_frequency",        "ENUM('daily','weekly','fortnightly','monthly','quarterly','annual') DEFAULT 'monthly'"},
		{"membership_plans",  "enable_online_sales",      "BOOLEAN DEFAULT TRUE"},
		{"membership_plans",  "enable_online_redemption", "BOOLEAN DEFAULT TRUE"},
		{"membership_plans",  "terms_conditions",         "TEXT"},
		{"services",          "price_type",               "ENUM('fixed','from','free') DEFAULT 'fixed'"},
		{"inventory_items",   "supplier",                  "VARCHAR(255) DEFAULT ''"},
		{"inventory_items",   "image_url",                 "VARCHAR(512) DEFAULT ''"},
		{"clients",           "date_of_birth",             "DATE NULL"},
		{"loyalty_tiers",     "icon",                      "VARCHAR(50) DEFAULT 'award'"},
		{"loyalty_tiers",     "qualify_by",                "ENUM('points','spend') DEFAULT 'points'"},
		{"loyalty_tiers",     "duration_type",             "ENUM('calendar','rolling') DEFAULT 'rolling'"},
		{"loyalty_settings",  "earn_per_visit_mode",       "ENUM('every','first_only') DEFAULT 'every'"},
		{"loyalty_settings",  "earn_per_booking_mode",     "ENUM('every','first_only') DEFAULT 'every'"},
		{"appointments",      "checked_in_at",             "TIMESTAMP NULL"},
		{"appointments",      "checked_out_at",            "TIMESTAMP NULL"},
		// Review automation settings on salon_settings
		{"salon_settings",   "review_enabled",            "TINYINT DEFAULT 0"},
		{"salon_settings",   "review_channel",            "ENUM('sms','whatsapp') DEFAULT 'sms'"},
		{"salon_settings",   "review_delay_hours",        "INT DEFAULT 2"},
		{"salon_settings",   "yelp_url",                  "VARCHAR(500) DEFAULT ''"},
		{"salon_settings",   "google_review_url",         "VARCHAR(500) DEFAULT ''"},
		// Customer portal auth
		{"clients",          "password_hash",              "VARCHAR(255) NULL"},
		{"clients",          "portal_enabled",             "TINYINT DEFAULT 0"},
		// Deposit capture
		{"appointments",     "payment_intent_id",          "VARCHAR(255) DEFAULT ''"},
		{"appointments",     "deposit_charged",            "TINYINT DEFAULT 0"},
		// Recurring bookings
		{"appointments",     "recurring_frequency",        "VARCHAR(20) DEFAULT NULL COMMENT 'Weekly,Every 2 Weeks,Monthly'"},
		{"appointments",     "recurring_confirmed",        "TINYINT DEFAULT 0 COMMENT '1 = next booking already confirmed at kiosk'"},
		// Staff kiosk availability
		{"staff_profiles",   "kiosk_status",               "VARCHAR(20) DEFAULT 'available' COMMENT 'available,busy,break'"},
		// Extended client profile fields (imported from Fresha export)
		{"clients", "fresha_id",        "VARCHAR(30) NULL COMMENT 'External Fresha client ID'"},
		{"clients", "marketing_consent","TINYINT DEFAULT 0 COMMENT 'General email/marketing opt-in'"},
		{"clients", "telephone",        "VARCHAR(25) NULL COMMENT 'Secondary/landline phone'"},
		{"clients", "address_line1",    "VARCHAR(255) NULL"},
		{"clients", "address_line2",    "VARCHAR(100) NULL COMMENT 'Apartment / Suite'"},
		{"clients", "address_area",     "VARCHAR(100) NULL COMMENT 'Neighbourhood / Area'"},
		{"clients", "address_city",     "VARCHAR(100) NULL"},
		{"clients", "address_state",    "VARCHAR(60) NULL"},
		{"clients", "address_postcode", "VARCHAR(20) NULL"},
		{"clients", "staff_alert",      "TEXT NULL COMMENT 'Shown prominently to staff during booking'"},
		{"clients", "tags",             "VARCHAR(500) NULL COMMENT 'Comma-separated client tags'"},
		{"clients", "avatar_url",       "VARCHAR(512) NULL COMMENT 'Permanent local avatar path e.g. /static/avatars/123.jpg'"},
		// Staff hourly rate for pay run calculations
		{"staff_profiles", "hourly_rate", "DECIMAL(8,2) DEFAULT 0 COMMENT 'Base hourly rate for payroll'"},
		// Owner reply to a client review
		{"review_responses", "owner_response", "TEXT NULL COMMENT 'Owner public reply to the review'"},
		// Optional physical resource (room/chair/station) booked for an appointment
		{"appointments", "resource_id", "INT UNSIGNED NULL"},
	}
	for _, m := range colMigrations {
		if err := addColumnIfNotExists(db, m.table, m.column, m.def); err != nil {
			return err
		}
	}

	// Widen gift_cards.status to support customer self-purchase requests that
	// need staff to confirm payment before the card becomes redeemable.
	if _, err := db.Exec(`
		ALTER TABLE gift_cards
		MODIFY COLUMN status ENUM('active','redeemed','expired','pending_payment') DEFAULT 'active'`); err != nil {
		return fmt.Errorf("widen gift_cards.status: %w", err)
	}

	// Widen appointments.source to include 'reception', the default used for
	// appointments booked by staff from the admin calendar.
	if _, err := db.Exec(`
		ALTER TABLE appointments
		MODIFY COLUMN source ENUM('walk_in','online','phone','google_reserve','instagram','reception') DEFAULT 'online'`); err != nil {
		return fmt.Errorf("widen appointments.source: %w", err)
	}

	// ── clients new columns ───────────────────────────────────────────────
	for _, m := range []struct{ col, def string }{
		{"anniversary", "DATE NULL"},
		{"preferences", "TEXT NULL"},
	} {
		if err := addColumnIfNotExists(db, "clients", m.col, m.def); err != nil {
			return err
		}
	}

	// ── service_addons table ──────────────────────────────────────────────
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS service_addons (
		id          INT PRIMARY KEY AUTO_INCREMENT,
		salon_id    INT NOT NULL,
		service_id  INT NOT NULL,
		name        VARCHAR(255) NOT NULL,
		price       DECIMAL(10,2) NOT NULL DEFAULT 0,
		duration_min INT NOT NULL DEFAULT 0,
		is_active   BOOLEAN NOT NULL DEFAULT TRUE,
		created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		INDEX idx_sa_service (service_id)
	)`); err != nil {
		return fmt.Errorf("create service_addons: %w", err)
	}

	// ── salon_settings new columns ───────────────────────────────────────
	for _, m := range []struct{ col, def string }{
		{"logo_url", "VARCHAR(500) NULL"},
		{"abn", "VARCHAR(14) NULL"},
		{"gst_registered", "BOOLEAN NOT NULL DEFAULT FALSE"},
		{"website_url", "VARCHAR(255) NULL"},
		{"instagram_url", "VARCHAR(255) NULL"},
		{"facebook_url", "VARCHAR(255) NULL"},
	} {
		if err := addColumnIfNotExists(db, "salon_settings", m.col, m.def); err != nil {
			return err
		}
	}

	// ── salon_holidays table ──────────────────────────────────────────────
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS salon_holidays (
		id         INT PRIMARY KEY AUTO_INCREMENT,
		salon_id   INT NOT NULL,
		date       DATE NOT NULL,
		name       VARCHAR(255) NOT NULL,
		repeat_yearly BOOLEAN NOT NULL DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE KEY uq_salon_holiday (salon_id, date)
	)`); err != nil {
		return fmt.Errorf("create salon_holidays: %w", err)
	}

	// Add business_id to salons (safe — no-op if column already exists)
	if err := addColumnIfNotExists(db, "salons", "business_id", "INT UNSIGNED NULL"); err != nil {
		return err
	}

	// Seed the default business for existing installations
	if _, err := db.Exec(`
		INSERT IGNORE INTO businesses (id, name, timezone, currency, country)
		VALUES (1, 'Kriyansh Beauty Bar', 'Australia/Melbourne', 'AUD', 'AU')`); err != nil {
		return fmt.Errorf("seed default business: %w", err)
	}

	// Link all unlinked salons to the default business
	if _, err := db.Exec(`UPDATE salons SET business_id = 1 WHERE business_id IS NULL`); err != nil {
		return fmt.Errorf("link salons to default business: %w", err)
	}

	// ── PAX terminal config on salon_settings ────────────────────────────────────
	for _, m := range []struct{ col, def string }{
		{"pax_terminal_ip",   "VARCHAR(45) NULL COMMENT 'PAX terminal LAN IP e.g. 192.168.1.100'"},
		{"pax_terminal_port", "SMALLINT UNSIGNED NOT NULL DEFAULT 10009 COMMENT 'PAX POSLINK HTTP port'"},
	} {
		if err := addColumnIfNotExists(db, "salon_settings", m.col, m.def); err != nil {
			return err
		}
	}

	// ── Widen transactions.payment_method to include gift_card, upi, qr, advance ─
	if _, err := db.Exec(`
		ALTER TABLE transactions
		MODIFY COLUMN payment_method ENUM('card','cash','tap','gift_card','upi','qr','advance','split') NOT NULL DEFAULT 'card'`); err != nil {
		return fmt.Errorf("widen transactions.payment_method: %w", err)
	}

	// ── Add product_id to transaction_items ────────────────────────────────────
	if err := addColumnIfNotExists(db, "transaction_items", "product_id", "INT NULL COMMENT 'inventory_items.id if this line is a product'"); err != nil {
		return err
	}

	// ── split_payment_method on transactions (second method for split payments) ─
	if err := addColumnIfNotExists(db, "transactions", "split_payment_method", "ENUM('card','cash','tap','gift_card','upi','qr') NULL"); err != nil {
		return err
	}
	if err := addColumnIfNotExists(db, "transactions", "split_amount", "DECIMAL(10,2) NULL COMMENT 'Amount paid via second method'"); err != nil {
		return err
	}

	// ── Membership expiry tracking ───────────────────────────────────────────
	if err := addColumnIfNotExists(db, "client_memberships", "expires_at", "DATE NULL COMMENT 'Hard expiry date — auto-set from billing_cycle on assign/renew'"); err != nil {
		return err
	}

	slog.Info("database migrations applied")
	return nil
}
