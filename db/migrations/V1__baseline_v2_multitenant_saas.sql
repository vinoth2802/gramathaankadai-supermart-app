-- ════════════════════════════════════════════════════════════════════
-- V1 — Baseline schema: SuperMart Platform v2 (Multi-Tenant SaaS) — MySQL 8
-- Generated from docs/datamodel-v2.dbml. Greenfield baseline.
--
-- MySQL dialect notes:
--   • BIGINT AUTO_INCREMENT surrogate PKs.
--   • tenant_id on every business table → tenants(id) ON DELETE CASCADE.
--   • Foreign keys are TABLE-LEVEL constraints — MySQL silently ignores
--     column-level REFERENCES.
--   • TIMESTAMPTZ→DATETIME, JSONB→JSON, now()→CURRENT_TIMESTAMP,
--     DEFAULT (CURRENT_DATE) is a parenthesised expression default (8.0.13+).
--   • Engine InnoDB / charset utf8mb4 (MySQL 8 defaults).
--   • The tenants.owner_user_id ↔ app_users circular FK is added at the end.
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Platform / Control Plane
-- ─────────────────────────────────────────────

CREATE TABLE platform_users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100),
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT,
  platform_role VARCHAR(30),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plans (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(40) NOT NULL UNIQUE,
  name          VARCHAR(100),
  price_monthly DECIMAL(10,2),
  price_yearly  DECIMAL(10,2),
  currency      VARCHAR(3),
  trial_days    INT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Tenancy core
-- ─────────────────────────────────────────────

CREATE TABLE tenants (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  slug             VARCHAR(60) NOT NULL UNIQUE,
  legal_name       VARCHAR(255),
  display_name     VARCHAR(255),
  business_type    VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'trial',
  owner_user_id    BIGINT,                          -- FK added at end (circular w/ app_users)
  plan_id          BIGINT,
  country          VARCHAR(2) NOT NULL DEFAULT 'IN',
  default_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  default_timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  locale           VARCHAR(10) NOT NULL DEFAULT 'en-IN',
  onboarding_step  VARCHAR(40),
  onboarded_at     DATETIME,
  trial_ends_at    DATETIME,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
);

CREATE TABLE tenant_locations (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       VARCHAR(150),
  type       VARCHAR(20),
  address    TEXT,
  pincode    VARCHAR(10),
  state      VARCHAR(100),
  phone      VARCHAR(20),
  gstin      VARCHAR(20),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Identity & RBAC
-- ─────────────────────────────────────────────

CREATE TABLE app_roles (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  name        VARCHAR(50) NOT NULL,
  description TEXT,
  color       VARCHAR(40),
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Global permission catalog (NOT tenant-scoped)
CREATE TABLE app_permissions (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  module      VARCHAR(50) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE (module, action)
);

CREATE TABLE app_role_permissions (
  role_id       BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id)       REFERENCES app_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES app_permissions(id) ON DELETE CASCADE
);

CREATE TABLE departments (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE designations (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE employees (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id         BIGINT NOT NULL,
  employee_code     VARCHAR(50),
  name              VARCHAR(150) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  gender            VARCHAR(10),
  dob               DATE,
  designation_id    BIGINT,
  department_id     BIGINT,
  date_of_joining   DATE,
  date_of_exit      DATE,
  exit_reason       TEXT,
  salary_type       VARCHAR(20) DEFAULT 'perMonth',
  employee_type     VARCHAR(20) DEFAULT 'salaried',
  basic_salary      DECIMAL(12,2) DEFAULT 0,
  bank_account_no   VARCHAR(30),
  ifsc              VARCHAR(20),
  pan               VARCHAR(10),
  aadhaar           VARCHAR(255),                    -- encrypted/tokenized at rest
  uan               VARCHAR(20),
  esic_no           VARCHAR(20),
  emergency_contact VARCHAR(20),
  photo_url         TEXT,
  address           TEXT,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, employee_code),
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id)  REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE app_users (
  id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id              BIGINT NOT NULL,
  name                   VARCHAR(100),
  email                  VARCHAR(150) NOT NULL,
  phone                  VARCHAR(20),
  password_hash          TEXT,
  role_id                BIGINT,
  employee_id            BIGINT,
  avatar_url             TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at      DATETIME,
  must_change_password   BOOLEAN NOT NULL DEFAULT FALSE,
  password_reset_token   TEXT,
  password_reset_expires DATETIME,
  failed_login_count     INT NOT NULL DEFAULT 0,
  locked_until           DATETIME,
  last_login             DATETIME,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, email),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id)     REFERENCES app_roles(id) ON DELETE SET NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE user_sessions (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  token_hash TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at DATETIME,
  revoked_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES app_users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Platform billing / lifecycle
-- ─────────────────────────────────────────────

CREATE TABLE plan_features (
  plan_id     BIGINT NOT NULL,
  feature_key VARCHAR(60) NOT NULL,
  is_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  limit_value INT,
  PRIMARY KEY (plan_id, feature_key),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id            BIGINT NOT NULL,
  plan_id              BIGINT NOT NULL,
  status               VARCHAR(20),
  billing_cycle        VARCHAR(10),
  current_period_start DATETIME,
  current_period_end   DATETIME,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  external_ref         VARCHAR(100),
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)   REFERENCES plans(id) ON DELETE RESTRICT
);

CREATE TABLE platform_invoices (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  subscription_id BIGINT,
  invoice_no      VARCHAR(50) UNIQUE,
  amount          DECIMAL(12,2),
  tax             DECIMAL(12,2),
  total           DECIMAL(12,2),
  status          VARCHAR(20),
  period_start    DATE,
  period_end      DATE,
  due_date        DATE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE TABLE platform_payments (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id           BIGINT NOT NULL,
  platform_invoice_id BIGINT,
  amount              DECIMAL(12,2),
  gateway             VARCHAR(40),
  gateway_ref         VARCHAR(100),
  status              VARCHAR(20),
  paid_at             DATETIME,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)           REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_invoice_id) REFERENCES platform_invoices(id) ON DELETE SET NULL
);

CREATE TABLE tenant_activity (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  platform_user_id BIGINT,
  action           VARCHAR(100),
  details          JSON,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)        REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_user_id) REFERENCES platform_users(id) ON DELETE SET NULL
);

