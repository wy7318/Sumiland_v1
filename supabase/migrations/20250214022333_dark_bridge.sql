-- Create trigger function to handle quote status changes
CREATE OR REPLACE FUNCTION handle_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to Approved
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status != 'Approved') THEN
    -- Get the user who made the change
    PERFORM create_order_from_quote(
      NEW.quote_id,
      COALESCE(NEW.updated_by, NEW.created_by)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quote_hdr;
CREATE TRIGGER quote_status_change_trigger
  BEFORE UPDATE OF status
  ON quote_hdr
  FOR EACH ROW
  EXECUTE FUNCTION handle_quote_status_change();

-- Add comment
COMMENT ON FUNCTION handle_quote_status_change() IS 
'Automatically creates an order when a quote status is changed to Approved';