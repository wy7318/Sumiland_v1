/*
  # Add Lead ID to Customers Table

  1. Changes
    - Add lead_id column to customers table to track lead conversions
    - Add foreign key constraint to leads table
    - Add unique constraint to prevent duplicate conversions
*/

-- Add lead_id column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id);

-- Add unique constraint to prevent multiple conversions of the same lead
ALTER TABLE customers ADD CONSTRAINT customers_lead_id_key UNIQUE (lead_id);