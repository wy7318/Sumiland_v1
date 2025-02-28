-- Add color columns to picklist_values
ALTER TABLE picklist_values
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS text_color text;

-- Add comments
COMMENT ON COLUMN picklist_values.color IS 'Optional background color value in hex format (e.g., #FF0000) for visual styling';
COMMENT ON COLUMN picklist_values.text_color IS 'Optional text color value in hex format (e.g., #FFFFFF) for visual styling';