-- Source notes from the IPL ("Includes 2-B ...") are shown under the description, not in user Notes
ALTER TABLE catalog_parts
  ADD COLUMN IF NOT EXISTS desc_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_option BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS option_group TEXT;
CREATE INDEX IF NOT EXISTS catalog_parts_series_callout_idx ON catalog_parts (series, call_out);
