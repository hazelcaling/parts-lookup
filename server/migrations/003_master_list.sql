-- Allow "no price" (e.g. obsolete-model IPL parts without a known list price)
ALTER TABLE catalog_parts ALTER COLUMN list_price DROP NOT NULL;
ALTER TABLE catalog_parts ALTER COLUMN list_price DROP DEFAULT;
-- When a user edits notes inline, remember it so re-seeding keeps the edit
ALTER TABLE catalog_parts ADD COLUMN IF NOT EXISTS notes_edited_at TIMESTAMPTZ;
ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS notes_edited_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS catalog_parts_series_idx ON catalog_parts (series);
CREATE INDEX IF NOT EXISTS catalog_parts_category_idx ON catalog_parts (category);
CREATE INDEX IF NOT EXISTS price_list_items_series_idx ON price_list_items (series);
CREATE INDEX IF NOT EXISTS price_list_items_category_idx ON price_list_items (category);
