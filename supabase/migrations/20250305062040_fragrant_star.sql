-- Add new picklist types for opportunities
ALTER TYPE picklist_type ADD VALUE IF NOT EXISTS 'opportunity_stage';
ALTER TYPE picklist_type ADD VALUE IF NOT EXISTS 'opportunity_status';
ALTER TYPE picklist_type ADD VALUE IF NOT EXISTS 'opportunity_type';
ALTER TYPE picklist_type ADD VALUE IF NOT EXISTS 'opportunity_product_status';

-- Create opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  name text NOT NULL,
  account_id uuid REFERENCES vendors(id),
  contact_id uuid REFERENCES customers(customer_id),
  owner_id uuid REFERENCES profiles(id),
  stage text NOT NULL,
  amount decimal(15,2) DEFAULT 0,
  probability integer CHECK (probability >= 0 AND probability <= 100) DEFAULT 0,
  expected_close_date date,
  lead_source text,
  lead_id uuid REFERENCES leads(id),
  type text,
  description text,
  status text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES profiles(id)
);

-- Create opportunity_products table
CREATE TABLE IF NOT EXISTS opportunity_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id),
  quantity decimal(15,2) NOT NULL,
  unit_price decimal(15,2) NOT NULL,
  subtotal decimal(15,2) NOT NULL,
  status text NOT NULL,
  notes text,
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_opportunities_organization ON opportunities(organization_id);
CREATE INDEX idx_opportunities_account ON opportunities(account_id);
CREATE INDEX idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX idx_opportunities_lead ON opportunities(lead_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunity_products_opportunity ON opportunity_products(opportunity_id);
CREATE INDEX idx_opportunity_products_product ON opportunity_products(product_id);
CREATE INDEX idx_opportunity_products_organization ON opportunity_products(organization_id);
CREATE INDEX idx_opportunity_products_status ON opportunity_products(status);

-- Enable RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_products ENABLE ROW LEVEL SECURITY;

-- Create policies for opportunities
CREATE POLICY "Opportunities are viewable by organization members"
ON opportunities FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Opportunities can be managed by organization members"
ON opportunities FOR ALL
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

-- Create policies for opportunity products
CREATE POLICY "Opportunity products are viewable by organization members"
ON opportunity_products FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Opportunity products can be managed by organization members"
ON opportunity_products FOR ALL
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

-- Add custom_field_entity type for opportunities
ALTER TYPE custom_field_entity ADD VALUE IF NOT EXISTS 'opportunity';

-- Create function to validate opportunity stage and status
CREATE OR REPLACE FUNCTION validate_opportunity_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stage exists in picklist values
  IF NOT EXISTS (
    SELECT 1 FROM picklist_values
    WHERE organization_id = NEW.organization_id
    AND type = 'opportunity_stage'
    AND value = NEW.stage
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid opportunity stage';
  END IF;

  -- Check if status exists in picklist values
  IF NOT EXISTS (
    SELECT 1 FROM picklist_values
    WHERE organization_id = NEW.organization_id
    AND type = 'opportunity_status'
    AND value = NEW.status
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid opportunity status';
  END IF;

  -- Check if type exists in picklist values when provided
  IF NEW.type IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM picklist_values
    WHERE organization_id = NEW.organization_id
    AND type = 'opportunity_type'
    AND value = NEW.type
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid opportunity type';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for opportunity field validation
CREATE TRIGGER validate_opportunity_fields_trigger
  BEFORE INSERT OR UPDATE OF stage, status, type ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION validate_opportunity_fields();

-- Create function to validate opportunity product status
CREATE OR REPLACE FUNCTION validate_opportunity_product_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status exists in picklist values
  IF NOT EXISTS (
    SELECT 1 FROM picklist_values
    WHERE organization_id = NEW.organization_id
    AND type = 'opportunity_product_status'
    AND value = NEW.status
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid opportunity product status';
  END IF;

  -- Calculate subtotal
  NEW.subtotal := NEW.quantity * NEW.unit_price;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for opportunity product status validation
CREATE TRIGGER validate_opportunity_product_status_trigger
  BEFORE INSERT OR UPDATE ON opportunity_products
  FOR EACH ROW
  EXECUTE FUNCTION validate_opportunity_product_status();

-- Add comments
COMMENT ON TABLE opportunities IS 'Stores opportunity information with organization-based access control';
COMMENT ON TABLE opportunity_products IS 'Stores opportunity product line items with status tracking';
COMMENT ON COLUMN opportunities.stage IS 'Opportunity stage from organization picklist values';
COMMENT ON COLUMN opportunities.status IS 'Opportunity status from organization picklist values';
COMMENT ON COLUMN opportunities.type IS 'Opportunity type from organization picklist values';
COMMENT ON COLUMN opportunity_products.status IS 'Product status from organization picklist values';