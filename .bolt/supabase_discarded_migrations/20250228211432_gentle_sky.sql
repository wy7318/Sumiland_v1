-- Insert default picklist values for quote status
INSERT INTO picklist_values 
(type, value, label, is_default, is_active, display_order, color, text_color)
VALUES
('quote_status', 'Draft', 'Draft', true, true, 10, '#4B5563', '#FFFFFF'),
('quote_status', 'Pending', 'Pending', false, true, 20, '#F59E0B', '#FFFFFF'),
('quote_status', 'Approved', 'Approved', false, true, 30, '#10B981', '#FFFFFF'),
('quote_status', 'Rejected', 'Rejected', false, true, 40, '#EF4444', '#FFFFFF'),
('quote_status', 'Expired', 'Expired', false, true, 50, '#6B7280', '#FFFFFF');

-- Add comment
COMMENT ON TABLE picklist_values IS 'Stores picklist values including quote statuses';