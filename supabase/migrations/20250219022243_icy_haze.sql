-- Drop existing policies
DROP POLICY IF EXISTS "Profiles can be created on signup" ON profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create simplified policies for profiles

-- Allow profile creation during signup
CREATE POLICY "Enable profile creation during signup"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Allow users to read any profile
CREATE POLICY "Enable profile reading"
ON profiles
FOR SELECT
TO public
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Enable self profile updates"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow super admins full access
CREATE POLICY "Enable super admin full access"
ON profiles
FOR ALL
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

-- Add comments
COMMENT ON POLICY "Enable profile creation during signup" ON profiles IS 
'Allows users to create their profile during signup process';

COMMENT ON POLICY "Enable profile reading" ON profiles IS 
'Allows public access to read all profiles';

COMMENT ON POLICY "Enable self profile updates" ON profiles IS 
'Allows users to update their own profile information';

COMMENT ON POLICY "Enable super admin full access" ON profiles IS 
'Allows super admins to perform any operation on profiles';