CREATE TABLE support_tickets (
  id                           BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id                    BIGINT NOT NULL,
  subject                      VARCHAR(255),
  status                       VARCHAR(20),
  priority                     VARCHAR(20),
  opened_by_user_id            BIGINT,
  assigned_to_platform_user_id BIGINT,
  created_at                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)                    REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (opened_by_user_id)            REFERENCES app_users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_platform_user_id) REFERENCES platform_users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Tenant config
-- ─────────────────────────────────────────────

CREATE TABLE tenant_settings (
  tenant_id                BIGINT PRIMARY KEY,
  invoice_prefix           VARCHAR(20),
  currency                 VARCHAR(3) DEFAULT 'INR',
  tax_method               VARCHAR(20),
  tax_default_gst_rate     DECIMAL(5,2),
  tax_round_off            BOOLEAN DEFAULT TRUE,
  tax_supply_type          VARCHAR(20),
  tax_business_type        VARCHAR(20),
  tax_composition_rate     DECIMAL(5,2),
  tcs_enabled              BOOLEAN DEFAULT FALSE,
  tds_enabled              BOOLEAN DEFAULT FALSE,
  cess_enabled             BOOLEAN DEFAULT FALSE,
  credit_days              INT DEFAULT 0,
  allow_negative_stock     BOOLEAN DEFAULT FALSE,
  decimal_qty              BOOLEAN DEFAULT TRUE,
  allow_sale_return        BOOLEAN DEFAULT TRUE,
  allow_purchase_return    BOOLEAN DEFAULT TRUE,
  default_party_type       VARCHAR(10) DEFAULT 'B2C',
  require_gstin            BOOLEAN DEFAULT FALSE,
  credit_limit             DECIMAL(12,2) DEFAULT 0,
  duplicate_check          BOOLEAN DEFAULT TRUE,
  balance_display          VARCHAR(20),
  default_uom              VARCHAR(10) DEFAULT 'PCS',
  enable_batch             BOOLEAN DEFAULT FALSE,
  enable_expiry            BOOLEAN DEFAULT FALSE,
  enable_mrp               BOOLEAN DEFAULT TRUE,
  enable_hsn               BOOLEAN DEFAULT TRUE,
  enable_location          BOOLEAN DEFAULT FALSE,
  barcode_type             VARCHAR(20),
  unit_conversion_enabled  BOOLEAN DEFAULT FALSE,
  loyalty_enabled          BOOLEAN DEFAULT FALSE,
  loyalty_points_per_rupee DECIMAL(8,4) DEFAULT 0,
  loyalty_min_points       DECIMAL(12,2) DEFAULT 0,
  loyalty_points_value     DECIMAL(8,4) DEFAULT 0,
  loyalty_expiry_days      INT,
  loyalty_max_discount     DECIMAL(12,2),
  loyalty_allow_partial    BOOLEAN DEFAULT TRUE,
  loyalty_show_on_invoice  BOOLEAN DEFAULT TRUE,
  print_flags              JSON,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE number_sequences (
  tenant_id  BIGINT NOT NULL,
  doc_type   VARCHAR(30) NOT NULL,
  prefix     VARCHAR(20),
  next_value BIGINT NOT NULL DEFAULT 1,
  padding    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, doc_type),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- HR / Payroll
-- ─────────────────────────────────────────────

CREATE TABLE salary_components (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name      VARCHAR(80),
  type      VARCHAR(10),
  calc_type VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE employee_salary_structure (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  employee_id    BIGINT NOT NULL,
  component_id   BIGINT NOT NULL,
  amount         DECIMAL(12,2),
  effective_from DATE,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id)  REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES salary_components(id) ON DELETE RESTRICT
);

CREATE TABLE shifts (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       VARCHAR(50),
  start_time TIME,
  end_time   TIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE attendance_records (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  employee_id    BIGINT NOT NULL,
  location_id    BIGINT,
  shift_id       BIGINT,
  date           DATE,
  status         VARCHAR(20),
  check_in       TIME,
  check_out      TIME,
  worked_hours   DECIMAL(5,2),
  overtime_hours DECIMAL(5,2),
  note           TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, employee_id, date),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES tenant_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (shift_id)    REFERENCES shifts(id) ON DELETE SET NULL
);

CREATE TABLE salary_records (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  employee_id     BIGINT NOT NULL,
  type            VARCHAR(20),
  amount          DECIMAL(12,2),
  previous_salary DECIMAL(12,2),
  effective_date  DATE,
  paid_date       DATE,
  pay_status      VARCHAR(20) DEFAULT 'unpaid',
  description     TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE payroll_runs (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  period_month     INT,
  period_year      INT,
  status           VARCHAR(20),
  total_gross      DECIMAL(14,2),
  total_deductions DECIMAL(14,2),
  total_net        DECIMAL(14,2),
  run_date         DATE,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE payslips (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  payroll_run_id   BIGINT NOT NULL,
  employee_id      BIGINT NOT NULL,
  gross            DECIMAL(12,2),
  total_earnings   DECIMAL(12,2),
  total_deductions DECIMAL(12,2),
  net_pay          DECIMAL(12,2),
  days_present     DECIMAL(5,1),
  days_lop         DECIMAL(5,1),
  status           VARCHAR(20),
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id)    REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE payslip_lines (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT NOT NULL,
  payslip_id   BIGINT NOT NULL,
  component_id BIGINT,
  label        VARCHAR(80),
  type         VARCHAR(10),
  amount       DECIMAL(12,2),
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (payslip_id)   REFERENCES payslips(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES salary_components(id) ON DELETE SET NULL
);

CREATE TABLE leave_types (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  name             VARCHAR(50),
  code             VARCHAR(10),
  annual_allotment INT DEFAULT 0,
  is_paid          BOOLEAN NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  color            VARCHAR(20),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE leave_requests (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id           BIGINT NOT NULL,
  employee_id         BIGINT NOT NULL,
  leave_type_id       BIGINT NOT NULL,
  from_date           DATE,
  to_date             DATE,
  days                DECIMAL(4,1),
  reason              TEXT,
  status              VARCHAR(20) DEFAULT 'pending',
  approved_by_user_id BIGINT,
  remarks             TEXT,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)           REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id)         REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id)       REFERENCES leave_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE leave_balances (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  employee_id     BIGINT NOT NULL,
  leave_type_id   BIGINT NOT NULL,
  year            INT,
  allotted        DECIMAL(5,1),
  used            DECIMAL(5,1),
  carried_forward DECIMAL(5,1),
  balance         DECIMAL(5,1),
  UNIQUE (tenant_id, employee_id, leave_type_id, year),
  FOREIGN KEY (tenant_id)     REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id)   REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
);

CREATE TABLE holiday_calendar (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  location_id BIGINT,
  date        DATE,
  name        VARCHAR(100),
  type        VARCHAR(20),
  UNIQUE (tenant_id, location_id, date),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES tenant_locations(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Reference / Config
-- ─────────────────────────────────────────────

CREATE TABLE uom_list (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  code      VARCHAR(10),
  descr     VARCHAR(100),
  UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE uom_conversions (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  base_uom_id      BIGINT NOT NULL,
  secondary_uom_id BIGINT NOT NULL,
  factor           DOUBLE DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)        REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (base_uom_id)      REFERENCES uom_list(id) ON DELETE CASCADE,
  FOREIGN KEY (secondary_uom_id) REFERENCES uom_list(id) ON DELETE CASCADE
);

CREATE TABLE categories (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE payment_modes (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name      VARCHAR(100),
  descr     VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE payment_type_settings (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  payment_mode_id BIGINT NOT NULL,
  color           VARCHAR(20),
  icon            VARCHAR(50),
  description     TEXT,
  display_order   INT DEFAULT 0,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, payment_mode_id),
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(id) ON DELETE CASCADE
);

CREATE TABLE tax_slabs (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name      VARCHAR(50),
  rate      DECIMAL(5,2),
  cgst      DECIMAL(5,2),
  sgst      DECIMAL(5,2),
  igst      DECIMAL(5,2),
  cess      DECIMAL(5,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Catalog & Inventory
-- ─────────────────────────────────────────────

CREATE TABLE products (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT NOT NULL,
  short_name         VARCHAR(255) NOT NULL,
  item_code          VARCHAR(100),
  category_id        BIGINT,
  hsn_code           VARCHAR(20),
  uom                VARCHAR(10) DEFAULT 'PCS',
  secondary_unit     VARCHAR(20),
  pcs_per_unit       INT,
  is_bulk            BOOLEAN NOT NULL DEFAULT FALSE,
  purchase_price     DECIMAL(12,2) DEFAULT 0,
  purchase_price_tax VARCHAR(10) DEFAULT 'with',
  mrp                DECIMAL(12,2) DEFAULT 0,
  sales_price        DECIMAL(12,2) DEFAULT 0,
  sales_price_tax    VARCHAR(10) DEFAULT 'with',
  wholesale_price    DECIMAL(12,2) DEFAULT 0,
  wholesale_qty      DECIMAL(12,3) DEFAULT 0,
  at_price           DECIMAL(12,2) DEFAULT 0,
  as_of_date         DATE,
  gst_rate           DECIMAL(5,2) DEFAULT 5,
  tax_slab_id        BIGINT,
  stock              DECIMAL(12,3) DEFAULT 0,
  reorder_level      DECIMAL(12,3) DEFAULT 10,
  min_stock          DECIMAL(12,3) DEFAULT 0,
  type               VARCHAR(20) DEFAULT 'Product',
  description        TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, item_code),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (tax_slab_id) REFERENCES tax_slabs(id) ON DELETE SET NULL
);

CREATE TABLE product_prices (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  product_id     BIGINT NOT NULL,
  price_tier     VARCHAR(30),
  price          DECIMAL(12,2),
  min_qty        DECIMAL(12,3),
  effective_from DATE,
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_batches (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  product_id  BIGINT NOT NULL,
  location_id BIGINT,
  batch_no    VARCHAR(50),
  mfg_date    DATE,
  expiry_date DATE,
  mrp         DECIMAL(12,2),
  qty_on_hand DECIMAL(12,3),
  UNIQUE (tenant_id, product_id, location_id, batch_no),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES tenant_locations(id) ON DELETE SET NULL
);

CREATE TABLE stock_ledger (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  product_id  BIGINT NOT NULL,
  location_id BIGINT,
  batch_id    BIGINT,
  txn_type    VARCHAR(20),
  ref_table   VARCHAR(40),
  ref_id      BIGINT,
  qty_in      DECIMAL(12,3) DEFAULT 0,
  qty_out     DECIMAL(12,3) DEFAULT 0,
  rate        DECIMAL(12,2),
  balance_qty DECIMAL(12,3),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES tenant_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (batch_id)    REFERENCES product_batches(id) ON DELETE SET NULL
);

CREATE TABLE stock_adjustments (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT NOT NULL,
  location_id        BIGINT,
  date               DATE,
  reason             VARCHAR(50),
  notes              TEXT,
  created_by_user_id BIGINT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)          REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id)        REFERENCES tenant_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE stock_adjustment_items (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT NOT NULL,
  adjustment_id BIGINT NOT NULL,
  product_id    BIGINT NOT NULL,
  batch_id      BIGINT,
  qty_diff      DECIMAL(12,3),
  rate          DECIMAL(12,2),
  FOREIGN KEY (tenant_id)     REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (adjustment_id) REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)    REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id)      REFERENCES product_batches(id) ON DELETE SET NULL
);

CREATE TABLE stock_transfers (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  from_location_id BIGINT NOT NULL,
  to_location_id   BIGINT NOT NULL,
  date             DATE,
  status           VARCHAR(20),
  notes            TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)        REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (from_location_id) REFERENCES tenant_locations(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_location_id)   REFERENCES tenant_locations(id) ON DELETE RESTRICT
);

CREATE TABLE stock_transfer_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  transfer_id BIGINT NOT NULL,
  product_id  BIGINT NOT NULL,
  batch_id    BIGINT,
  qty         DECIMAL(12,3),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (batch_id)    REFERENCES product_batches(id) ON DELETE SET NULL
);

CREATE TABLE bill_of_materials (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  output_qty DECIMAL(12,3),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE bom_components (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id            BIGINT NOT NULL,
  bom_id               BIGINT NOT NULL,
  component_product_id BIGINT NOT NULL,
  qty                  DECIMAL(12,3),
  UNIQUE (tenant_id, bom_id, component_product_id),
  FOREIGN KEY (tenant_id)            REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (bom_id)               REFERENCES bill_of_materials(id) ON DELETE CASCADE,
  FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE manufacturing_orders (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  bom_id     BIGINT NOT NULL,
  qty        DECIMAL(12,3),
  date       DATE,
  status     VARCHAR(20),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (bom_id)    REFERENCES bill_of_materials(id) ON DELETE RESTRICT
);

-- ─────────────────────────────────────────────
-- Parties
-- ─────────────────────────────────────────────

CREATE TABLE party_groups (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name      VARCHAR(100),
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE parties (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id            BIGINT NOT NULL,
  party_code           VARCHAR(50),
  name                 VARCHAR(255) NOT NULL,
  type                 VARCHAR(10) DEFAULT 'customer',
  party_type           VARCHAR(20) DEFAULT 'B2C',
  party_group_id       BIGINT,
  phone                VARCHAR(20),
  email                VARCHAR(255),
  address              TEXT,
  billing_state        VARCHAR(100),
  gstin                VARCHAR(20),
  opening_balance      DECIMAL(12,2) DEFAULT 0,
  opening_balance_type VARCHAR(10),
  balance              DECIMAL(12,2) DEFAULT 0,
  payable              DECIMAL(12,2) DEFAULT 0,
  credit_limit         DECIMAL(12,2),
  credit_days          INT,
  loyalty_points       DECIMAL(12,2) DEFAULT 0,
  last_sale            DATE,
  notes                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, party_code),
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_group_id) REFERENCES party_groups(id) ON DELETE SET NULL
);

CREATE TABLE party_ledger (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  party_id  BIGINT NOT NULL,
  date      DATE,
  txn_type  VARCHAR(20),
  ref_table VARCHAR(40),
  ref_id    BIGINT,
  debit     DECIMAL(12,2) DEFAULT 0,
  credit    DECIMAL(12,2) DEFAULT 0,
  balance   DECIMAL(12,2),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)  REFERENCES parties(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Sales & POS
-- ─────────────────────────────────────────────

CREATE TABLE pos_sessions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  location_id     BIGINT,
  cashier_user_id BIGINT,
  opened_at       DATETIME,
  closed_at       DATETIME,
  opening_cash    DECIMAL(12,2),
  closing_cash    DECIMAL(12,2),
  expected_cash   DECIMAL(12,2),
  variance        DECIMAL(12,2),
  status          VARCHAR(20),
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id)     REFERENCES tenant_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (cashier_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE sales (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT NOT NULL,
  invoice            VARCHAR(50),
  date               DATETIME DEFAULT CURRENT_TIMESTAMP,
  party_id           BIGINT,
  location_id        BIGINT,
  pos_session_id     BIGINT,
  cashier_user_id    BIGINT,
  customer_name      VARCHAR(255) DEFAULT 'Walk-in Customer',
  phone              VARCHAR(20),
  billing_address    TEXT,
  shipping_address   TEXT,
  state_of_supply    VARCHAR(100),
  subtotal           DECIMAL(12,2),
  discount           DECIMAL(12,2) DEFAULT 0,
  gst                DECIMAL(12,2),
  grand_total        DECIMAL(12,2),
  payment_mode       VARCHAR(100),
  payment_status     VARCHAR(20) DEFAULT 'Paid',
  total_received     DECIMAL(12,2),
  change_given       DECIMAL(12,2),
  due_date           DATE,
  vehicle_no         VARCHAR(50),
  delivery_date      DATE,
  delivery_location  TEXT,
  dispatch_location  TEXT,
  notes              TEXT,
  terms              TEXT,
  status             VARCHAR(20) DEFAULT 'active',
  created_by_user_id BIGINT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, invoice),
  FOREIGN KEY (tenant_id)          REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)           REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id)        REFERENCES tenant_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (pos_session_id)     REFERENCES pos_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (cashier_user_id)    REFERENCES app_users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE sale_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  sale_id     BIGINT NOT NULL,
  product_id  BIGINT,
  name        VARCHAR(255),
  description TEXT,
  qty         DECIMAL(12,3),
  item_count  DECIMAL(12,3) DEFAULT 0,
  unit        VARCHAR(50),
  rate        DECIMAL(12,2),
  mrp         DECIMAL(12,2),
  discount    DECIMAL(12,2) DEFAULT 0,
  free_qty    DECIMAL(12,3) DEFAULT 0,
  gst_rate    DECIMAL(5,2),
  gst_amount  DECIMAL(12,2),
  amount      DECIMAL(12,2),
  batch_no    VARCHAR(50),
  exp_date    DATE,
  mfg_date    DATE,
  size        VARCHAR(50),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id)    REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE estimates (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id         BIGINT NOT NULL,
  estimate_no       INT,
  estimate_date     DATE DEFAULT (CURRENT_DATE),
  valid_till        DATE,
  party_id          BIGINT,
  converted_sale_id BIGINT,
  customer_name     VARCHAR(255) DEFAULT 'Walk-in Customer',
  phone             VARCHAR(20),
  billing_address   TEXT,
  state_of_supply   VARCHAR(100),
  subtotal          DECIMAL(12,2) DEFAULT 0,
  gst               DECIMAL(12,2) DEFAULT 0,
  grand_total       DECIMAL(12,2) DEFAULT 0,
  adjustment        DECIMAL(12,2) DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'Open',
  notes             TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, estimate_no),
  FOREIGN KEY (tenant_id)         REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)          REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_sale_id) REFERENCES sales(id) ON DELETE SET NULL
);

