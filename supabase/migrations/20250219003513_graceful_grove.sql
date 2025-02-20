-- Create system user if it doesn't exist
DO $$ 
DECLARE
  system_user_id uuid;
BEGIN
  -- First check if system user exists
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'system@system.com';

  -- If system user doesn't exist, create it
  IF system_user_id IS NULL THEN
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      role
    ) VALUES (
      'system@system.com',
      crypt('System123!@#', gen_salt('bf')),
      now(),
      'authenticated'
    )
    RETURNING id INTO system_user_id;

    -- Create system user profile
    INSERT INTO profiles (
      id,
      name,
      role,
      type,
      is_super_admin
    ) VALUES (
      system_user_id,
      'System',
      'admin',
      'admin',
      true
    );
  END IF;
END $$;

-- Update user_organizations policies to allow system user
DROP POLICY IF EXISTS "Allow users to create their own mappings" ON user_organizations;
DROP POLICY IF EXISTS "Allow users to view their own mappings" ON user_organizations;
DROP POLICY IF EXISTS "Allow super admins to manage all mappings" ON user_organizations;

CREATE POLICY "Allow mapping creation"
ON user_organizations
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'system@system.com' 
    AND id = created_by
  )
);

CREATE POLICY "Allow mapping viewing"
ON user_organizations
FOR SELECT
TO public
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
);

CREATE POLICY "Allow super admin and system user management"
ON user_organizations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      is_super_admin = true
      OR
      id IN (
        SELECT id FROM auth.users WHERE email = 'system@system.com'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      is_super_admin = true
      OR
      id IN (
        SELECT id FROM auth.users WHERE email = 'system@system.com'
      )
    )
  )
);

-- Update the signUp function to use system user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  system_user_id uuid;
BEGIN
  -- Get system user id
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'system@system.com';

  -- Create profile for new user
  INSERT INTO profiles (id, name, role, type)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'user', 'user');

  -- Note: Organization mappings will be handled by the application
  -- using the system user as created_by

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comments
COMMENT ON FUNCTION handle_new_user() IS 
'Handles new user creation by setting up their profile and using system user for required fields';