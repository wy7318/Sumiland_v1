/*
  # Fix Categories Structure
  
  1. Changes:
    - Create separate tables for product and post categories
    - Migrate existing data to new structure
    - Update foreign key relationships
    - Add appropriate RLS policies
  
  2. Security:
    - Enable RLS on new tables
    - Add policies for viewing and modifying categories
*/

-- Create new product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category_type product_category NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT product_categories_type_check 
        CHECK (category_type::text = ANY(enum_range(NULL::product_category)::text[]))
);

-- Create new post_categories table
CREATE TABLE IF NOT EXISTS post_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Migrate product categories
INSERT INTO product_categories (name, category_type, description, created_at)
SELECT 
    name,
    category_type,
    description,
    created_at
FROM categories
WHERE category_type IS NOT NULL;

-- Migrate post categories
INSERT INTO post_categories (name, slug, description, created_at)
SELECT 
    name,
    COALESCE(slug, LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))),
    description,
    created_at
FROM categories
WHERE id IN (
    SELECT DISTINCT category_id 
    FROM post_categories pc 
    WHERE category_id IS NOT NULL
);

-- Update products table to reference new product_categories
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_category_id_fkey,
    ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES product_categories(id) 
        ON DELETE SET NULL;

-- Update post_categories junction table
ALTER TABLE post_categories
    DROP CONSTRAINT IF EXISTS post_categories_category_id_fkey,
    ADD CONSTRAINT post_categories_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES post_categories(id) 
        ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product categories
CREATE POLICY "Product categories are viewable by everyone"
    ON product_categories FOR SELECT
    USING (true);

CREATE POLICY "Product categories are modifiable by super admins"
    ON product_categories FOR ALL
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

-- Create RLS policies for post categories
CREATE POLICY "Post categories are viewable by everyone"
    ON post_categories FOR SELECT
    USING (true);

CREATE POLICY "Post categories are modifiable by super admins"
    ON post_categories FOR ALL
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

-- Add triggers for updated_at
CREATE TRIGGER set_product_categories_timestamp
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_post_categories_timestamp
    BEFORE UPDATE ON post_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();