CREATE TABLE estimate_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  estimate_id BIGINT NOT NULL,
  product_id  BIGINT,
  name        VARCHAR(255),
  description TEXT,
  qty         DECIMAL(12,3),
  item_count  DECIMAL(12,3),
  free_qty    DECIMAL(12,3),
  unit        VARCHAR(20),
  rate        DECIMAL(12,2),
  mrp         DECIMAL(12,2),
  gst_rate    DECIMAL(5,2),
  gst_amount  DECIMAL(12,2),
  amount      DECIMAL(12,2),
  batch_no    VARCHAR(50),
  exp_date    DATE,
  mfg_date    DATE,
  size        VARCHAR(50),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Purchases
-- ─────────────────────────────────────────────

CREATE TABLE purchase_orders (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  po_no       VARCHAR(50),
  date        DATE,
  party_id    BIGINT,
  location_id BIGINT,
  status      VARCHAR(20),
  grand_total DECIMAL(12,2),
  notes       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, po_no),
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)    REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES tenant_locations(id) ON DELETE SET NULL
);

CREATE TABLE purchase_order_items (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id         BIGINT NOT NULL,
  purchase_order_id BIGINT NOT NULL,
  product_id        BIGINT,
  name              VARCHAR(255),
  qty               DECIMAL(12,3),
  price             DECIMAL(12,2),
  unit              VARCHAR(50),
  FOREIGN KEY (tenant_id)         REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)        REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE purchases (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id             BIGINT NOT NULL,
  invoice               VARCHAR(50),
  date                  DATETIME DEFAULT CURRENT_TIMESTAMP,
  party_id              BIGINT,
  location_id           BIGINT,
  purchase_order_id     BIGINT,
  party_name            VARCHAR(255),
  subtotal              DECIMAL(12,2),
  discount              DECIMAL(12,2),
  gst                   DECIMAL(12,2),
  grand_total           DECIMAL(12,2),
  total_paid            DECIMAL(12,2),
  payment_status        VARCHAR(20) DEFAULT 'Paid',
  payment_mode          VARCHAR(100),
  due_date              DATE,
  supplier_invoice_no   VARCHAR(100),
  supplier_invoice_date DATE,
  eway_bill_no          VARCHAR(50),
  status                VARCHAR(20) DEFAULT 'active',
  created_by_user_id    BIGINT,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, invoice),
  FOREIGN KEY (tenant_id)          REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)           REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id)        REFERENCES tenant_locations(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_order_id)  REFERENCES purchase_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE purchase_items (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  purchase_id BIGINT NOT NULL,
  product_id  BIGINT,
  name        VARCHAR(255),
  qty         DECIMAL(12,3),
  price       DECIMAL(12,2),
  total       DECIMAL(12,2),
  discount    DECIMAL(12,2),
  unit        VARCHAR(50),
  gst_rate    DECIMAL(5,2),
  gst_amount  DECIMAL(12,2),
  mrp         DECIMAL(12,2),
  batch_no    VARCHAR(100),
  expiry_date DATE,
  mfg_date    DATE,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Returns
-- ─────────────────────────────────────────────

CREATE TABLE sale_returns (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id         BIGINT NOT NULL,
  credit_note_no    VARCHAR(50),
  date              DATE DEFAULT (CURRENT_DATE),
  party_id          BIGINT,
  original_sale_id  BIGINT,
  party_name        VARCHAR(255) DEFAULT 'Walk-in Customer',
  reference_invoice VARCHAR(50),
  type              VARCHAR(50) DEFAULT 'Credit Note',
  subtotal          DECIMAL(12,2),
  gst               DECIMAL(12,2),
  grand_total       DECIMAL(12,2),
  payment_mode      VARCHAR(50) DEFAULT 'Cash',
  total_received    DECIMAL(12,2),
  due_date          DATE,
  payment_status    VARCHAR(20) DEFAULT 'Unpaid',
  notes             TEXT,
  status            VARCHAR(20) DEFAULT 'active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, credit_note_no),
  FOREIGN KEY (tenant_id)        REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)         REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (original_sale_id) REFERENCES sales(id) ON DELETE SET NULL
);

