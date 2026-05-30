ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS loyalty_enabled          BOOLEAN        DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_rupee DECIMAL(8,2)   DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loyalty_min_points       INTEGER        DEFAULT 100,
  ADD COLUMN IF NOT EXISTS loyalty_points_value     DECIMAL(8,2)   DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS loyalty_expiry_days      INTEGER        DEFAULT 365,
  ADD COLUMN IF NOT EXISTS loyalty_max_discount     DECIMAL(5,2)   DEFAULT 10,
  ADD COLUMN IF NOT EXISTS loyalty_allow_partial    BOOLEAN        DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS loyalty_show_on_invoice  BOOLEAN        DEFAULT TRUE;
