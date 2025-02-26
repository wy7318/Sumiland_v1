-- Add description column to order_dtl
ALTER TABLE order_dtl
ADD COLUMN IF NOT EXISTS description text;

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_order_dtl_description ON order_dtl(description);

-- Update create_order_from_quote function to handle description
CREATE OR REPLACE FUNCTION create_order_from_quote(
  quote_id_param uuid,
  user_id_param uuid
)
RETURNS uuid AS $$
#variable_conflict use_column
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
  FOR UPDATE;

  -- Basic validations
  IF quote_record.quote_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  IF quote_record.status = 'Approved' THEN
    RAISE EXCEPTION 'Quote is already approved';
  END IF;

  IF quote_record.status NOT IN ('Pending', 'Draft') THEN
    RAISE EXCEPTION 'Quote cannot be approved because it is %', quote_record.status;
  END IF;

  -- Check for existing order with FOR UPDATE
  PERFORM 1 
  FROM order_hdr 
  WHERE quote_id = quote_id_param
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Order already exists for this quote';
  END IF;

  -- Create order
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
    generate_order_number(quote_record.organization_id),
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
  
  -- Copy quote details to order details with description
  INSERT INTO order_dtl (
    order_id,
    product_id,
    quantity,
    unit_price,
    subtotal,
    notes,
    organization_id,
    description  -- Add description field
  )
  SELECT
    new_order_id,
    NULL,
    quantity,
    unit_price,
    quantity * unit_price,
    item_desc,
    quote_record.organization_id,
    item_desc  -- Copy item_desc to description
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
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN order_dtl.description IS 'Detailed description of the order item, copied from quote_dtl.item_desc and editable';