-- Drop existing view and recreate with corrected calculations
DROP VIEW IF EXISTS current_stock_view;

CREATE OR REPLACE VIEW current_stock_view AS
WITH transaction_totals AS (
  SELECT 
    product_id,
    SUM(
      CASE 
        -- For adjustments, use the value directly (positive adds, negative subtracts)
        WHEN transaction_type = 'adjustment' THEN 
          CASE 
            WHEN quantity > 0 THEN quantity  -- Positive adjustment adds
            ELSE quantity                    -- Negative adjustment subtracts
          END
        -- For other transactions
        WHEN transaction_type IN ('purchase_received', 'work_order_return') THEN quantity
        WHEN transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -quantity
        ELSE 0
      END
    ) as quantity_total,
    SUM(
      CASE 
        -- For adjustments, use the weight directly (positive adds, negative subtracts)
        WHEN transaction_type = 'adjustment' THEN 
          CASE 
            WHEN weight > 0 THEN weight  -- Positive adjustment adds
            ELSE weight                  -- Negative adjustment subtracts
          END
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

-- Create function to validate inventory transactions
CREATE OR REPLACE FUNCTION validate_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure quantity is provided for quantity-based products
  IF EXISTS (
    SELECT 1 FROM products 
    WHERE id = NEW.product_id 
    AND stock_unit = 'quantity' 
    AND NEW.quantity IS NULL
  ) THEN
    RAISE EXCEPTION 'Quantity is required for quantity-based products';
  END IF;

  -- Ensure weight is provided for weight-based products
  IF EXISTS (
    SELECT 1 FROM products 
    WHERE id = NEW.product_id 
    AND stock_unit = 'weight' 
    AND (NEW.weight IS NULL OR NEW.weight_unit IS NULL)
  ) THEN
    RAISE EXCEPTION 'Weight and weight unit are required for weight-based products';
  END IF;

  -- For adjustments, ensure the values are properly set
  IF NEW.transaction_type = 'adjustment' THEN
    -- For quantity-based products
    IF EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id 
      AND stock_unit = 'quantity'
    ) THEN
      -- Ensure weight fields are NULL
      NEW.weight := NULL;
      NEW.weight_unit := NULL;
    -- For weight-based products
    ELSIF EXISTS (
      SELECT 1 FROM products 
      WHERE id = NEW.product_id 
      AND stock_unit = 'weight'
    ) THEN
      -- Ensure quantity is NULL
      NEW.quantity := NULL;
    END IF;
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
For adjustments:
  - Positive values add to stock
  - Negative values subtract from stock
For other transactions:
  - purchase_received and work_order_return add to stock
  - work_order_out, damaged, and transfer subtract from stock';

COMMENT ON FUNCTION validate_inventory_transaction() IS 
'Validates inventory transactions before insertion:
  - Ensures quantity is provided for quantity-based products
  - Ensures weight is provided for weight-based products
  - For adjustments, ensures correct fields are used based on product type';