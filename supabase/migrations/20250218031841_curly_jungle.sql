-- Update handle_po_status_change function to correctly handle weight-based inventory
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
      AND (quantity <= 0 OR unit_cost <= 0 OR subtotal <= 0)
    ) THEN
      RAISE EXCEPTION 'All items must have valid quantities, costs, and subtotals';
    END IF;

    -- Update items status
    UPDATE purchase_order_items
    SET 
      status = 'received',
      received_quantity = quantity,
      updated_at = now()
    WHERE po_id = NEW.id;

    -- Create inventory transactions with correct weight tracking
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
        -- For weight-based products, use 1 as quantity since we track by weight
        WHEN p.stock_unit = 'weight' THEN 1
        -- For quantity-based products, use the actual quantity
        ELSE poi.quantity
      END,
      poi.unit_cost,
      CASE 
        -- For weight-based products, use total_weight
        WHEN p.stock_unit = 'weight' THEN poi.total_weight
        -- For quantity-based products, weight remains NULL
        ELSE NULL
      END,
      CASE 
        -- For weight-based products, use weight_unit
        WHEN p.stock_unit = 'weight' THEN poi.weight_unit
        -- For quantity-based products, weight_unit remains NULL
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

-- Drop and recreate trigger to use updated function
DROP TRIGGER IF EXISTS handle_po_status_change_trigger ON purchase_orders;
CREATE TRIGGER handle_po_status_change_trigger
  AFTER UPDATE OF status
  ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'received' AND OLD.status != 'received')
  EXECUTE FUNCTION handle_po_status_change();

-- Add comment
COMMENT ON FUNCTION handle_po_status_change() IS 
'Handles PO receiving with improved weight tracking support. For weight-based products, 
uses total_weight for inventory tracking while quantity is set to 1. For quantity-based 
products, uses quantity for tracking while weight remains NULL.';