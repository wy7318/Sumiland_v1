-- Check and add weight tracking fields to purchase_order_items if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'purchase_order_items' AND column_name = 'unit_weight') THEN
        ALTER TABLE purchase_order_items
        ADD COLUMN unit_weight decimal(15,4);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'purchase_order_items' AND column_name = 'weight_unit') THEN
        ALTER TABLE purchase_order_items
        ADD COLUMN weight_unit text CHECK (weight_unit IN ('kg', 'g', 'lb', 'oz'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'purchase_order_items' AND column_name = 'total_weight') THEN
        ALTER TABLE purchase_order_items
        ADD COLUMN total_weight decimal(15,4);
    END IF;
END $$;

-- Create function to validate weights and calculate totals
CREATE OR REPLACE FUNCTION validate_po_item_weights()
RETURNS TRIGGER AS $$
DECLARE
  product_weight_unit text;
BEGIN
  -- Get product's weight unit
  SELECT weight_unit INTO product_weight_unit
  FROM products
  WHERE id = NEW.product_id;

  -- For weight-based products
  IF product_weight_unit IS NOT NULL THEN
    -- Ensure weight unit is provided and matches product
    IF NEW.weight_unit IS NULL OR NEW.weight_unit != product_weight_unit THEN
      RAISE EXCEPTION 'Weight unit must match product weight unit: %', product_weight_unit;
    END IF;

    -- Ensure unit weight is provided and positive
    IF NEW.unit_weight IS NULL OR NEW.unit_weight <= 0 THEN
      RAISE EXCEPTION 'Unit weight must be a positive number';
    END IF;

    -- Calculate total weight
    NEW.total_weight := NEW.unit_weight * NEW.quantity;
  ELSE
    -- For quantity-based products, clear weight fields
    NEW.unit_weight := NULL;
    NEW.weight_unit := NULL;
    NEW.total_weight := NULL;
  END IF;

  -- Calculate subtotal
  NEW.subtotal := NEW.quantity * NEW.unit_cost;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for weight validation
DROP TRIGGER IF EXISTS validate_po_item_weights_trigger ON purchase_order_items;
CREATE TRIGGER validate_po_item_weights_trigger
  BEFORE INSERT OR UPDATE
  ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_po_item_weights();

-- Update inventory transaction handling for weights
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

    -- Create inventory transactions with weight tracking
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
      poi.quantity,
      poi.unit_cost,
      poi.total_weight,
      poi.weight_unit,
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

-- Drop and recreate trigger to use updated function
DROP TRIGGER IF EXISTS handle_po_status_change_trigger ON purchase_orders;
CREATE TRIGGER handle_po_status_change_trigger
  AFTER UPDATE OF status
  ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'received' AND OLD.status != 'received')
  EXECUTE FUNCTION handle_po_status_change();

-- Add comments
COMMENT ON COLUMN purchase_order_items.unit_weight IS 'Weight per unit for weight-based products';
COMMENT ON COLUMN purchase_order_items.weight_unit IS 'Unit of measurement for weight (kg, g, lb, oz)';
COMMENT ON COLUMN purchase_order_items.total_weight IS 'Total weight (unit_weight × quantity)';

COMMENT ON FUNCTION validate_po_item_weights() IS 
'Validates weight entries and calculates total weights for PO items';

COMMENT ON FUNCTION handle_po_status_change() IS 
'Handles PO receiving with weight tracking support';