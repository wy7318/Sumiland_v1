-- Add updated_by field to quote_hdr
ALTER TABLE quote_hdr
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);

-- Add updated_by field to quote_dtl
ALTER TABLE quote_dtl
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quote_hdr_updated_by ON quote_hdr(updated_by);
CREATE INDEX IF NOT EXISTS idx_quote_dtl_updated_by ON quote_dtl(updated_by);

-- Add comment to document the columns
COMMENT ON COLUMN quote_hdr.updated_by IS 'User who last updated the quote';
COMMENT ON COLUMN quote_dtl.updated_by IS 'User who last updated the quote detail';