-- V19: Fixed Assets table
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                 SERIAL          PRIMARY KEY,
  name               VARCHAR(255)    NOT NULL,
  category           VARCHAR(100)    NOT NULL DEFAULT 'General',
  purchase_date      DATE,
  purchase_value     DECIMAL(14, 2)  NOT NULL DEFAULT 0,
  current_value      DECIMAL(14, 2)  NOT NULL DEFAULT 0,
  depreciation_rate  DECIMAL(5, 2)   NOT NULL DEFAULT 0,
  depreciation_type  VARCHAR(20)     NOT NULL DEFAULT 'straight-line',
  serial_no          VARCHAR(100),
  location           VARCHAR(200),
  vendor             VARCHAR(200),
  warranty_expiry    DATE,
  status             VARCHAR(20)     NOT NULL DEFAULT 'Active',
  notes              TEXT,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
