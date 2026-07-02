-- ============================================================
--  Salon OS — Phase 1 Database Schema
--  MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS salonos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE salonos;

-- ────────────────────────────────────────
-- SALONS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salons (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  slug          VARCHAR(60)   NOT NULL UNIQUE,
  phone         VARCHAR(20),
  email         VARCHAR(120),
  address       TEXT,
  city          VARCHAR(80)   DEFAULT 'Los Angeles',
  state         VARCHAR(10)   DEFAULT 'CA',
  zip           VARCHAR(10),
  timezone      VARCHAR(50)   DEFAULT 'America/Los_Angeles',
  tax_rate      DECIMAL(5,4)  DEFAULT 0.1025,  -- LA county default
  currency      CHAR(3)       DEFAULT 'USD',
  logo_url      VARCHAR(255),
  is_active     TINYINT(1)    DEFAULT 1,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────
-- SALON HOURS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salon_hours (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id    INT UNSIGNED NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun,1=Mon,...,6=Sat',
  open_time   TIME,
  close_time  TIME,
  is_closed   TINYINT(1) DEFAULT 0,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- USERS  (staff / admins)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id      INT UNSIGNED NOT NULL,
  first_name    VARCHAR(60)  NOT NULL,
  last_name     VARCHAR(60)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('owner','manager','receptionist','stylist') NOT NULL DEFAULT 'stylist',
  avatar_url    VARCHAR(255),
  is_active     TINYINT(1)   DEFAULT 1,
  last_login_at DATETIME,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email_salon (email, salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- REFRESH TOKENS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- SERVICE CATEGORIES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_categories (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id  INT UNSIGNED NOT NULL,
  name      VARCHAR(80)  NOT NULL,
  color     VARCHAR(7)   DEFAULT '#0D9488',
  sort_order TINYINT     DEFAULT 0,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- SERVICES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id      INT UNSIGNED  NOT NULL,
  category_id   INT UNSIGNED,
  name          VARCHAR(120)  NOT NULL,
  description   TEXT,
  duration_min  SMALLINT      NOT NULL DEFAULT 60  COMMENT 'minutes',
  price         DECIMAL(8,2)  NOT NULL,
  deposit_amt   DECIMAL(8,2)  DEFAULT 0.00,
  gender        ENUM('any','female','male') DEFAULT 'any',
  is_active     TINYINT(1)    DEFAULT 1,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id)    REFERENCES salons(id)             ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────
-- STAFF PROFILES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL UNIQUE,
  salon_id        INT UNSIGNED  NOT NULL,
  bio             TEXT,
  specializations VARCHAR(255),
  commission_pct  DECIMAL(5,2)  DEFAULT 0.00,
  accepts_online  TINYINT(1)    DEFAULT 1,
  color           VARCHAR(7)    DEFAULT '#0D9488',
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- STAFF SCHEDULES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_schedules (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  staff_id    INT UNSIGNED NOT NULL,
  day_of_week TINYINT      NOT NULL COMMENT '0=Sun,...,6=Sat',
  start_time  TIME,
  end_time    TIME,
  is_off      TINYINT(1)   DEFAULT 0,
  FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE
);

-- Staff can perform specific services
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id   INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (staff_id, service_id),
  FOREIGN KEY (staff_id)   REFERENCES staff_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id)       ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- CLIENTS (CRM)
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id        INT UNSIGNED  NOT NULL,
  first_name      VARCHAR(60)   NOT NULL,
  last_name       VARCHAR(60)   NOT NULL,
  email           VARCHAR(120),
  phone           VARCHAR(20)   NOT NULL,
  dob             DATE,
  gender          ENUM('female','male','other','prefer_not'),
  notes           TEXT,
  referral_source VARCHAR(60),
  loyalty_points  INT           DEFAULT 0,
  total_visits    INT           DEFAULT 0,
  total_spend     DECIMAL(10,2) DEFAULT 0.00,
  sms_consent     TINYINT(1)    DEFAULT 0  COMMENT 'TCPA consent',
  is_active       TINYINT(1)    DEFAULT 1,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_phone_salon (phone, salon_id),
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- APPOINTMENTS
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id        INT UNSIGNED  NOT NULL,
  client_id       INT UNSIGNED  NOT NULL,
  staff_id        INT UNSIGNED  NOT NULL,
  start_at        DATETIME      NOT NULL,
  end_at          DATETIME      NOT NULL,
  status          ENUM('pending','confirmed','checked_in','in_service','completed','cancelled','no_show')
                                NOT NULL DEFAULT 'pending',
  notes           TEXT,
  deposit_paid    DECIMAL(8,2)  DEFAULT 0.00,
  deposit_txn_id  VARCHAR(120)  COMMENT 'Stripe payment intent',
  reminder_48h    TINYINT(1)    DEFAULT 0,
  reminder_3h     TINYINT(1)    DEFAULT 0,
  source          ENUM('walk_in','online','phone','google_reserve','instagram') DEFAULT 'online',
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id)  REFERENCES salons(id)         ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id)        ON DELETE CASCADE,
  FOREIGN KEY (staff_id)  REFERENCES staff_profiles(id) ON DELETE CASCADE
);

