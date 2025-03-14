/*
  # Protect Critical Status Values

  1. Changes
    - Add function to validate picklist value changes
    - Add trigger to prevent deletion of critical values
    - Add trigger to prevent value changes but allow order/label updates
    - Update existing picklist functions to handle protected values

  2. Details
    - Protected Lead Status values: New, Converted
    - Protected Case Status values: Escalated, Closed
    - Allow changes to display order and label
    - Prevent deletion or value changes
*/

-- Create type for protected picklist values
CREATE TYPE protected_picklist AS (
  type picklist_type,
  value text
);

-- Create function to check if a picklist value is protected
CREATE OR REPLACE FUNCTION is_protected_picklist_value(check_type picklist_type, check_value text)
RETURNS boolean AS $$
DECLARE
  protected_values protected_picklist[];
BEGIN
  protected_values := ARRAY[
    -- Lead status protected values
    ('lead_status'::picklist_type, 'New'),
    ('lead_status'::picklist_type, 'Converted'),
    -- Case status protected values
    ('case_status'::picklist_type, 'Escalated'),
    ('case_status'::picklist_type, 'Closed')
  ];

  RETURN EXISTS (
    SELECT 1 
    FROM unnest(protected_values) AS p(type, value)
    WHERE p.type = check_type AND p.value = check_value
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate picklist value changes
CREATE OR REPLACE FUNCTION validate_picklist_value_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a protected value
  IF is_protected_picklist_value(NEW.type, OLD.value) THEN
    -- Prevent value changes
    IF NEW.value != OLD.value THEN
      RAISE EXCEPTION 'Cannot modify the value of a protected picklist item';
    END IF;

    -- Prevent status changes
    IF NEW.is_active != OLD.is_active THEN
      RAISE EXCEPTION 'Cannot change the active status of a protected picklist item';
    END IF;

    -- Allow changes to display order and label
    NEW.value := OLD.value;
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to prevent deletion of protected values
CREATE OR REPLACE FUNCTION prevent_protected_value_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF is_protected_picklist_value(OLD.type, OLD.value) THEN
    RAISE EXCEPTION 'Cannot delete a protected picklist value';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger for value changes
DROP TRIGGER IF EXISTS validate_picklist_value_changes_trigger ON picklist_values;
CREATE TRIGGER validate_picklist_value_changes_trigger
  BEFORE UPDATE ON picklist_values
  FOR EACH ROW
  EXECUTE FUNCTION validate_picklist_value_changes();

-- Create or replace trigger for deletions
DROP TRIGGER IF EXISTS prevent_protected_value_deletion_trigger ON picklist_values;
CREATE TRIGGER prevent_protected_value_deletion_trigger
  BEFORE DELETE ON picklist_values
  FOR EACH ROW
  EXECUTE FUNCTION prevent_protected_value_deletion();

-- Update insert_default_lead_status function to handle protected values
CREATE OR REPLACE FUNCTION insert_default_lead_status(org_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert default Lead Status values if they don't exist
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by)
  VALUES
    (org_id, 'lead_status', 'New', 'New', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'In_Progress', 'In Progress', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'Qualified', 'Qualified', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'Converted', 'Converted', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'Lost', 'Lost', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1))
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    -- Only update non-protected fields
    label = CASE 
      WHEN is_protected_picklist_value(EXCLUDED.type, EXCLUDED.value) THEN picklist_values.label 
      ELSE EXCLUDED.label 
    END,
    display_order = EXCLUDED.display_order;
END;
$$ LANGUAGE plpgsql;

-- Update insert_default_case_status function to handle protected values
CREATE OR REPLACE FUNCTION insert_default_case_status(org_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert default Case Status values if they don't exist
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by)
  VALUES
    (org_id, 'case_status', 'New', 'New', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'case_status', 'Escalated', 'Escalated', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'case_status', 'Closed', 'Closed', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1))
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    -- Only update non-protected fields
    label = CASE 
      WHEN is_protected_picklist_value(EXCLUDED.type, EXCLUDED.value) THEN picklist_values.label 
      ELSE EXCLUDED.label 
    END,
    display_order = EXCLUDED.display_order;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION is_protected_picklist_value(picklist_type, text) IS 
'Checks if a picklist value is protected from modification';

COMMENT ON FUNCTION validate_picklist_value_changes() IS 
'Prevents changes to protected picklist values while allowing order and label updates';

COMMENT ON FUNCTION prevent_protected_value_deletion() IS 
'Prevents deletion of protected picklist values';