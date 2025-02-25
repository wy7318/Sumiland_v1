-- Add organization_id to quote_hdr if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_hdr' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE quote_hdr 
    ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Add organization_id to quote_dtl if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quote_dtl' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE quote_dtl 
    ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quote_hdr_organization 
ON quote_hdr(organization_id);

CREATE INDEX IF NOT EXISTS idx_quote_dtl_organization 
ON quote_dtl(organization_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quote_hdr' 
    AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Quotes are viewable by everyone" ON quote_hdr;
    DROP POLICY IF EXISTS "Quotes can be managed by authenticated users" ON quote_hdr;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quote_dtl' 
    AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Quote details are viewable by everyone" ON quote_dtl;
    DROP POLICY IF EXISTS "Quote details can be managed by authenticated users" ON quote_dtl;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE quote_hdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_dtl ENABLE ROW LEVEL SECURITY;

-- Create new policies for quote_hdr
CREATE POLICY "Quotes are viewable by organization members"
ON quote_hdr FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Quotes can be managed by organization members"
ON quote_hdr FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

-- Create new policies for quote_dtl
CREATE POLICY "Quote details are viewable by organization members"
ON quote_dtl FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Quote details can be managed by organization members"
ON quote_dtl FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

-- Create trigger function to set organization_id on quote_dtl
CREATE OR REPLACE FUNCTION set_quote_dtl_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get organization_id from quote_hdr
  SELECT organization_id INTO NEW.organization_id
  FROM quote_hdr
  WHERE quote_id = NEW.quote_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_quote_dtl_organization_id_trigger ON quote_dtl;
CREATE TRIGGER set_quote_dtl_organization_id_trigger
  BEFORE INSERT OR UPDATE ON quote_dtl
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_dtl_organization_id();

-- Add comments
COMMENT ON TABLE quote_hdr IS 'Quote headers with organization-based access control';
COMMENT ON TABLE quote_dtl IS 'Quote details with organization-based access control';
COMMENT ON COLUMN quote_hdr.organization_id IS 'The organization this quote belongs to';
COMMENT ON COLUMN quote_dtl.organization_id IS 'The organization this quote detail belongs to (matches quote header)';