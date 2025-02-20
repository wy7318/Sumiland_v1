-- Drop existing policies
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Allow public profile reading" ON profiles;
DROP POLICY IF EXISTS "Allow self profile updates" ON profiles;
DROP POLICY IF EXISTS "Allow super admin full access" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "profiles_read_all"
ON profiles
FOR SELECT
USING (true);

CREATE POLICY "profiles_insert_self"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_super_admin"
ON profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND
    id IN (
      SELECT id FROM profiles WHERE is_super_admin = true
    )
  )
);

-- Add comments
COMMENT ON POLICY "profiles_read_all" ON profiles IS 
'Allows anyone to read profiles';

COMMENT ON POLICY "profiles_insert_self" ON profiles IS 
'Allows users to create their own profile';

COMMENT ON POLICY "profiles_update_self" ON profiles IS 
'Allows users to update their own profile';

COMMENT ON POLICY "profiles_super_admin" ON profiles IS 
'Allows super admins to manage all profiles';