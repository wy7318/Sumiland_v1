/*
  # Update Lead Status Tracking

  1. Changes
    - Add default picklist values for Lead Status
    - Add conversion tracking fields to leads table
    - Add trigger to validate lead status transitions
    - Add function to handle lead conversion

  2. Details
    - Default Lead Status values: New, In Progress, Qualified, Converted, Lost
    - Track conversion type (Contact/Opportunity)
    - Track conversion details and timing
*/

-- Add new picklist types if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'lead_conversion_type'
  ) THEN
    CREATE TYPE lead_conversion_type AS ENUM ('contact', 'opportunity');
  END IF;
END $$;

-- Add conversion type and reference columns to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS conversion_type lead_conversion_type,
ADD COLUMN IF NOT EXISTS converted_to_id uuid;

-- Create function to insert default picklist values
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
  ON CONFLICT (organization_id, type, value) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to handle lead status changes
CREATE OR REPLACE FUNCTION handle_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to Converted
  IF NEW.status = 'Converted' AND OLD.status != 'Converted' THEN
    -- Ensure conversion details are provided
    IF NEW.conversion_type IS NULL THEN
      RAISE EXCEPTION 'Conversion type must be specified when converting a lead';
    END IF;

    IF NEW.converted_to_id IS NULL THEN
      RAISE EXCEPTION 'Converted entity ID must be specified when converting a lead';
    END IF;

    -- Set conversion timestamp if not already set
    IF NEW.converted_at IS NULL THEN
      NEW.converted_at := now();
    END IF;

    -- Ensure is_converted flag is set
    NEW.is_converted := true;
  END IF;

  -- If status is being changed from Converted
  IF OLD.status = 'Converted' AND NEW.status != 'Converted' THEN
    -- Clear conversion details
    NEW.conversion_type := NULL;
    NEW.converted_to_id := NULL;
    NEW.converted_at := NULL;
    NEW.converted_by := NULL;
    NEW.is_converted := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lead status changes
DROP TRIGGER IF EXISTS handle_lead_status_change_trigger ON leads;
CREATE TRIGGER handle_lead_status_change_trigger
  BEFORE UPDATE OF status
  ON leads
  FOR EACH ROW
  EXECUTE FUNCTION handle_lead_status_change();

-- Add trigger to create default picklist values for new organizations
CREATE OR REPLACE FUNCTION create_default_picklists_for_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default lead status values
  PERFORM insert_default_lead_status(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new organizations
DROP TRIGGER IF EXISTS create_default_picklists_trigger ON organizations;
CREATE TRIGGER create_default_picklists_trigger
  AFTER INSERT
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_picklists_for_org();

-- Insert default values for existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    PERFORM insert_default_lead_status(org_record.id);
  END LOOP;
END $$;

-- Add comments
COMMENT ON COLUMN leads.conversion_type IS 'Type of entity the lead was converted to (contact or opportunity)';
COMMENT ON COLUMN leads.converted_to_id IS 'ID of the contact or opportunity the lead was converted to';
COMMENT ON FUNCTION handle_lead_status_change() IS 'Handles lead status changes and manages conversion details';
COMMENT ON FUNCTION insert_default_lead_status(uuid) IS 'Inserts default lead status values for an organization';