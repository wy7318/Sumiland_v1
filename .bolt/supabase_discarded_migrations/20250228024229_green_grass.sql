-- Add owner relationship to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES profiles(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_updated_by ON cases(updated_by);

-- Update case detail query to use profiles table
COMMENT ON COLUMN cases.owner_id IS 'Reference to the profile assigned to handle this case';
COMMENT ON COLUMN cases.created_by IS 'Reference to the profile who created this case';
COMMENT ON COLUMN cases.updated_by IS 'Reference to the profile who last updated this case';