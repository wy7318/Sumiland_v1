/*
  # Fix Date Handling in Reports

  1. Changes
    - Add date truncation functions for reports
    - Update report templates to use date truncation
    - Add support for different time units in aggregations

  2. Details
    - Truncate timestamps to dates for grouping
    - Support daily/monthly/yearly aggregation
    - Fix conversion time calculations
*/

-- Create function to truncate timestamp to date
CREATE OR REPLACE FUNCTION trunc_date(ts timestamptz)
RETURNS date AS $$
BEGIN
  RETURN date_trunc('day', ts)::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate date difference in days
CREATE OR REPLACE FUNCTION date_diff_days(start_date timestamptz, end_date timestamptz)
RETURNS numeric AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_date - start_date)) / 86400.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate date difference in minutes
CREATE OR REPLACE FUNCTION date_diff_minutes(start_date timestamptz, end_date timestamptz)
RETURNS numeric AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_date - start_date)) / 60.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update lead report templates function with date handling
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
        'aggregation', 'count',
        'group_by', 'status'
      ),
      jsonb_build_object(
        'type', 'line',
        'title', 'Average Time to Conversion (Days)',
        'x_field', 'trunc_date(created_at)',
        'y_field', 'date_diff_days(created_at, converted_at)',
        'aggregation', 'avg',
        'group_by', 'trunc_date(created_at)'
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
        'aggregation', 'count',
        'group_by', 'lead_source'
      ),
      jsonb_build_object(
        'type', 'pie',
        'title', 'Leads by Status',
        'x_field', 'status',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'status'
      ),
      jsonb_build_object(
        'type', 'bar',
        'title', 'Leads by Date',
        'x_field', 'trunc_date(created_at)',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'trunc_date(created_at)'
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

-- Update case report templates function with date handling
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
        'title', 'Average Resolution Time (Days)',
        'x_field', 'trunc_date(created_at)',
        'y_field', 'date_diff_days(created_at, closed_at)',
        'aggregation', 'avg',
        'group_by', 'trunc_date(created_at)'
      ),
      jsonb_build_object(
        'type', 'pie',
        'title', 'Escalation Rate',
        'x_field', 'CASE WHEN escalated_at IS NOT NULL THEN ''Escalated'' ELSE ''Not Escalated'' END',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'CASE WHEN escalated_at IS NOT NULL THEN ''Escalated'' ELSE ''Not Escalated'' END'
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
        'aggregation', 'count',
        'group_by', 'type'
      ),
      jsonb_build_object(
        'type', 'pie',
        'title', 'Cases by Status',
        'x_field', 'status',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'status'
      ),
      jsonb_build_object(
        'type', 'bar',
        'title', 'Cases by Date',
        'x_field', 'trunc_date(created_at)',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'trunc_date(created_at)'
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

-- Add comments
COMMENT ON FUNCTION trunc_date(timestamptz) IS 
'Truncates a timestamp to date for consistent grouping';

COMMENT ON FUNCTION date_diff_days(timestamptz, timestamptz) IS 
'Calculates the difference between two timestamps in days';

COMMENT ON FUNCTION date_diff_minutes(timestamptz, timestamptz) IS 
'Calculates the difference between two timestamps in minutes';