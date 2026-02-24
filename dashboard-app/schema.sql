-- Migration: 001_initial_schema
-- Description: Create initial database schema for takeaway dashboard
-- Tables: users, sessions, calls, audit_log

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- NULL for OAuth-only users
  name TEXT NOT NULL,
  image TEXT,
  google_id TEXT UNIQUE,
  apple_id TEXT UNIQUE,
  retell_api_key TEXT, -- Per-user Retell API key for syncing their calls
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

-- Sessions table (if using database sessions instead of JWT)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON serialized session data
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Cached phone calls from Retell (optional, for performance)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY, -- Retell call ID
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  duration INTEGER, -- seconds
  status TEXT NOT NULL, -- completed, missed, failed
  outcome TEXT, -- order_placed, inquiry, complaint
  transcript TEXT, -- Full conversation transcript
  recording_url TEXT, -- Retell recording URL (audio playback)
  call_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_date ON calls(call_date);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Audit log for security events
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- login, logout, password_change, etc.
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL
);

-- Record this migration
INSERT INTO migrations (name, applied_at) VALUES ('001_initial_schema', datetime('now'));

-- Migration: 002_hubrise_integration
-- Description: HubRise integration tables for order aggregation and CRM

-- HubRise OAuth connections
CREATE TABLE IF NOT EXISTS hubrise_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_hubrise_connections_user_id ON hubrise_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_hubrise_connections_location_id ON hubrise_connections(location_id);
CREATE INDEX IF NOT EXISTS idx_hubrise_connections_is_active ON hubrise_connections(is_active);

-- Orders from all platforms (via HubRise)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hubrise_order_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  platform_source TEXT NOT NULL, -- uber_eats, just_eat, deliveroo, foodhub, phone
  status TEXT NOT NULL DEFAULT 'new', -- new, accepted, rejected, preparing, ready, delivered, cancelled
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_postcode TEXT,
  customer_city TEXT,
  total_cents INTEGER NOT NULL, -- Store in pence/cents
  total_cents_tax INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  items TEXT NOT NULL, -- JSON array of order items
  order_created_at TEXT NOT NULL, -- HubRise timestamp
  order_updated_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_hubrise_order_id ON orders(hubrise_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_platform_source ON orders(platform_source);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_created_at ON orders(order_created_at);

-- Customers for CRM
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  address TEXT,
  postcode TEXT,
  city TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0,
  last_order_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_total_orders ON customers(total_orders);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON customers(last_order_date);

-- Record this migration
INSERT INTO migrations (name, applied_at) VALUES ('002_hubrise_integration', datetime('now'));
