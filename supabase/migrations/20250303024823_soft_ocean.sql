-- Drop unique constraint on phone number if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_phone_key'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_phone_key;
  END IF;
END $$;

-- Drop unique constraint on email if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_email_key'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_email_key;
  END IF;
END $$;

-- Add composite unique constraint for email within organization
ALTER TABLE customers
ADD CONSTRAINT customers_email_org_key UNIQUE (email, organization_id);

-- Add index for phone number searches
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Add comment
COMMENT ON COLUMN customers.phone IS 'Customer phone number (non-unique to allow multiple contacts per account)';
COMMENT ON CONSTRAINT customers_email_org_key ON customers IS 'Ensures email addresses are unique within each organization';