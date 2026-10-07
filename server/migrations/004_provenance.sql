-- Import provenance lives in hidden columns, not in user notes
ALTER TABLE catalog_parts
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS price_source TEXT,
  ADD COLUMN IF NOT EXISTS ipl_qty TEXT;
