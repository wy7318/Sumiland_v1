-- Drop existing policies for user_organizations
DROP POLICY IF EXISTS "Public can create mappings during signup" ON user_organizations;
DROP POLICY IF EXISTS "Super admin full access to mappings" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own mappings" ON user_organizations;

-- Create new non-recursive policies for user_organizations
CREATE POLICY "Allow users to create their own mappings"
ON user_organizations
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Allow users to view their own mappings"
ON user_organizations
FOR SELECT
TO public
USING (
  auth.uid() = user_id
);

CREATE POLICY "Allow super admins to manage all mappings"
ON user_organizations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

-- Drop existing policies for profiles if they exist
DROP POLICY IF EXISTS "Profiles readable by self" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by self" ON profiles;
DROP POLICY IF EXISTS "Profiles readable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles updatable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles insertable by super admins" ON profiles;
DROP POLICY IF EXISTS "Profiles deletable by super admins" ON profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow super admin to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow super admin to delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super admin can read all profiles" ON profiles;

-- Create new policies for profiles
CREATE POLICY "profiles_public_read"
ON profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "profiles_self_update"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_super_admin_all"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

-- Add comments
COMMENT ON POLICY "Allow users to create their own mappings" ON user_organizations IS 
'Allows users to create organization mappings for themselves during signup';

COMMENT ON POLICY "Allow users to view their own mappings" ON user_organizations IS 
'Allows users to view their own organization mappings';

COMMENT ON POLICY "Allow super admins to manage all mappings" ON user_organizations IS 
'Allows super admins to manage all organization mappings';

COMMENT ON POLICY "profiles_public_read" ON profiles IS 
'Allows public access to read profile information';

COMMENT ON POLICY "profiles_self_update" ON profiles IS 
'Allows users to update their own profile information';

COMMENT ON POLICY "profiles_super_admin_all" ON profiles IS 
'Allows super admins to manage all profiles';