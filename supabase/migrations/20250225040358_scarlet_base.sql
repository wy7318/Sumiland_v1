-- Create function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number integer;
  new_quote_number text;
BEGIN
  year := to_char(current_date, 'YY');
  
  -- Get the next sequence number for the current year
  WITH sequence AS (
    SELECT COUNT(*) + 1 as next_num
    FROM quote_hdr
    WHERE quote_number LIKE 'QT' || year || '%'
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
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_quote_number_trigger ON quote_hdr;
CREATE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON quote_hdr
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

-- Add comments
COMMENT ON FUNCTION generate_quote_number() IS 
'Generates a unique quote number in the format QT[YY][5-digit sequence]';

COMMENT ON FUNCTION set_quote_number() IS 
'Automatically sets quote number on new quotes if not already set';