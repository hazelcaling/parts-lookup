CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Extra part columns (both parts tables)
ALTER TABLE annual_parts ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE annual_parts
  ADD COLUMN IF NOT EXISTS vendor TEXT, ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT, ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS freight_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS obsolete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replacement_pn TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE catalog_parts
  ADD COLUMN IF NOT EXISTS vendor TEXT, ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT, ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS freight_usd NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS obsolete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replacement_pn TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS annual_parts_model_idx ON annual_parts (model);
CREATE INDEX IF NOT EXISTS catalog_parts_model_idx ON catalog_parts (model);
CREATE INDEX IF NOT EXISTS catalog_parts_pn_trgm ON catalog_parts USING gin (part_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS catalog_parts_desc_trgm ON catalog_parts USING gin (description gin_trgm_ops);

CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'contractor'
    CHECK (type IN ('contractor','wholesaler','end user','vendor')),
  address1 TEXT NOT NULL DEFAULT '', address2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT '', zipcode TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
-- "unique-ish": case/space-insensitive unique name
CREATE UNIQUE INDEX companies_name_uniq ON companies (lower(btrim(name)));

CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX contacts_company_idx ON contacts (company_id);

-- Simple saved job names for the quote form's Job autosuggest
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_id INT REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX jobs_name_uniq ON jobs (lower(btrim(name)));

CREATE TABLE price_lists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, vendor TEXT NOT NULL DEFAULT '', manufacturer TEXT NOT NULL DEFAULT '',
  effective_date DATE, file_name TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(), row_count INT NOT NULL DEFAULT 0);

CREATE TABLE price_list_items (
  id SERIAL PRIMARY KEY,
  price_list_id INT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  list_price NUMERIC(14,2), vendor TEXT NOT NULL DEFAULT '', manufacturer TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '', weight_lbs NUMERIC(12,3), freight_usd NUMERIC(12,2),
  notes TEXT NOT NULL DEFAULT '', obsolete BOOLEAN NOT NULL DEFAULT false,
  replacement_pn TEXT NOT NULL DEFAULT '', series TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
  raw JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX price_list_items_list_idx ON price_list_items (price_list_id);
CREATE INDEX price_list_items_pn_trgm ON price_list_items USING gin (part_number gin_trgm_ops);
CREATE INDEX price_list_items_desc_trgm ON price_list_items USING gin (description gin_trgm_ops);

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['annual_parts','catalog_parts','companies','contacts','jobs','price_list_items'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %1$s_updated_at ON %1$s', t);
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;
