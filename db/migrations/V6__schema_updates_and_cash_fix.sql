-- ============================================================
-- V6: Schema updates — new tables, missing columns, constraint fixes
-- ============================================================

-- ── 1. Fix cash_transactions: remove restrictive CHECK on type ──
ALTER TABLE cash_transactions
  DROP CONSTRAINT IF EXISTS cash_transactions_type_check;

ALTER TABLE cash_transactions
  ALTER COLUMN type TYPE VARCHAR(50);

-- ── 2. New table: categories ───────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL      PRIMARY KEY,
    name       VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── 3. New table: uom_conversions ─────────────────────────────
CREATE TABLE IF NOT EXISTS uom_conversions (
    id               SERIAL  PRIMARY KEY,
    base_uom_id      INT     NOT NULL REFERENCES uom_list(id) ON DELETE CASCADE,
    factor           FLOAT   NOT NULL DEFAULT 1,
    secondary_uom_id INT     NOT NULL REFERENCES uom_list(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Products: missing columns ──────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS type          VARCHAR(20)  NOT NULL DEFAULT 'Product',
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS batch         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pcs_per_unit  INT;

-- ── 5. Parties: missing columns ───────────────────────────────
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS party_type VARCHAR(20) NOT NULL DEFAULT 'B2C';

-- ── 6. Sales: missing columns ─────────────────────────────────
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_status    VARCHAR(20)  NOT NULL DEFAULT 'Paid',
  ADD COLUMN IF NOT EXISTS due_date          DATE,
  ADD COLUMN IF NOT EXISTS billing_address   TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address  TEXT,
  ADD COLUMN IF NOT EXISTS phone             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS state_of_supply   VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu',
  ADD COLUMN IF NOT EXISTS vehicle_no        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_date     DATE,
  ADD COLUMN IF NOT EXISTS delivery_location TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_location TEXT,
  ADD COLUMN IF NOT EXISTS notes             TEXT,
  ADD COLUMN IF NOT EXISTS terms             TEXT,
  ADD COLUMN IF NOT EXISTS status            VARCHAR(20)  NOT NULL DEFAULT 'active';

-- ── 7. Sale items: missing columns ────────────────────────────
ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS product_id  INT REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS item_count  NUMERIC(12, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_no    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS exp_date    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mfg_date    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mrp         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS size        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS free_qty    NUMERIC(12, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_rate    NUMERIC(5,  2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- ── 8. Purchases: missing columns ─────────────────────────────
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS supplier_invoice_no   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS supplier_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS status                VARCHAR(20) NOT NULL DEFAULT 'active';

-- ── 9. Purchase items: missing columns ────────────────────────
ALTER TABLE purchase_items
  ADD COLUMN IF NOT EXISTS batch_no    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS mfg_date    DATE,
  ADD COLUMN IF NOT EXISTS mrp         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_rate    NUMERIC(5,  2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- ── 10. Payment in history: missing columns ───────────────────
ALTER TABLE payment_in_history
  ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status   VARCHAR(20)    NOT NULL DEFAULT 'Unused';

-- ── 11. Cheques: remove restrictive type CHECK ─────────────────
ALTER TABLE cheques
  DROP CONSTRAINT IF EXISTS cheques_type_check;
