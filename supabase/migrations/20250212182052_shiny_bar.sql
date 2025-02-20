/*
  # Update customer table constraints

  1. Changes
    - Make address fields optional in customers table
    - Add default values for timestamps
    - Add indexes for better query performance

  2. Notes
    - This allows customer creation from contact form without address information
    - Address information can be added later if needed
*/

-- Modify address fields to be nullable
ALTER TABLE customers 
ALTER COLUMN address_line1 DROP NOT NULL,
ALTER COLUMN city DROP NOT NULL,
ALTER COLUMN state DROP NOT NULL,
ALTER COLUMN zip_code DROP NOT NULL,
ALTER COLUMN country DROP NOT NULL;

-- Set default values for timestamps if not already set
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' 
    AND column_name = 'created_at' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE customers 
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now();
  END IF;
END $$;

-- Create indexes for frequently queried fields if they don't exist
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);