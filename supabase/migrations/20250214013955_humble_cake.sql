/*
  # Add phone column to profiles table

  1. Changes
    - Add phone column to profiles table
    - Add index for phone column for better query performance
*/

-- Add phone column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Create index for phone field
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Add comment to document the column
COMMENT ON COLUMN profiles.phone IS 'User phone number for contact purposes';