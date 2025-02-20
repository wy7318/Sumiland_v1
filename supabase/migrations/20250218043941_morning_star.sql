-- Drop existing view and recreate with corrected calculations
DROP VIEW IF EXISTS current_stock_view;

CREATE OR REPLACE VIEW current_stock_view AS
WITH transaction_totals AS (
  SELECT 
    product_id,
    SUM(
      CASE 
        -- For adjustments, use the value directly
        WHEN transaction_type = 'adjustment' THEN quantity
        -- For other transactions
        WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN quantity
        WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -quantity
        ELSE 0
      END
    ) as quantity_total,
    SUM(
      CASE 
        -- For adjustments, use the weight directly
        WHEN transaction_type = 'adjustment' THEN weight
        -- For other transactions
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

-- Update handle_po_status_change function to correctly handle inventory transactions
CREATE OR REPLACE FUNCTION handle_po_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is being changed to received
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Validate that all items have proper quantities and costs
    IF EXISTS (
      SELECT 1 
      FROM purchase_order_items 
      WHERE po_id = NEW.id 
      AND (quantity <= 0 OR unit_cost <= 0)
    ) THEN
      RAISE EXCEPTION 'All items must have valid quantities and costs';
    END IF;

    -- Update items status
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
      weight,
      weight_unit,
      reference_id,
      reference_type,
      notes,
      created_by
    )
    SELECT 
      poi.product_id,
      'purchase_received',
      CASE 
        WHEN p.stock_unit = 'quantity' THEN poi.quantity
        ELSE NULL
      END,
      poi.unit_cost,
      CASE 
        WHEN p.stock_unit = 'weight' THEN poi.total_weight
        ELSE NULL
      END,
      CASE 
        WHEN p.stock_unit = 'weight' THEN poi.weight_unit
        ELSE NULL
      END,
      NEW.id,
      'purchase_order',
      'Received from PO ' || NEW.po_number,
      NEW.updated_by
    FROM purchase_order_items poi
    JOIN products p ON p.id = poi.product_id
    WHERE poi.po_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for PO status changes
DROP TRIGGER IF EXISTS handle_po_status_change_trigger ON purchase_orders;
CREATE TRIGGER handle_po_status_change_trigger
  AFTER UPDATE OF status
  ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'received' AND OLD.status != 'received')
  EXECUTE FUNCTION handle_po_status_change();

-- Create function to validate inventory transactions
CREATE OR REPLACE FUNCTION validate_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
BEGIN
  -- Get product information
  SELECT * INTO product_record
  FROM products
  WHERE id = NEW.product_id;

  -- Validate based on product type
  IF product_record.stock_unit = 'quantity' THEN
    -- For quantity-based products
    IF NEW.quantity IS NULL THEN
      RAISE EXCEPTION 'Quantity is required for quantity-based products';
    END IF;
    -- Clear weight fields
    NEW.weight := NULL;
    NEW.weight_unit := NULL;
  ELSE
    -- For weight-based products
    IF NEW.weight IS NULL OR NEW.weight_unit IS NULL THEN
      RAISE EXCEPTION 'Weight and weight unit are required for weight-based products';
    END IF;
    -- Clear quantity field
    NEW.quantity := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory transaction validation
DROP TRIGGER IF EXISTS validate_inventory_transaction_trigger ON inventory_transactions;
CREATE TRIGGER validate_inventory_transaction_trigger
  BEFORE INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_inventory_transaction();

-- Add comments
COMMENT ON VIEW current_stock_view IS 
'Calculates current stock levels for all products based on inventory transactions.
For all transaction types:
  - purchase_received and work_order_return add to stock
  - work_order_out, damaged, and transfer subtract from stock
  - adjustments directly modify stock (positive or negative)';

COMMENT ON FUNCTION handle_po_status_change() IS 
'Handles purchase order receiving process:
  - Updates PO items status
  - Creates inventory transactions with correct quantity/weight based on product type
  - Validates all items have proper quantities and costs';

COMMENT ON FUNCTION validate_inventory_transaction() IS 
'Validates inventory transactions before insertion:
  - Ensures correct fields are used based on product type (quantity or weight)
  - Clears irrelevant fields to maintain data consistency';