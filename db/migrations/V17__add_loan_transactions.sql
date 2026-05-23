-- V17: Add loan_transactions table and extend loan_accounts
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS lender_name     VARCHAR(255);
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS duration_months INTEGER;
ALTER TABLE loan_accounts ADD COLUMN IF NOT EXISTS payment_mode    VARCHAR(50) DEFAULT 'Cash';

CREATE TABLE IF NOT EXISTS loan_transactions (
  id               SERIAL PRIMARY KEY,
  loan_id          INTEGER NOT NULL REFERENCES loan_accounts(id) ON DELETE CASCADE,
  type             VARCHAR(50) NOT NULL,
  principal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest         DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_charges    DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_mode     VARCHAR(50),
  reference_no     VARCHAR(100),
  charge_type      VARCHAR(100),
  transaction_date DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
