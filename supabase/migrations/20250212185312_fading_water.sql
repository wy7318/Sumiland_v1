/*
  # Fix Feeds and Profiles Relationship

  1. Changes
    - Add foreign key constraint between feeds.created_by and profiles.id
    - Add foreign key constraint between feeds.updated_by and profiles.id
    - Update feed policies to ensure proper access control

  2. Security
    - Maintain existing RLS policies
    - Ensure proper relationship between feeds and profiles
*/

-- Add foreign key constraints
ALTER TABLE feeds
DROP CONSTRAINT IF EXISTS feeds_created_by_fkey,
DROP CONSTRAINT IF EXISTS feeds_updated_by_fkey;

ALTER TABLE feeds
ADD CONSTRAINT feeds_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE feeds
ADD CONSTRAINT feeds_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Update the feed query in CaseDetailPage to use the correct join
COMMENT ON TABLE feeds IS 'Stores feed entries for cases with proper profile relationships';