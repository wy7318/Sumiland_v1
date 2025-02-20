/*
  # Create Order Management System

  1. New Tables
    - order_hdr
      - order_id (uuid, primary key)
      - order_number (text, unique)
      - customer_id (uuid, references customers)
      - status (enum)
      - payment_status (enum)
      - payment_amount (decimal)
      - notes (text)
      - created_at (timestamptz)
      - created_by (uuid, references profiles)
      - updated_at (timestamptz)
      - updated_by (uuid, references profiles)
      - quote_id (uuid, references quote_hdr)

    - order_dtl
      - order_dtl_id (uuid, primary key)
      - order_id (uuid, references order_hdr)
      - product_id (uuid, references products)
      - quantity (integer)
      - unit_price (decimal)
      - subtotal (decimal)
      - notes (text)

  2. Functions
    - create_order_from_quote: Creates an order from a quote
    - validate_payment_status: Validates payment status based on amount
    - validate_order_completion: Validates order completion based on payment

  3. Triggers
    - order_payment_validation: Ensures payment amount doesn't exceed total
    - order_completion_validation: Ensures order can't be completed without full payment
*/

-- Create order status enum
CREATE TYPE order_status AS ENUM (
  'New',
  'In Progress',
  'In Review',
  'Completed',
  'Cancelled'
);

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
  'Pending',
  'Partial Received',
  'Fully Received'
);

-- Create order_hdr table
CREATE TABLE IF NOT EXISTS order_hdr (
  order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(customer_id) NOT NULL,
  status order_status NOT NULL DEFAULT 'New',
  payment_status payment_status NOT NULL DEFAULT 'Pending',
  payment_amount decimal(15,2) NOT NULL DEFAULT 0,
  payment_percent decimal(5,2),
  total_amount decimal(15,2) NOT NULL DEFAULT 0,
  notes text,
  quote_id uuid REFERENCES quote_hdr(quote_id),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES profiles(id)
);

-- Create order_dtl table
CREATE TABLE IF NOT EXISTS order_dtl (
  order_dtl_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES order_hdr(order_id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(15,2) NOT NULL,
  subtotal decimal(15,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number integer;
  new_order_number text;
BEGIN
  year := to_char(current_date, 'YY');
  
  -- Get the next sequence number for the current year
  WITH sequence AS (
    SELECT COUNT(*) + 1 as next_num
    FROM order_hdr
    WHERE order_number LIKE 'ORD' || year || '%'
  )
  SELECT next_num INTO sequence_number FROM sequence;
  
  -- Format: ORD[YY][5-digit sequence]
  new_order_number := 'ORD' || year || LPAD(sequence_number::text, 5, '0');
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create order from quote
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
    updated_by
  )
  VALUES (
    generate_order_number(),
    quote_record.customer_id,
    quote_record.total_amount,
    quote_id_param,
    user_id_param,
    user_id_param
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
  
  RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate payment amount
CREATE OR REPLACE FUNCTION validate_payment_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate payment percent
  NEW.payment_percent := CASE 
    WHEN NEW.total_amount > 0 
    THEN ROUND((NEW.payment_amount / NEW.total_amount) * 100, 2)
    ELSE 0 
  END;

  -- Validate payment amount doesn't exceed total
  IF NEW.payment_amount > NEW.total_amount THEN
    RAISE EXCEPTION 'Payment amount cannot exceed total order amount';
  END IF;

  -- Update payment status based on amount
  NEW.payment_status := CASE
    WHEN NEW.payment_amount = 0 THEN 'Pending'
    WHEN NEW.payment_amount = NEW.total_amount THEN 'Fully Received'
    WHEN NEW.payment_amount < NEW.total_amount THEN 'Partial Received'
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate order completion
CREATE OR REPLACE FUNCTION validate_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent completion if payment is not fully received
  IF NEW.status = 'Completed' AND NEW.payment_status != 'Fully Received' THEN
    RAISE EXCEPTION 'Order cannot be completed until payment is fully received';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER order_payment_validation
  BEFORE INSERT OR UPDATE OF payment_amount, total_amount
  ON order_hdr
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_amount();

CREATE TRIGGER order_completion_validation
  BEFORE INSERT OR UPDATE OF status
  ON order_hdr
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_completion();

-- Enable RLS
ALTER TABLE order_hdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_dtl ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Orders viewable by authenticated users"
  ON order_hdr
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Orders insertable by authenticated users"
  ON order_hdr
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Orders updatable by authenticated users"
  ON order_hdr
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Order details viewable by authenticated users"
  ON order_dtl
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Order details insertable by authenticated users"
  ON order_dtl
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Order details updatable by authenticated users"
  ON order_dtl
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_order_hdr_customer ON order_hdr(customer_id);
CREATE INDEX idx_order_hdr_quote ON order_hdr(quote_id);
CREATE INDEX idx_order_hdr_status ON order_hdr(status);
CREATE INDEX idx_order_hdr_payment_status ON order_hdr(payment_status);
CREATE INDEX idx_order_dtl_order ON order_dtl(order_id);
CREATE INDEX idx_order_dtl_product ON order_dtl(product_id);