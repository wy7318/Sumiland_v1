/*
  # Authentication and User Management Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `role` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on profiles table
    - Add policies for profile management
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'user')) DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Profiles can be created on signup" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
  VALUES (
    'matt.lee@sumisubi.com',
    crypt('Mskm1324!!', gen_salt('bf')),
    now(),
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Insert into profiles
  INSERT INTO profiles (id, name, role)
  VALUES (v_user_id, 'Matt Lee', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;