-- Tam şema: tablolar + eksik sütunlar (Neon / PostgreSQL)
-- Neon SQL Editor'da tek seferde çalıştırabilirsin.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  image TEXT,
  google_id TEXT UNIQUE,
  apple_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  duration INTEGER,
  status TEXT NOT NULL,
  outcome TEXT,
  transcript TEXT,
  call_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

-- Eksik sütunları ekle (tablolar zaten varsa sadece bunlar çalışır)
ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_api_key TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_cost_cents INTEGER;
