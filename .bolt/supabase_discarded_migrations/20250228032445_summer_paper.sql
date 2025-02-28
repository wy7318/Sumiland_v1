-- Insert default case types
INSERT INTO picklist_values 
(type, value, label, description, is_default, is_active, display_order, organization_id, created_by)
SELECT 
  'case_type',
  value,
  label,
  description,
  is_default,
  true,
  display_order,
  organizations.id,
  (SELECT id FROM auth.users WHERE email = 'system@system.com')
FROM (
  VALUES 
    ('Design_Inquiry', 'Design Inquiry', 'For design-related inquiries and requests', true, 0),
    ('Career', 'Career', 'For job applications and career opportunities', false, 1),
    ('Other', 'Other', 'For other types of inquiries', false, 2)
) AS types(value, label, description, is_default, display_order)
CROSS JOIN (
  SELECT id FROM organizations WHERE name = 'Sumiland'
) organizations
ON CONFLICT (organization_id, type, value) DO NOTHING;

-- Insert default case statuses
INSERT INTO picklist_values 
(type, value, label, description, is_default, is_active, display_order, organization_id, created_by)
SELECT 
  'case_status',
  value,
  label,
  description,
  is_default,
  true,
  display_order,
  organizations.id,
  (SELECT id FROM auth.users WHERE email = 'system@system.com')
FROM (
  VALUES 
    ('New', 'New', 'Newly created case', true, 0),
    ('Assigned', 'Assigned', 'Case has been assigned to a team member', false, 1),
    ('In_Progress', 'In Progress', 'Case is being worked on', false, 2),
    ('Completed', 'Completed', 'Case has been completed', false, 3)
) AS statuses(value, label, description, is_default, display_order)
CROSS JOIN (
  SELECT id FROM organizations WHERE name = 'Sumiland'
) organizations
ON CONFLICT (organization_id, type, value) DO NOTHING;

-- Add comment
COMMENT ON TABLE picklist_values IS 'Stores picklist values including case types and statuses';