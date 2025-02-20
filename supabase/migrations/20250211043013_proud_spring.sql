/*
  # Set up super admin user
  
  1. Changes
    - Update matt.lee@sumisubi.com user to have admin type
    - Ensure proper admin access
*/

-- Update the specific user to be admin
UPDATE profiles
SET type = 'admin'
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'matt.lee@sumisubi.com'
);

-- Ensure admin role is set
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'matt.lee@sumisubi.com'
);