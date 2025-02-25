-- Add default organization for public submissions
CREATE OR REPLACE FUNCTION get_default_organization()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT id INTO org_id
  FROM organizations
  WHERE name = 'Sumiland'
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Cases are viewable by authenticated users" ON cases;
DROP POLICY IF EXISTS "Cases can be created by anyone" ON cases;
DROP POLICY IF EXISTS "Cases can be updated by authenticated users" ON cases;

-- Create new policies for cases
CREATE POLICY "Cases are viewable by organization members"
ON cases FOR SELECT
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
);

CREATE POLICY "Cases can be created by anyone"
ON cases FOR INSERT
TO public
WITH CHECK (
  organization_id = get_default_organization()
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

-- Create new policies for feeds
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