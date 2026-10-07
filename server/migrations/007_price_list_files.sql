-- Keep the original uploaded price list file in the database (the Render web service disk is ephemeral).
-- file_name (already present) holds the original file name. Lists uploaded before this have file_data NULL.
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS file_mime TEXT NOT NULL DEFAULT '';
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS file_size INT;
