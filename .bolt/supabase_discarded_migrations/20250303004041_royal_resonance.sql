-- Add default lead status values
INSERT INTO picklist_values 
(organization_id, type, value, label, description, is_default, is_active, display_order, color, text_color, created_by)
SELECT 
  o.id as organization_id,
  'lead_status' as type,
  value,
  label,
  description,
  is_default,
  true as is_active,
  display_order,
  color,
  text_color,
  (SELECT id FROM auth.users WHERE email = 'system@system.com') as created_by
FROM organizations o
CROSS JOIN (
  VALUES 
    ('new', 'New', 'Lead is new and needs review', true, 0, '#E3F2FD', '#1E88E5'),
    ('contacted', 'Contacted', 'Initial contact has been made', false, 1, '#E8F5E9', '#43A047'),
    ('working', 'Working', 'Actively working with the lead', false, 2, '#FFF3E0', '#FB8C00'),
    ('qualified', 'Qualified', 'Lead has been qualified', false, 3, '#E8EAF6', '#3949AB'),
    ('unqualified', 'Unqualified', 'Lead has been determined to be unqualified', false, 4, '#FFEBEE', '#E53935'),
    ('converted', 'Converted', 'Lead has been converted to customer', false, 5, '#E0F2F1', '#00897B'),
    ('closed', 'Closed', 'Lead opportunity is closed', false, 6, '#EFEBE9', '#6D4C41')
) AS v(value, label, description, is_default, display_order, color, text_color)
WHERE NOT EXISTS (
  SELECT 1 FROM picklist_values 
  WHERE type = 'lead_status' 
  AND organization_id = o.id
);

-- Add default lead source values
INSERT INTO picklist_values 
(organization_id, type, value, label, description, is_default, is_active, display_order, color, text_color, created_by)
SELECT 
  o.id as organization_id,
  'lead_source' as type,
  value,
  label,
  description,
  is_default,
  true as is_active,
  display_order,
  color,
  text_color,
  (SELECT id FROM auth.users WHERE email = 'system@system.com') as created_by
FROM organizations o
CROSS JOIN (
  VALUES 
    ('web', 'Website', 'Lead from website contact form', true, 0, '#E3F2FD', '#1E88E5'),
    ('referral', 'Referral', 'Referred by existing customer or partner', false, 1, '#E8F5E9', '#43A047'),
    ('social', 'Social Media', 'Lead from social media platforms', false, 2, '#F3E5F5', '#8E24AA'),
    ('email', 'Email Campaign', 'Lead from email marketing campaign', false, 3, '#FFF3E0', '#FB8C00'),
    ('event', 'Event', 'Lead from trade show or event', false, 4, '#E8EAF6', '#3949AB'),
    ('cold_call', 'Cold Call', 'Lead from cold calling', false, 5, '#FFEBEE', '#E53935'),
    ('other', 'Other', 'Other lead sources', false, 6, '#EFEBE9', '#6D4C41')
) AS v(value, label, description, is_default, display_order, color, text_color)
WHERE NOT EXISTS (
  SELECT 1 FROM picklist_values 
  WHERE type = 'lead_source' 
  AND organization_id = o.id
);

-- Add comment
COMMENT ON TABLE picklist_values IS 'Stores picklist values including lead status and source options';