-- Update user_organizations policies to allow direct user creation
DROP POLICY IF EXISTS "Allow mapping creation" ON user_organizations;
DROP POLICY IF EXISTS "Allow mapping viewing" ON user_organizations;
DROP POLICY IF EXISTS "Allow super admin and system user management" ON user_organizations;

-- Create simplified policies
CREATE POLICY "Allow users to create their own mappings"
ON user_organizations
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  OR
  auth.uid() = created_by
);

CREATE POLICY "Allow users to view their own mappings"
ON user_organizations
FOR SELECT
TO public
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

CREATE POLICY "Allow admins to manage all mappings"
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

-- Add comments
COMMENT ON POLICY "Allow users to create their own mappings" ON user_organizations IS 
'Allows users to create organization mappings for themselves';

COMMENT ON POLICY "Allow users to view their own mappings" ON user_organizations IS 
'Allows users to view their own organization mappings';

COMMENT ON POLICY "Allow admins to manage all mappings" ON user_organizations IS 
'Allows admins to manage all organization mappings';