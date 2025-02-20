-- Drop existing policies
DROP POLICY IF EXISTS "Super admin full access" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Create policies for organizations

-- Allow public to search active organizations
CREATE POLICY "Public can search active organizations"
ON organizations
FOR SELECT
USING (status = 'active');

-- Super admin can do everything
CREATE POLICY "Super admin full access"
ON organizations
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

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = organizations.id
    AND user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON TABLE organizations IS 'Organizations table with public search access for signup process';