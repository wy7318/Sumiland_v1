/*
  # Create Feeds Table for Case Management

  1. New Tables
    - `feeds`
      - `id` (uuid, primary key)
      - `content` (text, required)
      - `parent_id` (uuid, references feeds)
      - `parent_type` (text, e.g., 'Case')
      - `reference_id` (uuid, references the parent record)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_by` (uuid, references auth.users)
      - `updated_at` (timestamptz)
      - `status` (text, 'Active' or 'Deleted')

  2. Security
    - Enable RLS on `feeds` table
    - Add policies for authenticated users to:
      - Read all active feeds
      - Create new feeds
      - Update their own feeds
      - Soft delete their own feeds

  3. Indexes
    - Create indexes for performance optimization
*/

-- Create feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  parent_id uuid REFERENCES feeds(id),
  parent_type text NOT NULL CHECK (parent_type IN ('Case')),
  reference_id uuid NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('Active', 'Deleted')) DEFAULT 'Active'
);

-- Enable RLS
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feeds_parent ON feeds(parent_id);
CREATE INDEX IF NOT EXISTS idx_feeds_reference ON feeds(parent_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_feeds_created_at ON feeds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);

-- Create policies
CREATE POLICY "Feeds are viewable by authenticated users"
ON feeds FOR SELECT
TO authenticated
USING (status = 'Active');

CREATE POLICY "Authenticated users can create feeds"
ON feeds FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  status = 'Active'
);

CREATE POLICY "Users can update their own feeds"
ON feeds FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create function to soft delete feeds
CREATE OR REPLACE FUNCTION soft_delete_feed(feed_id uuid, user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE feeds
  SET status = 'Deleted',
      updated_by = user_id,
      updated_at = now()
  WHERE id = feed_id
  AND created_by = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;