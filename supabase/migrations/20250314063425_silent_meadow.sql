-- Create function to format date for display
CREATE OR REPLACE FUNCTION format_date_group(ts timestamptz, grouping text)
RETURNS text AS $$
BEGIN
  RETURN CASE grouping
    WHEN 'daily' THEN to_char(ts, 'YYYY-MM-DD')
    WHEN 'monthly' THEN to_char(ts, 'YYYY-MM')
    WHEN 'yearly' THEN to_char(ts, 'YYYY')
    ELSE to_char(ts, 'YYYY-MM-DD')
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to truncate date for grouping
CREATE OR REPLACE FUNCTION group_date(ts timestamptz, grouping text)
RETURNS date AS $$
BEGIN
  RETURN date_trunc(
    CASE grouping
      WHEN 'daily' THEN 'day'
      WHEN 'monthly' THEN 'month'
      WHEN 'yearly' THEN 'year'
      ELSE 'day'
    END,
    ts
  )::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update lead report templates function with proper date handling
CREATE OR REPLACE FUNCTION create_lead_report_templates(org_id uuid, folder_id uuid)
RETURNS void AS $$
BEGIN
  -- Lead Conversion Analysis Report
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
        'title', 'Lead Conversion Rate by Date',
        'x_field', 'group_date(created_at, ''daily'')',
        'y_field', 'CASE WHEN status = ''Converted'' THEN 1 ELSE 0 END',
        'aggregation', 'avg',
        'group_by', 'group_date(created_at, ''daily'')'
      ),
      jsonb_build_object(
        'type', 'line',
        'title', 'Average Time to Conversion (Days)',
        'x_field', 'group_date(created_at, ''daily'')',
        'y_field', 'date_diff_days(created_at, converted_at)',
        'aggregation', 'avg',
        'group_by', 'group_date(created_at, ''daily'')'
      ),
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
        'title', 'Leads Created by Date',
        'x_field', 'group_date(created_at, ''daily'')',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'group_date(created_at, ''daily'')'
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

-- Update case report templates function with proper date handling
CREATE OR REPLACE FUNCTION create_case_report_templates(org_id uuid, folder_id uuid)
RETURNS void AS $$
BEGIN
  -- Case Analysis Report
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
    'Case Analysis',
    'Analyzes case resolution times and distribution',
    'cases',
    '[]',
    ARRAY['id', 'type', 'status', 'created_at', 'escalated_at', 'closed_at'],
    jsonb_build_array(
      jsonb_build_object(
        'type', 'bar',
        'title', 'Average Resolution Time (Days)',
        'x_field', 'group_date(created_at, ''daily'')',
        'y_field', 'date_diff_days(created_at, closed_at)',
        'aggregation', 'avg',
        'group_by', 'group_date(created_at, ''daily'')'
      ),
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
        'title', 'Cases Created by Date',
        'x_field', 'group_date(created_at, ''daily'')',
        'y_field', 'id',
        'aggregation', 'count',
        'group_by', 'group_date(created_at, ''daily'')'
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
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION format_date_group(timestamptz, text) IS 
'Formats a timestamp for display based on grouping level (daily, monthly, yearly)';

COMMENT ON FUNCTION group_date(timestamptz, text) IS 
'Truncates a timestamp to the specified grouping level for consistent aggregation';