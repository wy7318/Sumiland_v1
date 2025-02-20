-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "anyone_can_read_profiles"
ON profiles
FOR SELECT
USING (true);

CREATE POLICY "users_can_insert_own_profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "super_admins_full_access"
ON profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND
    id IN (
      SELECT id FROM profiles WHERE is_super_admin = true
    )
  )
);

-- Add comments
COMMENT ON POLICY "anyone_can_read_profiles" ON profiles IS 
'Allows anyone to read any profile';

COMMENT ON POLICY "users_can_insert_own_profile" ON profiles IS 
'Allows users to create their own profile during signup';

COMMENT ON POLICY "users_can_update_own_profile" ON profiles IS 
'Allows users to update their own profile information';

COMMENT ON POLICY "super_admins_full_access" ON profiles IS 
'Allows super admins to perform any operation on profiles';