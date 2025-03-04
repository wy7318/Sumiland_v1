/*
  # Add tax fields to quotes

  1. Changes
    - Add tax_percent and tax_amount to quote_hdr
    - Add subtotal field to quote_hdr to store pre-tax amount
    - Add indexes for better performance
    
  2. Notes
    - All new fields are nullable
    - tax_percent is stored as decimal(5,2) to handle percentages like 7.25%
    - tax_amount and subtotal use decimal(15,2) for consistency with total_amount
*/

-- Add tax and subtotal fields to quote_hdr
ALTER TABLE quote_hdr
ADD COLUMN IF NOT EXISTS tax_percent decimal(5,2),
ADD COLUMN IF NOT EXISTS tax_amount decimal(15,2),
ADD COLUMN IF NOT EXISTS subtotal decimal(15,2);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_hdr_tax ON quote_hdr(tax_percent);
CREATE INDEX IF NOT EXISTS idx_quote_hdr_subtotal ON quote_hdr(subtotal);

-- Add comments
COMMENT ON COLUMN quote_hdr.tax_percent IS 'Tax percentage applied to the quote (e.g., 7.25)';
COMMENT ON COLUMN quote_hdr.tax_amount IS 'Calculated tax amount based on subtotal and tax percentage';
COMMENT ON COLUMN quote_hdr.subtotal IS 'Total amount before tax';