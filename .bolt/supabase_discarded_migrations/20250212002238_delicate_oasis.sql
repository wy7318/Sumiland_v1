/*
  # Fix Product Categories Reference
  
  1. Changes:
    - Update products table to reference product_categories instead of categories
    - Add proper foreign key constraint
  
  2. Security:
    - No changes to RLS policies needed
*/

-- Drop existing foreign key constraint if it exists
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Add new foreign key constraint to product_categories
ALTER TABLE products
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES product_categories(id) 
    ON DELETE SET NULL;

-- Update any existing category references
UPDATE products p
SET category_id = pc.id
FROM categories c
JOIN product_categories pc ON c.name = pc.name
WHERE p.category_id = c.id;