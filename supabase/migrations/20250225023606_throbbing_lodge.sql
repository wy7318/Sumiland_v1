-- Add organization_id to products if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_organization 
ON products(organization_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
    DROP POLICY IF EXISTS "Products can be managed by authenticated users" ON products;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Products are viewable by organization members"
ON products FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Products can be managed by organization admins"
ON products FOR ALL
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
COMMENT ON TABLE products IS 'Products with organization-based access control. Only organization admins and owners can manage products.';