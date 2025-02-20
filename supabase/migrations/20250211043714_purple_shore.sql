/*
  # Fix policy conflicts
  
  1. Changes
    - Drop and recreate policies with unique names
    - Ensure proper super admin access
    - Maintain existing functionality
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can do everything" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update profile types" ON profiles;
DROP POLICY IF EXISTS "Users can view all profile types" ON profiles;

-- Create new policies with unique names
CREATE POLICY "Profiles readable by self"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Profiles updatable by self"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles readable by super admins"
ON profiles
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND is_super_admin = true
));

CREATE POLICY "Profiles updatable by super admins"
ON profiles
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND is_super_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid() AND is_super_admin = true
));