CREATE TABLE sale_return_items (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  return_id  BIGINT NOT NULL,
  product_id BIGINT,
  name       VARCHAR(255),
  qty        DECIMAL(12,3),
  rate       DECIMAL(12,2),
  amount     DECIMAL(12,2),
  unit       VARCHAR(50),
  gst_rate   DECIMAL(5,2),
  gst_amount DECIMAL(12,2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (return_id)  REFERENCES sale_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE purchase_returns (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id            BIGINT NOT NULL,
  debit_note_no        VARCHAR(50),
  date                 DATE DEFAULT (CURRENT_DATE),
  party_id             BIGINT,
  original_purchase_id BIGINT,
  party_name           VARCHAR(255) DEFAULT 'Walk-in Supplier',
  reference_invoice    VARCHAR(100),
  type                 VARCHAR(50) DEFAULT 'Debit Note',
  subtotal             DECIMAL(12,2),
  gst                  DECIMAL(12,2),
  grand_total          DECIMAL(12,2),
  payment_mode         VARCHAR(50) DEFAULT 'Cash',
  total_paid           DECIMAL(12,2),
  due_date             DATE,
  payment_status       VARCHAR(20) DEFAULT 'Unpaid',
  notes                TEXT,
  status               VARCHAR(20) DEFAULT 'active',
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, debit_note_no),
  FOREIGN KEY (tenant_id)            REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)             REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (original_purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
);

CREATE TABLE purchase_return_items (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  return_id  BIGINT NOT NULL,
  product_id BIGINT,
  name       VARCHAR(255),
  qty        DECIMAL(12,3),
  rate       DECIMAL(12,2),
  amount     DECIMAL(12,2),
  unit       VARCHAR(50),
  gst_rate   DECIMAL(5,2),
  gst_amount DECIMAL(12,2),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (return_id)  REFERENCES purchase_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Payments, Cash & Banking
-- ─────────────────────────────────────────────

CREATE TABLE bank_accounts (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  bank_name  VARCHAR(255),
  account_no VARCHAR(50),
  ifsc       VARCHAR(20),
  type       VARCHAR(20) DEFAULT 'Current',
  balance    DECIMAL(14,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE bank_transactions (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  bank_account_id BIGINT NOT NULL,
  date            DATE,
  direction       VARCHAR(5),
  amount          DECIMAL(12,2),
  ref_table       VARCHAR(40),
  ref_id          BIGINT,
  description     TEXT,
  balance         DECIMAL(14,2),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
);

CREATE TABLE payment_in_history (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  party_id        BIGINT,
  bank_account_id BIGINT,
  party_name      VARCHAR(255),
  amount          DECIMAL(12,2),
  discount        DECIMAL(12,2) DEFAULT 0,
  payment_mode    VARCHAR(100),
  reference       VARCHAR(100),
  notes           TEXT,
  date            DATE DEFAULT (CURRENT_DATE),
  status          VARCHAR(20) DEFAULT 'Unused',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)        REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE TABLE payment_out_history (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  party_id        BIGINT,
  bank_account_id BIGINT,
  party_name      VARCHAR(255),
  amount          DECIMAL(12,2),
  discount        DECIMAL(12,2) DEFAULT 0,
  payment_mode    VARCHAR(100),
  reference       VARCHAR(100),
  notes           TEXT,
  date            DATE DEFAULT (CURRENT_DATE),
  status          VARCHAR(20) DEFAULT 'Unused',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)        REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE TABLE payment_in_allocations (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT NOT NULL,
  payment_in_id BIGINT NOT NULL,
  sale_id       BIGINT NOT NULL,
  amount        DECIMAL(12,2),
  FOREIGN KEY (tenant_id)     REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_in_id) REFERENCES payment_in_history(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id)       REFERENCES sales(id) ON DELETE CASCADE
);

CREATE TABLE payment_out_allocations (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  payment_out_id BIGINT NOT NULL,
  purchase_id    BIGINT NOT NULL,
  amount         DECIMAL(12,2),
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (payment_out_id) REFERENCES payment_out_history(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id)    REFERENCES purchases(id) ON DELETE CASCADE
);

CREATE TABLE cash_transactions (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  date        DATE DEFAULT (CURRENT_DATE),
  type        VARCHAR(50),
  amount      DECIMAL(12,2),
  ref_table   VARCHAR(40),
  ref_id      BIGINT,
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE cheques (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  party_id        BIGINT,
  bank_account_id BIGINT,
  payment_in_id   BIGINT,
  payment_out_id  BIGINT,
  party_name      VARCHAR(255),
  amount          DECIMAL(12,2),
  cheque_no       VARCHAR(50),
  bank            VARCHAR(255),
  issue_date      DATE,
  due_date        DATE,
  type            VARCHAR(5),
  status          VARCHAR(10) DEFAULT 'pending',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)       REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)        REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_in_id)   REFERENCES payment_in_history(id) ON DELETE SET NULL,
  FOREIGN KEY (payment_out_id)  REFERENCES payment_out_history(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Accounting & Assets
-- ─────────────────────────────────────────────

CREATE TABLE fixed_assets (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id         BIGINT NOT NULL,
  name              VARCHAR(255),
  category          VARCHAR(100) DEFAULT 'General',
  purchase_date     DATE,
  purchase_value    DECIMAL(14,2),
  current_value     DECIMAL(14,2),
  depreciation_rate DECIMAL(5,2),
  depreciation_type VARCHAR(20) DEFAULT 'straight-line',
  serial_no         VARCHAR(100),
  location          VARCHAR(200),
  vendor            VARCHAR(200),
  warranty_expiry   DATE,
  status            VARCHAR(20) DEFAULT 'Active',
  notes             TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE asset_depreciation_schedule (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id      BIGINT NOT NULL,
  fixed_asset_id BIGINT NOT NULL,
  period         DATE,
  opening_value  DECIMAL(14,2),
  depreciation   DECIMAL(14,2),
  closing_value  DECIMAL(14,2),
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (fixed_asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
);

CREATE TABLE capital_investments (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id         BIGINT NOT NULL,
  investor_name     VARCHAR(255),
  type              VARCHAR(20),
  contact_number    VARCHAR(20),
  email             VARCHAR(255),
  address           TEXT,
  investment_amount DECIMAL(15,2),
  equity_percent    DECIMAL(5,2),
  investment_date   DATE,
  payment_mode      VARCHAR(50),
  reference_no      VARCHAR(100),
  notes             TEXT,
  status            VARCHAR(20) DEFAULT 'Active',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE loan_accounts (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  name            VARCHAR(255),
  lender_name     VARCHAR(255),
  principal       DECIMAL(14,2),
  interest_rate   DECIMAL(5,2),
  emi             DECIMAL(12,2),
  start_date      DATE,
  duration_months INT,
  payment_mode    VARCHAR(50),
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE loan_transactions (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  loan_id          BIGINT NOT NULL,
  type             VARCHAR(50),
  principal        DECIMAL(12,2),
  interest         DECIMAL(12,2),
  other_charges    DECIMAL(12,2),
  total_amount     DECIMAL(12,2),
  payment_mode     VARCHAR(50),
  reference_no     VARCHAR(100),
  charge_type      VARCHAR(100),
  transaction_date DATE,
  notes            TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (loan_id)   REFERENCES loan_accounts(id) ON DELETE CASCADE
);

CREATE TABLE chart_of_accounts (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  code      VARCHAR(20),
  name      VARCHAR(150),
  type      VARCHAR(20),
  parent_id BIGINT,
  UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
);

CREATE TABLE journal_entries (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  date       DATE,
  ref_table  VARCHAR(40),
  ref_id     BIGINT,
  narration  TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE journal_lines (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id        BIGINT NOT NULL,
  journal_entry_id BIGINT NOT NULL,
  account_id       BIGINT NOT NULL,
  debit            DECIMAL(14,2) DEFAULT 0,
  credit           DECIMAL(14,2) DEFAULT 0,
  FOREIGN KEY (tenant_id)        REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id)       REFERENCES chart_of_accounts(id) ON DELETE RESTRICT
);

-- ─────────────────────────────────────────────
-- Expenses & Other Income
-- ─────────────────────────────────────────────

CREATE TABLE expense_categories (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  name       VARCHAR(100),
  type       VARCHAR(20) DEFAULT 'Indirect',
  color      VARCHAR(80),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE expenses (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id           BIGINT NOT NULL,
  date                DATE DEFAULT (CURRENT_DATE),
  expense_category_id BIGINT,
  description         TEXT,
  amount              DECIMAL(12,2),
  paid_amount         DECIMAL(12,2),
  payment_mode        VARCHAR(50),
  reference           VARCHAR(100),
  notes               TEXT,
  party_id            BIGINT,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)           REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (party_id)            REFERENCES parties(id) ON DELETE SET NULL
);

CREATE TABLE other_income_categories (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  name      VARCHAR(100),
  UNIQUE (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE other_incomes (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  date            DATE DEFAULT (CURRENT_DATE),
  category_id     BIGINT,
  amount          DECIMAL(12,2),
  received_amount DECIMAL(12,2),
  payment_mode    VARCHAR(50),
  reference       VARCHAR(100),
  party_id        BIGINT,
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES other_income_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (party_id)    REFERENCES parties(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Loyalty & Tax filing
-- ─────────────────────────────────────────────

CREATE TABLE loyalty_transactions (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  party_id   BIGINT NOT NULL,
  sale_id    BIGINT,
  type       VARCHAR(10),
  points     DECIMAL(12,2),
  value      DECIMAL(12,2),
  expires_at DATE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id)  REFERENCES parties(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id)   REFERENCES sales(id) ON DELETE SET NULL
);

CREATE TABLE gst_return_filings (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT NOT NULL,
  return_type  VARCHAR(20),
  period       VARCHAR(10),
  status       VARCHAR(20) DEFAULT 'draft',
  filed_at     DATETIME,
  json_payload JSON,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- System
-- ─────────────────────────────────────────────

CREATE TABLE audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT,
  log_time    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id     BIGINT,
  user_name   VARCHAR(100),
  action      VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id   BIGINT,
  ip_address  VARCHAR(45),
  details     JSON,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE recycle_bin (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT NOT NULL,
  type               VARCHAR(50),
  entity_id          BIGINT,
  name               VARCHAR(255),
  amount             DECIMAL(12,2),
  deleted_by_user_id BIGINT,
  deleted_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  restored_at        DATETIME,
  snapshot           LONGTEXT,
  FOREIGN KEY (tenant_id)          REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (deleted_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE import_jobs (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT NOT NULL,
  type               VARCHAR(20),
  filename           VARCHAR(255),
  rows_total         INT,
  rows_ok            INT,
  rows_failed        INT,
  error_report       TEXT,
  created_by_user_id BIGINT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)          REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES app_users(id) ON DELETE SET NULL
);

CREATE TABLE backup_jobs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT NOT NULL,
  mode        VARCHAR(20),
  storage_url TEXT,
  status      VARCHAR(20),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  user_id    BIGINT,
  type       VARCHAR(40),
  title      VARCHAR(255),
  body       TEXT,
  link       VARCHAR(255),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE TABLE notification_preferences (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id  BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  type       VARCHAR(40),
  channel    VARCHAR(20),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES app_users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Circular FK: tenants.owner_user_id → app_users.id  (nullable bootstrap)
-- ─────────────────────────────────────────────
ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_owner_user
  FOREIGN KEY (owner_user_id) REFERENCES app_users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- Secondary indexes (tenant fences + hot FKs / lookups)
-- (MySQL auto-creates an index for every FK column; these add the
--  composite tenant fences used by analytics/list queries.)
-- ─────────────────────────────────────────────
CREATE INDEX idx_employees_tenant_name     ON employees(tenant_id, name);
CREATE INDEX idx_attendance_tenant_date    ON attendance_records(tenant_id, date);
CREATE INDEX idx_products_tenant_name      ON products(tenant_id, short_name);
CREATE INDEX idx_stock_ledger_product      ON stock_ledger(tenant_id, product_id);
CREATE INDEX idx_party_ledger_party        ON party_ledger(tenant_id, party_id);
CREATE INDEX idx_sales_tenant_date         ON sales(tenant_id, date);
CREATE INDEX idx_sale_items_sale           ON sale_items(tenant_id, sale_id);
CREATE INDEX idx_purchases_tenant_date     ON purchases(tenant_id, date);
CREATE INDEX idx_purchase_items_purchase   ON purchase_items(tenant_id, purchase_id);
CREATE INDEX idx_expenses_tenant_date      ON expenses(tenant_id, date);
CREATE INDEX idx_loyalty_txn_party         ON loyalty_transactions(tenant_id, party_id);
CREATE INDEX idx_audit_log_tenant_time     ON audit_log(tenant_id, log_time);
