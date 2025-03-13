/*
  # Reports Schema Setup

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `object_type` (text)
      - `filters` (jsonb)
      - `grouping` (text[])
      - `sorting` (jsonb)
      - `date_range` (jsonb)
      - `charts` (jsonb)
      - `is_favorite` (boolean)
      - `is_shared` (boolean)
      - `folder_id` (uuid)
      - `created_at` (timestamptz)
      - `created_by` (uuid)
      - `organization_id` (uuid)

    - `report_folders`
      - `id` (uuid, primary key)
      - `name` (text)
      - `parent_id` (uuid)
      - `is_shared` (boolean)
      - `created_at` (timestamptz)
      - `created_by` (uuid)
      - `organization_id` (uuid)

  2. Security
    - Enable RLS on all tables
    - Add policies for organization-based access
*/

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  object_type text NOT NULL,
  filters jsonb DEFAULT '[]',
  grouping text[] DEFAULT '{}',
  sorting jsonb DEFAULT '[]',
  date_range jsonb,
  charts jsonb DEFAULT '[]',
  is_favorite boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  folder_id uuid REFERENCES report_folders(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  organization_id uuid REFERENCES organizations(id) NOT NULL
);

-- Create report_folders table
CREATE TABLE IF NOT EXISTS report_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES report_folders(id),
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  organization_id uuid REFERENCES organizations(id) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_reports_organization ON reports(organization_id);
CREATE INDEX idx_reports_folder ON reports(folder_id);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_object_type ON reports(object_type);
CREATE INDEX idx_reports_favorite ON reports(is_favorite);

CREATE INDEX idx_report_folders_organization ON report_folders(organization_id);
CREATE INDEX idx_report_folders_parent ON report_folders(parent_id);
CREATE INDEX idx_report_folders_created_by ON report_folders(created_by);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for reports
CREATE POLICY "Reports are viewable by organization members"
ON reports FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
  OR (
    is_shared = true
    AND organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Reports can be managed by creators"
ON reports FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  OR (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- Create policies for report folders
CREATE POLICY "Report folders are viewable by organization members"
ON report_folders FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
  OR (
    is_shared = true
    AND organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Report folders can be managed by creators"
ON report_folders FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  OR (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- Add comments
COMMENT ON TABLE reports IS 'Stores report configurations with organization-based access control';
COMMENT ON TABLE report_folders IS 'Stores report folder hierarchy with organization-based access control';

COMMENT ON COLUMN reports.filters IS 'Array of filter conditions in JSON format';
COMMENT ON COLUMN reports.grouping IS 'Array of field names to group by';
COMMENT ON COLUMN reports.sorting IS 'Array of sort conditions in JSON format';
COMMENT ON COLUMN reports.date_range IS 'Optional date range filter in JSON format';
COMMENT ON COLUMN reports.charts IS 'Array of chart configurations in JSON format';
COMMENT ON COLUMN reports.is_shared IS 'Whether the report is shared with all organization members';

COMMENT ON COLUMN report_folders.parent_id IS 'Reference to parent folder for nested structure';
COMMENT ON COLUMN report_folders.is_shared IS 'Whether the folder is shared with all organization members';