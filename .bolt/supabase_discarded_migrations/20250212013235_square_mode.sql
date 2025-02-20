-- Drop existing RLS policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are modifiable by super admins" ON products;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
USING (true);

CREATE POLICY "Super admins can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
    )
);

CREATE POLICY "Super admins can update products"
ON products FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
    )
);

CREATE POLICY "Super admins can delete products"
ON products FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
    )
);