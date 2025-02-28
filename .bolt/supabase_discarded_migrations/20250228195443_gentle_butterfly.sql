-- Insert default picklist values for product categories
INSERT INTO picklist_values 
(type, value, label, is_default, is_active, display_order, color, text_color)
VALUES
('product_category', 'hardware', 'Hardware', true, true, 10, '#4B5563', '#FFFFFF'),
('product_category', 'software', 'Software', false, true, 20, '#3B82F6', '#FFFFFF'),
('product_category', 'service', 'Service', false, true, 30, '#10B981', '#FFFFFF'),
('product_category', 'consumable', 'Consumable', false, true, 40, '#F59E0B', '#FFFFFF'),
('product_category', 'other', 'Other', false, true, 50, '#6B7280', '#FFFFFF');

-- Insert default picklist values for stock unit types
INSERT INTO picklist_values 
(type, value, label, is_default, is_active, display_order, color, text_color)
VALUES
('product_stock_unit', 'quantity', 'Quantity', true, true, 10, '#4B5563', '#FFFFFF'),
('product_stock_unit', 'weight', 'Weight', false, true, 20, '#3B82F6', '#FFFFFF');

-- Insert default picklist values for weight units
INSERT INTO picklist_values 
(type, value, label, is_default, is_active, display_order, color, text_color)
VALUES
('product_weight_unit', 'kg', 'Kilograms (kg)', true, true, 10, '#4B5563', '#FFFFFF'),
('product_weight_unit', 'g', 'Grams (g)', false, true, 20, '#3B82F6', '#FFFFFF'),
('product_weight_unit', 'lb', 'Pounds (lb)', false, true, 30, '#10B981', '#FFFFFF'),
('product_weight_unit', 'oz', 'Ounces (oz)', false, true, 40, '#F59E0B', '#FFFFFF');

-- Add comment
COMMENT ON TABLE picklist_values IS 'Stores picklist values including product categories and stock unit types';