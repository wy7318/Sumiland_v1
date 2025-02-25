-- Add organization_id to product_categories if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_categories' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE product_categories 
    ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_categories_organization 
ON product_categories(organization_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_categories' 
    AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Categories are viewable by everyone" ON product_categories;
    DROP POLICY IF EXISTS "Categories can be managed by authenticated users" ON product_categories;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Categories are viewable by organization members"
ON product_categories FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Categories can be managed by organization admins"
ON product_categories FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Add comment
COMMENT ON TABLE product_categories IS 'Product categories with organization-based access control. Only organization admins and owners can manage categories.';