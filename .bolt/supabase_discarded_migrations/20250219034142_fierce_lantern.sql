-- Drop existing policies
DROP POLICY IF EXISTS "Enable profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Enable profile reading" ON profiles;
DROP POLICY IF EXISTS "Enable self profile updates" ON profiles;
DROP POLICY IF EXISTS "Enable super admin full access" ON profiles;

-- Create new policies with proper security
CREATE POLICY "Allow profile creation during signup"
ON profiles
FOR INSERT
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow public profile reading"
ON profiles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow self profile updates"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow super admin full access"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = true
  )
);

-- Create secure function to handle profile creation
CREATE OR REPLACE FUNCTION handle_auth_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id,
    name,
    role,
    type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'user',
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_profile();

-- Add comments
COMMENT ON FUNCTION handle_auth_user_profile IS 
'Creates a profile for new users with proper security context';

COMMENT ON POLICY "Allow profile creation during signup" ON profiles IS 
'Allows authenticated users to create their own profile';

COMMENT ON POLICY "Allow public profile reading" ON profiles IS 
'Allows anyone to read profile information';

COMMENT ON POLICY "Allow self profile updates" ON profiles IS 
'Allows users to update their own profile';

COMMENT ON POLICY "Allow super admin full access" ON profiles IS 
'Allows super admins to manage all profiles';