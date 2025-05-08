-- Enable the pg_cron extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to update organization statuses
CREATE OR REPLACE FUNCTION update_organization_status()
RETURNS void AS $$
BEGIN
  -- Update organizations to inactive if current date is outside contract dates
  UPDATE organizations
  SET 
    status = 'inactive',
    updated_at = NOW(),
    updated_by = '80ed0423-ea46-4aa6-a922-4b438ab6b996' -- System user ID
  WHERE 
    (CURRENT_TIMESTAMP > license_contract_end_date OR CURRENT_TIMESTAMP < license_contract_start_date)
    AND status != 'inactive';
    
  -- Optionally, reactivate organizations if within contract dates
  UPDATE organizations
  SET 
    status = 'active',
    updated_at = NOW(),
    updated_by = '80ed0423-ea46-4aa6-a922-4b438ab6b996'  -- System user ID
  WHERE 
    CURRENT_TIMESTAMP BETWEEN license_contract_start_date AND license_contract_end_date
    AND status = 'inactive'
    AND license_contract_start_date IS NOT NULL
    AND license_contract_end_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run daily at midnight
SELECT cron.schedule('0 0 * * *', 'SELECT update_organization_status()');