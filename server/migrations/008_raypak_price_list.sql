-- A Raypak price list (price_lists.is_raypak) drives the list prices of the Raypak catalog (catalog_parts):
-- catalog_parts.price_list_id = the Raypak list that set the price (or cleared it: PN not in that list);
-- catalog_parts.from_price_list = row was added by a Raypak list (PN not in any IPL).
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS is_raypak BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE catalog_parts ADD COLUMN IF NOT EXISTS price_list_id INT REFERENCES price_lists(id) ON DELETE SET NULL;
ALTER TABLE catalog_parts ADD COLUMN IF NOT EXISTS from_price_list BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS catalog_parts_upper_pn_idx ON catalog_parts (upper(part_number));
CREATE INDEX IF NOT EXISTS price_list_items_upper_pn_idx ON price_list_items (price_list_id, upper(part_number));
