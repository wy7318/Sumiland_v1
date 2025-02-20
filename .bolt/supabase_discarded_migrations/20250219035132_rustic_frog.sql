-- Drop existing policies
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Allow public profile reading" ON profiles;
DROP POLICY IF EXISTS "Allow self profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow super admin full access" ON profiles;

-- Create new policies with corrected INSERT policy
CREATE POLICY "Allow profile creation during signup"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow public profile reading"
ON profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow self profile updates"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow super admin full access"
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
COMMENT ON POLICY "Allow profile creation during signup" ON profiles IS 
'Allows public access to create profiles during signup';

COMMENT ON POLICY "Allow public profile reading" ON profiles IS 
'Allows anyone to read profile information';

COMMENT ON POLICY "Allow self profile updates" ON profiles IS 
'Allows users to update their own profile';

COMMENT ON POLICY "Allow super admin full access" ON profiles IS 
'Allows super admins to manage all profiles';