

CREATE POLICY "Service can manage notifications"
ON notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);



select * from notification_queue 
select * from Vendors
select * from customers
select * from leads
select * from cases
select * from opportunities
select * from quote_hdr
select * from order_hdr
select * from tasks


select * from notification_object_preferences

-- New table for notification object types
CREATE TYPE notification_object_type AS ENUM (
  'vendor', 'customer', 'lead', 'case', 'opportunity', 'quote', 'order', 'task'
);

-- Enhanced notification_preferences table
CREATE TABLE notification_object_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  object_type notification_object_type NOT NULL,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id, object_type)
);

-- Notification queue for processing
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  object_type notification_object_type NOT NULL,
  object_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);



-- version 2
CREATE OR REPLACE FUNCTION notify_owner_change()
RETURNS TRIGGER AS $$
DECLARE
  item_identifier TEXT := 'Item';
  object_type_val notification_object_type;
  duplicate_exists BOOLEAN;
  record_id UUID;
  owner_field_changed BOOLEAN;
  new_owner_id UUID;
  old_owner_id UUID;
BEGIN
  -- Determine object_type based on table name
  CASE TG_TABLE_NAME
    WHEN 'vendors' THEN object_type_val := 'vendor'::notification_object_type;
    WHEN 'customers' THEN object_type_val := 'customer'::notification_object_type;
    WHEN 'leads' THEN object_type_val := 'lead'::notification_object_type;
    WHEN 'cases' THEN object_type_val := 'case'::notification_object_type;
    WHEN 'opportunities' THEN object_type_val := 'opportunity'::notification_object_type;
    WHEN 'quote_hdr' THEN object_type_val := 'quote'::notification_object_type;
    WHEN 'order_hdr' THEN object_type_val := 'order'::notification_object_type;
    WHEN 'tasks' THEN object_type_val := 'task'::notification_object_type;
    ELSE RAISE EXCEPTION 'Unsupported table: %', TG_TABLE_NAME;
  END CASE;

  -- Get the correct ID field based on table name
  CASE TG_TABLE_NAME
    WHEN 'customers' THEN record_id := NEW.customer_id;
    WHEN 'quote_hdr' THEN record_id := NEW.quote_id;
    WHEN 'order_hdr' THEN record_id := NEW.order_id;
    WHEN 'tasks' THEN record_id := NEW.id; -- This should be the task ID, not the assigned_to
    ELSE record_id := NEW.id;
  END CASE;

  -- Safe generic identifier that will work for any table
  item_identifier := TG_TABLE_NAME || ' #' || record_id::TEXT;

  -- Handle different ownership fields based on table
  IF TG_TABLE_NAME = 'tasks' THEN
    -- For tasks, use assigned_to field
    owner_field_changed := NEW.assigned_to IS DISTINCT FROM OLD.assigned_to;
    new_owner_id := NEW.assigned_to;
    old_owner_id := OLD.assigned_to;
  ELSE
    -- For all other tables, use owner_id field
    owner_field_changed := NEW.owner_id IS DISTINCT FROM OLD.owner_id;
    new_owner_id := NEW.owner_id;
    old_owner_id := OLD.owner_id;
  END IF;

  IF (owner_field_changed AND new_owner_id IS NOT NULL) THEN
    -- Check for duplicate entries from the last 5 minutes
    SELECT EXISTS (
      SELECT 1 FROM notification_queue 
      WHERE object_type = object_type_val
      AND object_id = record_id
      AND user_id = new_owner_id  -- FIXED: Use new_owner_id instead of NEW.owner_id
      AND action_type = 'assigned'
      AND created_at > NOW() - INTERVAL '5 minutes'
    ) INTO duplicate_exists;
    
    -- Only insert if no duplicate exists
    IF NOT duplicate_exists THEN
      INSERT INTO notification_queue (
        user_id, 
        organization_id, 
        object_type, 
        object_id, 
        action_type, 
        actor_id,
        metadata
      ) VALUES (
        new_owner_id,  -- FIXED: Use new_owner_id instead of NEW.owner_id
        NEW.organization_id, 
        object_type_val, 
        record_id, 
        'assigned', 
        auth.uid(),
        jsonb_build_object(
          'previous_owner_id', old_owner_id,
          'identifier', item_identifier
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Apply to each table (example for leads)
CREATE TRIGGER leads_owner_change
AFTER UPDATE ON leads
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION notify_owner_change();


CREATE TRIGGER opportunity_owner_change
AFTER UPDATE ON opportunities
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION notify_owner_change();

CREATE TRIGGER customer_owner_change
AFTER UPDATE ON customers
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION notify_owner_change();


CREATE TRIGGER vendor_owner_change
AFTER UPDATE ON vendors
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION notify_owner_change();
-- vendors owner change notify user, but link is not assigned


CREATE TRIGGER quote_owner_change
AFTER UPDATE ON quote_hdr
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION notify_owner_change();


CREATE TRIGGER order_owner_change
AFTER UPDATE ON order_hdr
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION notify_owner_change();
-- order has no owner field available to assign on UI

CREATE TRIGGER task_owner_change
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
EXECUTE FUNCTION notify_owner_change();



-- Create a webhook that triggers on insert to notification_queue
create or replace function notify_webhook()
returns trigger as $$
begin
  perform net.http_post(
    'https://jaytpfztifhtzcruxguj.supabase.co/functions/v1/process-notification',
    jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'schema', TG_TABLE_SCHEMA, 
      'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else null end
    ),
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpheXRwZnp0aWZodHpjcnV4Z3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyMzU1OTYsImV4cCI6MjA1NDgxMTU5Nn0.cfF-k42T7adag2Rynl175ZaHWcKlh4kTXrv6lUkQhmA"}'
  );
  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger to call the webhook
create trigger notification_queue_webhook_trigger
after insert on notification_queue
for each row
execute function notify_webhook();




