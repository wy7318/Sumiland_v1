/*
  # Add company field to customers table

  1. Changes
    - Add `company` column to customers table
    - Make it nullable since existing records won't have this field
    - Add index for better query performance

  2. Notes
    - No data migration needed as new field is nullable
*/

-- Add company column to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS company text;

-- Create index for company field
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);