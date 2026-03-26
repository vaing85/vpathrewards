-- Add link checking columns to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS link_status TEXT DEFAULT 'unchecked';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS link_last_checked TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS link_error TEXT;

-- link_status values: 'unchecked' | 'ok' | 'broken' | 'expired' | 'unknown'
