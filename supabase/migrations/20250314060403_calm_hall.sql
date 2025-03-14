/*
  # Update Case Status Tracking

  1. Changes
    - Add default case status values for each organization
    - Add date tracking fields for status changes
    - Add trigger to automatically update date fields on status change

  2. Details
    - Default Case Status values: New, Escalated, Closed
    - Track escalation and closure dates automatically
*/

-- Add date tracking columns to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Create function to insert default case status values
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
  ON CONFLICT (organization_id, type, value) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Update create_default_picklists_for_org function to include case status
CREATE OR REPLACE FUNCTION create_default_picklists_for_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default lead status values
  PERFORM insert_default_lead_status(NEW.id);
  
  -- Insert default case status values
  PERFORM insert_default_case_status(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle case status changes
CREATE OR REPLACE FUNCTION handle_case_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to Escalated
  IF NEW.status = 'Escalated' AND OLD.status != 'Escalated' THEN
    NEW.escalated_at := now();
  END IF;

  -- If status is being changed to Closed
  IF NEW.status = 'Closed' AND OLD.status != 'Closed' THEN
    NEW.closed_at := now();
  END IF;

  -- If status is being changed from Escalated or Closed to something else
  IF OLD.status = 'Escalated' AND NEW.status != 'Escalated' THEN
    NEW.escalated_at := NULL;
  END IF;

  IF OLD.status = 'Closed' AND NEW.status != 'Closed' THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for case status changes
DROP TRIGGER IF EXISTS handle_case_status_change_trigger ON cases;
CREATE TRIGGER handle_case_status_change_trigger
  BEFORE UPDATE OF status
  ON cases
  FOR EACH ROW
  EXECUTE FUNCTION handle_case_status_change();

-- Insert default values for existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    PERFORM insert_default_case_status(org_record.id);
  END LOOP;
END $$;

-- Add comments
COMMENT ON COLUMN cases.escalated_at IS 'Timestamp when case was escalated';
COMMENT ON COLUMN cases.closed_at IS 'Timestamp when case was closed';
COMMENT ON FUNCTION handle_case_status_change() IS 'Automatically updates escalation and closure dates based on status changes';
COMMENT ON FUNCTION insert_default_case_status(uuid) IS 'Inserts default case status values for an organization';