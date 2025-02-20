-- Drop and recreate product_categories table with correct structure
DROP TABLE IF EXISTS product_categories CASCADE;

-- Create product_categories table
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

-- Create products table with correct structure
DROP TABLE IF EXISTS products CASCADE;

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

-- Create indexes
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_categories
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

-- Create RLS policies for products
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

-- Insert default categories
INSERT INTO product_categories (name, category_type, description)
VALUES 
    ('Web Development', 'Web', 'Custom web development services'),
    ('Logo Design', 'Logo', 'Professional logo design services'),
    ('Brand Identity', 'Branding', 'Complete brand identity design'),
    ('UI/UX Design', 'Design', 'User interface and experience design'),
    ('Software Development', 'Software', 'Custom software development'),
    ('Business Consulting', 'Consulting', 'Professional business consulting services')
ON CONFLICT (name) DO NOTHING;