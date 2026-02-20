-- Run this once on your database to add per-user Retell API key.
-- Vercel Postgres: run in Dashboard → Storage → your DB → Query, or via psql.

-- PostgreSQL:
ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_api_key TEXT;

-- SQLite (if using locally):
-- ALTER TABLE users ADD COLUMN retell_api_key TEXT;
