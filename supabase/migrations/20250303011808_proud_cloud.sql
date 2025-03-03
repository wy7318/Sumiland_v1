-- Add 'lead' to custom_field_entity enum
ALTER TYPE custom_field_entity ADD VALUE IF NOT EXISTS 'lead';

-- Add comment
COMMENT ON TYPE custom_field_entity IS 'Entity types that can have custom fields (case, vendor, customer, product, order, quote, lead)';