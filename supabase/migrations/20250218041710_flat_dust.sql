-- Create a new table for current stock levels
CREATE TABLE IF NOT EXISTS current_stock (
  product_id uuid PRIMARY KEY REFERENCES products(id),
  quantity decimal(15,2) NOT NULL DEFAULT 0,
  weight decimal(15,4),
  weight_unit text CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz')),
  last_updated timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE current_stock ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Current stock viewable by authenticated users"
  ON current_stock FOR SELECT TO authenticated USING (true);

CREATE POLICY "Current stock updatable by authenticated users"
  ON current_stock FOR ALL TO authenticated USING (true);

-- Create function to update current stock
CREATE OR REPLACE FUNCTION update_current_stock()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
  current_record RECORD;
  stock_change decimal(15,2);
  weight_change decimal(15,4);
BEGIN
  -- Get product information
  SELECT * INTO product_record
  FROM products
  WHERE id = NEW.product_id;

  -- Get current stock record
  SELECT * INTO current_record
  FROM current_stock
  WHERE product_id = NEW.product_id
  FOR UPDATE;  -- Lock the row to prevent concurrent updates

  -- Calculate stock changes based on transaction type
  IF product_record.stock_unit = 'weight' THEN
    -- For weight-based products
    weight_change := CASE 
      WHEN NEW.transaction_type = 'adjustment' THEN -NEW.weight -- Negative for adjustments
      WHEN NEW.transaction_type IN ('purchase_received', 'work_order_return') THEN NEW.weight
      WHEN NEW.transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -NEW.weight
      ELSE 0
    END;

    -- Insert or update current stock
    IF current_record IS NULL THEN
      INSERT INTO current_stock (
        product_id,
        quantity,
        weight,
        weight_unit
      ) VALUES (
        NEW.product_id,
        0, -- Quantity is not used for weight-based products
        weight_change,
        NEW.weight_unit
      );
    ELSE
      UPDATE current_stock
      SET 
        weight = COALESCE(weight, 0) + weight_change,
        weight_unit = NEW.weight_unit,
        last_updated = now()
      WHERE product_id = NEW.product_id;
    END IF;
  ELSE
    -- For quantity-based products
    stock_change := CASE 
      WHEN NEW.transaction_type = 'adjustment' THEN -NEW.quantity -- Negative for adjustments
      WHEN NEW.transaction_type IN ('purchase_received', 'work_order_return') THEN NEW.quantity
      WHEN NEW.transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -NEW.quantity
      ELSE 0
    END;

    -- Insert or update current stock
    IF current_record IS NULL THEN
      INSERT INTO current_stock (
        product_id,
        quantity
      ) VALUES (
        NEW.product_id,
        stock_change
      );
    ELSE
      UPDATE current_stock
      SET 
        quantity = COALESCE(quantity, 0) + stock_change,
        last_updated = now()
      WHERE product_id = NEW.product_id;
    END IF;
  END IF;

  -- Get updated stock level
  SELECT * INTO current_record
  FROM current_stock
  WHERE product_id = NEW.product_id;

  -- Check for low stock
  IF (
    (product_record.stock_unit = 'weight' AND COALESCE(current_record.weight, 0) <= product_record.min_stock_level) OR
    (product_record.stock_unit = 'quantity' AND COALESCE(current_record.quantity, 0) <= product_record.min_stock_level)
  ) THEN
    -- Only create alert if one doesn't already exist
    IF NOT EXISTS (
      SELECT 1 
      FROM inventory_alerts 
      WHERE product_id = NEW.product_id 
      AND alert_type = 'low_stock'
      AND status IN ('new', 'acknowledged')
    ) THEN
      INSERT INTO inventory_alerts (
        product_id,
        alert_type,
        message
      )
      VALUES (
        NEW.product_id,
        'low_stock',
        'Product stock has fallen below minimum level. Current stock: ' || 
        CASE 
          WHEN product_record.stock_unit = 'weight' 
          THEN ROUND(current_record.weight::numeric, 2) || ' ' || current_record.weight_unit
          ELSE ROUND(current_record.quantity::numeric, 2) || ' units'
        END ||
        ' (Minimum: ' || product_record.min_stock_level || ')'
      );
    END IF;
  END IF;

  -- Check for overstock
  IF product_record.max_stock_level IS NOT NULL AND (
    (product_record.stock_unit = 'weight' AND COALESCE(current_record.weight, 0) > product_record.max_stock_level) OR
    (product_record.stock_unit = 'quantity' AND COALESCE(current_record.quantity, 0) > product_record.max_stock_level)
  ) THEN
    -- Only create alert if one doesn't already exist
    IF NOT EXISTS (
      SELECT 1 
      FROM inventory_alerts 
      WHERE product_id = NEW.product_id 
      AND alert_type = 'overstock'
      AND status IN ('new', 'acknowledged')
    ) THEN
      INSERT INTO inventory_alerts (
        product_id,
        alert_type,
        message
      )
      VALUES (
        NEW.product_id,
        'overstock',
        'Product stock has exceeded maximum level. Current stock: ' || 
        CASE 
          WHEN product_record.stock_unit = 'weight' 
          THEN ROUND(current_record.weight::numeric, 2) || ' ' || current_record.weight_unit
          ELSE ROUND(current_record.quantity::numeric, 2) || ' units'
        END ||
        ' (Maximum: ' || product_record.max_stock_level || ')'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating current stock
DROP TRIGGER IF EXISTS update_current_stock_trigger ON inventory_transactions;
CREATE TRIGGER update_current_stock_trigger
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_current_stock();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_current_stock_product ON current_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_current_stock_quantity ON current_stock(quantity);
CREATE INDEX IF NOT EXISTS idx_current_stock_weight ON current_stock(weight);

-- Add comments
COMMENT ON TABLE current_stock IS 
'Stores the current stock levels for all products, supporting both quantity and weight-based tracking';

COMMENT ON FUNCTION update_current_stock() IS 
'Updates current stock levels and generates alerts based on inventory transactions.
Handles both weight-based and quantity-based products.
For adjustments, negative values subtract from stock and positive values add to stock.
Includes proper locking to prevent concurrent updates.';