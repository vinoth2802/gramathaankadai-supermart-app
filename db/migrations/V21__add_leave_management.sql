-- V21: Leave management — leave_types and leave_requests tables

CREATE TABLE IF NOT EXISTS leave_types (
  id                SERIAL        PRIMARY KEY,
  name              VARCHAR(50)   NOT NULL UNIQUE,
  code              VARCHAR(10)   NOT NULL UNIQUE,
  annual_allotment  INTEGER       NOT NULL DEFAULT 0,
  is_paid           BOOLEAN       NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  color             VARCHAR(20)   NOT NULL DEFAULT 'blue',
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO leave_types (name, code, annual_allotment, is_paid, color) VALUES
  ('Casual Leave',    'CL',  12, TRUE,  'amber'),
  ('Sick Leave',      'SL',   6, TRUE,  'rose'),
  ('Annual Leave',    'AL',  15, TRUE,  'blue'),
  ('Maternity Leave', 'ML',  90, TRUE,  'violet'),
  ('Loss of Pay',     'LOP',  0, FALSE, 'slate')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_requests (
  id              SERIAL          PRIMARY KEY,
  employee_id     INTEGER         NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   INTEGER         NOT NULL REFERENCES leave_types(id),
  from_date       DATE            NOT NULL,
  to_date         DATE            NOT NULL,
  days            DECIMAL(4, 1)   NOT NULL,
  reason          TEXT,
  status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
  approved_by     VARCHAR(100),
  remarks         TEXT,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee  ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_from_date ON leave_requests(from_date);
