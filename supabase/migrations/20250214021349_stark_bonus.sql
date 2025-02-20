-- Create function to create order from quote
CREATE OR REPLACE FUNCTION create_order_from_quote(
  quote_id_param uuid,
  user_id_param uuid
)
RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
  quote_record RECORD;
BEGIN
  -- Get quote information
  SELECT * INTO quote_record
  FROM quote_hdr
  WHERE quote_id = quote_id_param;
  
  -- Insert order header
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
    NULL, -- product_id is NULL as quotes don't have product references
    quantity,
    unit_price,
    quantity * unit_price,
    item_desc
  FROM quote_dtl
  WHERE quote_id = quote_id_param;
  
  -- Update quote status to Approved
  UPDATE quote_hdr
  SET status = 'Approved',
      updated_at = now()
  WHERE quote_id = quote_id_param;
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;