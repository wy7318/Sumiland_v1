-- Drop existing enum if it exists
DROP TYPE IF EXISTS product_category;

-- Create product_category enum
CREATE TYPE product_category AS ENUM ('Design', 'Web', 'Logo', 'Branding', 'Software', 'Consulting');

-- Add category_type column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type product_category;

-- Update existing categories to match enum values
UPDATE categories 
SET category_type = 
  CASE 
    WHEN name ILIKE '%design%' THEN 'Design'::product_category
    WHEN name ILIKE '%web%' THEN 'Web'::product_category
    WHEN name ILIKE '%logo%' THEN 'Logo'::product_category
    WHEN name ILIKE '%brand%' THEN 'Branding'::product_category
    WHEN name ILIKE '%software%' THEN 'Software'::product_category
    WHEN name ILIKE '%consult%' THEN 'Consulting'::product_category
    ELSE NULL
  END;

-- Add constraint to ensure category_type is not null
ALTER TABLE categories 
  ALTER COLUMN category_type SET NOT NULL,
  ADD CONSTRAINT categories_type_check CHECK (category_type::text = ANY(enum_range(NULL::product_category)::text[]));

-- Recreate RLS policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Categories are modifiable by super admins" ON categories;

CREATE POLICY "Categories are viewable by everyone"
    ON categories FOR SELECT
    USING (true);

CREATE POLICY "Categories are modifiable by super admins"
    ON categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_super_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_super_admin = true
        )
    );