/*
  # Fix Product Tables Structure
  
  1. Changes:
    - Ensure product_categories table exists with correct structure
    - Fix products table foreign key reference
    - Add category_type column to product_categories
  
  2. Security:
    - Ensure RLS is enabled
    - Add proper policies
*/

-- Ensure product_categories has the correct structure
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

-- Add trigger for updated_at if it doesn't exist
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
    DROP CONSTRAINT IF EXISTS products_category_id_fkey;

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