-- Drop existing trigger and function
DROP TRIGGER IF EXISTS check_inventory_levels_trigger ON inventory_transactions;
DROP FUNCTION IF EXISTS check_inventory_levels();

-- Create improved function to check inventory levels with better inventory calculation
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  current_stock decimal(15,2);
BEGIN
  -- Calculate current stock with corrected logic
  -- For adjustments: negative quantity subtracts, positive adds
  -- For purchase received: adds to stock
  -- For work order out: subtracts from stock
  -- For work order return: adds to stock
  -- For damaged/transfer: subtracts from stock
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'adjustment' THEN -quantity -- Negative for subtract, positive for add
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

  -- Update the product's last_purchase_cost if this is a purchase receipt
  IF NEW.transaction_type = 'purchase_received' AND NEW.unit_cost IS NOT NULL THEN
    UPDATE products
    SET 
      last_purchase_cost = NEW.unit_cost,
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory alerts
CREATE TRIGGER check_inventory_levels_trigger
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_levels();

-- Create function to handle PO status changes
CREATE OR REPLACE FUNCTION handle_po_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to received
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Validate that all items have proper quantities
    IF EXISTS (
      SELECT 1 
      FROM purchase_order_items 
      WHERE po_id = NEW.id 
      AND (quantity <= 0 OR unit_cost <= 0)
    ) THEN
      RAISE EXCEPTION 'All items must have valid quantities and costs';
    END IF;

    -- Update items status and create inventory transactions
    UPDATE purchase_order_items
    SET 
      status = 'received',
      received_quantity = quantity,
      updated_at = now()
    WHERE po_id = NEW.id;

    -- Create inventory transactions for each item
    INSERT INTO inventory_transactions (
      product_id,
      transaction_type,
      quantity,
      unit_cost,
      reference_id,
      reference_type,
      notes,
      created_by
    )
    SELECT 
      poi.product_id,
      'purchase_received',
      poi.quantity,
      poi.unit_cost,
      NEW.id,
      'purchase_order',
      'Received from PO ' || NEW.po_number,
      NEW.updated_by
    FROM purchase_order_items poi
    WHERE poi.po_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for PO status changes
CREATE TRIGGER handle_po_status_change_trigger
  AFTER UPDATE OF status
  ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'received' AND OLD.status != 'received')
  EXECUTE FUNCTION handle_po_status_change();

-- Add comments
COMMENT ON FUNCTION check_inventory_levels() IS 
'Tracks inventory levels and creates alerts for low stock and overstock conditions.';

COMMENT ON FUNCTION handle_po_status_change() IS 
'Handles purchase order receiving process by updating inventory levels.';