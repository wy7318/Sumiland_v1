-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quote_hdr;
DROP FUNCTION IF EXISTS handle_quote_status_change();
DROP FUNCTION IF EXISTS create_order_from_quote(uuid, uuid);

-- Create optimized function to create order from quote
CREATE OR REPLACE FUNCTION create_order_from_quote(
  quote_id_param uuid,
  user_id_param uuid
)
RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
  quote_record RECORD;
BEGIN
  -- Get quote information in a single query
  SELECT 
    q.quote_id,
    q.customer_id,
    q.total_amount,
    q.notes,
    q.status
  INTO quote_record
  FROM quote_hdr q
  WHERE q.quote_id = quote_id_param
  FOR UPDATE;  -- Lock the row to prevent concurrent modifications

  -- Validate quote exists
  IF quote_record.quote_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Validate quote is not already approved
  IF quote_record.status = 'Approved' THEN
    RAISE EXCEPTION 'Quote is already approved';
  END IF;
  
  -- Create order in a single transaction
  INSERT INTO order_hdr (
    order_number,
    customer_id,
    total_amount,
    quote_id,
    created_by,
    updated_by,
    notes,
    status,
    payment_status,
    payment_amount
  )
  VALUES (
    generate_order_number(),
    quote_record.customer_id,
    quote_record.total_amount,
    quote_id_param,
    user_id_param,
    user_id_param,
    quote_record.notes,
    'New'::order_status,
    'Pending'::payment_status,
    0
  )
  RETURNING order_id INTO new_order_id;
  
  -- Copy quote details to order details
  INSERT INTO order_dtl (
    order_id,
    product_id,
    quantity,
    unit_price,
    subtotal,
    notes
  )
  SELECT
    new_order_id,
    NULL,
    quantity,
    unit_price,
    quantity * unit_price,
    item_desc
  FROM quote_dtl
  WHERE quote_id = quote_id_param;
  
  -- Update quote status directly
  UPDATE quote_hdr
  SET 
    status = 'Approved',
    updated_at = now(),
    updated_by = user_id_param
  WHERE quote_id = quote_id_param;
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- Create non-recursive trigger function
CREATE OR REPLACE FUNCTION handle_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to Approved
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    -- Call create_order_from_quote directly
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
  AFTER UPDATE OF status
  ON quote_hdr
  FOR EACH ROW
  WHEN (NEW.status = 'Approved' AND OLD.status != 'Approved')
  EXECUTE FUNCTION handle_quote_status_change();

-- Add comments
COMMENT ON FUNCTION create_order_from_quote(uuid, uuid) IS 
'Creates a new order from a quote with optimized performance and error handling';

COMMENT ON FUNCTION handle_quote_status_change() IS 
'Handles quote status changes with improved efficiency and reduced stack usage';