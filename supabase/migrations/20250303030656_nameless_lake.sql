-- Add foreign key constraint for owner_id in cases table
ALTER TABLE cases
DROP CONSTRAINT IF EXISTS cases_owner_id_fkey;

ALTER TABLE cases
ADD CONSTRAINT cases_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);

-- Add comment
COMMENT ON CONSTRAINT cases_owner_id_fkey ON cases IS 
'Foreign key relationship between cases and profiles for case ownership';

-- Update case query to use correct join syntax
COMMENT ON TABLE cases IS 
'Cases table with proper relationships to profiles (owner) and customers (contact)';