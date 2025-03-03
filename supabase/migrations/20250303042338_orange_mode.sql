-- Drop existing policies for profiles
DROP POLICY IF EXISTS "anyone_can_read_profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "super_admins_full_access" ON profiles;

-- Create new policies for profiles
CREATE POLICY "profiles_viewable_by_organization_members"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_organizations uo1
    WHERE uo1.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_organizations uo2
      WHERE uo2.organization_id = uo1.organization_id
      AND uo2.user_id = profiles.id
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
);

CREATE POLICY "profiles_self_update"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_insert"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_super_admin_access"
ON profiles FOR ALL
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
COMMENT ON POLICY "profiles_viewable_by_organization_members" ON profiles IS 
'Allows users to view profiles of other users in their organizations';

COMMENT ON POLICY "profiles_self_update" ON profiles IS 
'Allows users to update their own profile';

COMMENT ON POLICY "profiles_self_insert" ON profiles IS 
'Allows users to create their own profile during signup';

COMMENT ON POLICY "profiles_super_admin_access" ON profiles IS 
'Allows super admins to manage all profiles';