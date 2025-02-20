/*
  # Add Quote Expiration Trigger

  1. Changes
    - Add trigger to automatically expire quotes after 30 days
    - Add function to handle quote expiration
    - Add index for better performance on quote date checks

  2. Details
    - Quotes will be marked as 'Expired' if:
      - Current status is 'Draft' or 'Pending'
      - Created date is more than 30 days ago
    - Trigger runs on schedule (every hour)
    - Only affects non-finalized quotes (Draft/Pending)

  3. Notes
    - Does not affect quotes that are already Approved or Rejected
    - Safe to run multiple times (idempotent)
*/

-- Create function to expire quotes
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS void AS $$
BEGIN
  UPDATE quote_hdr
  SET 
    status = 'Expired',
    updated_at = NOW()
  WHERE 
    status IN ('Draft', 'Pending')
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quote_hdr_status_created_at 
ON quote_hdr(status, created_at);

-- Schedule the function to run every hour
SELECT cron.schedule(
  'expire-quotes',  -- name of the cron job
  '0 * * * *',     -- run every hour at minute 0
  'SELECT expire_old_quotes()'
);

-- Add comment to document the trigger
COMMENT ON FUNCTION expire_old_quotes() IS 
'Automatically expires quotes that are more than 30 days old and still in Draft or Pending status';