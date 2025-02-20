/*
  # Add policies for user management
  
  1. Changes
    - Add policies to allow admin users to manage other users
    - Ensure proper access control for user management
*/

-- Policy to allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE type = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE type = 'admin'
  )
);

-- Policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE type = 'admin'
  )
);