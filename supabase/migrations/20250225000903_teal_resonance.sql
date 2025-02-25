-- Create new versions of the functions with different names
CREATE OR REPLACE FUNCTION get_user_organizations_v2(check_user_id uuid)
RETURNS TABLE (organization_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id
  FROM user_organizations uo
  WHERE uo.user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_belongs_to_organization_v2(check_user_id uuid, check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_organizations uo
    WHERE uo.user_id = check_user_id
    AND uo.organization_id = check_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing policies to use new functions
DO $$ 
BEGIN
  -- Update posts policies
  DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
  CREATE POLICY "Published posts are viewable by everyone"
    ON posts FOR SELECT
    USING (published = true);

  DROP POLICY IF EXISTS "Posts can be managed by organization members" ON posts;
  CREATE POLICY "Posts can be managed by organization members"
    ON posts FOR ALL
    TO authenticated
    USING (organization_id IN (SELECT get_user_organizations_v2(auth.uid())))
    WITH CHECK (organization_id IN (SELECT get_user_organizations_v2(auth.uid())));

  -- Update authors policies
  DROP POLICY IF EXISTS "Authors can be managed by organization members" ON authors;
  CREATE POLICY "Authors can be managed by organization members"
    ON authors FOR ALL
    TO authenticated
    USING (organization_id IN (SELECT get_user_organizations_v2(auth.uid())))
    WITH CHECK (organization_id IN (SELECT get_user_organizations_v2(auth.uid())));

  -- Update categories policies
  DROP POLICY IF EXISTS "Categories can be managed by organization members" ON categories;
  CREATE POLICY "Categories can be managed by organization members"
    ON categories FOR ALL
    TO authenticated
    USING (organization_id IN (SELECT get_user_organizations_v2(auth.uid())))
    WITH CHECK (organization_id IN (SELECT get_user_organizations_v2(auth.uid())));

  -- Update tags policies
  DROP POLICY IF EXISTS "Tags can be managed by organization members" ON tags;
  CREATE POLICY "Tags can be managed by organization members"
    ON tags FOR ALL
    TO authenticated
    USING (organization_id IN (SELECT get_user_organizations_v2(auth.uid())))
    WITH CHECK (organization_id IN (SELECT get_user_organizations_v2(auth.uid())));
END $$;

-- Add comments
COMMENT ON FUNCTION get_user_organizations_v2(uuid) IS 
'Returns a table of organization IDs that the given user belongs to. Parameter renamed to avoid ambiguity.';

COMMENT ON FUNCTION user_belongs_to_organization_v2(uuid, uuid) IS 
'Checks if a user belongs to a specific organization. Parameters renamed to avoid ambiguity.';