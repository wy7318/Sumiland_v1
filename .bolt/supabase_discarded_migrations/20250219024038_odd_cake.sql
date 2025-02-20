-- Drop all existing policies for profiles
DO $$ 
BEGIN
  -- Drop policies if they exist
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
END $$;

-- Create basic policies for profiles
CREATE POLICY "Enable insert for signup"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for authenticated users"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for users based on id"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add comment
COMMENT ON TABLE profiles IS 'User profiles with basic CRUD policies for signup and user management';