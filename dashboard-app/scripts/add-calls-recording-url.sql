-- Run once if your calls table was created before recording_url was added.
-- Vercel Postgres: Dashboard → Storage → your DB → Query.

ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
