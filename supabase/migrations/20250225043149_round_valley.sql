-- Add organization_id to order tables if they don't exist
ALTER TABLE order_hdr 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

ALTER TABLE order_dtl 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Add vendor_id to order_hdr
ALTER TABLE order_hdr
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_hdr_organization ON order_hdr(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_dtl_organization ON order_dtl(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_hdr_vendor ON order_hdr(vendor_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Orders viewable by authenticated users" ON order_hdr;
DROP POLICY IF EXISTS "Orders insertable by authenticated users" ON order_hdr;
DROP POLICY IF EXISTS "Orders updatable by authenticated users" ON order_hdr;
DROP POLICY IF EXISTS "Order details viewable by authenticated users" ON order_dtl;
DROP POLICY IF EXISTS "Order details insertable by authenticated users" ON order_dtl;
DROP POLICY IF EXISTS "Order details updatable by authenticated users" ON order_dtl;

-- Create new policies for order_hdr
CREATE POLICY "Orders are viewable by organization members"
ON order_hdr FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Orders can be managed by organization members"
ON order_hdr FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

-- Create new policies for order_dtl
CREATE POLICY "Order details are viewable by organization members"
ON order_dtl FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Order details can be managed by organization members"
ON order_dtl FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

-- Update create_order_from_quote function to include organization_id and vendor_id
CREATE OR REPLACE FUNCTION create_order_from_quote(
  quote_id_param uuid,
  user_id_param uuid
)
RETURNS uuid AS $$
DECLARE
  new_order_id uuid;
  quote_record RECORD;
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
  FOR UPDATE;  -- Lock the row to prevent concurrent modifications

  -- Validate quote exists
  IF quote_record.quote_id IS NULL THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Check if an order already exists for this quote
  IF EXISTS (
    SELECT 1 
    FROM order_hdr 
    WHERE quote_id = quote_id_param
  ) THEN
    RAISE EXCEPTION 'Order already exists for this quote';
  END IF;

  -- Validate quote status
  IF quote_record.status = 'Approved' THEN
    RAISE EXCEPTION 'Quote is already approved';
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
    generate_order_number(),
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
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN order_hdr.organization_id IS 'The organization this order belongs to';
COMMENT ON COLUMN order_dtl.organization_id IS 'The organization this order detail belongs to (matches order header)';
COMMENT ON COLUMN order_hdr.vendor_id IS 'Reference to the account (vendor) associated with this order';