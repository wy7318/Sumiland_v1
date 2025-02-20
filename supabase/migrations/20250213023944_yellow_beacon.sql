/*
  # Fix Customer RLS Policies

  1. Changes
    - Drop existing RLS policies for customers table
    - Add new policies that properly handle public access for both viewing and creating customers
    - Maintain security for authenticated access
    - Add proper indexes for performance

  2. Security
    - Allow public access for viewing and creating customers
    - Maintain authenticated user access for all operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

-- Create new policies
-- Allow public access to view customers
CREATE POLICY "Public can view customers"
ON customers 
FOR SELECT
TO public
USING (true);

-- Allow public access for creating customers (needed for contact forms)
CREATE POLICY "Public can create customers"
ON customers 
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to update customers
CREATE POLICY "Authenticated users can update customers"
ON customers 
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete customers
CREATE POLICY "Authenticated users can delete customers"
ON customers 
FOR DELETE
TO authenticated
USING (true);

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);