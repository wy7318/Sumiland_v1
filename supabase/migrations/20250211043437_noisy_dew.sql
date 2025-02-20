/*
  # Add super admin functionality
  
  1. Changes
    - Add is_super_admin column to profiles table
    - Set matt.lee@sumisubi.com as super admin
    - Update policies for super admin access
*/

-- Add is_super_admin column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Set matt.lee@sumisubi.com as super admin
UPDATE profiles
SET is_super_admin = true
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'matt.lee@sumisubi.com'
);

-- Update policies for super admin
CREATE POLICY "Super admins can do everything"
ON profiles
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_super_admin = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE is_super_admin = true
  )
);