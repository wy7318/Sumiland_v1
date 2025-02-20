/*
  # Inventory Management System Schema

  1. Updates to Products Table
    - Add cost tracking fields
    - Add inventory tracking fields
    - Add alert thresholds

  2. New Tables
    - inventory_transactions: Track all inventory movements
    - work_orders: Track order fulfillment
    - purchase_orders: Track vendor orders
    - vendors: Store vendor information
    - inventory_alerts: Track low stock notifications
*/

-- Add cost and inventory fields to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS avg_cost decimal(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock_level decimal(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stock_level decimal(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stock_unit text CHECK (stock_unit IN ('weight', 'quantity')) DEFAULT 'quantity',
ADD COLUMN IF NOT EXISTS weight_unit text CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vendor_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_purchase_cost decimal(15,2) DEFAULT 0;

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  contact_person text,
  status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  payment_terms text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) NOT NULL,
  status text CHECK (status IN ('draft', 'sent', 'received', 'cancelled')) DEFAULT 'draft',
  total_amount decimal(15,2) DEFAULT 0,
  expected_delivery_date date,
  actual_delivery_date date,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity decimal(15,2) NOT NULL,
  unit_cost decimal(15,2) NOT NULL,
  received_quantity decimal(15,2) DEFAULT 0,
  status text CHECK (status IN ('pending', 'partial', 'received')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  transaction_type text CHECK (
    transaction_type IN (
      'purchase_received',
      'work_order_out',
      'work_order_return',
      'adjustment',
      'damaged',
      'transfer'
    )
  ) NOT NULL,
  quantity decimal(15,2) NOT NULL,
  weight decimal(15,2),
  weight_unit text CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz')),
  unit_cost decimal(15,2),
  reference_id uuid, -- Can reference PO, work order, etc.
  reference_type text CHECK (
    reference_type IN (
      'purchase_order',
      'work_order',
      'adjustment'
    )
  ),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES order_hdr(order_id),
  status text CHECK (
    status IN (
      'draft',
      'in_progress',
      'completed',
      'cancelled'
    )
  ) DEFAULT 'draft',
  assigned_to uuid REFERENCES profiles(id),
  scheduled_date date,
  completion_date date,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Create work_order_items table
CREATE TABLE IF NOT EXISTS work_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity_required decimal(15,2) NOT NULL,
  quantity_consumed decimal(15,2) DEFAULT 0,
  quantity_returned decimal(15,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  alert_type text CHECK (
    alert_type IN (
      'low_stock',
      'overstock',
      'expiring'
    )
  ) NOT NULL,
  status text CHECK (
    status IN (
      'new',
      'acknowledged',
      'resolved'
    )
  ) DEFAULT 'new',
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- Create function to calculate average cost
CREATE OR REPLACE FUNCTION calculate_product_avg_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update avg_cost for purchase receipts
  IF NEW.transaction_type = 'purchase_received' AND NEW.unit_cost IS NOT NULL THEN
    UPDATE products
    SET 
      avg_cost = (
        (COALESCE(avg_cost, 0) * 
         COALESCE((
           SELECT SUM(quantity) 
           FROM inventory_transactions 
           WHERE product_id = NEW.product_id
           AND transaction_type = 'purchase_received'
           AND id != NEW.id
         ), 0)
        ) + (NEW.unit_cost * NEW.quantity)
      ) / (
        COALESCE((
          SELECT SUM(quantity) 
          FROM inventory_transactions 
          WHERE product_id = NEW.product_id
          AND transaction_type = 'purchase_received'
          AND id != NEW.id
        ), 0) + NEW.quantity
      ),
      last_purchase_cost = NEW.unit_cost,
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for average cost calculation
CREATE TRIGGER update_product_avg_cost
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_product_avg_cost();

-- Create function to generate work order number
CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number integer;
  new_wo_number text;
BEGIN
  year := to_char(current_date, 'YY');
  
  WITH sequence AS (
    SELECT COUNT(*) + 1 as next_num
    FROM work_orders
    WHERE wo_number LIKE 'WO' || year || '%'
  )
  SELECT next_num INTO sequence_number FROM sequence;
  
  new_wo_number := 'WO' || year || LPAD(sequence_number::text, 5, '0');
  
  RETURN new_wo_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence_number integer;
  new_po_number text;
BEGIN
  year := to_char(current_date, 'YY');
  
  WITH sequence AS (
    SELECT COUNT(*) + 1 as next_num
    FROM purchase_orders
    WHERE po_number LIKE 'PO' || year || '%'
  )
  SELECT next_num INTO sequence_number FROM sequence;
  
  new_po_number := 'PO' || year || LPAD(sequence_number::text, 5, '0');
  
  RETURN new_po_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to check inventory levels
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  current_stock decimal(15,2);
BEGIN
  -- Calculate current stock
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN quantity
      WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO current_stock
  FROM inventory_transactions
  WHERE product_id = NEW.product_id;

  -- Check for low stock
  IF current_stock <= (
    SELECT min_stock_level 
    FROM products 
    WHERE id = NEW.product_id
  ) THEN
    INSERT INTO inventory_alerts (
      product_id,
      alert_type,
      message
    )
    VALUES (
      NEW.product_id,
      'low_stock',
      'Product stock has fallen below minimum level. Current stock: ' || current_stock
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory alerts
CREATE TRIGGER check_inventory_levels_trigger
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_levels();

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Vendors viewable by authenticated users"
  ON vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendors manageable by authenticated users"
  ON vendors FOR ALL TO authenticated USING (true);

CREATE POLICY "Purchase orders viewable by authenticated users"
  ON purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Purchase orders manageable by authenticated users"
  ON purchase_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Purchase order items viewable by authenticated users"
  ON purchase_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Purchase order items manageable by authenticated users"
  ON purchase_order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Inventory transactions viewable by authenticated users"
  ON inventory_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inventory transactions manageable by authenticated users"
  ON inventory_transactions FOR ALL TO authenticated USING (true);

CREATE POLICY "Work orders viewable by authenticated users"
  ON work_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Work orders manageable by authenticated users"
  ON work_orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Work order items viewable by authenticated users"
  ON work_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Work order items manageable by authenticated users"
  ON work_order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Inventory alerts viewable by authenticated users"
  ON inventory_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Inventory alerts manageable by authenticated users"
  ON inventory_alerts FOR ALL TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_id, reference_type);
CREATE INDEX idx_work_orders_order ON work_orders(order_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_inventory_alerts_product ON inventory_alerts(product_id);
CREATE INDEX idx_inventory_alerts_status ON inventory_alerts(status);