-- Roles
CREATE TABLE IF NOT EXISTS app_roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions
CREATE TABLE IF NOT EXISTS app_permissions (
  id          SERIAL PRIMARY KEY,
  module      VARCHAR(50) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE (module, action)
);

-- Role ↔ Permission mapping
CREATE TABLE IF NOT EXISTS app_role_permissions (
  role_id       INTEGER NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES app_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Users
CREATE TABLE IF NOT EXISTS app_users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES app_roles(id),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings extra columns
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS firm_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pincode   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS state     VARCHAR(100);
