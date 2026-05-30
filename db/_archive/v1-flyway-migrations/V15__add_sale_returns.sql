CREATE TABLE IF NOT EXISTS sale_returns (
  id               SERIAL PRIMARY KEY,
  credit_note_no   VARCHAR(50)    UNIQUE NOT NULL,
  date             DATE           DEFAULT CURRENT_DATE,
  party_id         INTEGER        REFERENCES parties(id) ON DELETE SET NULL,
  party_name       VARCHAR(255)   DEFAULT 'Walk-in Customer',
  reference_invoice VARCHAR(50),
  type             VARCHAR(50)    DEFAULT 'Credit Note',
  subtotal         DECIMAL(12,2)  DEFAULT 0,
  gst              DECIMAL(12,2)  DEFAULT 0,
  grand_total      DECIMAL(12,2)  DEFAULT 0,
  payment_mode     VARCHAR(50)    DEFAULT 'Cash',
  total_received   DECIMAL(12,2)  DEFAULT 0,
  due_date         DATE,
  payment_status   VARCHAR(20)    DEFAULT 'Unpaid',
  notes            TEXT,
  status           VARCHAR(20)    DEFAULT 'active',
  created_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_return_items (
  id          SERIAL PRIMARY KEY,
  return_id   INTEGER        NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  product_id  INTEGER        REFERENCES products(id) ON DELETE SET NULL,
  name        VARCHAR(255)   NOT NULL,
  qty         DECIMAL(12,3)  DEFAULT 0,
  rate        DECIMAL(12,2)  DEFAULT 0,
  unit        VARCHAR(50),
  gst_rate    DECIMAL(5,2)   DEFAULT 0,
  gst_amount  DECIMAL(12,2)  DEFAULT 0,
  amount      DECIMAL(12,2)  DEFAULT 0,
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);