-- Services booked per appointment
CREATE TABLE IF NOT EXISTS appointment_services (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT UNSIGNED  NOT NULL,
  service_id     INT UNSIGNED  NOT NULL,
  price          DECIMAL(8,2)  NOT NULL,
  duration_min   SMALLINT      NOT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id)     REFERENCES services(id)     ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- PAYMENTS / INVOICES
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id        INT UNSIGNED  NOT NULL,
  appointment_id  INT UNSIGNED,
  client_id       INT UNSIGNED  NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  tax_amount      DECIMAL(10,2) DEFAULT 0.00,
  tip_amount      DECIMAL(10,2) DEFAULT 0.00,
  discount_amt    DECIMAL(10,2) DEFAULT 0.00,
  loyalty_redeemed DECIMAL(10,2) DEFAULT 0.00,
  total           DECIMAL(10,2) NOT NULL,
  status          ENUM('draft','paid','refunded','partial_refund') DEFAULT 'draft',
  stripe_pi_id    VARCHAR(120)  COMMENT 'Stripe Payment Intent ID',
  payment_method  ENUM('card','cash','apple_pay','google_pay','terminal') DEFAULT 'card',
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id)        REFERENCES salons(id)       ON DELETE CASCADE,
  FOREIGN KEY (appointment_id)  REFERENCES appointments(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id)       REFERENCES clients(id)      ON DELETE CASCADE
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT UNSIGNED  NOT NULL,
  description VARCHAR(120)  NOT NULL,
  quantity    TINYINT       DEFAULT 1,
  unit_price  DECIMAL(8,2)  NOT NULL,
  total       DECIMAL(8,2)  NOT NULL,
  item_type   ENUM('service','product','tip','discount') DEFAULT 'service',
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────
-- SMS REMINDERS QUEUE
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_jobs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id        INT UNSIGNED  NOT NULL,
  appointment_id  INT UNSIGNED,
  to_phone        VARCHAR(20)   NOT NULL,
  message         TEXT          NOT NULL,
  job_type        ENUM('reminder_48h','reminder_3h','no_show_winback','marketing') NOT NULL,
  status          ENUM('pending','sent','failed') DEFAULT 'pending',
  scheduled_at    DATETIME      NOT NULL,
  sent_at         DATETIME,
  twilio_sid      VARCHAR(60),
  error_msg       VARCHAR(255),
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salon_id)       REFERENCES salons(id)       ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────
-- AUDIT LOG
-- ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  salon_id    INT UNSIGNED,
  user_id     INT UNSIGNED,
  action      VARCHAR(80)  NOT NULL,
  entity      VARCHAR(40),
  entity_id   INT UNSIGNED,
  meta        JSON,
  ip_addr     VARCHAR(45),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────
-- SEED DATA
-- ────────────────────────────────────────
INSERT INTO salons (name, slug, phone, email, address, city, state, zip) VALUES
('Kriyansh Salon', 'kriyansh', '+1-310-555-0100', 'hello@kriyansh.com',
 '9150 Wilshire Blvd', 'Beverly Hills', 'CA', '90210');

INSERT INTO salon_hours (salon_id, day_of_week, open_time, close_time) VALUES
(1, 0, '10:00:00', '18:00:00'),
(1, 1, '09:00:00', '20:00:00'),
(1, 2, '09:00:00', '20:00:00'),
(1, 3, '09:00:00', '20:00:00'),
(1, 4, '09:00:00', '20:00:00'),
(1, 5, '09:00:00', '20:00:00'),
(1, 6, '09:00:00', '19:00:00');

INSERT INTO service_categories (salon_id, name, color) VALUES
(1, 'Hair Color',   '#0D9488'),
(1, 'Haircut',      '#7C3AED'),
(1, 'Treatment',    '#DB2777'),
(1, 'Styling',      '#F59E0B');

INSERT INTO services (salon_id, category_id, name, duration_min, price, deposit_amt) VALUES
(1, 1, 'Balayage',          150, 220.00, 30.00),
(1, 1, 'Full Color',        120, 150.00, 20.00),
(1, 1, 'Highlights',         90, 140.00, 20.00),
(1, 2, 'Haircut & Blowout',  60,  85.00,  0.00),
(1, 2, 'Mens Cut',           30,  45.00,  0.00),
(1, 3, 'Keratin Treatment', 180, 280.00, 50.00),
(1, 3, 'Deep Conditioning',  45,  55.00,  0.00),
(1, 4, 'Blowout',            45,  65.00,  0.00),
(1, 4, 'Updo / Event Style', 90, 120.00, 20.00);
