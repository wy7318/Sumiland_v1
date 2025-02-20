/*
  # Fix Customer RLS Policies

  1. Changes
    - Drop existing RLS policies for customers table
    - Add new policies that properly handle public access for contact form submissions
    - Maintain security for authenticated access

  2. Security
    - Allow public access for creating new customers
    - Restrict viewing/updating to authenticated users
    - Ensure data integrity
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can update their customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their customers" ON customers;

-- Create new policies
-- Allow public access for creating customers (needed for contact forms)
CREATE POLICY "Public can create customers"
ON customers FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated users to view all customers
CREATE POLICY "Authenticated users can view customers"
ON customers FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update customers
CREATE POLICY "Authenticated users can update customers"
ON customers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete customers
CREATE POLICY "Authenticated users can delete customers"
ON customers FOR DELETE
TO authenticated
USING (true);