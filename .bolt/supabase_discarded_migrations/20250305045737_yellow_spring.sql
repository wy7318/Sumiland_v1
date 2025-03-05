-- Drop existing policies
DROP POLICY IF EXISTS "Cases are viewable by organization members" ON cases;
DROP POLICY IF EXISTS "Cases can be created by anyone" ON cases;
DROP POLICY IF EXISTS "Cases can be updated by organization members" ON cases;
DROP POLICY IF EXISTS "Cases can be deleted by organization members" ON cases;

-- Create new policies with proper organization filtering
CREATE POLICY "Cases are viewable by organization members"
ON cases FOR SELECT
TO authenticated
USING (
  organization_id = request_organization_id() 
  AND EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = cases.organization_id
  )
);

CREATE POLICY "Cases can be created by organization members"
ON cases FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = request_organization_id() 
  AND EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = cases.organization_id
  )
);

CREATE POLICY "Cases can be updated by organization members"
ON cases FOR UPDATE
TO authenticated
USING (
  organization_id = request_organization_id() 
  AND EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = cases.organization_id
  )
)
WITH CHECK (
  organization_id = request_organization_id() 
  AND EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = cases.organization_id
  )
);

CREATE POLICY "Cases can be deleted by organization members"
ON cases FOR DELETE
TO authenticated
USING (
  organization_id = request_organization_id() 
  AND EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = cases.organization_id
  )
);

-- Update function to validate organization access
CREATE OR REPLACE FUNCTION validate_organization_access(org_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if the organization ID matches the request header
  -- and if the user belongs to the organization
  RETURN 
    org_id = request_organization_id() 
    AND EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid()
      AND organization_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION validate_organization_access(uuid) IS 
'Validates that the user has access to the organization and it matches the request header';