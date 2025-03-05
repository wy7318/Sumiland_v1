-- Create function to get organization ID from request header
CREATE OR REPLACE FUNCTION request_organization_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (current_setting('request.headers')::json->>'x-organization-id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE;

-- Update RLS policies to use the organization header
CREATE OR REPLACE FUNCTION user_belongs_to_organization(org_id uuid)
RETURNS boolean AS $$
BEGIN
  -- First check if the organization ID matches the request header
  IF org_id != request_organization_id() THEN
    RETURN false;
  END IF;

  -- Then check if the user belongs to the organization
  RETURN EXISTS (
    SELECT 1
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies for all relevant tables
ALTER POLICY "Cases are viewable by organization members" ON cases
USING (
  organization_id = request_organization_id() 
  AND user_belongs_to_organization(organization_id)
);

ALTER POLICY "Customers are viewable by organization members" ON customers
USING (
  organization_id = request_organization_id() 
  AND user_belongs_to_organization(organization_id)
);

ALTER POLICY "Leads are viewable by organization members" ON leads
USING (
  organization_id = request_organization_id() 
  AND user_belongs_to_organization(organization_id)
);

ALTER POLICY "Custom fields are viewable by organization members" ON custom_fields
USING (
  organization_id = request_organization_id() 
  AND user_belongs_to_organization(organization_id)
);

ALTER POLICY "Custom field values are viewable by organization members" ON custom_field_values
USING (
  organization_id = request_organization_id() 
  AND user_belongs_to_organization(organization_id)
);

-- Add comments
COMMENT ON FUNCTION request_organization_id() IS 'Gets the organization ID from the request header';
COMMENT ON FUNCTION user_belongs_to_organization(uuid) IS 'Checks if the authenticated user belongs to the organization and if it matches the request header';