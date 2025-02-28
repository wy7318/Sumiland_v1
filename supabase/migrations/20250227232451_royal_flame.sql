-- Create picklist_type enum
CREATE TYPE picklist_type AS ENUM (
  'portfolio_category',
  'case_type',
  'case_status',
  'quote_status',
  'order_status',
  'product_status',
  'product_category',
  'product_stock_unit',
  'product_weight_unit',
  'account_type',
  'account_status'
);

-- Create picklist_values table
CREATE TABLE picklist_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  type picklist_type NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (organization_id, type, value)
);

-- Create indexes
CREATE INDEX idx_picklist_values_org ON picklist_values(organization_id);
CREATE INDEX idx_picklist_values_type ON picklist_values(type);
CREATE INDEX idx_picklist_values_active ON picklist_values(is_active);
CREATE INDEX idx_picklist_values_order ON picklist_values(display_order);

-- Enable RLS
ALTER TABLE picklist_values ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Picklist values are viewable by organization members"
ON picklist_values FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Picklist values can be managed by organization admins"
ON picklist_values FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Create function to prevent deletion of default values
CREATE OR REPLACE FUNCTION prevent_default_value_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default THEN
    RAISE EXCEPTION 'Cannot delete default picklist value';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER prevent_default_value_deletion_trigger
  BEFORE DELETE ON picklist_values
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_value_deletion();

-- Create function to ensure only one default per type
CREATE OR REPLACE FUNCTION ensure_single_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE picklist_values
    SET is_default = false
    WHERE organization_id = NEW.organization_id
    AND type = NEW.type
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER ensure_single_default_trigger
  BEFORE INSERT OR UPDATE ON picklist_values
  FOR EACH ROW
  WHEN (NEW.is_default)
  EXECUTE FUNCTION ensure_single_default();

-- Add comments
COMMENT ON TABLE picklist_values IS 'Stores picklist values for standard fields across the application';
COMMENT ON COLUMN picklist_values.type IS 'Type of picklist (e.g., case_status, product_category)';
COMMENT ON COLUMN picklist_values.value IS 'Actual value stored in the database';
COMMENT ON COLUMN picklist_values.label IS 'Display label shown to users';
COMMENT ON COLUMN picklist_values.is_default IS 'Indicates if this is the default value for the picklist type';
COMMENT ON COLUMN picklist_values.is_active IS 'Controls whether the value is available for selection';