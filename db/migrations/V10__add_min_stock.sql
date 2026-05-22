-- Add minimum stock threshold column to products (separate from reorder_level)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_stock DECIMAL(12,3) NOT NULL DEFAULT 0;
