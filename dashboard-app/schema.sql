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
