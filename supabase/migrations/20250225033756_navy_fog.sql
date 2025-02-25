-- Add new fields to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('Customer', 'Distributor', 'Vendor', 'Manufacturer', 'Corporate')),
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(customer_id),
ADD COLUMN IF NOT EXISTS shipping_address_line1 text,
ADD COLUMN IF NOT EXISTS shipping_address_line2 text,
ADD COLUMN IF NOT EXISTS shipping_city text,
ADD COLUMN IF NOT EXISTS shipping_state text,
ADD COLUMN IF NOT EXISTS shipping_country text,
ADD COLUMN IF NOT EXISTS billing_address_line1 text,
ADD COLUMN IF NOT EXISTS billing_address_line2 text,
ADD COLUMN IF NOT EXISTS billing_city text,
ADD COLUMN IF NOT EXISTS billing_state text,
ADD COLUMN IF NOT EXISTS billing_country text,
ADD COLUMN IF NOT EXISTS use_shipping_for_billing boolean DEFAULT false;

-- Drop old address column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'address'
  ) THEN
    ALTER TABLE vendors DROP COLUMN address;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_customer ON vendors(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);

-- Add comments
COMMENT ON COLUMN vendors.type IS 'Type of account (Customer, Distributor, Vendor, Manufacturer, Corporate)';
COMMENT ON COLUMN vendors.customer_id IS 'Reference to customer record for contact information';
COMMENT ON COLUMN vendors.use_shipping_for_billing IS 'Flag to indicate if billing address should match shipping address';