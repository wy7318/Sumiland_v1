-- First, clean up any invalid data
UPDATE inventory_transactions
SET weight = NULL, weight_unit = NULL
WHERE quantity IS NOT NULL;

-- Modify inventory_transactions table to allow null quantity
ALTER TABLE inventory_transactions
ALTER COLUMN quantity DROP NOT NULL;

-- Add constraint to ensure either quantity or weight is provided
ALTER TABLE inventory_transactions
ADD CONSTRAINT check_quantity_or_weight
CHECK (
  (quantity IS NOT NULL AND weight IS NULL AND weight_unit IS NULL) OR
  (quantity IS NULL AND weight IS NOT NULL AND weight_unit IS NOT NULL)
);

-- Create or replace the validation function
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

-- Create or replace the trigger
DROP TRIGGER IF EXISTS validate_inventory_transaction_trigger ON inventory_transactions;
CREATE TRIGGER validate_inventory_transaction_trigger
  BEFORE INSERT OR UPDATE ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_inventory_transaction();

-- Add comments
COMMENT ON CONSTRAINT check_quantity_or_weight ON inventory_transactions IS 
'Ensures that either quantity (for quantity-based products) or weight and weight_unit (for weight-based products) is provided, but not both';