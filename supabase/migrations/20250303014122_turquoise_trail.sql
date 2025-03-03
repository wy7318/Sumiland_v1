-- Add vendor_id to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customers_vendor ON customers(vendor_id);

-- Add comment
COMMENT ON COLUMN customers.vendor_id IS 'Reference to the account (vendor) this customer belongs to';

-- Update RLS policies to include vendor access
CREATE POLICY "Customers are viewable by their vendor"
ON customers FOR SELECT
TO authenticated
USING (
  vendor_id IN (
    SELECT id FROM vendors
    WHERE organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);