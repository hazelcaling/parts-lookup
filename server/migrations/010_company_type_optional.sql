-- Company type is optional (blank = NULL). Existing companies keep their type.
ALTER TABLE companies ALTER COLUMN type DROP NOT NULL;
ALTER TABLE companies ALTER COLUMN type DROP DEFAULT;
-- CHECK (type IN (...)) already passes for NULL; re-create it explicitly so NULL is allowed
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'companies'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%type%' LOOP
    EXECUTE format('ALTER TABLE companies DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE companies ADD CONSTRAINT companies_type_check
  CHECK (type IS NULL OR type IN ('contractor','wholesaler','end user','vendor'));
