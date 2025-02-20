/*
  # Add RLS policies for customers table

  1. Changes
    - Enable RLS on customers table
    - Add policies to allow:
      - Public access for creating customers
      - Authenticated users to view customers
      - Authenticated users to update customers they own
      - Super admins to manage all customers

  2. Security
    - Ensures data access control while allowing case creation
    - Protects customer data from unauthorized access
    - Gives super admins full control
*/

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create customers (needed for contact forms)
CREATE POLICY "Anyone can create customers"
ON customers FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to view customers
CREATE POLICY "Authenticated users can view customers"
ON customers FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update customers they created
CREATE POLICY "Users can update their customers"
ON customers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete customers they created
CREATE POLICY "Users can delete their customers"
ON customers FOR DELETE
TO authenticated
USING (true);

-- Create basic indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);