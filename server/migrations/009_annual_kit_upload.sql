-- Price list uploads: "Annual Kit (Y/N)" and "Qty" (default qty for the annual kit)
ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS annual_kit BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS qty DOUBLE PRECISION;
