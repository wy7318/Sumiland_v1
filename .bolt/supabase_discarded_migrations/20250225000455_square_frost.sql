-- Drop and recreate the function with fixed parameter names
CREATE OR REPLACE FUNCTION user_belongs_to_organization(check_user_id uuid, check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_organizations
    WHERE user_id = check_user_id
    AND organization_id = check_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION user_belongs_to_organization(uuid, uuid) IS 
'Checks if a user belongs to a specific organization. Parameters are renamed to avoid ambiguity.';