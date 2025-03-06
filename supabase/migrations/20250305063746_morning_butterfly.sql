-- Add foreign key constraints for opportunities table
DO $$ 
BEGIN
  -- Add created_by constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opportunities_created_by_fkey'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES profiles(id);
  END IF;

  -- Add updated_by constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opportunities_updated_by_fkey'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_updated_by_fkey
    FOREIGN KEY (updated_by)
    REFERENCES profiles(id);
  END IF;

  -- Add owner_id constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opportunities_owner_id_fkey'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES profiles(id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_updated_by ON opportunities(updated_by);

-- Add comments
COMMENT ON CONSTRAINT opportunities_created_by_fkey ON opportunities IS 
'Foreign key relationship between opportunities and profiles for creation tracking';

COMMENT ON CONSTRAINT opportunities_updated_by_fkey ON opportunities IS 
'Foreign key relationship between opportunities and profiles for update tracking';

COMMENT ON CONSTRAINT opportunities_owner_id_fkey ON opportunities IS 
'Foreign key relationship between opportunities and profiles for opportunity ownership';