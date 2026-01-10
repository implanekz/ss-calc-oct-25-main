-- Add first and last name fields to partners
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Optional: backfill or keep nulls; UI will handle missing values gracefully.

