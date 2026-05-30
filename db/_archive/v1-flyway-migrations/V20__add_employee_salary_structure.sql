-- V20: Create employees table with full salary structure
CREATE TABLE IF NOT EXISTS employees (
  id                SERIAL          PRIMARY KEY,
  employee_code     VARCHAR(50)     UNIQUE,
  name              VARCHAR(150)    NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(150),
  designation       VARCHAR(100),
  department        VARCHAR(100),
  date_of_joining   DATE,
  basic_salary      DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  salary_type       VARCHAR(20)     NOT NULL DEFAULT 'perMonth',
  employee_type     VARCHAR(20)     NOT NULL DEFAULT 'dailyWages',
  hra               DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  da                DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  ta                DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  medical_allowance DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  special_allowance DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  pf                DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  esi               DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  provisional_tax   DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  tds               DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  loan_recovery     DECIMAL(12, 2)  NOT NULL DEFAULT 0,
  address           TEXT,
  notes             TEXT,
  is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
