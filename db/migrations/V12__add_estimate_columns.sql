-- Add missing columns to estimates
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS estimate_date   DATE          DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS customer_name   VARCHAR(255)  DEFAULT 'Walk-in Customer',
  ADD COLUMN IF NOT EXISTS phone           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS state_of_supply VARCHAR(100)  DEFAULT 'Tamil Nadu',
  ADD COLUMN IF NOT EXISTS subtotal        DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst             DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total     DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment      DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP;

-- Fix status check constraint: original used lowercase, app uses Title Case
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check
  CHECK (status IN ('Open', 'Converted', 'Cancelled', 'open', 'converted', 'cancelled'));

-- Add missing columns to estimate_items
ALTER TABLE estimate_items
  ADD COLUMN IF NOT EXISTS name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS item_count  DECIMAL(12,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_no    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS exp_date    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mfg_date    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mrp         DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS size        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rate        DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_qty    DECIMAL(12,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gst_rate    DECIMAL(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount  DECIMAL(12,2) DEFAULT 0;
