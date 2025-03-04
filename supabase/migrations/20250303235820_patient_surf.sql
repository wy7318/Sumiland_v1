-- Add audit columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON customers(updated_by);

-- Add comments
COMMENT ON COLUMN customers.created_by IS 'User who created the customer';
COMMENT ON COLUMN customers.updated_by IS 'User who last updated the customer';