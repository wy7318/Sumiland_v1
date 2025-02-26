-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS quote_status_change_trigger ON quote_hdr CASCADE;
DROP FUNCTION IF EXISTS handle_quote_status_change() CASCADE;
DROP FUNCTION IF EXISTS create_order_from_quote(uuid, uuid) CASCADE;

-- Create optimized function to create order from quote
CREATE OR REPLACE FUNCTION create_order_from_quote(
  quote_id_param uuid,
  user_id_param uuid
)
RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
  quote_record RECORD;
  existing_order RECORD;
BEGIN
  -- Get quote information with FOR UPDATE lock
  SELECT 
    q.quote_id,
    q.customer_id,
    q.vendor_id,
    q.organization_id,
    q.total_amount,
    q.notes,
    q.status
  INTO quote_record
  FROM quote_hdr q
  WHERE q.quote_id = quote_id_param
  FOR UPDATE NOWAIT;  -- Add NOWAIT to fail fast if row is locked

  -- Validate quote exists
  IF quote_record.quote_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Check if an order already exists for this quote
  SELECT order_id INTO existing_order
  FROM order_hdr
  WHERE quote_id = quote_id_param
  FOR UPDATE NOWAIT;

  IF FOUND THEN
    RAISE EXCEPTION 'Order already exists for this quote';
  END IF;

  -- Validate quote status
  IF quote_record.status = 'Approved' THEN
    RAISE EXCEPTION 'Quote is already approved';
  END IF;

  -- Validate quote is in a valid status for approval
  IF quote_record.status NOT IN ('Pending', 'Draft') THEN
    RAISE EXCEPTION 'Quote cannot be approved because it is %', quote_record.status;
  END IF;
  
  -- Create order in a single transaction
  INSERT INTO order_hdr (
    order_number,
    customer_id,
    vendor_id,
    organization_id,
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
    generate_order_number(quote_record.organization_id),  -- Use organization-specific order number
    quote_record.customer_id,
    quote_record.vendor_id,
    quote_record.organization_id,
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
    notes,
    organization_id
  )
  SELECT
    new_order_id,
    NULL,
    quantity,
    unit_price,
    quantity * unit_price,
    item_desc,
    quote_record.organization_id
  FROM quote_dtl
  WHERE quote_id = quote_id_param;
  
  -- Update quote status
  UPDATE quote_hdr
  SET 
    status = 'Approved',
    updated_at = now(),
    updated_by = user_id_param
  WHERE quote_id = quote_id_param;
  
  RETURN new_order_id;
EXCEPTION
  WHEN lock_not_available THEN
    RAISE EXCEPTION 'Quote is currently being processed by another user';
  WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error creating order: %', SQLERRM;
    -- Re-raise the error
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Create non-recursive trigger function with simpler validation
CREATE OR REPLACE FUNCTION handle_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to Approved
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    -- Check if quote is in a valid status for approval
    IF OLD.status NOT IN ('Pending', 'Draft') THEN
      RAISE EXCEPTION 'Quote cannot be approved because it is %', OLD.status;
    END IF;

    -- Create order (order existence check is handled in create_order_from_quote)
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

-- Add comments
COMMENT ON FUNCTION create_order_from_quote(uuid, uuid) IS 
'Creates a new order from a quote with optimized performance and error handling.
Handles all order existence checks and row locking.';

COMMENT ON FUNCTION handle_quote_status_change() IS 
'Handles quote status changes with minimal validation.
Delegates order existence checks to create_order_from_quote function.';