/*
  # Add selected_fields to reports table

  1. Changes
    - Add selected_fields column to reports table to store selected fields for reports
*/

-- Add selected_fields column to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS selected_fields text[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN reports.selected_fields IS 'Array of field names selected for the report';