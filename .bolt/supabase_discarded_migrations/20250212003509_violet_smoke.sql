/*
  # Fix Products Table Structure
  
  1. Changes:
    - Drop and recreate products table with correct structure
    - Add proper indexes and constraints
    - Add RLS policies
  
  2. Security:
    - Enable RLS
    - Add proper policies for super admins
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS products;

-- Create products table with correct structure
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    description text,
    price decimal(10,2) NOT NULL CHECK (price >= 0),
    status product_status NOT NULL DEFAULT 'inactive',
    category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
    image_url text,
    metadata jsonb,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- Add trigger for updated_at
DO $$ BEGIN
    CREATE TRIGGER set_products_timestamp
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
    CREATE POLICY "Products are viewable by everyone"
        ON products FOR SELECT
        USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Products are modifiable by super admins"
        ON products FOR ALL
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

-- Insert some sample products
INSERT INTO products (name, description, price, status, category_id, image_url)
SELECT 
    'Web Development Package',
    'Complete web development service including design and implementation',
    2999.99,
    'active',
    pc.id,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800'
FROM product_categories pc
WHERE pc.name = 'Web Development'
LIMIT 1;

INSERT INTO products (name, description, price, status, category_id, image_url)
SELECT 
    'Logo Design Package',
    'Professional logo design with unlimited revisions',
    499.99,
    'active',
    pc.id,
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800'
FROM product_categories pc
WHERE pc.name = 'Logo Design'
LIMIT 1;

INSERT INTO products (name, description, price, status, category_id, image_url)
SELECT 
    'Brand Identity Package',
    'Complete brand identity design including logo, colors, and guidelines',
    1499.99,
    'active',
    pc.id,
    'https://images.unsplash.com/photo-1434626881859-194d67b2b86f?w=800'
FROM product_categories pc
WHERE pc.name = 'Brand Identity'
LIMIT 1;