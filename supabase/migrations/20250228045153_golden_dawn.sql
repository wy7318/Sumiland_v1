-- Drop existing type check constraint if it exists
ALTER TABLE vendors 
DROP CONSTRAINT IF EXISTS vendors_type_check;

-- Drop existing status check constraint if it exists
ALTER TABLE vendors 
DROP CONSTRAINT IF EXISTS vendors_status_check;

-- Add comment
COMMENT ON TABLE vendors IS 'Stores vendor/account information with picklist-based type and status values';