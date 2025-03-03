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

-- Add index for phone number searches
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Add comment
COMMENT ON COLUMN customers.phone IS 'Customer phone number (non-unique to allow multiple contacts per account)';