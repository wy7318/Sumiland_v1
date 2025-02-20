-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_inventory_levels_trigger ON inventory_transactions;
DROP FUNCTION IF EXISTS check_inventory_levels();

-- Create improved function to check inventory levels
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  current_stock decimal(15,2);
  product_record RECORD;
BEGIN
  -- Get product information
  SELECT * INTO product_record
  FROM products
  WHERE id = NEW.product_id;

  -- Calculate current stock based on product type
  IF product_record.stock_unit = 'weight' THEN
    -- For weight-based products, sum the weights
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'adjustment' THEN weight -- Use weight directly for adjustments
        WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN weight
        WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -weight
        ELSE 0
      END
    ), 0)
    INTO current_stock
    FROM inventory_transactions
    WHERE product_id = NEW.product_id
    AND weight IS NOT NULL;
  ELSE
    -- For quantity-based products, sum the quantities
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'adjustment' THEN quantity -- Use quantity directly for adjustments
        WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN quantity
        WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -quantity
        ELSE 0
      END
    ), 0)
    INTO current_stock
    FROM inventory_transactions
    WHERE product_id = NEW.product_id;
  END IF;

  -- Check for low stock
  IF current_stock <= product_record.min_stock_level THEN
    -- Only create alert if one doesn't already exist for this product
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
        current_stock || 
        CASE 
          WHEN product_record.stock_unit = 'weight' THEN ' ' || product_record.weight_unit
          ELSE ' units'
        END
      );
    END IF;
  END IF;

  -- Check for overstock if max_stock_level is set
  IF product_record.max_stock_level IS NOT NULL 
  AND current_stock > product_record.max_stock_level THEN
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
        current_stock || 
        CASE 
          WHEN product_record.stock_unit = 'weight' THEN ' ' || product_record.weight_unit
          ELSE ' units'
        END
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

-- Add comment
COMMENT ON FUNCTION check_inventory_levels() IS 
'Tracks inventory levels and creates alerts for low stock and overstock conditions.
Handles both weight-based and quantity-based products correctly.
For weight-based products, compares weights.
For quantity-based products, compares quantities.
Alerts are only created if no active alert (new or acknowledged) exists for the same condition.';