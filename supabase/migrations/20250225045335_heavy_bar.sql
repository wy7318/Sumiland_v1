-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quote_hdr CASCADE;
DROP FUNCTION IF EXISTS handle_quote_status_change() CASCADE;

-- Create improved trigger function with better validation and error handling
CREATE OR REPLACE FUNCTION handle_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  existing_order_id uuid;
BEGIN
  -- Only proceed if status is being changed to Approved
  IF NEW.status = 'Approved' THEN
    -- First check if quote is in a valid status for approval
    IF OLD.status NOT IN ('Pending', 'Draft') THEN
      -- Reset the status to the old value and raise error
      NEW.status := OLD.status;
      RAISE EXCEPTION 'Quote cannot be approved because it is %', OLD.status;
    END IF;

    -- Then check if an order already exists
    SELECT order_id INTO existing_order_id
    FROM order_hdr 
    WHERE quote_id = NEW.quote_id
    FOR UPDATE NOWAIT;

    IF FOUND THEN
      -- Reset the status to the old value and raise error
      NEW.status := OLD.status;
      RAISE EXCEPTION 'Order already exists for this quote';
    END IF;

    -- If all validations pass, try to create the order
    BEGIN
      PERFORM create_order_from_quote(
        NEW.quote_id,
        COALESCE(NEW.updated_by, NEW.created_by)
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- If order creation fails, reset status and re-raise the error
        NEW.status := OLD.status;
        RAISE;
    END;
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
Performs validations in correct order and properly resets status on failure.
1. Validates current status
2. Checks for existing order with proper locking
3. Attempts to create order
4. Resets status if any step fails';