-- Update RLS policies for blog-related tables

-- Posts
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Posts can be managed by authenticated users" ON posts;

CREATE POLICY "Published posts are viewable by everyone"
ON posts
FOR SELECT
USING (
  published = true
  OR
  (auth.uid() IS NOT NULL AND organization_id IN (SELECT get_user_organizations(auth.uid())))
);

CREATE POLICY "Posts can be managed by organization members"
ON posts
FOR ALL
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Authors
DROP POLICY IF EXISTS "Authors are viewable by everyone" ON authors;
DROP POLICY IF EXISTS "Authors can be managed by authenticated users" ON authors;

CREATE POLICY "Authors are viewable by everyone"
ON authors
FOR SELECT
USING (true);

CREATE POLICY "Authors can be managed by organization members"
ON authors
FOR ALL
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Categories can be managed by authenticated users" ON categories;

CREATE POLICY "Categories are viewable by everyone"
ON categories
FOR SELECT
USING (true);

CREATE POLICY "Categories can be managed by organization members"
ON categories
FOR ALL
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Tags
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON tags;
DROP POLICY IF EXISTS "Tags can be managed by authenticated users" ON tags;

CREATE POLICY "Tags are viewable by everyone"
ON tags
FOR SELECT
USING (true);

CREATE POLICY "Tags can be managed by organization members"
ON tags
FOR ALL
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations(auth.uid()))
);

-- Function to get organization ID for new blog content
CREATE OR REPLACE FUNCTION get_default_organization()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Get the first organization the user belongs to
  SELECT organization_id INTO org_id
  FROM user_organizations
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_default_organization IS 
'Returns the default organization ID for the current user when creating new content';