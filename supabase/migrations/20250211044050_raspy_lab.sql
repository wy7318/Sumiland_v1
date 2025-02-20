/*
  # Complete super admin permissions
  
  1. Changes
    - Add INSERT and DELETE permissions for super admins
    - Ensure super admins have full CRUD access
    - Keep existing read/update policies intact
*/

-- Add INSERT and DELETE policies for super admins
CREATE POLICY "Profiles insertable by super admins"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND is_super_admin = true
));

CREATE POLICY "Profiles deletable by super admins"
ON profiles
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND is_super_admin = true
));