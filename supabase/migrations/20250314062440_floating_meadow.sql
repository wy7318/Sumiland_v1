/*
  # Add Template Reports

  1. Changes
    - Add is_template column to reports table
    - Add template_id column to reports table for user copies
    - Create default report templates for Leads and Cases
    - Add function to copy templates for new organizations

  2. Details
    - Lead report templates include conversion rates, timing, and distribution charts
    - Case report templates include resolution times and distribution charts
    - Templates are automatically copied for new organizations
*/

-- Add template-related columns to reports table
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES reports(id);

-- Create folder for templates
INSERT INTO report_folders (
  id,
  name,
  is_shared,
  created_at,
  created_by,
  organization_id
)
SELECT 
  gen_random_uuid(),
  'Templates',
  true,
  now(),
  (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1),
  organizations.id
FROM organizations
ON CONFLICT DO NOTHING;

-- Function to create lead report templates
CREATE OR REPLACE FUNCTION create_lead_report_templates(org_id uuid, folder_id uuid)
RETURNS void AS $$
BEGIN
  -- Lead Conversion Rate Report
  INSERT INTO reports (
    name,
    description,
    object_type,
    filters,
    selected_fields,
    charts,
    is_template,
    is_shared,
    folder_id,
    created_by,
    organization_id
  ) VALUES (
    'Lead Conversion Analysis',
    'Analyzes lead conversion rates and timing',
    'leads',
    '[]',
    ARRAY['id', 'status', 'created_at', 'converted_at', 'lead_source'],
    jsonb_build_array(
      jsonb_build_object(
        'type', 'bar',
        'title', 'Lead Conversion Rate',
        'x_field', 'status',
        'y_field', 'id',
        'aggregation', 'count'
      ),
      jsonb_build_object(
        'type', 'line',
        'title', 'Average Time to Conversion',
        'x_field', 'created_at',
        'y_field', 'converted_at',
        'aggregation', 'avg'
      )
    ),
    true,
    true,
    folder_id,
    (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1),
    org_id
  );

  -- Lead Distribution Report
  INSERT INTO reports (
    name,
    description,
    object_type,
    filters,
    selected_fields,
    charts,
    is_template,
    is_shared,
    folder_id,
    created_by,
    organization_id
  ) VALUES (
    'Lead Distribution Analysis',
    'Analyzes lead distribution by source and status',
    'leads',
    '[]',
    ARRAY['id', 'status', 'lead_source', 'created_at'],
    jsonb_build_array(
      jsonb_build_object(
        'type', 'pie',
        'title', 'Leads by Source',
        'x_field', 'lead_source',
        'y_field', 'id',
        'aggregation', 'count'
      ),
      jsonb_build_object(
        'type', 'pie',
        'title', 'Leads by Status',
        'x_field', 'status',
        'y_field', 'id',
        'aggregation', 'count'
      ),
      jsonb_build_object(
        'type', 'bar',
        'title', 'Leads by Date',
        'x_field', 'created_at',
        'y_field', 'id',
        'aggregation', 'count'
      )
    ),
    true,
    true,
    folder_id,
    (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1),
    org_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to create case report templates
CREATE OR REPLACE FUNCTION create_case_report_templates(org_id uuid, folder_id uuid)
RETURNS void AS $$
BEGIN
  -- Case Resolution Analysis Report
  INSERT INTO reports (
    name,
    description,
    object_type,
    filters,
    selected_fields,
    charts,
    is_template,
    is_shared,
    folder_id,
    created_by,
    organization_id
  ) VALUES (
    'Case Resolution Analysis',
    'Analyzes case resolution times and escalation rates',
    'cases',
    '[]',
    ARRAY['id', 'status', 'created_at', 'escalated_at', 'closed_at'],
    jsonb_build_array(
      jsonb_build_object(
        'type', 'bar',
        'title', 'Average Resolution Time',
        'x_field', 'status',
        'y_field', 'closed_at',
        'aggregation', 'avg'
      ),
      jsonb_build_object(
        'type', 'pie',
        'title', 'Escalation Rate',
        'x_field', 'status',
        'y_field', 'id',
        'aggregation', 'count'
      )
    ),
    true,
    true,
    folder_id,
    (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1),
    org_id
  );

  -- Case Distribution Report
  INSERT INTO reports (
    name,
    description,
    object_type,
    filters,
    selected_fields,
    charts,
    is_template,
    is_shared,
    folder_id,
    created_by,
    organization_id
  ) VALUES (
    'Case Distribution Analysis',
    'Analyzes case distribution by type and status',
    'cases',
    '[]',
    ARRAY['id', 'type', 'status', 'created_at'],
    jsonb_build_array(
      jsonb_build_object(
        'type', 'pie',
        'title', 'Cases by Type',
        'x_field', 'type',
        'y_field', 'id',
        'aggregation', 'count'
      ),
      jsonb_build_object(
        'type', 'pie',
        'title', 'Cases by Status',
        'x_field', 'status',
        'y_field', 'id',
        'aggregation', 'count'
      ),
      jsonb_build_object(
        'type', 'bar',
        'title', 'Cases by Date',
        'x_field', 'created_at',
        'y_field', 'id',
        'aggregation', 'count'
      )
    ),
    true,
    true,
    folder_id,
    (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1),
    org_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to create all report templates for an organization
CREATE OR REPLACE FUNCTION create_report_templates(org_id uuid)
RETURNS void AS $$
DECLARE
  template_folder_id uuid;
BEGIN
  -- Get template folder ID
  SELECT id INTO template_folder_id
  FROM report_folders
  WHERE name = 'Templates'
  AND organization_id = org_id;

  -- Create templates
  PERFORM create_lead_report_templates(org_id, template_folder_id);
  PERFORM create_case_report_templates(org_id, template_folder_id);
END;
$$ LANGUAGE plpgsql;

-- Update organization creation trigger to create report templates
CREATE OR REPLACE FUNCTION create_default_picklists_for_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default picklist values
  PERFORM insert_default_lead_status(NEW.id);
  PERFORM insert_default_case_status(NEW.id);
  
  -- Create report templates
  PERFORM create_report_templates(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create templates for existing organizations
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations
  LOOP
    PERFORM create_report_templates(org_record.id);
  END LOOP;
END $$;

-- Add comments
COMMENT ON COLUMN reports.is_template IS 'Indicates if this is a template report';
COMMENT ON COLUMN reports.template_id IS 'Reference to the template this report was copied from';
COMMENT ON FUNCTION create_lead_report_templates(uuid, uuid) IS 'Creates default lead analysis report templates';
COMMENT ON FUNCTION create_case_report_templates(uuid, uuid) IS 'Creates default case analysis report templates';
COMMENT ON FUNCTION create_report_templates(uuid) IS 'Creates all default report templates for an organization';