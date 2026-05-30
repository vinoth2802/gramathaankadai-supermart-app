-- V18: Payment type display settings
CREATE TABLE IF NOT EXISTS payment_type_settings (
  id              SERIAL PRIMARY KEY,
  payment_mode_id INTEGER UNIQUE REFERENCES payment_modes(id) ON DELETE CASCADE,
  color           VARCHAR(20)  NOT NULL DEFAULT 'blue',
  icon            VARCHAR(50)  NOT NULL DEFAULT 'CreditCard',
  description     TEXT,
  display_order   INTEGER      NOT NULL DEFAULT 0,
  is_default      BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_type_settings (payment_mode_id, color, icon, description, is_default, display_order)
SELECT
  id,
  CASE name
    WHEN 'Cash'          THEN 'green'
    WHEN 'Bank Transfer' THEN 'blue'
    WHEN 'Cheque'        THEN 'purple'
    WHEN 'Credit Card'   THEN 'orange'
    WHEN 'UPI'           THEN 'blue'
    WHEN 'PAYTM UPI'     THEN 'blue'
    ELSE 'gray'
  END,
  CASE name
    WHEN 'Cash'          THEN 'Banknote'
    WHEN 'Bank Transfer' THEN 'Building2'
    WHEN 'Cheque'        THEN 'FileText'
    WHEN 'Credit Card'   THEN 'CreditCard'
    WHEN 'UPI'           THEN 'Smartphone'
    WHEN 'PAYTM UPI'     THEN 'Smartphone'
    ELSE 'Wallet'
  END,
  CASE name
    WHEN 'Cash'          THEN 'Physical cash payments'
    WHEN 'Bank Transfer' THEN 'Direct bank to bank transfer'
    WHEN 'Cheque'        THEN 'Cheque payments'
    WHEN 'Credit Card'   THEN 'Credit card payments'
    WHEN 'UPI'           THEN 'UPI payments'
    WHEN 'PAYTM UPI'     THEN 'Paytm UPI payments'
    ELSE 'Other payment method'
  END,
  true,
  ROW_NUMBER() OVER (ORDER BY id)
FROM payment_modes
ON CONFLICT (payment_mode_id) DO NOTHING;
