-- Create a view to calculate current stock
CREATE OR REPLACE VIEW current_stock_view AS
WITH transaction_totals AS (
  SELECT 
    product_id,
    SUM(
      CASE 
        WHEN transaction_type = 'adjustment' THEN quantity
        WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN quantity
        WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -quantity
        ELSE 0
      END
    ) as quantity_total,
    SUM(
      CASE 
        WHEN transaction_type = 'adjustment' THEN weight
        WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN weight
        WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -weight
        ELSE 0
      END
    ) as weight_total,
    MAX(weight_unit) as weight_unit
  FROM inventory_transactions
  GROUP BY product_id
)
SELECT 
  p.id as product_id,
  p.name,
  p.stock_unit,
  CASE 
    WHEN p.stock_unit = 'quantity' THEN COALESCE(t.quantity_total, 0)
    ELSE NULL
  END as quantity,
  CASE 
    WHEN p.stock_unit = 'weight' THEN COALESCE(t.weight_total, 0)
    ELSE NULL
  END as weight,
  CASE 
    WHEN p.stock_unit = 'weight' THEN COALESCE(t.weight_unit, p.weight_unit)
    ELSE NULL
  END as weight_unit
FROM products p
LEFT JOIN transaction_totals t ON p.id = t.product_id;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_inventory_levels_trigger ON inventory_transactions;
DROP FUNCTION IF EXISTS check_inventory_levels();

-- Create improved function to check inventory levels
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
  current_stock RECORD;
BEGIN
  -- Get product information
  SELECT * INTO product_record
  FROM products
  WHERE id = NEW.product_id;

  -- Get current stock from view
  SELECT * INTO current_stock
  FROM current_stock_view
  WHERE product_id = NEW.product_id;

  -- Check for low stock
  IF (
    (product_record.stock_unit = 'weight' AND current_stock.weight <= product_record.min_stock_level) OR
    (product_record.stock_unit = 'quantity' AND current_stock.quantity <= product_record.min_stock_level)
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
          THEN ROUND(current_stock.weight::numeric, 2) || ' ' || current_stock.weight_unit
          ELSE ROUND(current_stock.quantity::numeric, 2) || ' units'
        END ||
        ' (Minimum: ' || product_record.min_stock_level || ')'
      );
    END IF;
  END IF;

  -- Check for overstock
  IF product_record.max_stock_level IS NOT NULL AND (
    (product_record.stock_unit = 'weight' AND current_stock.weight > product_record.max_stock_level) OR
    (product_record.stock_unit = 'quantity' AND current_stock.quantity > product_record.max_stock_level)
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
          THEN ROUND(current_stock.weight::numeric, 2) || ' ' || current_stock.weight_unit
          ELSE ROUND(current_stock.quantity::numeric, 2) || ' units'
        END ||
        ' (Maximum: ' || product_record.max_stock_level || ')'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory alerts
CREATE TRIGGER check_inventory_levels_trigger
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_levels();

-- Add comments
COMMENT ON VIEW current_stock_view IS 
'Calculates current stock levels for all products based on inventory transactions';

COMMENT ON FUNCTION check_inventory_levels() IS 
'Monitors inventory levels and creates alerts based on current stock view.
Handles both weight-based and quantity-based products correctly.
For adjustments and transactions, positive values add to stock and negative values subtract from stock.';