-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quote_hdr CASCADE;
DROP FUNCTION IF EXISTS handle_quote_status_change() CASCADE;

-- Create improved trigger function with better validation
CREATE OR REPLACE FUNCTION handle_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to Approved
  IF NEW.status = 'Approved' THEN
    -- Check if quote exists in order_hdr
    IF EXISTS (
      SELECT 1 
      FROM order_hdr 
      WHERE quote_id = NEW.quote_id
    ) THEN
      -- Reset the status to the old value
      NEW.status := OLD.status;
      RAISE EXCEPTION 'Order already exists for this quote';
    END IF;

    -- Check if quote is in a valid status for approval
    IF OLD.status NOT IN ('Pending', 'Draft') THEN
      -- Reset the status to the old value
      NEW.status := OLD.status;
      RAISE EXCEPTION 'Quote cannot be approved because it is %', OLD.status;
    END IF;

    -- Create order
    PERFORM create_order_from_quote(
      NEW.quote_id,
      COALESCE(NEW.updated_by, NEW.created_by)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger with proper timing
CREATE TRIGGER quote_status_change_trigger
  BEFORE UPDATE OF status
  ON quote_hdr
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status != 'Approved')
  EXECUTE FUNCTION handle_quote_status_change();

-- Add comment
COMMENT ON FUNCTION handle_quote_status_change() IS 
'Handles quote status changes with improved validation and error handling.
Resets status to original value if validation fails.';