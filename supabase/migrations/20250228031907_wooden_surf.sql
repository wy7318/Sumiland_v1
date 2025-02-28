-- Add foreign key constraint for owner_id in cases table
DO $$ 
BEGIN
  -- First check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'cases_owner_id_fkey'
    AND table_name = 'cases'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE cases
    ADD CONSTRAINT cases_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES profiles(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);

-- Add comment
COMMENT ON CONSTRAINT cases_owner_id_fkey ON cases IS 
'Foreign key relationship between cases and profiles for case ownership';