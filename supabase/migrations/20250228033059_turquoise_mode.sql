-- Add color column to picklist_values
ALTER TABLE picklist_values
ADD COLUMN IF NOT EXISTS color text;

-- Add comment
COMMENT ON COLUMN picklist_values.color IS 'Optional color value in hex format (e.g., #FF0000) for visual styling';