-- Drop existing view
DROP VIEW IF EXISTS current_stock_view;

-- Recreate view with correct column references
CREATE OR REPLACE VIEW current_stock_view AS
WITH transaction_totals AS (
  SELECT 
    t.product_id,
    SUM(
      CASE 
        WHEN t.transaction_type = 'adjustment' THEN t.quantity
        WHEN t.transaction_type IN ('purchase_received', 'work_order_return') THEN t.quantity
        WHEN t.transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -t.quantity
        ELSE 0
      END
    ) as quantity_total,
    SUM(
      CASE 
        WHEN t.transaction_type = 'adjustment' THEN t.weight
        WHEN t.transaction_type IN ('purchase_received', 'work_order_return') THEN t.weight
        WHEN t.transaction_type IN ('work_order_out', 'damaged', 'transfer') THEN -t.weight
        ELSE 0
      END
    ) as weight_total,
    MAX(t.weight_unit) as weight_unit
  FROM inventory_transactions t
  GROUP BY t.product_id
)
SELECT 
  t.product_id,  -- Use transaction's product_id as primary reference
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
FROM transaction_totals t
JOIN products p ON t.product_id = p.id;

-- Add comment
COMMENT ON VIEW current_stock_view IS 
'Calculates current stock levels for all products based on inventory transactions.
Uses product_id from transactions as primary reference to ensure proper relationship mapping.
For all transaction types:
  - purchase_received and work_order_return add to stock
  - work_order_out, damaged, and transfer subtract from stock
  - adjustments directly modify stock (positive or negative)';