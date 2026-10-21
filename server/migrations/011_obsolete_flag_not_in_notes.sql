-- Notes hold only IPL / user text. "Obsolete" is shown from the obsolete flag, not stored in notes.
-- Strip the marker the Raypak rule used to append ("; Obsolete" / "Obsolete") from rows flagged obsolete.
UPDATE catalog_parts SET notes = regexp_replace(notes, '(^|; )Obsolete$', '')
 WHERE obsolete AND notes ~ '(^|; )Obsolete$';
UPDATE annual_parts SET notes = regexp_replace(notes, '(^|; )Obsolete$', '')
 WHERE obsolete AND notes ~ '(^|; )Obsolete$';
ALTER TABLE annual_parts ADD COLUMN IF NOT EXISTS notes_edited_at TIMESTAMPTZ;
