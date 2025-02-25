-- Add organization_id to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Add organization_id to feeds table
ALTER TABLE feeds
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cases_organization ON cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_feeds_organization ON feeds(organization_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Cases are viewable by authenticated users" ON cases;
DROP POLICY IF EXISTS "Cases can be created by anyone" ON cases;
DROP POLICY IF EXISTS "Cases can be updated by authenticated users" ON cases;

-- Create new organization-based policies for cases
CREATE POLICY "Cases are viewable by organization members"
ON cases FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
);

CREATE POLICY "Cases can be created with organization check"
ON cases FOR INSERT
WITH CHECK (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
);

CREATE POLICY "Cases can be updated by organization members"
ON cases FOR UPDATE
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
);

CREATE POLICY "Cases can be deleted by organization members"
ON cases FOR DELETE
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
);

-- Drop existing policies for feeds
DROP POLICY IF EXISTS "Feeds are viewable by authenticated users" ON feeds;
DROP POLICY IF EXISTS "Authenticated users can create feeds" ON feeds;
DROP POLICY IF EXISTS "Users can update their own feeds" ON feeds;

-- Create new organization-based policies for feeds
CREATE POLICY "Feeds are viewable by organization members"
ON feeds FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
  AND status = 'Active'
);

CREATE POLICY "Feeds can be created by organization members"
ON feeds FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
  AND auth.uid() = created_by
  AND status = 'Active'
);

CREATE POLICY "Feeds can be updated by organization members"
ON feeds FOR UPDATE
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
  AND auth.uid() = created_by
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
  AND auth.uid() = created_by
);

-- Update the soft delete function to check organization access
CREATE OR REPLACE FUNCTION soft_delete_feed(feed_id uuid, user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE feeds
  SET status = 'Deleted',
      updated_by = user_id,
      updated_at = now()
  WHERE id = feed_id
  AND created_by = user_id
  AND organization_id IN (SELECT get_user_organizations_v2(user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON COLUMN cases.organization_id IS 'The organization this case belongs to';
COMMENT ON COLUMN feeds.organization_id IS 'The organization this feed belongs to';