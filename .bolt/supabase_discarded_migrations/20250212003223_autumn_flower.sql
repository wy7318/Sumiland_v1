/*
  # Fix Product Categories Structure
  
  1. Changes:
    - Drop and recreate product_categories table with correct structure
    - Fix products table foreign key reference
    - Add proper indexes
  
  2. Security:
    - Ensure RLS is enabled
    - Add proper policies
*/

-- Drop existing foreign key constraint
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Drop and recreate product_categories table
DROP TABLE IF EXISTS product_categories;

CREATE TABLE product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category_type product_category NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT product_categories_name_unique UNIQUE (name),
    CONSTRAINT product_categories_type_check 
        CHECK (category_type::text = ANY(enum_range(NULL::product_category)::text[]))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);
CREATE INDEX IF NOT EXISTS idx_product_categories_type ON product_categories(category_type);

-- Add trigger for updated_at
DO $$ BEGIN
    CREATE TRIGGER set_product_categories_timestamp
        BEFORE UPDATE ON product_categories
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Fix products table foreign key
ALTER TABLE products
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES product_categories(id) 
    ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
    CREATE POLICY "Product categories are viewable by everyone"
        ON product_categories FOR SELECT
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Insert some default categories
INSERT INTO product_categories (name, category_type, description)
VALUES 
    ('Web Development', 'Web', 'Custom web development services'),
    ('Logo Design', 'Logo', 'Professional logo design services'),
    ('Brand Identity', 'Branding', 'Complete brand identity design'),
    ('UI/UX Design', 'Design', 'User interface and experience design'),
    ('Software Development', 'Software', 'Custom software development'),
    ('Business Consulting', 'Consulting', 'Professional business consulting services')
ON CONFLICT (name) DO NOTHING;