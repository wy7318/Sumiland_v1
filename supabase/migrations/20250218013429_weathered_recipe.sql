-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_inventory_levels_trigger ON inventory_transactions;
DROP FUNCTION IF EXISTS check_inventory_levels();

-- Create improved function to check inventory levels
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  current_stock decimal(15,2);
BEGIN
  -- Calculate current stock
  -- For adjustments: quantity is used directly (positive adds, negative subtracts)
  -- For purchase received: adds to stock
  -- For work order out: subtracts from stock
  -- For work order return: adds to stock
  -- For damaged/transfer: subtracts from stock
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'adjustment' THEN quantity -- Use quantity directly
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
    -- Only create alert if one doesn't already exist for this product
    IF NOT EXISTS (
      SELECT 1 
      FROM inventory_alerts 
      WHERE product_id = NEW.product_id 
      AND alert_type = 'low_stock'
      AND status = 'new'
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
  END IF;

  -- Check for overstock if max_stock_level is set
  IF (
    SELECT max_stock_level 
    FROM products 
    WHERE id = NEW.product_id
  ) IS NOT NULL 
  AND current_stock > (
    SELECT max_stock_level 
    FROM products 
    WHERE id = NEW.product_id
  ) THEN
    -- Only create alert if one doesn't already exist
    IF NOT EXISTS (
      SELECT 1 
      FROM inventory_alerts 
      WHERE product_id = NEW.product_id 
      AND alert_type = 'overstock'
      AND status = 'new'
    ) THEN
      INSERT INTO inventory_alerts (
        product_id,
        alert_type,
        message
      )
      VALUES (
        NEW.product_id,
        'overstock',
        'Product stock has exceeded maximum level. Current stock: ' || current_stock
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
For adjustments, positive numbers add to stock and negative numbers subtract from stock.
Purchase receipts and work order returns add to stock, while work order outs, damaged items, and transfers subtract from stock.';