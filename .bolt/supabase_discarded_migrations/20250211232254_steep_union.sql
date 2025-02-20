/*
  # Fix Profiles RLS Policies

  1. Changes
    - Drop existing problematic policies
    - Create new, simpler policies for profiles table
    - Allow authenticated users to read profiles
    - Allow users to update their own profiles
    - Allow super admins full access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow super admin to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow super admin to delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles readable by self" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by self" ON profiles;
DROP POLICY IF EXISTS "Profiles readable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles insertable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles deletable by super admins" ON profiles;

-- Create new, simpler policies
CREATE POLICY "Profiles are viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can do everything"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
);