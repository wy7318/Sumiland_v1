/*
  # Add Opportunity Number Column and Auto-Numbering

  1. Changes
    - Add opportunity_number column to opportunities table
    - Create sequence for opportunity numbers
    - Add trigger to auto-generate opportunity numbers
    - Backfill existing opportunities with numbers

  2. Details
    - Format: OPP# followed by sequential number (e.g., OPP#0001)
    - Numbers will be padded with leading zeros to 4 digits
    - Sequence starts at 1
    - Existing opportunities will be numbered sequentially by created date
*/

-- Create sequence for opportunity numbers
CREATE SEQUENCE IF NOT EXISTS opportunity_number_seq;

-- Add opportunity_number column
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS opportunity_number text;

-- Create function to generate opportunity number
CREATE OR REPLACE FUNCTION generate_opportunity_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.opportunity_number IS NULL THEN
    NEW.opportunity_number := 'OPP#' || LPAD(nextval('opportunity_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate opportunity number
DO $$ BEGIN
  CREATE TRIGGER set_opportunity_number
  BEFORE INSERT ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION generate_opportunity_number();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Backfill existing opportunities with numbers
WITH numbered_opportunities AS (
  SELECT 
    id,
    'OPP#' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 4, '0') as new_number
  FROM opportunities
  WHERE opportunity_number IS NULL
)
UPDATE opportunities o
SET opportunity_number = n.new_number
FROM numbered_opportunities n
WHERE o.id = n.id;

-- Set opportunity_number as unique
ALTER TABLE opportunities
ADD CONSTRAINT opportunities_number_unique UNIQUE (opportunity_number);