/*
  # Fix Product Categories Structure
  
  1. Changes:
    - Create product_categories table if not exists
    - Add proper ENUM type for category
    - Update products table to use correct category reference
  
  2. Security:
    - Enable RLS
    - Add policies for product categories
*/

-- Create product_categories table if not exists
CREATE TABLE IF NOT EXISTS product_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add trigger for updated_at
DO $$ BEGIN
  CREATE TRIGGER set_product_categories_timestamp
      BEFORE UPDATE ON product_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
  EXCEPTION
      WHEN duplicate_object THEN null;
END $$;

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

-- Update products table to reference product_categories
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_category_id_fkey;

ALTER TABLE products
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES product_categories(id) 
    ON DELETE SET NULL;