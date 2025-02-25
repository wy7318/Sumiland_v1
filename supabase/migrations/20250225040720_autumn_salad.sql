-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS set_quote_number_trigger ON quote_hdr CASCADE;
DROP FUNCTION IF EXISTS set_quote_number() CASCADE;
DROP FUNCTION IF EXISTS generate_quote_number() CASCADE;

-- Create function to generate organization-specific quote number
CREATE OR REPLACE FUNCTION generate_quote_number(org_id uuid)
RETURNS text AS $$
DECLARE
  year text;
  sequence_number integer;
  new_quote_number text;
BEGIN
  year := to_char(current_date, 'YY');
  
  -- Get the next sequence number for the current year and organization
  WITH sequence AS (
    SELECT COUNT(*) + 1 as next_num
    FROM quote_hdr
    WHERE quote_number LIKE 'QT' || year || '%'
    AND organization_id = org_id
  )
  SELECT next_num INTO sequence_number FROM sequence;
  
  -- Format: QT[YY][5-digit sequence]
  new_quote_number := 'QT' || year || LPAD(sequence_number::text, 5, '0');
  
  RETURN new_quote_number;
END;
$$ LANGUAGE plpgsql;

-- Add trigger function to set quote number on insert
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set quote number if it's not already set
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON quote_hdr
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

-- Drop existing unique constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quote_hdr_quote_number_key'
  ) THEN
    ALTER TABLE quote_hdr DROP CONSTRAINT quote_hdr_quote_number_key;
  END IF;
END $$;

-- Add new composite unique constraint
ALTER TABLE quote_hdr
ADD CONSTRAINT quote_hdr_quote_number_org_key 
UNIQUE (quote_number, organization_id);

-- Add comments
COMMENT ON FUNCTION generate_quote_number(uuid) IS 
'Generates a unique quote number in the format QT[YY][5-digit sequence] for a specific organization';

COMMENT ON FUNCTION set_quote_number() IS 
'Automatically sets organization-specific quote number on new quotes if not already set';

COMMENT ON CONSTRAINT quote_hdr_quote_number_org_key ON quote_hdr IS 
'Ensures quote numbers are unique within each organization';