-- Drop existing policies
DROP POLICY IF EXISTS "allow_read_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_super_admin_access" ON profiles;
DROP POLICY IF EXISTS "allow_read_user_organizations" ON user_organizations;
DROP POLICY IF EXISTS "allow_insert_own_mapping" ON user_organizations;
DROP POLICY IF EXISTS "allow_super_admin_manage_mappings" ON user_organizations;

-- Create non-recursive policies for profiles
CREATE POLICY "profiles_read_access"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "profiles_update_self"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_self"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_super_admin"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND
    id IN (
      SELECT id FROM profiles WHERE is_super_admin = true
    )
  )
);

-- Create non-recursive policies for user_organizations
CREATE POLICY "user_organizations_read_access"
ON user_organizations FOR SELECT
USING (true);

CREATE POLICY "user_organizations_insert_self"
ON user_organizations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_organizations_super_admin"
ON user_organizations FOR ALL
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
COMMENT ON POLICY "profiles_read_access" ON profiles IS 
'Allows anyone to read profiles';

COMMENT ON POLICY "profiles_update_self" ON profiles IS 
'Allows users to update their own profile';

COMMENT ON POLICY "profiles_insert_self" ON profiles IS 
'Allows users to create their own profile';

COMMENT ON POLICY "profiles_super_admin" ON profiles IS 
'Allows super admins to manage all profiles';

COMMENT ON POLICY "user_organizations_read_access" ON user_organizations IS 
'Allows anyone to read user-organization mappings';

COMMENT ON POLICY "user_organizations_insert_self" ON user_organizations IS 
'Allows users to create their own organization mappings';

COMMENT ON POLICY "user_organizations_super_admin" ON user_organizations IS 
'Allows super admins to manage all organization mappings';