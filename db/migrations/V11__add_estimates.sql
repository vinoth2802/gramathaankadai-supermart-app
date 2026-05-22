CREATE TABLE IF NOT EXISTS estimates (
  id SERIAL PRIMARY KEY,
  estimate_no INTEGER NOT NULL,
  estimate_date DATE DEFAULT CURRENT_DATE,
  valid_till DATE,
  party_id INTEGER REFERENCES parties(id),
  customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
  phone VARCHAR(20),
  billing_address TEXT,
  state_of_supply VARCHAR(100) DEFAULT 'Tamil Nadu',
  subtotal DECIMAL(12,2) DEFAULT 0,
  gst DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  adjustment DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Open'
    CHECK (status IN ('Open', 'Converted', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_items (
  id SERIAL PRIMARY KEY,
  estimate_id INTEGER REFERENCES estimates(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_count DECIMAL(12,3) DEFAULT 0,
  batch_no VARCHAR(50),
  exp_date VARCHAR(20),
  mfg_date VARCHAR(20),
  mrp DECIMAL(12,2) DEFAULT 0,
  size VARCHAR(50),
  qty DECIMAL(12,3) DEFAULT 0,
  free_qty DECIMAL(12,3) DEFAULT 0,
  unit VARCHAR(20),
  rate DECIMAL(12,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 0,
  gst_amount DECIMAL(12,2) DEFAULT 0,
  amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
