/*
  # Add type column to profiles table

  1. Changes
    - Add type column to profiles table with default value 'user'
    - Add check constraint to ensure valid types
    - Update existing admin user to have admin type
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add type column with check constraint
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS type text NOT NULL 
CHECK (type IN ('user', 'admin')) 
DEFAULT 'user';

-- Update the admin user to have admin type
UPDATE profiles 
SET type = 'admin' 
WHERE role = 'admin';

-- Add policy for type column
CREATE POLICY "Users can view all profile types"
ON profiles
FOR SELECT
USING (true);

CREATE POLICY "Only admins can update profile types"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() IN (
  SELECT id FROM profiles WHERE type = 'admin'
))
WITH CHECK (auth.uid() IN (
  SELECT id FROM profiles WHERE type = 'admin'
));