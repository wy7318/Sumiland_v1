-- Add new picklist types for leads
ALTER TYPE picklist_type ADD VALUE IF NOT EXISTS 'lead_status';
ALTER TYPE picklist_type ADD VALUE IF NOT EXISTS 'lead_source';

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  customer_id uuid REFERENCES customers(customer_id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  company text,
  website text,
  phone text,
  description text,
  product_interest text,
  email_opt_out boolean DEFAULT false,
  status text NOT NULL,
  lead_source text,
  owner_id uuid REFERENCES profiles(id),
  is_converted boolean DEFAULT false,
  converted_at timestamptz,
  converted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX idx_leads_organization ON leads(organization_id);
CREATE INDEX idx_leads_customer ON leads(customer_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_source ON leads(lead_source);
CREATE INDEX idx_leads_created ON leads(created_at);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Leads are viewable by organization members"
ON leads FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Leads can be managed by organization members"
ON leads FOR ALL
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

-- Create function to check for existing customer
CREATE OR REPLACE FUNCTION check_lead_customer()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a customer with this email exists in the same organization
  SELECT customer_id INTO NEW.customer_id
  FROM customers
  WHERE email = NEW.email
  AND organization_id = NEW.organization_id
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for existing customer
CREATE TRIGGER check_lead_customer_trigger
  BEFORE INSERT OR UPDATE OF email ON leads
  FOR EACH ROW
  EXECUTE FUNCTION check_lead_customer();

-- Create function to validate lead status
CREATE OR REPLACE FUNCTION validate_lead_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status exists in picklist values
  IF NOT EXISTS (
    SELECT 1 FROM picklist_values
    WHERE organization_id = NEW.organization_id
    AND type = 'lead_status'
    AND value = NEW.status
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid lead status';
  END IF;

  -- Check if lead source exists in picklist values when provided
  IF NEW.lead_source IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM picklist_values
    WHERE organization_id = NEW.organization_id
    AND type = 'lead_source'
    AND value = NEW.lead_source
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid lead source';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate lead status and source
CREATE TRIGGER validate_lead_status_trigger
  BEFORE INSERT OR UPDATE OF status, lead_source ON leads
  FOR EACH ROW
  EXECUTE FUNCTION validate_lead_status();

-- Add comments
COMMENT ON TABLE leads IS 'Stores lead information with organization-based access control';
COMMENT ON COLUMN leads.customer_id IS 'Reference to existing customer if email matches';
COMMENT ON COLUMN leads.status IS 'Lead status from organization picklist values';
COMMENT ON COLUMN leads.lead_source IS 'Lead source from organization picklist values';
COMMENT ON COLUMN leads.is_converted IS 'Indicates if lead has been converted to customer/opportunity';