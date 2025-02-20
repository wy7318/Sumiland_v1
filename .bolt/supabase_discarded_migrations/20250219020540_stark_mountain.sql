-- Create system user if it doesn't exist
CREATE OR REPLACE FUNCTION create_system_user()
RETURNS void AS $$
DECLARE
  system_user_id uuid;
BEGIN
  -- Check if system user profile exists
  SELECT id INTO system_user_id
  FROM profiles
  WHERE name = 'System';

  -- If system user doesn't exist, create it
  IF system_user_id IS NULL THEN
    -- Generate a UUID for the system user
    system_user_id := gen_random_uuid();
    
    -- Create system user profile
    INSERT INTO profiles (
      id,
      name,
      role,
      type,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      system_user_id,
      'System',
      'admin',
      'admin',
      true,
      now(),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the system user
SELECT create_system_user();

-- Update policies to allow system user operations
CREATE OR REPLACE FUNCTION is_system_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND (
        is_super_admin = true 
        OR name = 'System'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user_organizations policies
DROP POLICY IF EXISTS "Allow mapping creation" ON user_organizations;
DROP POLICY IF EXISTS "Allow mapping viewing" ON user_organizations;
DROP POLICY IF EXISTS "Allow super admin and system user management" ON user_organizations;

CREATE POLICY "Allow public mapping creation"
ON user_organizations
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  OR
  created_by IN (
    SELECT id FROM profiles WHERE name = 'System'
  )
);

CREATE POLICY "Allow mapping viewing"
ON user_organizations
FOR SELECT
TO public
USING (
  auth.uid() = user_id
  OR
  is_system_or_admin()
);

CREATE POLICY "Allow admin management"
ON user_organizations
FOR ALL
TO authenticated
USING (is_system_or_admin())
WITH CHECK (is_system_or_admin());

-- Add comments
COMMENT ON FUNCTION create_system_user() IS 'Creates the system user profile if it does not exist';
COMMENT ON FUNCTION is_system_or_admin() IS 'Checks if the current user is a system user or admin';