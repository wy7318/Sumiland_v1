-- Drop existing order number generation function if it exists
DROP FUNCTION IF EXISTS generate_order_number();

-- Create organization-specific order number generation function
CREATE OR REPLACE FUNCTION generate_order_number(org_id uuid)
RETURNS text AS $$
DECLARE
  year text;
  sequence_number integer;
  new_order_number text;
BEGIN
  year := to_char(current_date, 'YY');
  
  -- Get the next sequence number for the current year and organization
  WITH sequence AS (
    SELECT COUNT(*) + 1 as next_num
    FROM order_hdr
    WHERE order_number LIKE 'ORD' || year || '%'
    AND organization_id = org_id
  )
  SELECT next_num INTO sequence_number FROM sequence;
  
  -- Format: ORD[YY][5-digit sequence]
  new_order_number := 'ORD' || year || LPAD(sequence_number::text, 5, '0');
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Drop existing unique constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_hdr_order_number_key'
  ) THEN
    ALTER TABLE order_hdr DROP CONSTRAINT order_hdr_order_number_key;
  END IF;
END $$;

-- Add new composite unique constraint
ALTER TABLE order_hdr
ADD CONSTRAINT order_hdr_order_number_org_key 
UNIQUE (order_number, organization_id);

-- Update create_order_from_quote function to use organization-specific order number
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
  LIMIT 1;

  IF existing_order.order_id IS NOT NULL THEN
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

-- Add comments
COMMENT ON FUNCTION generate_order_number(uuid) IS 
'Generates a unique order number in the format ORD[YY][5-digit sequence] for a specific organization';

COMMENT ON CONSTRAINT order_hdr_order_number_org_key ON order_hdr IS 
'Ensures order numbers are unique within each organization';