CREATE TABLE IF NOT EXISTS capital_investments (
  id               SERIAL PRIMARY KEY,
  investor_name    VARCHAR(255) NOT NULL,
  type             VARCHAR(20)  NOT NULL CHECK (type IN ('Director', 'Promoter', 'Investor')),
  contact_number   VARCHAR(20),
  email            VARCHAR(255),
  address          TEXT,
  investment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  equity_percent   DECIMAL(5,2)  DEFAULT 0,
  investment_date  DATE          NOT NULL,
  payment_mode     VARCHAR(50),
  reference_no     VARCHAR(100),
  notes            TEXT,
  status           VARCHAR(20)   DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Pending')),
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
