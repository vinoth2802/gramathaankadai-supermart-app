-- Add bulk/wholesale/stock detail fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_bulk          BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_unit   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sales_price_tax  VARCHAR(10)   NOT NULL DEFAULT 'with',
  ADD COLUMN IF NOT EXISTS wholesale_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_qty    DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_price_tax VARCHAR(10) NOT NULL DEFAULT 'with',
  ADD COLUMN IF NOT EXISTS at_price         DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS as_of_date       DATE,
  ADD COLUMN IF NOT EXISTS location         VARCHAR(100);
