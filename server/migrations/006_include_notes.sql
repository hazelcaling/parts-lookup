-- Generated assembly notes ("Included in 1-J 007150F" / "Includes 2-J 006533F, ...") per model
ALTER TABLE catalog_parts
  ADD COLUMN IF NOT EXISTS parent_call_out TEXT,
  ADD COLUMN IF NOT EXISTS include_note TEXT NOT NULL DEFAULT '';
