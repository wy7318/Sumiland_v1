-- Drop existing policies
DROP POLICY IF EXISTS "profiles_viewable_by_organization_members" ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_access" ON profiles;

-- Create simplified policies for profiles
CREATE POLICY "allow_read_profiles"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_super_admin_access"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
);

-- Drop existing policies for user_organizations
DROP POLICY IF EXISTS "Allow mapping creation" ON user_organizations;
DROP POLICY IF EXISTS "Allow mapping viewing" ON user_organizations;
DROP POLICY IF EXISTS "Allow super admin and system user management" ON user_organizations;

-- Create simplified policies for user_organizations
CREATE POLICY "allow_read_user_organizations"
ON user_organizations FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_insert_own_mapping"
ON user_organizations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_super_admin_manage_mappings"
ON user_organizations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
);

-- Add comments
COMMENT ON POLICY "allow_read_profiles" ON profiles IS 
'Allows public read access to all profiles';

COMMENT ON POLICY "allow_update_own_profile" ON profiles IS 
'Allows users to update their own profile';

COMMENT ON POLICY "allow_insert_own_profile" ON profiles IS 
'Allows users to create their own profile during signup';

COMMENT ON POLICY "allow_super_admin_access" ON profiles IS 
'Allows super admins to manage all profiles';

COMMENT ON POLICY "allow_read_user_organizations" ON user_organizations IS 
'Allows public read access to all user-organization mappings';

COMMENT ON POLICY "allow_insert_own_mapping" ON user_organizations IS 
'Allows users to create their own organization mappings';

COMMENT ON POLICY "allow_super_admin_manage_mappings" ON user_organizations IS 
'Allows super admins to manage all organization mappings';