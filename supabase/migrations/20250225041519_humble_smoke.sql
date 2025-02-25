-- Add vendor_id to quote_hdr
ALTER TABLE quote_hdr
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quote_hdr_vendor ON quote_hdr(vendor_id);

-- Add comment
COMMENT ON COLUMN quote_hdr.vendor_id IS 'Reference to the account (vendor) associated with this quote';