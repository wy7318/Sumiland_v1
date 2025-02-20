-- Create a secure function to handle user-organization mapping
CREATE OR REPLACE FUNCTION create_user_organization_mappings(
  user_id uuid,
  org_ids uuid[]
)
RETURNS void AS $$
DECLARE
  org_id uuid;
  system_user_id uuid;
BEGIN
  -- Get system user id
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'system@system.com';

  -- Create mappings for each organization
  FOREACH org_id IN ARRAY org_ids
  LOOP
    INSERT INTO user_organizations (
      user_id,
      organization_id,
      role,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      org_id,
      'member',
      system_user_id,
      now(),
      now()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION create_user_organization_mappings IS 
'Creates user-organization mappings using system user as creator';