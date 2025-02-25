-- Drop existing policies for portfolio items
DROP POLICY IF EXISTS "Published portfolio items are viewable by everyone" ON portfolio_items;
DROP POLICY IF EXISTS "Portfolio items can be managed by authenticated users" ON portfolio_items;

-- Create new organization-based policies for portfolio items
CREATE POLICY "Published portfolio items are viewable by everyone"
ON portfolio_items FOR SELECT
USING (published = true);

CREATE POLICY "Portfolio items can be managed by organization members"
ON portfolio_items FOR ALL
TO authenticated
USING (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
)
WITH CHECK (
  organization_id IN (SELECT get_user_organizations_v2(auth.uid()))
);

-- Add comment
COMMENT ON TABLE portfolio_items IS 'Portfolio items with organization-based access control';