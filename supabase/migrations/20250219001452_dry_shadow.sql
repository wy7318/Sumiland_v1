-- Drop existing policies
DROP POLICY IF EXISTS "Super admin full access to mappings" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own mappings" ON user_organizations;

-- Create policies for user_organizations

-- Allow public to create mappings during signup
CREATE POLICY "Public can create mappings during signup"
ON user_organizations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND
  EXISTS (
    SELECT 1 FROM organizations
    WHERE id = organization_id
    AND status = 'active'
  )
);

-- Super admin can do everything
CREATE POLICY "Super admin full access to mappings"
ON user_organizations
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

-- Users can view their own mappings
CREATE POLICY "Users can view their own mappings"
ON user_organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE user_organizations IS 'User-organization mappings with public insert access for signup process';