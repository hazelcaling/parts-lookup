-- Contacts can be saved by name only; the company link is optional (existing contacts keep theirs)
ALTER TABLE contacts ALTER COLUMN company_id DROP NOT NULL;
