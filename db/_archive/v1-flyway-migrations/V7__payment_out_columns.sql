-- V7: Add discount and status columns to payment_out_history
ALTER TABLE payment_out_history
  ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status   VARCHAR(20)    NOT NULL DEFAULT 'Unused';
