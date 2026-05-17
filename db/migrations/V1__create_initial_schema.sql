-- ============================================================
-- V1: Schema for Gramathaankadai Supermart
-- Derived from db.sample.json (json-server data model)
-- ============================================================

-- Units of Measure
CREATE TABLE uom_list (
    id        SERIAL PRIMARY KEY,
    code      VARCHAR(10)  NOT NULL UNIQUE,
    descr     VARCHAR(100) NOT NULL
);

-- Payment modes
CREATE TABLE payment_modes (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL UNIQUE,
    descr     VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Items / Products
CREATE TABLE products (
    id             SERIAL PRIMARY KEY,
    short_name     VARCHAR(255) NOT NULL,
    item_code      VARCHAR(100) UNIQUE,
    category       VARCHAR(100) NOT NULL DEFAULT 'General',
    hsn_code       VARCHAR(20),
    uom            VARCHAR(10)  NOT NULL DEFAULT 'PCS',
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    mrp            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    sales_price    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gst_rate       NUMERIC(5, 2)  NOT NULL DEFAULT 5,
    stock          NUMERIC(12, 3) NOT NULL DEFAULT 0,
    reorder_level  NUMERIC(12, 3) NOT NULL DEFAULT 10,
    expiry_date    DATE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Parties (customers and/or suppliers)
CREATE TABLE parties (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    type       VARCHAR(10)  NOT NULL DEFAULT 'customer'
                 CHECK (type IN ('customer', 'supplier', 'both')),
    phone      VARCHAR(20),
    email      VARCHAR(255),
    address    TEXT,
    gstin      VARCHAR(20),
    balance    NUMERIC(12, 2) NOT NULL DEFAULT 0, -- receivable (Dr) from customer
    payable    NUMERIC(12, 2) NOT NULL DEFAULT 0, -- payable (Cr) to supplier
    last_sale  DATE,
    notes      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales invoices
CREATE TABLE sales (
    id            SERIAL PRIMARY KEY,
    invoice       VARCHAR(50)   NOT NULL UNIQUE,
    date          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    customer_name VARCHAR(255)  NOT NULL DEFAULT 'Walk-in Customer',
    party_id      INT REFERENCES parties(id) ON DELETE SET NULL,
    subtotal      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gst           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_mode  VARCHAR(100),
    total_received NUMERIC(12, 2) NOT NULL DEFAULT 0,
    change_given  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sale line items (snapshot of item at time of sale)
CREATE TABLE sale_items (
    id      SERIAL PRIMARY KEY,
    sale_id INT            NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    name    VARCHAR(255)   NOT NULL,
    qty     NUMERIC(12, 3) NOT NULL,
    rate    NUMERIC(12, 2) NOT NULL,
    amount  NUMERIC(12, 2) NOT NULL
);

-- Purchase invoices
CREATE TABLE purchases (
    id           SERIAL PRIMARY KEY,
    invoice      VARCHAR(50)   NOT NULL UNIQUE,
    date         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    party_name   VARCHAR(255),
    party_id     INT REFERENCES parties(id) ON DELETE SET NULL,
    grand_total  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_mode VARCHAR(100),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase line items
CREATE TABLE purchase_items (
    id          SERIAL PRIMARY KEY,
    purchase_id INT            NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    name        VARCHAR(255)   NOT NULL,
    qty         NUMERIC(12, 3) NOT NULL,
    price       NUMERIC(12, 2) NOT NULL,
    total       NUMERIC(12, 2) NOT NULL
);

-- Payments received (standalone, not tied to a sale)
CREATE TABLE payment_in_history (
    id           SERIAL PRIMARY KEY,
    party_id     INT REFERENCES parties(id) ON DELETE SET NULL,
    party_name   VARCHAR(255),
    amount       NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(100),
    reference    VARCHAR(100),
    notes        TEXT,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Payments made (standalone, not tied to a purchase)
CREATE TABLE payment_out_history (
    id           SERIAL PRIMARY KEY,
    party_id     INT REFERENCES parties(id) ON DELETE SET NULL,
    party_name   VARCHAR(255),
    amount       NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(100),
    reference    VARCHAR(100),
    notes        TEXT,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Cash transactions ledger
CREATE TABLE cash_transactions (
    id          SERIAL PRIMARY KEY,
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    type        VARCHAR(5) NOT NULL CHECK (type IN ('in', 'out')),
    amount      NUMERIC(12, 2) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE bank_accounts (
    id         SERIAL PRIMARY KEY,
    bank_name  VARCHAR(255) NOT NULL,
    account_no VARCHAR(50),
    ifsc       VARCHAR(20),
    balance    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    type       VARCHAR(20) NOT NULL DEFAULT 'Current',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cheques
CREATE TABLE cheques (
    id         SERIAL PRIMARY KEY,
    party_id   INT REFERENCES parties(id) ON DELETE SET NULL,
    party_name VARCHAR(255),
    amount     NUMERIC(12, 2) NOT NULL,
    cheque_no  VARCHAR(50),
    bank       VARCHAR(255),
    issue_date DATE,
    due_date   DATE,
    type       VARCHAR(5) NOT NULL CHECK (type IN ('in', 'out')),
    status     VARCHAR(10) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'cleared', 'bounced')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan accounts
CREATE TABLE loan_accounts (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    principal     NUMERIC(14, 2),
    interest_rate NUMERIC(5, 2),
    emi           NUMERIC(12, 2),
    start_date    DATE,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Shop settings (single row, id=1)
CREATE TABLE settings (
    id             INTEGER PRIMARY KEY DEFAULT 1,
    shop_name      VARCHAR(255) NOT NULL DEFAULT 'Gramathaankadai SuperMart',
    address        TEXT,
    phone          VARCHAR(20),
    gstin          VARCHAR(20),
    invoice_prefix VARCHAR(10)  NOT NULL DEFAULT 'INV',
    currency       VARCHAR(5)   NOT NULL DEFAULT 'INR',
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Audit log
CREATE TABLE audit_log (
    id         BIGSERIAL PRIMARY KEY,
    log_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_name  VARCHAR(100),
    action     VARCHAR(100) NOT NULL,
    details    JSONB
);

-- ============================================================
-- Seed data
-- ============================================================

INSERT INTO uom_list (code, descr) VALUES
    ('KG',  'Kilogram'),
    ('PCS', 'Piece'),
    ('LTR', 'Litre'),
    ('GM',  'Gram'),
    ('MT',  'Metric Ton'),
    ('BOX', 'Box'),
    ('PKT', 'Packet'),
    ('BTL', 'Bottle');

INSERT INTO payment_modes (name, descr) VALUES
    ('Cash',          'Cash payment'),
    ('UPI',           'Unified Payments Interface'),
    ('Bank Transfer', 'NEFT / RTGS / IMPS'),
    ('Cheque',        'Bank Cheque'),
    ('Card',          'Debit / Credit Card');

INSERT INTO settings (id, shop_name, address, phone, gstin, invoice_prefix, currency)
VALUES (1, 'Gramathaankadai SuperMart', 'Main Road, Tamil Nadu', '9876543210', '33ABCDE1234F1Z5', 'INV', 'INR');

INSERT INTO bank_accounts (bank_name, account_no, ifsc, balance, type)
VALUES ('State Bank of India', 'XXXX1234', 'SBIN0001234', 45000, 'Current');
