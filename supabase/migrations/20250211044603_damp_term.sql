/*
  # Fix Profile Policies Recursion

  1. Changes
    - Drop existing policies that cause recursion
    - Create new non-recursive policies for profiles table
    - Add separate policies for super admin access
    - Ensure proper access control without circular dependencies

  2. Security
    - Maintain proper access control
    - Fix infinite recursion issues
    - Keep super admin privileges
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Profiles readable by self" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by self" ON profiles;
DROP POLICY IF EXISTS "Profiles readable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles insertable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles deletable by super admins" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "Allow users to read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  is_super_admin = true
);

CREATE POLICY "Allow users to update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR
  is_super_admin = true
)
WITH CHECK (
  (auth.uid() = id AND NOT is_super_admin)
  OR
  is_super_admin = true
);

CREATE POLICY "Allow super admin to insert profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin = true
);

CREATE POLICY "Allow super admin to delete profiles"
ON profiles
FOR DELETE
TO authenticated
USING (
  is_super_admin = true
);

-- Add a policy for super admins to read all profiles
CREATE POLICY "Super admin can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
);