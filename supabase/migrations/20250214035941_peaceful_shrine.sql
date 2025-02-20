-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quote_hdr;
DROP FUNCTION IF EXISTS handle_quote_status_change();

-- Create optimized function to handle quote status changes
CREATE OR REPLACE FUNCTION handle_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to Approved
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    -- Check if an order already exists
    IF EXISTS (
      SELECT 1 
      FROM order_hdr 
      WHERE quote_id = NEW.quote_id
      FOR UPDATE NOWAIT
    ) THEN
      RAISE EXCEPTION 'Order already exists for this quote';
    END IF;

    -- Call create_order_from_quote directly
    PERFORM create_order_from_quote(
      NEW.quote_id,
      COALESCE(NEW.updated_by, NEW.created_by)
    );

    -- Return NEW to ensure the status change is saved
    RETURN NEW;
  END IF;
  
  -- For all other status changes, just return NEW
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
'Handles quote status changes and creates orders for approved quotes';