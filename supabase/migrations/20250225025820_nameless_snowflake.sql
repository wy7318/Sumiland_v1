-- Add organization_id to vendors if it doesn't exist
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_organization 
ON vendors(organization_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors viewable by authenticated users" ON vendors;
DROP POLICY IF EXISTS "Vendors manageable by authenticated users" ON vendors;

-- Enable RLS if not already enabled
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Accounts are viewable by organization members"
ON vendors FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Accounts can be managed by organization admins"
ON vendors FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Add comment
COMMENT ON TABLE vendors IS 'Accounts (formerly vendors) with organization-based access control';