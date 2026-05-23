CREATE TABLE IF NOT EXISTS purchase_returns (
  id              SERIAL PRIMARY KEY,
  debit_note_no   VARCHAR(50)    NOT NULL UNIQUE,
  date            DATE           NOT NULL DEFAULT CURRENT_DATE,
  party_id        INTEGER        REFERENCES parties(id),
  party_name      VARCHAR(255)   NOT NULL DEFAULT 'Walk-in Supplier',
  reference_invoice VARCHAR(100),
  type            VARCHAR(50)    NOT NULL DEFAULT 'Debit Note',
  subtotal        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  gst             DECIMAL(12,2)  NOT NULL DEFAULT 0,
  grand_total     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  payment_mode    VARCHAR(50)    DEFAULT 'Cash',
  total_paid      DECIMAL(12,2)  NOT NULL DEFAULT 0,
  due_date        DATE,
  payment_status  VARCHAR(20)    NOT NULL DEFAULT 'Unpaid',
  notes           TEXT,
  status          VARCHAR(20)    NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id         SERIAL PRIMARY KEY,
  return_id  INTEGER        NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id INTEGER,
  name       VARCHAR(255)   NOT NULL,
  qty        DECIMAL(12,3)  NOT NULL DEFAULT 0,
  rate       DECIMAL(12,2)  NOT NULL DEFAULT 0,
  unit       VARCHAR(50),
  gst_rate   DECIMAL(5,2)   NOT NULL DEFAULT 0,
  gst_amount DECIMAL(12,2)  NOT NULL DEFAULT 0,
  amount     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
