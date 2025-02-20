-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
DROP POLICY IF EXISTS "Categories are modifiable by super admins" ON categories;

-- Create new policies
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