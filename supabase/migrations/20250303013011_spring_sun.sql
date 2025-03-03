-- Update feeds parent_type check constraint to include Vendor
ALTER TABLE feeds
DROP CONSTRAINT IF EXISTS feeds_parent_type_check;

ALTER TABLE feeds
ADD CONSTRAINT feeds_parent_type_check
CHECK (parent_type IN ('Case', 'Lead', 'Vendor'));

-- Add comment
COMMENT ON COLUMN feeds.parent_type IS 'Type of parent entity (Case, Lead, Vendor)';