-- Create secure function to handle organization mappings
CREATE OR REPLACE FUNCTION create_user_organization_mappings(
  user_id uuid,
  org_ids uuid[]
)
RETURNS void AS $$
DECLARE
  system_user_id uuid;
  org_id uuid;
BEGIN
  -- Get system user id
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'info@sumisubi.com';

  -- Validate system user exists
  IF system_user_id IS NULL THEN
    RAISE EXCEPTION 'System user not found';
  END IF;

  -- Insert mappings for each organization
  FOREACH org_id IN ARRAY org_ids
  LOOP
    -- Validate organization exists and is active
    IF NOT EXISTS (
      SELECT 1 FROM organizations
      WHERE id = org_id
      AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Invalid organization ID: %', org_id;
    END IF;

    -- Create mapping
    INSERT INTO user_organizations (
      user_id,
      organization_id,
      role,
      created_by,
      updated_by
    ) VALUES (
      user_id,
      org_id,
      'member',
      system_user_id,
      system_user_id
    )
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION create_user_organization_mappings IS 
'Securely creates organization mappings for a user using the system user as creator';