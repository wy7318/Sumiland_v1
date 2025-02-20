/*
  # Create Products Table

  1. New Types
    - product_status ENUM ('active', 'inactive')
    - product_category ENUM ('Design', 'Web', 'Logo', 'Branding', 'Software', 'Consulting')

  2. New Tables
    - products
      - id (uuid, primary key)
      - name (varchar, required)
      - description (text, optional)
      - price (decimal, required)
      - status (product_status enum)
      - created_at (timestamp)
      - updated_at (timestamp)
      - category_id (uuid, optional)
      - image_url (text, optional)
      - metadata (jsonb, optional)

  3. Indexes and Constraints
    - B-tree indexes on name, category_id, status
    - Check constraint on price
    - RLS policies for security
*/

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('Design', 'Web', 'Logo', 'Branding', 'Software', 'Consulting');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(255) NOT NULL,
    description     text,
    price           decimal(10,2) NOT NULL,
    status          product_status NOT NULL DEFAULT 'inactive',
    created_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    category_id     uuid REFERENCES categories(id) ON DELETE SET NULL,
    image_url       text,
    metadata        jsonb,
    CONSTRAINT price_positive CHECK (price >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING btree (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products USING btree (status);

-- Create update timestamp trigger
CREATE TRIGGER set_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Products are viewable by everyone"
    ON products FOR SELECT
    USING (true);

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