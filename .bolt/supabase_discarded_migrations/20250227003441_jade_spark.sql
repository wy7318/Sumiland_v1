-- Create table for custom field definitions
CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  entity_type custom_field_entity NOT NULL,
  field_name text NOT NULL,
  field_type custom_field_type NOT NULL,
  field_label text NOT NULL,
  description text,
  is_required boolean DEFAULT false,
  is_searchable boolean DEFAULT false,
  default_value jsonb,
  options jsonb, -- For select/multi-select fields
  validation_rules jsonb, -- JSON object containing validation rules
  display_order integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (organization_id, entity_type, field_name)
);

-- Create table for custom field values
CREATE TABLE IF NOT EXISTS custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  field_id uuid REFERENCES custom_fields(id) NOT NULL,
  entity_id uuid NOT NULL, -- References the ID of the case, vendor, etc.
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (organization_id, field_id, entity_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_org ON custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_fields_status ON custom_fields(status);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_org ON custom_field_values(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_value ON custom_field_values USING gin (value);

-- Enable RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_fields
CREATE POLICY "Custom fields are viewable by organization members"
ON custom_fields FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Custom fields can be managed by organization admins"
ON custom_fields FOR ALL
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

-- Create policies for custom_field_values
CREATE POLICY "Custom field values are viewable by organization members"
ON custom_field_values FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Custom field values can be managed by organization members"
ON custom_field_values FOR ALL
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

-- Create function to validate custom field value
CREATE OR REPLACE FUNCTION validate_custom_field_value()
RETURNS TRIGGER AS $$
DECLARE
  field_record RECORD;
BEGIN
  -- Get the custom field definition
  SELECT * INTO field_record
  FROM custom_fields
  WHERE id = NEW.field_id;

  -- Basic validation that field exists and belongs to same organization
  IF field_record.id IS NULL THEN
    RAISE EXCEPTION 'Custom field not found';
  END IF;

  IF field_record.organization_id != NEW.organization_id THEN
    RAISE EXCEPTION 'Organization mismatch between field and value';
  END IF;

  -- Type validation
  CASE field_record.field_type
    WHEN 'text' THEN
      IF jsonb_typeof(NEW.value) != 'string' THEN
        RAISE EXCEPTION 'Invalid value type for text field';
      END IF;
    WHEN 'number' THEN
      IF jsonb_typeof(NEW.value) != 'number' THEN
        RAISE EXCEPTION 'Invalid value type for number field';
      END IF;
    WHEN 'boolean' THEN
      IF jsonb_typeof(NEW.value) != 'boolean' THEN
        RAISE EXCEPTION 'Invalid value type for boolean field';
      END IF;
    WHEN 'select' THEN
      IF jsonb_typeof(NEW.value) != 'string' OR 
         NOT (NEW.value #>> '{}' = ANY (ARRAY(SELECT jsonb_array_elements_text(field_record.options)))) THEN
        RAISE EXCEPTION 'Invalid value for select field';
      END IF;
    WHEN 'multi_select' THEN
      IF jsonb_typeof(NEW.value) != 'array' OR
         EXISTS (
           SELECT element 
           FROM jsonb_array_elements_text(NEW.value) element
           WHERE NOT (element = ANY (ARRAY(SELECT jsonb_array_elements_text(field_record.options))))
         ) THEN
        RAISE EXCEPTION 'Invalid value for multi-select field';
      END IF;
    WHEN 'date' THEN
      IF jsonb_typeof(NEW.value) != 'string' OR
         to_timestamp(NEW.value #>> '{}', 'YYYY-MM-DD') IS NULL THEN
        RAISE EXCEPTION 'Invalid value for date field';
      END IF;
    WHEN 'email' THEN
      IF jsonb_typeof(NEW.value) != 'string' OR
         NOT (NEW.value #>> '{}' ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RAISE EXCEPTION 'Invalid email format';
      END IF;
    WHEN 'url' THEN
      IF jsonb_typeof(NEW.value) != 'string' OR
         NOT (NEW.value #>> '{}' ~* '^https?://[^\s/$.?#].[^\s]*$') THEN
        RAISE EXCEPTION 'Invalid URL format';
      END IF;
    WHEN 'phone' THEN
      IF jsonb_typeof(NEW.value) != 'string' OR
         NOT (NEW.value #>> '{}' ~* '^\+?[\d\s-()]{10,}$') THEN
        RAISE EXCEPTION 'Invalid phone number format';
      END IF;
    WHEN 'currency' THEN
      IF jsonb_typeof(NEW.value) != 'number' OR
         NEW.value::text::numeric < 0 THEN
        RAISE EXCEPTION 'Invalid currency value';
      END IF;
  END CASE;

  -- Required field validation
  IF field_record.is_required AND (NEW.value IS NULL OR NEW.value = 'null'::jsonb) THEN
    RAISE EXCEPTION 'Value required for field %', field_record.field_label;
  END IF;

  -- Custom validation rules if defined
  IF field_record.validation_rules IS NOT NULL THEN
    -- Example validation for min/max length
    IF field_record.validation_rules ? 'minLength' AND 
       length(NEW.value #>> '{}') < (field_record.validation_rules->>'minLength')::integer THEN
      RAISE EXCEPTION 'Value too short for field %', field_record.field_label;
    END IF;
    
    IF field_record.validation_rules ? 'maxLength' AND 
       length(NEW.value #>> '{}') > (field_record.validation_rules->>'maxLength')::integer THEN
      RAISE EXCEPTION 'Value too long for field %', field_record.field_label;
    END IF;

    -- Example validation for min/max numeric values
    IF field_record.field_type = 'number' OR field_record.field_type = 'currency' THEN
      IF field_record.validation_rules ? 'min' AND 
         (NEW.value #>> '{}')::numeric < (field_record.validation_rules->>'min')::numeric THEN
        RAISE EXCEPTION 'Value below minimum for field %', field_record.field_label;
      END IF;
      
      IF field_record.validation_rules ? 'max' AND 
         (NEW.value #>> '{}')::numeric > (field_record.validation_rules->>'max')::numeric THEN
        RAISE EXCEPTION 'Value above maximum for field %', field_record.field_label;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for custom field value validation
CREATE TRIGGER validate_custom_field_value_trigger
  BEFORE INSERT OR UPDATE ON custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION validate_custom_field_value();

-- Add comments
COMMENT ON TABLE custom_fields IS 'Stores custom field definitions for each organization';
COMMENT ON TABLE custom_field_values IS 'Stores custom field values for entities';
COMMENT ON FUNCTION validate_custom_field_value() IS 'Validates custom field values based on field type and rules';