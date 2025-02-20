-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website_url text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_zip_code text,
  billing_country text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip_code text,
  shipping_country text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  type text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id)
);

-- Create user-organization mapping table
CREATE TABLE IF NOT EXISTS user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);

-- Create policies for organizations

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

-- Create policies for user_organizations

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

-- Function to validate organization IDs
CREATE OR REPLACE FUNCTION validate_organization_ids(org_ids text[])
RETURNS TABLE(valid boolean, invalid_ids text[]) AS $$
DECLARE
  invalid text[] := '{}';
  org_id text;
BEGIN
  FOREACH org_id IN ARRAY org_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM organizations WHERE id::text = org_id
    ) THEN
      invalid := invalid || org_id;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT
    array_length(invalid, 1) IS NULL,
    invalid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;