-- Database schema for the logic flow system

delete from logic_flows;
delete from logic_flow_condition_groups;
delete from logic_flow_conditions;
delete from logic_flow_actions;
delete from logic_flow_execution_queue;
delete from logic_flow_execution_logs;

select * from logic_flows;
select * from logic_flow_condition_groups;
select * from logic_flow_conditions;
select * from logic_flow_actions;
select * from logic_flow_execution_queue;
select * from logic_flow_execution_logs;
select * from debug_logs 


select * from leads order by updated_at desc

select * from leads where id = '41f87df9-71d1-4b99-b379-d19c4ed5c542'

CALL process_logic_flow_queue(10);

-- Main table storing flow definitions
CREATE TABLE IF NOT EXISTS logic_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  object_type TEXT NOT NULL, -- The table this flow applies to (e.g., 'leads', 'tasks')
  status BOOLEAN DEFAULT true, -- Active/Inactive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL -- For multi-tenant support
);

-- Table storing condition rows (IF/ELSE IF blocks)
CREATE TABLE IF NOT EXISTS logic_flow_condition_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES logic_flows(id) ON DELETE CASCADE,
  row_order INTEGER NOT NULL, -- Execution order (1, 2, 3...)
  description TEXT -- Optional description of this condition set
);

-- Individual conditions within each condition group (combined with AND)
CREATE TABLE IF NOT EXISTS logic_flow_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condition_group_id UUID NOT NULL REFERENCES logic_flow_condition_groups(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL, -- Field to evaluate
  data_type TEXT NOT NULL, -- The data type of the column (varchar, int, etc.)
  operator TEXT NOT NULL, -- Operator (=, >, LIKE, etc.)
  value JSONB, -- Value to compare against (using JSONB allows for arrays, ranges, etc.)
  condition_order INTEGER NOT NULL, -- Order within the group
  object_path TEXT[] DEFAULT NULL, -- For cross-object related fields
  referenced_field TEXT DEFAULT NULL -- For field-to-field comparisons
);

-- Actions to perform when conditions are met
CREATE TABLE IF NOT EXISTS logic_flow_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condition_group_id UUID NOT NULL REFERENCES logic_flow_condition_groups(id) ON DELETE CASCADE,
  field_to_update TEXT NOT NULL, -- Column name to update
  data_type TEXT NOT NULL, -- The data type of the field
  update_value JSONB NOT NULL, -- New value to set
  is_formula BOOLEAN DEFAULT false, -- Whether update_value is a formula
  formula TEXT, -- Optional formula (for calculated values)
  target_object_path TEXT[] DEFAULT NULL, -- For updating related objects
  source_field_path TEXT[] DEFAULT NULL, -- For copying values from related objects
  source_field TEXT DEFAULT NULL -- Field to copy from
);

-- Queue for asynchronous processing
CREATE TABLE IF NOT EXISTS logic_flow_execution_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES logic_flows(id),
  record_id UUID NOT NULL, -- ID of record to process
  object_type TEXT NOT NULL, -- Table name
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  process_after TIMESTAMP WITH TIME ZONE DEFAULT now(),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  organization_id UUID NOT NULL
);

-- Execution log for auditing and debugging
CREATE TABLE IF NOT EXISTS logic_flow_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES logic_flows(id),
  record_id UUID NOT NULL, -- ID of the processed record
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN NOT NULL,
  condition_group_id UUID REFERENCES logic_flow_condition_groups(id), -- Which condition matched
  actions_taken JSONB, -- Details of actions performed
  error_message TEXT,
  organization_id UUID NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logic_flows_org ON logic_flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_logic_flows_object ON logic_flows(object_type, status);
CREATE INDEX IF NOT EXISTS idx_condition_groups_flow ON logic_flow_condition_groups(flow_id, row_order);
CREATE INDEX IF NOT EXISTS idx_conditions_group ON logic_flow_conditions(condition_group_id, condition_order);
CREATE INDEX IF NOT EXISTS idx_actions_group ON logic_flow_actions(condition_group_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON logic_flow_execution_queue(status, process_after);
CREATE INDEX IF NOT EXISTS idx_queue_org ON logic_flow_execution_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_flow ON logic_flow_execution_logs(flow_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_time ON logic_flow_execution_logs(execution_time);

-- Setup Row Level Security (RLS)
ALTER TABLE logic_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_flow_condition_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_flow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_flow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_flow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE logic_flow_execution_queue ENABLE ROW LEVEL SECURITY;












-- Function to retrieve columns and their data types from a table
CREATE OR REPLACE FUNCTION get_table_schema(p_table_name TEXT, p_org_id UUID)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN,
  supported_operators JSONB,
  column_description TEXT
) AS $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  -- Security check to prevent SQL injection
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Table % does not exist', p_table_name;
  END IF;
  
  -- Check that table has an organization_id column to enforce multi-tenancy
  -- Note: Explicitly reference the columns table with alias to avoid ambiguity
  PERFORM 1
  FROM information_schema.columns cols
  WHERE cols.table_schema = 'public'
    AND cols.table_name = p_table_name
    AND cols.column_name = 'organization_id';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table % does not support multi-tenancy', p_table_name;
  END IF;

  -- Return column information with supported operators
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable = 'YES' AS is_nullable,
    CASE
      -- Define supported operators for each data type
      WHEN c.data_type IN ('integer', 'numeric', 'decimal', 'real', 'double precision') THEN
        jsonb_build_array('=', '!=', '<', '>', '<=', '>=', 'BETWEEN', 'IN', 'IS NULL', 'IS NOT NULL')
      WHEN c.data_type IN ('character varying', 'text', 'character') THEN
        jsonb_build_array('=', '!=', 'LIKE', 'ILIKE', 'NOT LIKE', 'IN', 'IS NULL', 'IS NOT NULL')
      WHEN c.data_type IN ('timestamp', 'timestamp with time zone', 'date', 'time') THEN
        jsonb_build_array('=', '<', '>', '<=', '>=', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'DATE_TRUNC')
      WHEN c.data_type = 'boolean' THEN
        jsonb_build_array('IS TRUE', 'IS FALSE', 'IS NOT TRUE', 'IS NOT FALSE', 'IS NULL', 'IS NOT NULL')
      WHEN c.data_type = 'uuid' THEN
        jsonb_build_array('=', 'IN', 'IS NULL', 'IS NOT NULL')
      ELSE
        jsonb_build_array('UNSUPPORTED')
    END AS supported_operators,
    pg_catalog.col_description(
      format('%I.%I', c.table_schema, c.table_name)::regclass::oid, 
      c.ordinal_position
    ) AS column_description
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public'
    AND c.table_name = p_table_name
    -- Exclude system columns or columns you don't want exposed
    AND c.column_name NOT IN ('created_at', 'updated_at', 'deleted_at')
  ORDER BY 
    c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute this function to authenticated users
GRANT EXECUTE ON FUNCTION get_table_schema TO authenticated;

-- Function to retrieve relationships between objects
CREATE OR REPLACE FUNCTION get_object_relationships(p_object_name TEXT, p_org_id UUID)
RETURNS TABLE (
  source_object TEXT,
  target_object TEXT,
  relationship_type TEXT,
  source_field TEXT,
  target_field TEXT,
  relationship_name TEXT,
  inverse_relationship_name TEXT
) AS $$
BEGIN
  -- This function would typically query a relationships table
  -- For now, we'll return an empty result set
  RETURN QUERY
  SELECT 
    source_object, 
    target_object, 
    relationship_type, 
    source_field, 
    target_field, 
    relationship_name, 
    inverse_relationship_name
  FROM 
    (VALUES (NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT)) AS t
  WHERE FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute this function to authenticated users
GRANT EXECUTE ON FUNCTION get_object_relationships TO authenticated;














-- Function to process a single queued logic flow
CREATE OR REPLACE FUNCTION process_logic_flow(p_queue_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_queue RECORD;
  v_flow RECORD;
  v_record JSONB;
  v_record_id UUID;
  v_conditions RECORD;
  v_condition_met BOOLEAN;
  v_result JSONB;
  v_actions JSONB := '[]'::JSONB;
  v_action RECORD;
  v_update_values TEXT := '';
  v_updated BOOLEAN := FALSE;
  v_matching_condition_group_id UUID := NULL;
  v_text_value TEXT;
  v_raw_value TEXT;
BEGIN
  -- Get queue item
  SELECT * INTO v_queue 
  FROM logic_flow_execution_queue 
  WHERE id = p_queue_id AND status = 'pending'
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item not found or already processing');
  END IF;
  
  -- Mark as processing
  UPDATE logic_flow_execution_queue 
  SET status = 'processing', attempts = attempts + 1 
  WHERE id = p_queue_id;
  
  -- Get flow details
  SELECT * INTO v_flow 
  FROM logic_flows 
  WHERE id = v_queue.flow_id;
  
  -- Get record data
  v_record_id := v_queue.record_id;
  EXECUTE format('
    SELECT to_jsonb(t) 
    FROM %I t 
    WHERE id = $1 AND organization_id = $2', 
    v_queue.object_type
  ) INTO v_record USING v_record_id, v_queue.organization_id;
  
  IF v_record IS NULL THEN
    -- Record not found, mark as completed (could have been deleted)
    UPDATE logic_flow_execution_queue 
    SET status = 'completed', 
        last_error = 'Record not found'
    WHERE id = p_queue_id;
    
    RETURN jsonb_build_object('success', TRUE, 'message', 'Record not found');
  END IF;

  -- Process each condition group in order
  FOR v_conditions IN
    SELECT cg.id, cg.row_order
    FROM logic_flow_condition_groups cg
    WHERE cg.flow_id = v_flow.id
    ORDER BY cg.row_order
  LOOP
    -- Default to all conditions being met
    v_condition_met := TRUE;
    
    -- Check each condition in this group (AND logic)
    FOR v_action IN (
      SELECT column_name, operator, value 
      FROM logic_flow_conditions 
      WHERE condition_group_id = v_conditions.id
      ORDER BY condition_order
    ) LOOP
      -- Get field value from the record
      DECLARE
        field_value TEXT := v_record->>v_action.column_name;
        op_value TEXT;
        is_condition_true BOOLEAN;
      BEGIN
        -- Get the raw string value to parse
        v_raw_value := v_action.value::text;
        
        -- Extract the condition value from the JSON string using regex
        -- This ensures we correctly extract quoted values from JSONB
        IF v_raw_value ~ E'^\\{.*\\}$' THEN
          op_value := regexp_replace(v_raw_value, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
        ELSE
          op_value := v_raw_value;
        END IF;
        
        -- Evaluate the condition based on operator
        CASE v_action.operator
          WHEN '=' THEN 
            is_condition_true := LOWER(field_value) = LOWER(op_value);
          WHEN '!=' THEN 
            is_condition_true := field_value != op_value;
          WHEN '<' THEN 
            is_condition_true := field_value::text < op_value::text;
          WHEN '>' THEN 
            is_condition_true := field_value::text > op_value::text;
          WHEN '<=' THEN 
            is_condition_true := field_value::text <= op_value::text;
          WHEN '>=' THEN 
            is_condition_true := field_value::text >= op_value::text;
          WHEN 'LIKE' THEN 
            is_condition_true := field_value LIKE op_value;
          WHEN 'ILIKE' THEN 
            is_condition_true := field_value ILIKE op_value;
          WHEN 'NOT LIKE' THEN 
            is_condition_true := field_value NOT LIKE op_value;
          WHEN 'IS NULL' THEN 
            is_condition_true := field_value IS NULL;
          WHEN 'IS NOT NULL' THEN 
            is_condition_true := field_value IS NOT NULL;
          WHEN 'IS TRUE' THEN 
            is_condition_true := field_value::boolean IS TRUE;
          WHEN 'IS FALSE' THEN 
            is_condition_true := field_value::boolean IS FALSE;
          WHEN 'IS NOT TRUE' THEN 
            is_condition_true := field_value::boolean IS NOT TRUE;
          WHEN 'IS NOT FALSE' THEN 
            is_condition_true := field_value::boolean IS NOT FALSE;
          ELSE
            is_condition_true := FALSE;
        END CASE;
        
        RAISE NOTICE 'Evaluating condition: % % % = %', field_value, v_action.operator, op_value, is_condition_true;
        
        -- If any condition is false, the whole AND group is false
        IF NOT is_condition_true THEN
          v_condition_met := FALSE;
          EXIT; -- No need to check further conditions
        END IF;
      END;
    END LOOP;
    
    -- If all conditions in this group are met, apply actions and stop processing further groups
    IF v_condition_met THEN
      v_matching_condition_group_id := v_conditions.id;
      
      -- Get all actions for this condition group
      FOR v_action IN
        SELECT * 
        FROM logic_flow_actions
        WHERE condition_group_id = v_conditions.id
      LOOP
        -- Get the raw value for extraction
        v_raw_value := v_action.update_value::text;
        
        -- Extract the update value from the JSON string using regex
        -- This ensures we correctly extract quoted values from JSONB
        IF v_raw_value ~ E'^\\{.*\\}$' THEN
          v_text_value := regexp_replace(v_raw_value, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
        ELSE
          v_text_value := v_raw_value;
        END IF;
        
        -- Ensure we have a non-null value to update
        IF v_text_value IS NULL OR v_text_value = '' THEN
          -- If we couldn't extract a value, apply advanced fallbacks
          
          -- Try direct JSONB extraction as a fallback
          BEGIN
            SELECT update_value->>'value' INTO v_text_value
            FROM logic_flow_actions
            WHERE id = v_action.id;
          EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore errors and continue with other methods
          END;
          
          -- If still null, check for email patterns in raw text
          IF v_text_value IS NULL OR v_text_value = '' THEN
            IF v_raw_value LIKE '%@%' THEN
              -- Extract a simple email pattern as last resort
              v_text_value := regexp_replace(v_raw_value, '.*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}).*', E'\\1', 'i');
            ELSE
              -- Use a default non-empty value to avoid null constraint violations
              v_text_value := 'default_value';
            END IF;
          END IF;
        END IF;
        
        RAISE NOTICE 'Extracted update value: % from %', v_text_value, v_raw_value;
        
        -- Build update values string
        IF length(v_update_values) > 0 THEN
          v_update_values := v_update_values || ', ';
        END IF;
        
        -- Handle formula or direct value
        IF v_action.is_formula THEN
          -- Simple formula handling - in production, you'd need more robust formula parsing
          v_update_values := v_update_values || format('%I = (%s)', 
                                              v_action.field_to_update, 
                                              v_action.formula);
        ELSE
          -- Direct value assignment based on data type
          CASE v_action.data_type
            WHEN 'text', 'character varying', 'character' THEN
              v_update_values := v_update_values || format('%I = %L', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'integer', 'numeric', 'decimal', 'real', 'double precision' THEN
              v_update_values := v_update_values || format('%I = %s', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'boolean' THEN
              v_update_values := v_update_values || format('%I = %L::boolean', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'timestamp', 'timestamp with time zone', 'date', 'time' THEN
              v_update_values := v_update_values || format('%I = %L::timestamp', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'uuid' THEN
              v_update_values := v_update_values || format('%I = %L::uuid', 
                                                v_action.field_to_update, 
                                                v_text_value);
            ELSE
              v_update_values := v_update_values || format('%I = %L', 
                                                v_action.field_to_update, 
                                                v_text_value);
          END CASE;
        END IF;
        
        -- Collect action details for logging
        v_actions := v_actions || jsonb_build_object(
          'field', v_action.field_to_update,
          'value', v_text_value
        );
      END LOOP;
      
      -- If we have actions to perform, update the record
      IF length(v_update_values) > 0 THEN
        BEGIN
          -- Print the update SQL for debugging
          RAISE NOTICE 'Update SQL: UPDATE %I SET %s WHERE id = %L AND organization_id = %L', 
            v_queue.object_type, v_update_values, v_record_id, v_queue.organization_id;
            
          -- Update the record
          EXECUTE format('
            UPDATE %I 
            SET %s, updated_at = now()
            WHERE id = $1 AND organization_id = $2
            RETURNING true', 
            v_queue.object_type, v_update_values
          ) INTO v_updated USING v_record_id, v_queue.organization_id;
          
          -- Mark queue item as completed
          UPDATE logic_flow_execution_queue 
          SET status = 'completed'
          WHERE id = p_queue_id;
          
          -- Log successful execution
          INSERT INTO logic_flow_execution_logs (
            flow_id,
            record_id,
            success,
            condition_group_id,
            actions_taken,
            organization_id
          ) VALUES (
            v_flow.id,
            v_record_id,
            TRUE,
            v_matching_condition_group_id,
            v_actions,
            v_queue.organization_id
          );
          
          v_result := jsonb_build_object(
            'success', TRUE,
            'actions', v_actions,
            'condition_group_id', v_matching_condition_group_id
          );
        EXCEPTION WHEN OTHERS THEN
          -- Handle errors
          UPDATE logic_flow_execution_queue 
          SET status = 'failed', 
              last_error = SQLERRM
          WHERE id = p_queue_id;
          
          -- Log failed execution
          INSERT INTO logic_flow_execution_logs (
            flow_id,
            record_id,
            success,
            condition_group_id,
            error_message,
            organization_id
          ) VALUES (
            v_flow.id,
            v_record_id,
            FALSE,
            v_matching_condition_group_id,
            SQLERRM,
            v_queue.organization_id
          );
          
          v_result := jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM
          );
        END;
      ELSE
        -- No actions to perform
        UPDATE logic_flow_execution_queue 
        SET status = 'completed'
        WHERE id = p_queue_id;
        
        v_result := jsonb_build_object(
          'success', TRUE,
          'message', 'Conditions met but no actions defined'
        );
      END IF;
      
      -- Break out of the loop - first matching condition group wins
      EXIT;
    END IF;
  END LOOP;
  
  -- If no condition groups matched
  IF v_matching_condition_group_id IS NULL THEN
    UPDATE logic_flow_execution_queue 
    SET status = 'completed'
    WHERE id = p_queue_id;
    
    v_result := jsonb_build_object(
      'success', TRUE,
      'message', 'No matching conditions found'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a stored procedure to process the queue (for scheduled jobs)
CREATE OR REPLACE PROCEDURE process_logic_flow_queue(max_items INT DEFAULT 100)
LANGUAGE plpgsql
AS $$
DECLARE
  v_queue_id UUID;
  v_result JSONB;
  v_processed INT := 0;
BEGIN
  -- Process up to max_items from the queue
  WHILE v_processed < max_items LOOP
    -- Get next pending queue item
    SELECT id INTO v_queue_id
    FROM logic_flow_execution_queue
    WHERE status = 'pending'
      AND process_after <= now()
      AND attempts < 3  -- Limit retry attempts
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    EXIT WHEN v_queue_id IS NULL;
    
    -- Process the queue item
    v_result := process_logic_flow(v_queue_id);
    
    v_processed := v_processed + 1;
  END LOOP;
  
  -- Return the number of processed items
  RAISE NOTICE 'Processed % queue items', v_processed;
END;
$$;
















-- Function to queue logic flows for execution when records change
CREATE OR REPLACE FUNCTION queue_logic_flows()
RETURNS TRIGGER AS $$
DECLARE
  v_object_type TEXT;
  v_flow_record RECORD;
  v_org_id UUID;
BEGIN
  -- Get the table name and organization_id
  v_object_type := TG_TABLE_NAME;
  
  -- Extract organization_id from the record
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
  ELSE
    v_org_id := NEW.organization_id;
  END IF;
  
  -- Find all active logic flows for this object type and organization
  FOR v_flow_record IN
    SELECT id
    FROM logic_flows
    WHERE object_type = v_object_type
      AND status = true
      AND organization_id = v_org_id
  LOOP
    -- Add to execution queue
    INSERT INTO logic_flow_execution_queue (
      flow_id, 
      record_id, 
      object_type, 
      organization_id
    ) VALUES (
      v_flow_record.id,
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      v_object_type,
      v_org_id
    );
  END LOOP;
  
  -- Return the appropriate record based on operation type
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply triggers to all CRM tables
CREATE OR REPLACE FUNCTION create_logic_flow_triggers() 
RETURNS VOID AS $$
DECLARE
  tables TEXT[] := ARRAY['tasks', 'vendors', 'leads', 'cases', 'opportunities', 
                        'quote_hdr', 'quote_dtl', 'order_hdr', 'order_dtl', 
                        'products', 'customers'];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Check if the table exists before creating triggers
    PERFORM 1 FROM information_schema.tables 
    WHERE table_name = table_name AND table_schema = 'public';
    
    IF NOT FOUND THEN
      RAISE NOTICE 'Skipping table % as it does not exist', table_name;
      CONTINUE;
    END IF;
    
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_logic_flow_after_insert_update ON %I;
      CREATE TRIGGER trigger_logic_flow_after_insert_update
      AFTER INSERT OR UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION queue_logic_flows();
      
      DROP TRIGGER IF EXISTS trigger_logic_flow_after_delete ON %I;
      CREATE TRIGGER trigger_logic_flow_after_delete
      AFTER DELETE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION queue_logic_flows();
    ', table_name, table_name, table_name, table_name);
    
    RAISE NOTICE 'Created triggers for table %', table_name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create triggers for individual tables
CREATE OR REPLACE FUNCTION create_logic_flow_trigger_for_table(p_table_name TEXT) 
RETURNS VOID AS $$
BEGIN
  -- Check if the table exists before creating triggers
  PERFORM 1 FROM information_schema.tables 
  WHERE table_name = p_table_name AND table_schema = 'public';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table % does not exist', p_table_name;
  END IF;
  
  EXECUTE format('
    DROP TRIGGER IF EXISTS trigger_logic_flow_after_insert_update ON %I;
    CREATE TRIGGER trigger_logic_flow_after_insert_update
    AFTER INSERT OR UPDATE ON %I
    FOR EACH ROW
    EXECUTE FUNCTION queue_logic_flows();
    
    DROP TRIGGER IF EXISTS trigger_logic_flow_after_delete ON %I;
    CREATE TRIGGER trigger_logic_flow_after_delete
    AFTER DELETE ON %I
    FOR EACH ROW
    EXECUTE FUNCTION queue_logic_flows();
  ', p_table_name, p_table_name, p_table_name, p_table_name);
  
  RAISE NOTICE 'Created triggers for table %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled function to process the queue
CREATE OR REPLACE FUNCTION scheduled_process_logic_flow_queue()
RETURNS void AS $$
BEGIN
  -- Call the existing procedure
  CALL process_logic_flow_queue(100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the scheduled function
COMMENT ON FUNCTION scheduled_process_logic_flow_queue() IS 'Processes pending logic flow execution queue items. Called by scheduler every 15 minutes.';


















-- Function to manually trigger a flow evaluation for a specific record
CREATE OR REPLACE FUNCTION manual_trigger_flow(p_flow_id UUID, p_record_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_flow RECORD;
  v_queue_id UUID;
  v_result JSONB;
BEGIN
  -- Get flow details to verify it exists
  SELECT * INTO v_flow FROM logic_flows WHERE id = p_flow_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Flow not found');
  END IF;
  
  -- Add to execution queue with high priority
  INSERT INTO logic_flow_execution_queue (
    flow_id, 
    record_id, 
    object_type, 
    organization_id,
    process_after -- Set to now for immediate processing
  ) VALUES (
    p_flow_id,
    p_record_id,
    v_flow.object_type,
    v_flow.organization_id,
    now()
  ) RETURNING id INTO v_queue_id;
  
  -- Process immediately
  v_result := process_logic_flow(v_queue_id);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Flow manually triggered and processed',
    'queue_id', v_queue_id,
    'result', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear all execution logs (for testing/cleanup)
CREATE OR REPLACE FUNCTION clear_logic_flow_logs(older_than_days INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM logic_flow_execution_logs
  WHERE execution_time < (now() - (older_than_days || ' days')::interval)
  RETURNING count(*) INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to inspect JSONB values for debugging
CREATE OR REPLACE FUNCTION inspect_jsonb_value(p_id UUID)
RETURNS TABLE (
  test_description TEXT,
  test_result TEXT
) AS $$
DECLARE
  v_jsonb_value JSONB;
  v_jsonb_text TEXT;
BEGIN
  -- Get the JSONB value
  SELECT update_value INTO v_jsonb_value
  FROM logic_flow_actions
  WHERE id = p_id;
  
  -- Convert to text for easier inspection
  v_jsonb_text := v_jsonb_value::text;
  
  -- Basic information
  test_description := 'JSONB Type';
  test_result := pg_typeof(v_jsonb_value)::text;
  RETURN NEXT;
  
  test_description := 'JSONB as Text';
  test_result := v_jsonb_text;
  RETURN NEXT;
  
  test_description := 'JSON Structure Type';
  test_result := jsonb_typeof(v_jsonb_value);
  RETURN NEXT;
  
  -- Direct value extraction
  test_description := 'Direct Value Extraction';
  test_result := v_jsonb_value->>'value';
  RETURN NEXT;
  
  -- Object keys
  test_description := 'Object Keys';
  test_result := (SELECT string_agg(key, ', ') FROM jsonb_object_keys(v_jsonb_value) AS key);
  RETURN NEXT;
  
  -- Try alternate extraction methods
  test_description := 'JSON Value Path';
  test_result := jsonb_path_query_first(v_jsonb_value, '$.value')::text;
  RETURN NEXT;
  
  test_description := 'Extract from Text using Regex';
  test_result := regexp_replace(v_jsonb_text, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
  RETURN NEXT;
  
  -- Double parsing approach (for string-encoded JSON)
  BEGIN
    test_description := 'Double Parse as JSONB';
    test_result := (v_jsonb_text::jsonb)->>'value';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    test_description := 'Double Parse Error';
    test_result := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Check for escaped characters
  test_description := 'Contains Escaped Quotes';
  test_result := CASE WHEN v_jsonb_text ~ E'\\\\"|\\\"' THEN 'Yes' ELSE 'No' END;
  RETURN NEXT;
  
  -- Character inspection
  test_description := 'First 10 Characters Hex';
  test_result := E'\\x' || encode(substring(v_jsonb_text, 1, 10)::bytea, 'hex');
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to fix JSONB formatting in logic_flow_actions
CREATE OR REPLACE FUNCTION fix_jsonb_in_actions()
RETURNS TABLE (
  id UUID,
  old_value TEXT,
  new_value TEXT,
  fixed BOOLEAN
) AS $$
DECLARE
  v_action RECORD;
  v_text_value TEXT;
  v_new_jsonb JSONB;
  v_updated BOOLEAN;
BEGIN
  FOR v_action IN
    SELECT lfa.id, lfa.update_value, lfa.update_value::text as raw_text
    FROM logic_flow_actions lfa
  LOOP
    -- Extract the embedded value using regex
    v_text_value := regexp_replace(v_action.raw_text, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
    
    -- If we successfully extracted a value, fix the JSONB
    IF v_text_value IS NOT NULL AND v_text_value != v_action.raw_text THEN
      -- Create a proper JSONB object
      v_new_jsonb := jsonb_build_object('value', v_text_value);
      
      -- Update the record
      UPDATE logic_flow_actions
      SET update_value = v_new_jsonb
      WHERE id = v_action.id;
      
      v_updated := TRUE;
    ELSE
      v_updated := FALSE;
    END IF;
    
    -- Return the result
    id := v_action.id;
    old_value := v_action.raw_text;
    new_value := v_new_jsonb::text;
    fixed := v_updated;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





























-- 1. First, let's check if your flow and conditions are correctly defined
SELECT 
    f.id AS flow_id, 
    f.name AS flow_name, 
    f.object_type, 
    f.status AS flow_active,
    COUNT(DISTINCT cg.id) AS condition_group_count,
    COUNT(DISTINCT c.id) AS condition_count,
    COUNT(DISTINCT a.id) AS action_count
FROM 
    logic_flows f
LEFT JOIN 
    logic_flow_condition_groups cg ON f.id = cg.flow_id
LEFT JOIN 
    logic_flow_conditions c ON cg.id = c.condition_group_id
LEFT JOIN 
    logic_flow_actions a ON cg.id = a.condition_group_id
GROUP BY 
    f.id, f.name, f.object_type, f.status;

[
  {
    "flow_id": "5f1a351a-ba74-43f6-9a43-79798f0c665f",
    "flow_name": "Qualified",
    "object_type": "leads",
    "flow_active": true,
    "condition_group_count": 1,
    "condition_count": 1,
    "action_count": 1
  }
]

-- 2. Let's examine the condition groups in detail
SELECT 
    cg.id AS condition_group_id,
    cg.flow_id,
    cg.row_order,
    cg.description,
    COUNT(c.id) AS condition_count
FROM 
    logic_flow_condition_groups cg
LEFT JOIN 
    logic_flow_conditions c ON cg.id = c.condition_group_id
GROUP BY 
    cg.id, cg.flow_id, cg.row_order, cg.description
ORDER BY 
    cg.flow_id, cg.row_order;


[
  {
    "condition_group_id": "23d2a90a-1ea7-439c-a56e-a4d48b9c7454",
    "flow_id": "5f1a351a-ba74-43f6-9a43-79798f0c665f",
    "row_order": 1,
    "description": "Row 1",
    "condition_count": 1
  }
]

-- 3. Let's examine the conditions in detail
SELECT 
    c.id AS condition_id,
    c.condition_group_id,
    c.column_name,
    c.data_type,
    c.operator,
    c.value::text AS value_as_text,
    c.condition_order,
    c.object_path,
    c.referenced_field
FROM 
    logic_flow_conditions c
ORDER BY 
    c.condition_group_id, c.condition_order;



[
  {
    "condition_id": "a25803a1-268f-484d-bb57-67bee70a98f4",
    "condition_group_id": "23d2a90a-1ea7-439c-a56e-a4d48b9c7454",
    "column_name": "status",
    "data_type": "text",
    "operator": "=",
    "value_as_text": "\"{\\\"value\\\":\\\"Qualified\\\"}\"",
    "condition_order": 1,
    "object_path": null,
    "referenced_field": null
  }
]

-- 4. Let's examine the actions in detail
SELECT 
    a.id AS action_id,
    a.condition_group_id,
    a.field_to_update,
    a.data_type,
    a.update_value::text AS update_value_as_text,
    a.is_formula,
    a.formula,
    a.target_object_path,
    a.source_field_path,
    a.source_field
FROM 
    logic_flow_actions a
ORDER BY 
    a.condition_group_id;

[
  {
    "action_id": "22851dde-8220-4f68-afeb-38635087c463",
    "condition_group_id": "23d2a90a-1ea7-439c-a56e-a4d48b9c7454",
    "field_to_update": "company",
    "data_type": "text",
    "update_value_as_text": "\"{\\\"value\\\":\\\"thisis\\\"}\"",
    "is_formula": false,
    "formula": null,
    "target_object_path": null,
    "source_field_path": null,
    "source_field": null
  }
]

-- 5. Check recent execution log entries
SELECT 
    l.id,
    l.flow_id,
    l.record_id,
    l.execution_time,
    l.success,
    l.condition_group_id,
    l.actions_taken,
    l.error_message
FROM 
    logic_flow_execution_logs l
ORDER BY 
    l.execution_time DESC
LIMIT 20;

No Record



SELECT * FROM fix_action_values();

[
  {
    "action_id": "22851dde-8220-4f68-afeb-38635087c463",
    "old_value": "\"{\\\"value\\\":\\\"thisis\\\"}\"",
    "new_value": "{\"value\": \"{\\\"value\\\":\\\"thisis\\\"}\"}",
    "was_fixed": true
  }
]


SELECT * FROM test_flow_conditions('5f1a351a-ba74-43f6-9a43-79798f0c665f', '41f87df9-71d1-4b99-b379-d19c4ed5c542');

ERROR:  42702: column reference "column_name" is ambiguous
DETAIL:  It could refer to either a PL/pgSQL variable or a table column.
QUERY:  SELECT id, column_name, operator, value, condition_order
            FROM logic_flow_conditions
            WHERE condition_group_id = v_cg.id
            ORDER BY condition_order
CONTEXT:  PL/pgSQL function test_flow_conditions(uuid,uuid) line 44 at FOR over SELECT rows
Note: A limit of 100 was applied to your query. If this was the cause of a syntax error, try selecting "No limit" instead and re-run the query.


SELECT * FROM test_flow_actions('5f1a351a-ba74-43f6-9a43-79798f0c665f', '41f87df9-71d1-4b99-b379-d19c4ed5c542');

ERROR:  42702: column reference "field_to_update" is ambiguous
DETAIL:  It could refer to either a PL/pgSQL variable or a table column.
QUERY:  SELECT id, field_to_update, data_type, update_value, is_formula, formula
            FROM logic_flow_actions
            WHERE condition_group_id = v_cg.id
CONTEXT:  PL/pgSQL function test_flow_actions(uuid,uuid) line 40 at FOR over SELECT rows
Note: A limit of 100 was applied to your query. If this was the cause of a syntax error, try selecting "No limit" instead and re-run the query.














-- 1. First, let's directly fix the condition value
UPDATE logic_flow_conditions 
SET value = '{"value": "Qualified"}'::jsonb
WHERE id = 'a25803a1-268f-484d-bb57-67bee70a98f4';

-- 2. Then fix the action value
UPDATE logic_flow_actions 
SET update_value = '{"value": "thisis"}'::jsonb
WHERE id = '22851dde-8220-4f68-afeb-38635087c463';

-- 3. Create a direct test for the specific record to see if conditions match
CREATE OR REPLACE FUNCTION test_specific_condition() 
RETURNS TABLE (
    result TEXT,
    details TEXT
) AS $$
DECLARE
    v_record JSONB;
    v_status TEXT;
    v_condition_value TEXT;
    v_matches BOOLEAN;
BEGIN
    -- Get record data
    EXECUTE 'SELECT to_jsonb(t) FROM leads t WHERE id = $1' 
    INTO v_record 
    USING '41f87df9-71d1-4b99-b379-d19c4ed5c542';
    
    -- Get status from record
    v_status := v_record->>'status';
    
    -- Get condition value
    SELECT value->>'value' INTO v_condition_value 
    FROM logic_flow_conditions 
    WHERE id = 'a25803a1-268f-484d-bb57-67bee70a98f4';
    
    -- Check if values match
    v_matches := v_status = v_condition_value;
    
    -- Return result
    result := CASE WHEN v_matches THEN 'CONDITION MATCHES' ELSE 'CONDITION DOES NOT MATCH' END;
    details := format('Record status: "%s", Expected: "%s"', v_status, v_condition_value);
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a simple function to manually run the flow
CREATE OR REPLACE FUNCTION manual_run_fixed_flow(p_record_id UUID) 
RETURNS TEXT AS $$
DECLARE
    v_record JSONB;
    v_status TEXT;
    v_condition_met BOOLEAN;
    v_update_sql TEXT;
    v_update_value TEXT;
BEGIN
    -- Get record data
    EXECUTE 'SELECT to_jsonb(t) FROM leads t WHERE id = $1' 
    INTO v_record 
    USING p_record_id;
    
    -- Check if record exists
    IF v_record IS NULL THEN
        RETURN 'Record not found';
    END IF;
    
    -- Get status from record
    v_status := v_record->>'status';
    
    -- Get condition value and check if condition is met
    SELECT v_status = (value->>'value') INTO v_condition_met 
    FROM logic_flow_conditions 
    WHERE id = 'a25803a1-268f-484d-bb57-67bee70a98f4';
    
    -- If condition is met, update the record
    IF v_condition_met THEN
        -- Get the update value
        SELECT update_value->>'value' INTO v_update_value 
        FROM logic_flow_actions 
        WHERE id = '22851dde-8220-4f68-afeb-38635087c463';
        
        -- Build and execute the update SQL
        v_update_sql := format('
            UPDATE leads 
            SET company = %L, updated_at = now() 
            WHERE id = %L', 
            v_update_value, p_record_id);
            
        EXECUTE v_update_sql;
        
        -- Log the execution
        INSERT INTO logic_flow_execution_logs (
            flow_id,
            record_id,
            success,
            condition_group_id,
            actions_taken,
            organization_id
        ) VALUES (
            '5f1a351a-ba74-43f6-9a43-79798f0c665f',
            p_record_id,
            TRUE,
            '23d2a90a-1ea7-439c-a56e-a4d48b9c7454',
            json_build_array(
                json_build_object(
                    'field', 'company',
                    'value', v_update_value
                )
            ),
            (SELECT organization_id FROM leads WHERE id = p_record_id)
        );
        
        RETURN 'Flow executed successfully. Updated company to: ' || v_update_value;
    ELSE
        RETURN 'Condition not met. Record status: ' || v_status;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to analyze the process_logic_flow function
CREATE OR REPLACE FUNCTION analyze_process_logic_flow(p_queue_id UUID) 
RETURNS TEXT AS $$
DECLARE
    v_queue RECORD;
    v_flow RECORD;
    v_record JSONB;
    v_conditions RECORD;
    v_condition RECORD;
    v_field_value TEXT;
    v_op_value TEXT;
    v_is_condition_true BOOLEAN;
    v_all_conditions_met BOOLEAN;
    v_matching_group_id UUID;
    v_output TEXT := '';
BEGIN
    -- Get queue item
    SELECT * INTO v_queue 
    FROM logic_flow_execution_queue 
    WHERE id = p_queue_id;
    
    IF v_queue IS NULL THEN
        RETURN 'Queue item not found';
    END IF;
    
    v_output := v_output || format('Queue item found: ID=%s, Flow ID=%s, Record ID=%s, Status=%s%s', 
                                 v_queue.id, v_queue.flow_id, v_queue.record_id, v_queue.status, E'\n');
    
    -- Get flow details
    SELECT * INTO v_flow 
    FROM logic_flows 
    WHERE id = v_queue.flow_id;
    
    IF v_flow IS NULL THEN
        RETURN v_output || 'Flow not found';
    END IF;
    
    v_output := v_output || format('Flow found: Name=%s, Object Type=%s, Active=%s%s', 
                                 v_flow.name, v_flow.object_type, v_flow.status, E'\n');
    
    -- Get record data
    EXECUTE format('
        SELECT to_jsonb(t) 
        FROM %I t 
        WHERE id = $1', 
        v_queue.object_type
    ) INTO v_record USING v_queue.record_id;
    
    IF v_record IS NULL THEN
        RETURN v_output || 'Record not found';
    END IF;
    
    v_output := v_output || format('Record found: ID=%s%s', v_queue.record_id, E'\n');
    
    -- Process each condition group
    FOR v_conditions IN
        SELECT cg.id, cg.row_order
        FROM logic_flow_condition_groups cg
        WHERE cg.flow_id = v_flow.id
        ORDER BY cg.row_order
    LOOP
        v_output := v_output || format('Checking condition group: ID=%s, Order=%s%s', 
                                     v_conditions.id, v_conditions.row_order, E'\n');
        
        v_all_conditions_met := TRUE;
        
        -- Check each condition
        FOR v_condition IN
            SELECT column_name, operator, value 
            FROM logic_flow_conditions 
            WHERE condition_group_id = v_conditions.id
        LOOP
            v_field_value := v_record->>v_condition.column_name;
            
            -- Get value from condition
            IF v_condition.value ? 'value' THEN
                v_op_value := v_condition.value->>'value';
            ELSE
                -- Try alternate methods
                BEGIN
                    v_op_value := regexp_replace(v_condition.value::text, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
                EXCEPTION WHEN OTHERS THEN
                    v_op_value := v_condition.value::text;
                END;
            END IF;
            
            -- Evaluate condition
            CASE v_condition.operator
                WHEN '=' THEN 
                    v_is_condition_true := LOWER(v_field_value) = LOWER(v_op_value);
                WHEN '!=' THEN 
                    v_is_condition_true := v_field_value != v_op_value;
                ELSE
                    v_is_condition_true := FALSE;
            END CASE;
            
            v_output := v_output || format('  Checking condition: %s %s %s => %s (Record value: "%s", Expected: "%s")%s', 
                                        v_condition.column_name, v_condition.operator, v_op_value, 
                                        v_is_condition_true, v_field_value, v_op_value, E'\n');
            
            IF NOT v_is_condition_true THEN
                v_all_conditions_met := FALSE;
            END IF;
        END LOOP;
        
        IF v_all_conditions_met THEN
            v_matching_group_id := v_conditions.id;
            v_output := v_output || format('  All conditions met for group %s%s', v_conditions.id, E'\n');
            
            -- Check actions
            FOR v_condition IN
                SELECT field_to_update, data_type, update_value 
                FROM logic_flow_actions 
                WHERE condition_group_id = v_conditions.id
            LOOP
                IF v_condition.update_value ? 'value' THEN
                    v_op_value := v_condition.update_value->>'value';
                ELSE
                    -- Try alternate methods
                    BEGIN
                        v_op_value := regexp_replace(v_condition.update_value::text, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
                    EXCEPTION WHEN OTHERS THEN
                        v_op_value := v_condition.update_value::text;
                    END;
                END IF;
                
                v_output := v_output || format('  Action would set %s = %s (data type: %s)%s', 
                                            v_condition.field_to_update, v_op_value, v_condition.data_type, E'\n');
            END LOOP;
            
            EXIT; -- First matching group wins
        ELSE
            v_output := v_output || format('  Not all conditions met for group %s%s', v_conditions.id, E'\n');
        END IF;
    END LOOP;
    
    RETURN v_output;
END;
$$ LANGUAGE plpgsql;

-- 6. Call this function to test your specific record
SELECT test_specific_condition();

ERROR:  42883: operator does not exist: uuid = text
HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
QUERY:  SELECT to_jsonb(t) FROM leads t WHERE id = $1
CONTEXT:  PL/pgSQL function test_specific_condition() line 9 at EXECUTE
Note: A limit of 100 was applied to your query. If this was the cause of a syntax error, try selecting "No limit" instead and re-run the query.

-- 7. Manually run the fixed flow on your record
SELECT manual_run_fixed_flow('41f87df9-71d1-4b99-b379-d19c4ed5c542');
Flow executed successfully. Updated company to: thisis

-- 8. Analyze a specific queue item (replace with your actual queue ID)
-- SELECT analyze_process_logic_flow('your-queue-id-here');


























-- Create a more compatible version of the process_logic_flow function
CREATE OR REPLACE FUNCTION process_logic_flow(p_queue_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_queue RECORD;
  v_flow RECORD;
  v_record JSONB;
  v_record_id UUID;
  v_conditions RECORD;
  v_condition_met BOOLEAN;
  v_result JSONB;
  v_actions JSONB := '[]'::JSONB;
  v_action RECORD;
  v_update_values TEXT := '';
  v_updated BOOLEAN := FALSE;
  v_matching_condition_group_id UUID := NULL;
  v_text_value TEXT;
  v_raw_value TEXT;
  v_field_value TEXT;
  v_op_value TEXT;
  v_update_sql TEXT;
  v_update_result BOOLEAN;
BEGIN
  -- Get queue item
  SELECT * INTO v_queue 
  FROM logic_flow_execution_queue 
  WHERE id = p_queue_id AND status = 'pending'
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Queue item not found or already processing');
  END IF;
  
  -- Mark as processing
  UPDATE logic_flow_execution_queue 
  SET status = 'processing', attempts = attempts + 1 
  WHERE id = p_queue_id;
  
  -- Get flow details
  SELECT * INTO v_flow 
  FROM logic_flows 
  WHERE id = v_queue.flow_id;
  
  -- Get record data
  v_record_id := v_queue.record_id;
  
  BEGIN
    EXECUTE format('
      SELECT to_jsonb(t) 
      FROM %I t 
      WHERE id = %L AND organization_id = %L', 
      v_queue.object_type, v_record_id, v_queue.organization_id
    ) INTO v_record;
  EXCEPTION WHEN OTHERS THEN
    -- Handle any errors and mark queue item as failed
    UPDATE logic_flow_execution_queue 
    SET status = 'failed', 
        last_error = 'Error fetching record: ' || SQLERRM
    WHERE id = p_queue_id;
    
    RETURN jsonb_build_object('success', FALSE, 'error', 'Error fetching record: ' || SQLERRM);
  END;
  
  IF v_record IS NULL THEN
    -- Record not found, mark as completed (could have been deleted)
    UPDATE logic_flow_execution_queue 
    SET status = 'completed', 
        last_error = 'Record not found'
    WHERE id = p_queue_id;
    
    RETURN jsonb_build_object('success', TRUE, 'message', 'Record not found');
  END IF;

  -- Process each condition group in order
  FOR v_conditions IN
    SELECT cg.id, cg.row_order, cg.description
    FROM logic_flow_condition_groups cg
    WHERE cg.flow_id = v_flow.id
    ORDER BY cg.row_order
  LOOP
    -- Default to all conditions being met
    v_condition_met := TRUE;
    
    -- Check each condition in this group (AND logic)
    FOR v_action IN (
      SELECT c.id, c.column_name, c.operator, c.value, c.condition_order
      FROM logic_flow_conditions c
      WHERE c.condition_group_id = v_conditions.id
      ORDER BY c.condition_order
    ) LOOP
      -- Get field value from the record
      v_field_value := v_record->>v_action.column_name;
      
      -- Get condition value correctly
      IF v_action.value ? 'value' THEN
        -- Directly extract from JSONB if it has a "value" key
        v_op_value := v_action.value->>'value';
      ELSE
        -- Try other methods if needed
        v_raw_value := v_action.value::text;
        
        -- Method 1: Try regex extraction
        BEGIN
          v_op_value := regexp_replace(v_raw_value, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
          
          -- If regex returned the original string, it failed
          IF v_op_value = v_raw_value THEN
            -- Method 2: Just use the raw value as is
            v_op_value := v_raw_value;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Fallback to raw value
          v_op_value := v_raw_value;
        END;
      END IF;
      
      -- Evaluate the condition based on operator
      CASE v_action.operator
        WHEN '=' THEN 
          v_condition_met := LOWER(v_field_value) = LOWER(v_op_value);
        WHEN '!=' THEN 
          v_condition_met := v_field_value != v_op_value;
        WHEN '<' THEN 
          v_condition_met := v_field_value::text < v_op_value::text;
        WHEN '>' THEN 
          v_condition_met := v_field_value::text > v_op_value::text;
        WHEN '<=' THEN 
          v_condition_met := v_field_value::text <= v_op_value::text;
        WHEN '>=' THEN 
          v_condition_met := v_field_value::text >= v_op_value::text;
        WHEN 'LIKE' THEN 
          v_condition_met := v_field_value LIKE v_op_value;
        WHEN 'ILIKE' THEN 
          v_condition_met := v_field_value ILIKE v_op_value;
        WHEN 'NOT LIKE' THEN 
          v_condition_met := v_field_value NOT LIKE v_op_value;
        WHEN 'IS NULL' THEN 
          v_condition_met := v_field_value IS NULL;
        WHEN 'IS NOT NULL' THEN 
          v_condition_met := v_field_value IS NOT NULL;
        WHEN 'IS TRUE' THEN 
          v_condition_met := v_field_value::boolean IS TRUE;
        WHEN 'IS FALSE' THEN 
          v_condition_met := v_field_value::boolean IS FALSE;
        WHEN 'IS NOT TRUE' THEN 
          v_condition_met := v_field_value::boolean IS NOT TRUE;
        WHEN 'IS NOT FALSE' THEN 
          v_condition_met := v_field_value::boolean IS NOT FALSE;
        ELSE
          v_condition_met := FALSE;
      END CASE;
      
      -- If any condition is false, the whole AND group is false
      IF NOT v_condition_met THEN
        EXIT; -- No need to check further conditions
      END IF;
    END LOOP;
    
    -- If all conditions in this group are met, apply actions and stop processing further groups
    IF v_condition_met THEN
      v_matching_condition_group_id := v_conditions.id;
      
      -- Get all actions for this condition group
      FOR v_action IN
        SELECT a.id, a.field_to_update, a.data_type, a.update_value, a.is_formula, a.formula
        FROM logic_flow_actions a
        WHERE a.condition_group_id = v_conditions.id
      LOOP
        -- Extract update value correctly
        IF v_action.is_formula THEN
          v_text_value := v_action.formula;
        ELSIF v_action.update_value ? 'value' THEN
          -- Directly extract from JSONB if it has a "value" key
          v_text_value := v_action.update_value->>'value';
        ELSE
          -- Try other methods if needed
          v_raw_value := v_action.update_value::text;
          
          -- Method 1: Try regex extraction
          BEGIN
            v_text_value := regexp_replace(v_raw_value, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
            
            -- If regex returned the original string, it failed
            IF v_text_value = v_raw_value THEN
              -- Method 2: Just use the raw value as is
              v_text_value := v_raw_value;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            -- Fallback to raw value
            v_text_value := v_raw_value;
          END;
        END IF;
        
        -- Build update values string
        IF length(v_update_values) > 0 THEN
          v_update_values := v_update_values || ', ';
        END IF;
        
        -- Handle formula or direct value
        IF v_action.is_formula THEN
          -- Simple formula handling - in production, you'd need more robust formula parsing
          v_update_values := v_update_values || format('%I = (%s)', 
                                          v_action.field_to_update, 
                                          v_action.formula);
        ELSE
          -- Direct value assignment based on data type
          CASE v_action.data_type
            WHEN 'text', 'character varying', 'character' THEN
              v_update_values := v_update_values || format('%I = %L', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'integer', 'numeric', 'decimal', 'real', 'double precision' THEN
              v_update_values := v_update_values || format('%I = %s', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'boolean' THEN
              v_update_values := v_update_values || format('%I = %L::boolean', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'timestamp', 'timestamp with time zone', 'date', 'time' THEN
              v_update_values := v_update_values || format('%I = %L::timestamp', 
                                                v_action.field_to_update, 
                                                v_text_value);
            WHEN 'uuid' THEN
              v_update_values := v_update_values || format('%I = %L::uuid', 
                                                v_action.field_to_update, 
                                                v_text_value);
            ELSE
              v_update_values := v_update_values || format('%I = %L', 
                                                v_action.field_to_update, 
                                                v_text_value);
          END CASE;
        END IF;
        
        -- Collect action details for logging
        v_actions := v_actions || jsonb_build_object(
          'field', v_action.field_to_update,
          'value', v_text_value
        );
      END LOOP;
      
      -- If we have actions to perform, update the record
      IF length(v_update_values) > 0 THEN
        BEGIN
          -- Build the SQL update statement
          v_update_sql := format('
            UPDATE %I 
            SET %s, updated_at = now()
            WHERE id = %L AND organization_id = %L',
            v_queue.object_type, v_update_values, v_record_id, v_queue.organization_id);
            
          -- Execute the update
          EXECUTE v_update_sql;
          v_updated := TRUE;
          
          -- Mark queue item as completed
          UPDATE logic_flow_execution_queue 
          SET status = 'completed'
          WHERE id = p_queue_id;
          
          -- Log successful execution
          INSERT INTO logic_flow_execution_logs (
            flow_id,
            record_id,
            success,
            condition_group_id,
            actions_taken,
            organization_id
          ) VALUES (
            v_flow.id,
            v_record_id,
            TRUE,
            v_matching_condition_group_id,
            v_actions,
            v_queue.organization_id
          );
          
          v_result := jsonb_build_object(
            'success', TRUE,
            'actions', v_actions,
            'condition_group_id', v_matching_condition_group_id
          );
        EXCEPTION WHEN OTHERS THEN
          -- Handle errors
          UPDATE logic_flow_execution_queue 
          SET status = 'failed', 
              last_error = SQLERRM
          WHERE id = p_queue_id;
          
          -- Log failed execution
          INSERT INTO logic_flow_execution_logs (
            flow_id,
            record_id,
            success,
            condition_group_id,
            error_message,
            organization_id
          ) VALUES (
            v_flow.id,
            v_record_id,
            FALSE,
            v_matching_condition_group_id,
            SQLERRM,
            v_queue.organization_id
          );
          
          v_result := jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM
          );
        END;
      ELSE
        -- No actions to perform
        UPDATE logic_flow_execution_queue 
        SET status = 'completed'
        WHERE id = p_queue_id;
        
        v_result := jsonb_build_object(
          'success', TRUE,
          'message', 'Conditions met but no actions defined'
        );
      END IF;
      
      -- Break out of the loop - first matching condition group wins
      EXIT;
    END IF;
  END LOOP;
  
  -- If no condition groups matched
  IF v_matching_condition_group_id IS NULL THEN
    UPDATE logic_flow_execution_queue 
    SET status = 'completed'
    WHERE id = p_queue_id;
    
    v_result := jsonb_build_object(
      'success', TRUE,
      'message', 'No matching conditions found'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the test_specific_condition function
CREATE OR REPLACE FUNCTION test_specific_condition() 
RETURNS TABLE (
    result TEXT,
    details TEXT
) AS $$
DECLARE
    v_record JSONB;
    v_status TEXT;
    v_condition_value TEXT;
    v_matches BOOLEAN;
BEGIN
    -- Get record data with a more compatible approach
    EXECUTE format('SELECT to_jsonb(t) FROM leads t WHERE id = %L', '41f87df9-71d1-4b99-b379-d19c4ed5c542')
    INTO v_record;
    
    -- Get status from record
    v_status := v_record->>'status';
    
    -- Get condition value
    SELECT value->>'value' INTO v_condition_value 
    FROM logic_flow_conditions 
    WHERE id = 'a25803a1-268f-484d-bb57-67bee70a98f4';
    
    -- Check if values match
    v_matches := v_status = v_condition_value;
    
    -- Return result
    result := CASE WHEN v_matches THEN 'CONDITION MATCHES' ELSE 'CONDITION DOES NOT MATCH' END;
    details := format('Record status: "%s", Expected: "%s"', v_status, v_condition_value);
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Enhanced process_logic_flow_queue to add debugging
CREATE OR REPLACE PROCEDURE process_logic_flow_queue(max_items INT DEFAULT 100)
LANGUAGE plpgsql
AS $$
DECLARE
  v_queue_id UUID;
  v_result JSONB;
  v_processed INT := 0;
  v_success INT := 0;
  v_failed INT := 0;
BEGIN
  -- Process up to max_items from the queue
  WHILE v_processed < max_items LOOP
    -- Get next pending queue item
    SELECT id INTO v_queue_id
    FROM logic_flow_execution_queue
    WHERE status = 'pending'
      AND process_after <= now()
      AND attempts < 3  -- Limit retry attempts
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    EXIT WHEN v_queue_id IS NULL;
    
    -- Process the queue item
    BEGIN
      v_result := process_logic_flow(v_queue_id);
      
      IF (v_result->>'success')::boolean THEN
        v_success := v_success + 1;
      ELSE
        v_failed := v_failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      
      -- Update queue item to mark as failed
      UPDATE logic_flow_execution_queue 
      SET status = 'failed', 
          last_error = SQLERRM
      WHERE id = v_queue_id;
    END;
    
    v_processed := v_processed + 1;
  END LOOP;
  
  -- Return the number of processed items
  RAISE NOTICE 'Processed % queue items (Success: %, Failed: %)', v_processed, v_success, v_failed;
END;
$$;


SELECT test_specific_condition();
































-- Create a debug logging table
CREATE TABLE IF NOT EXISTS debug_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    flow_id UUID,
    queue_id UUID,
    record_id UUID,
    step TEXT,
    message TEXT,
    details JSONB
);

-- Create a debug version of the process_logic_flow function
CREATE OR REPLACE FUNCTION debug_process_flow(p_queue_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_queue RECORD;
    v_flow RECORD;
    v_record JSONB;
    v_record_id UUID;
    v_conditions RECORD;
    v_condition RECORD;
    v_action RECORD;
    v_condition_met BOOLEAN;
    v_matching_condition_group_id UUID := NULL;
    v_update_values TEXT := '';
    v_actions JSONB := '[]'::JSONB;
    v_text_value TEXT;
    v_field_value TEXT;
    v_op_value TEXT;
    v_raw_value TEXT;
    v_update_sql TEXT;
    v_log_id INT;
    v_output TEXT := '';
BEGIN
    -- Initialize debug log
    INSERT INTO debug_logs (queue_id, step, message)
    VALUES (p_queue_id, 'start', 'Starting debug process')
    RETURNING id INTO v_log_id;

    -- Get queue item details
    SELECT * INTO v_queue 
    FROM logic_flow_execution_queue 
    WHERE id = p_queue_id;
    
    IF v_queue IS NULL THEN
        UPDATE debug_logs
        SET message = 'Queue item not found', 
            details = jsonb_build_object('queue_id', p_queue_id)
        WHERE id = v_log_id;
        
        RETURN 'Queue item not found: ' || p_queue_id;
    END IF;
    
    -- Update log with queue details
    UPDATE debug_logs
    SET flow_id = v_queue.flow_id, 
        record_id = v_queue.record_id,
        details = to_jsonb(v_queue)
    WHERE id = v_log_id;
    
    v_output := v_output || format('Queue item found: ID=%s, Flow ID=%s, Record ID=%s, Status=%s%s', 
                                 v_queue.id, v_queue.flow_id, v_queue.record_id, v_queue.status, E'\n');
    
    -- Get flow details
    SELECT * INTO v_flow 
    FROM logic_flows 
    WHERE id = v_queue.flow_id;
    
    IF v_flow IS NULL THEN
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'flow_missing', 'Flow not found');
        
        v_output := v_output || 'Flow not found' || E'\n';
        RETURN v_output;
    END IF;
    
    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'flow_found', 'Flow details', to_jsonb(v_flow));
    
    v_output := v_output || format('Flow found: Name=%s, Object Type=%s, Active=%s%s', 
                                 v_flow.name, v_flow.object_type, v_flow.status, E'\n');
    
    -- Get record data
    v_record_id := v_queue.record_id;
    BEGIN
        EXECUTE format('
            SELECT to_jsonb(t) 
            FROM %I t 
            WHERE id = %L', 
            v_queue.object_type, v_record_id
        ) INTO v_record;
        
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'record_found', 'Record data', v_record);
        
        v_output := v_output || format('Record found: %s%s', v_record::text, E'\n');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'record_error', 'Error fetching record', 
                jsonb_build_object('error', SQLERRM, 'sql', format('SELECT to_jsonb(t) FROM %I t WHERE id = %L', 
                                                               v_queue.object_type, v_record_id)));
        
        v_output := v_output || format('Error fetching record: %s%s', SQLERRM, E'\n');
        RETURN v_output;
    END;
    
    IF v_record IS NULL THEN
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'record_missing', 'Record not found');
        
        v_output := v_output || 'Record not found' || E'\n';
        RETURN v_output;
    END IF;
    
    -- Get available condition groups
    DECLARE
        v_condition_group_count INT := 0;
    BEGIN
        SELECT COUNT(*) INTO v_condition_group_count
        FROM logic_flow_condition_groups
        WHERE flow_id = v_flow.id;
        
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_groups', 'Condition groups count', 
                jsonb_build_object('count', v_condition_group_count));
        
        v_output := v_output || format('Found %s condition group(s)%s', v_condition_group_count, E'\n');
        
        IF v_condition_group_count = 0 THEN
            v_output := v_output || 'No condition groups to process' || E'\n';
            RETURN v_output;
        END IF;
    END;
    
    -- Process each condition group
    FOR v_conditions IN
        SELECT cg.id, cg.row_order, cg.description
        FROM logic_flow_condition_groups cg
        WHERE cg.flow_id = v_flow.id
        ORDER BY cg.row_order
    LOOP
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'checking_condition_group', 'Checking condition group', 
                jsonb_build_object('condition_group_id', v_conditions.id, 'row_order', v_conditions.row_order));
        
        v_output := v_output || format('Checking condition group: ID=%s, Order=%s%s', 
                                     v_conditions.id, v_conditions.row_order, E'\n');
        
        -- Default to all conditions being met
        v_condition_met := TRUE;
        
        -- Count conditions in this group
        DECLARE
            v_cond_count INT := 0;
        BEGIN
            SELECT COUNT(*) INTO v_cond_count
            FROM logic_flow_conditions
            WHERE condition_group_id = v_conditions.id;
            
            INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
            VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_count', 'Number of conditions in group', 
                    jsonb_build_object('condition_group_id', v_conditions.id, 'count', v_cond_count));
            
            v_output := v_output || format('  Group has %s condition(s)%s', v_cond_count, E'\n');
            
            IF v_cond_count = 0 THEN
                -- No conditions means this group is always true
                v_condition_met := TRUE;
                
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'no_conditions', 'No conditions in group, treating as true', 
                        jsonb_build_object('condition_group_id', v_conditions.id));
                
                v_output := v_output || '  No conditions - treating as TRUE' || E'\n';
            END IF;
        END;
        
        -- Check each condition
        FOR v_condition IN
            SELECT c.id, c.column_name, c.operator, c.value, c.condition_order
            FROM logic_flow_conditions c
            WHERE c.condition_group_id = v_conditions.id
            ORDER BY c.condition_order
        LOOP
            -- Get field value from the record
            v_field_value := v_record->>v_condition.column_name;
            
            INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
            VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'field_value', 'Field value from record', 
                    jsonb_build_object(
                        'condition_id', v_condition.id,
                        'column_name', v_condition.column_name,
                        'field_value', v_field_value
                    ));
            
            -- Get condition value correctly
            IF v_condition.value ? 'value' THEN
                -- Directly extract from JSONB if it has a "value" key
                v_op_value := v_condition.value->>'value';
                
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_value', 'Condition value extracted directly', 
                        jsonb_build_object(
                            'condition_id', v_condition.id,
                            'extraction_method', 'direct_jsonb',
                            'condition_value', v_op_value,
                            'raw_condition', v_condition.value::text
                        ));
            ELSE
                -- Try other methods if needed
                v_raw_value := v_condition.value::text;
                
                -- Method 1: Try regex extraction
                BEGIN
                    v_op_value := regexp_replace(v_raw_value, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
                    
                    -- If regex returned the original string, it failed
                    IF v_op_value = v_raw_value THEN
                        -- Method 2: Just use the raw value as is
                        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_value', 'Regex extraction failed, using raw value', 
                                jsonb_build_object(
                                    'condition_id', v_condition.id,
                                    'extraction_method', 'raw_fallback',
                                    'condition_value', v_raw_value
                                ));
                    ELSE
                        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_value', 'Condition value extracted with regex', 
                                jsonb_build_object(
                                    'condition_id', v_condition.id,
                                    'extraction_method', 'regex',
                                    'condition_value', v_op_value,
                                    'raw_condition', v_raw_value
                                ));
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Fallback to raw value
                    v_op_value := v_raw_value;
                    
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_value', 'Regex error, using raw value', 
                            jsonb_build_object(
                                'condition_id', v_condition.id,
                                'extraction_method', 'error_fallback',
                                'condition_value', v_op_value,
                                'error', SQLERRM
                            ));
                END;
            END IF;
            
            -- Evaluate the condition based on operator
            DECLARE
                v_is_condition_true BOOLEAN;
            BEGIN
                CASE v_condition.operator
                    WHEN '=' THEN 
                        v_is_condition_true := LOWER(v_field_value) = LOWER(v_op_value);
                    WHEN '!=' THEN 
                        v_is_condition_true := v_field_value != v_op_value;
                    WHEN '<' THEN 
                        v_is_condition_true := v_field_value::text < v_op_value::text;
                    WHEN '>' THEN 
                        v_is_condition_true := v_field_value::text > v_op_value::text;
                    WHEN '<=' THEN 
                        v_is_condition_true := v_field_value::text <= v_op_value::text;
                    WHEN '>=' THEN 
                        v_is_condition_true := v_field_value::text >= v_op_value::text;
                    WHEN 'LIKE' THEN 
                        v_is_condition_true := v_field_value LIKE v_op_value;
                    WHEN 'ILIKE' THEN 
                        v_is_condition_true := v_field_value ILIKE v_op_value;
                    WHEN 'NOT LIKE' THEN 
                        v_is_condition_true := v_field_value NOT LIKE v_op_value;
                    WHEN 'IS NULL' THEN 
                        v_is_condition_true := v_field_value IS NULL;
                    WHEN 'IS NOT NULL' THEN 
                        v_is_condition_true := v_field_value IS NOT NULL;
                    WHEN 'IS TRUE' THEN 
                        v_is_condition_true := v_field_value::boolean IS TRUE;
                    WHEN 'IS FALSE' THEN 
                        v_is_condition_true := v_field_value::boolean IS FALSE;
                    WHEN 'IS NOT TRUE' THEN 
                        v_is_condition_true := v_field_value::boolean IS NOT TRUE;
                    WHEN 'IS NOT FALSE' THEN 
                        v_is_condition_true := v_field_value::boolean IS NOT FALSE;
                    ELSE
                        v_is_condition_true := FALSE;
                END CASE;
                
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_evaluation', 'Condition evaluation result', 
                        jsonb_build_object(
                            'condition_id', v_condition.id,
                            'column_name', v_condition.column_name,
                            'operator', v_condition.operator,
                            'field_value', v_field_value,
                            'condition_value', v_op_value,
                            'result', v_is_condition_true
                        ));
                
                v_output := v_output || format('  Checking condition: %s %s %s => %s (Record value: "%s", Expected: "%s")%s', 
                                            v_condition.column_name, v_condition.operator, v_op_value, 
                                            v_is_condition_true, v_field_value, v_op_value, E'\n');
                
                IF NOT v_is_condition_true THEN
                    v_condition_met := FALSE;
                    
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'condition_failed', 'Condition not met, group will be skipped', 
                            jsonb_build_object('condition_id', v_condition.id));
                    
                    -- Skip further conditions in this group
                    EXIT;
                END IF;
            END;
        END LOOP;
        
        -- If all conditions in this group are met, apply actions
        IF v_condition_met THEN
            v_matching_condition_group_id := v_conditions.id;
            
            INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
            VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'conditions_met', 'All conditions in group are met', 
                    jsonb_build_object('condition_group_id', v_conditions.id));
            
            v_output := v_output || format('  All conditions met for group %s%s', v_conditions.id, E'\n');
            
            -- Count actions for this group
            DECLARE
                v_action_count INT := 0;
            BEGIN
                SELECT COUNT(*) INTO v_action_count
                FROM logic_flow_actions
                WHERE condition_group_id = v_conditions.id;
                
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'action_count', 'Number of actions in group', 
                        jsonb_build_object('condition_group_id', v_conditions.id, 'count', v_action_count));
                
                v_output := v_output || format('  Group has %s action(s)%s', v_action_count, E'\n');
                
                IF v_action_count = 0 THEN
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'no_actions', 'No actions to perform');
                    
                    v_output := v_output || '  No actions to perform' || E'\n';
                END IF;
            END;
            
            -- Reset update values for this group
            v_update_values := '';
            
            -- Get all actions for this condition group
            FOR v_action IN
                SELECT a.id, a.field_to_update, a.data_type, a.update_value, a.is_formula, a.formula
                FROM logic_flow_actions a
                WHERE a.condition_group_id = v_conditions.id
            LOOP
                -- Extract update value correctly
                IF v_action.is_formula THEN
                    v_text_value := v_action.formula;
                    
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'action_value', 'Action value is a formula', 
                            jsonb_build_object(
                                'action_id', v_action.id,
                                'field_to_update', v_action.field_to_update,
                                'formula', v_action.formula
                            ));
                ELSIF v_action.update_value ? 'value' THEN
                    -- Directly extract from JSONB if it has a "value" key
                    v_text_value := v_action.update_value->>'value';
                    
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'action_value', 'Action value extracted directly', 
                            jsonb_build_object(
                                'action_id', v_action.id,
                                'field_to_update', v_action.field_to_update,
                                'extraction_method', 'direct_jsonb',
                                'update_value', v_text_value,
                                'raw_value', v_action.update_value::text
                            ));
                ELSE
                    -- Try other methods if needed
                    v_raw_value := v_action.update_value::text;
                    
                    -- Method 1: Try regex extraction
                    BEGIN
                        v_text_value := regexp_replace(v_raw_value, '.*"value"\\s*:\\s*"([^"]*)".*', E'\\1', 'i');
                        
                        -- If regex returned the original string, it failed
                        IF v_text_value = v_raw_value THEN
                            -- Method 2: Just use the raw value as is
                            INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                            VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'action_value', 'Regex extraction failed, using raw value', 
                                    jsonb_build_object(
                                        'action_id', v_action.id,
                                        'field_to_update', v_action.field_to_update,
                                        'extraction_method', 'raw_fallback',
                                        'update_value', v_raw_value
                                    ));
                        ELSE
                            INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                            VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'action_value', 'Action value extracted with regex', 
                                    jsonb_build_object(
                                        'action_id', v_action.id,
                                        'field_to_update', v_action.field_to_update,
                                        'extraction_method', 'regex',
                                        'update_value', v_text_value,
                                        'raw_value', v_raw_value
                                    ));
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        -- Fallback to raw value
                        v_text_value := v_raw_value;
                        
                        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'action_value', 'Regex error, using raw value', 
                                jsonb_build_object(
                                    'action_id', v_action.id,
                                    'field_to_update', v_action.field_to_update,
                                    'extraction_method', 'error_fallback',
                                    'update_value', v_text_value,
                                    'error', SQLERRM
                                ));
                    END;
                END IF;
                
                -- Build update values string
                IF length(v_update_values) > 0 THEN
                    v_update_values := v_update_values || ', ';
                END IF;
                
                -- Handle formula or direct value
                IF v_action.is_formula THEN
                    -- Simple formula handling - in production, you'd need more robust formula parsing
                    v_update_values := v_update_values || format('%I = (%s)', 
                                                  v_action.field_to_update, 
                                                  v_action.formula);
                ELSE
                    -- Direct value assignment based on data type
                    CASE v_action.data_type
                        WHEN 'text', 'character varying', 'character' THEN
                            v_update_values := v_update_values || format('%I = %L', 
                                                            v_action.field_to_update, 
                                                            v_text_value);
                        WHEN 'integer', 'numeric', 'decimal', 'real', 'double precision' THEN
                            v_update_values := v_update_values || format('%I = %s', 
                                                            v_action.field_to_update, 
                                                            v_text_value);
                        WHEN 'boolean' THEN
                            v_update_values := v_update_values || format('%I = %L::boolean', 
                                                            v_action.field_to_update, 
                                                            v_text_value);
                        WHEN 'timestamp', 'timestamp with time zone', 'date', 'time' THEN
                            v_update_values := v_update_values || format('%I = %L::timestamp', 
                                                            v_action.field_to_update, 
                                                            v_text_value);
                        WHEN 'uuid' THEN
                            v_update_values := v_update_values || format('%I = %L::uuid', 
                                                            v_action.field_to_update, 
                                                            v_text_value);
                        ELSE
                            v_update_values := v_update_values || format('%I = %L', 
                                                            v_action.field_to_update, 
                                                            v_text_value);
                    END CASE;
                END IF;
                
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'update_sql_part', 'Generated SQL fragment for this action', 
                        jsonb_build_object(
                            'action_id', v_action.id,
                            'field_to_update', v_action.field_to_update,
                            'update_value', v_text_value,
                            'sql_fragment', v_update_values
                        ));
                
                v_output := v_output || format('  Action would set %s = %s (data type: %s)%s', 
                                            v_action.field_to_update, v_text_value, v_action.data_type, E'\n');
                
                -- Collect action details for logging
                v_actions := v_actions || jsonb_build_object(
                  'field', v_action.field_to_update,
                  'value', v_text_value
                );
            END LOOP;
            
            -- If we have actions to perform, update the record
            IF length(v_update_values) > 0 THEN
                -- Build the SQL update statement
                v_update_sql := format('
                    UPDATE %I 
                    SET %s, updated_at = now()
                    WHERE id = %L',
                    v_queue.object_type, v_update_values, v_record_id);
                
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'update_sql', 'Complete SQL statement to execute', 
                        jsonb_build_object('sql', v_update_sql));
                
                v_output := v_output || format('  SQL: %s%s', v_update_sql, E'\n');
                
                -- Execute the update
                BEGIN
                    EXECUTE v_update_sql;
                    
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'update_success', 'SQL executed successfully');
                    
                    v_output := v_output || '  Update executed successfully' || E'\n';
                    
                    -- Verify the changes were made
                    DECLARE
                        v_updated_record JSONB;
                    BEGIN
                        EXECUTE format('
                            SELECT to_jsonb(t) 
                            FROM %I t 
                            WHERE id = %L', 
                            v_queue.object_type, v_record_id
                        ) INTO v_updated_record;
                        
                        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'verify_update', 'Record after update', 
                                jsonb_build_object('updated_record', v_updated_record));
                        
                        v_output := v_output || format('  Updated record: %s%s', v_updated_record::text, E'\n');
                    EXCEPTION WHEN OTHERS THEN
                        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'verify_error', 'Error verifying update', 
                                jsonb_build_object('error', SQLERRM));
                        
                        v_output := v_output || format('  Error verifying update: %s%s', SQLERRM, E'\n');
                    END;
                EXCEPTION WHEN OTHERS THEN
                    INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
                    VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'update_error', 'Error executing SQL', 
                            jsonb_build_object('error', SQLERRM));
                    
                    v_output := v_output || format('  Error executing update: %s%s', SQLERRM, E'\n');
                END;
            ELSE
                INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message)
                VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'no_updates', 'No update values generated');
                
                v_output := v_output || '  No update values generated' || E'\n';
            END IF;
            
            -- First matching group wins
            EXIT;
        ELSE
            INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message, details)
            VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'conditions_not_met', 'Not all conditions in group are met', 
                    jsonb_build_object('condition_group_id', v_conditions.id));
            
            v_output := v_output || format('  Not all conditions met for group %s%s', v_conditions.id, E'\n');
        END IF;
    END LOOP;
    
    IF v_matching_condition_group_id IS NULL THEN
        INSERT INTO debug_logs (queue_id, flow_id, record_id, step, message)
        VALUES (p_queue_id, v_queue.flow_id, v_queue.record_id, 'no_matching_groups', 'No condition groups matched');
        
        v_output := v_output || 'No condition groups matched' || E'\n';
    END IF;
    
    RETURN v_output;
END;
$$ LANGUAGE plpgsql;

-- Run the debugger function on your problem queue item
-- SELECT debug_process_flow('your-queue-id-here');

-- Function to create a test flow with known values
CREATE OR REPLACE FUNCTION create_test_flow(
    p_table_name TEXT,
    p_condition_field TEXT,
    p_condition_value TEXT,
    p_update_field TEXT,
    p_update_value TEXT
) RETURNS UUID AS $$
DECLARE
    v_flow_id UUID;
    v_condition_group_id UUID;
BEGIN
    -- Create a test flow
    INSERT INTO logic_flows (
        name,
        description,
        object_type,
        status,
        organization_id
    ) VALUES (
        'Test Flow ' || now(),
        'Auto-created test flow',
        p_table_name,
        true,
        (SELECT organization_id FROM auth.users LIMIT 1) -- Get a valid organization_id
    ) RETURNING id INTO v_flow_id;
    
    -- Create a condition group
    INSERT INTO logic_flow_condition_groups (
        flow_id,
        row_order,
        description
    ) VALUES (
        v_flow_id,
        1,
        'Test condition group'
    ) RETURNING id INTO v_condition_group_id;
    
    -- Create a condition
    INSERT INTO logic_flow_conditions (
        condition_group_id,
        column_name,
        data_type,
        operator,
        value,
        condition_order
    ) VALUES (
        v_condition_group_id,
        p_condition_field,
        'text',
        '=',
        jsonb_build_object('value', p_condition_value),
        1
    );
    
    -- Create an action
    INSERT INTO logic_flow_actions (
        condition_group_id,
        field_to_update,
        data_type,
        update_value,
        is_formula
    ) VALUES (
        v_condition_group_id,
        p_update_field,
        'text',
        jsonb_build_object('value', p_update_value),
        false
    );
    
    RETURN v_flow_id;
END;
$$ LANGUAGE plpgsql;

-- Function to test a flow directly against a specific record
CREATE OR REPLACE FUNCTION test_flow_directly(
    p_flow_id UUID,
    p_record_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_queue_id UUID;
    v_organization_id UUID;
    v_object_type TEXT;
    v_debug_output TEXT;
BEGIN
    -- Get flow details
    SELECT object_type INTO v_object_type
    FROM logic_flows
    WHERE id = p_flow_id;
    
    IF v_object_type IS NULL THEN
        RETURN 'Flow not found with ID: ' || p_flow_id;
    END IF;
    
    -- Get organization_id from the record
    EXECUTE format('
        SELECT organization_id
        FROM %I
        WHERE id = %L',
        v_object_type, p_record_id
    ) INTO v_organization_id;
    
    IF v_organization_id IS NULL THEN
        RETURN 'Record not found with ID: ' || p_record_id;
    END IF;
    
    -- Create a queue item
    INSERT INTO logic_flow_execution_queue (
        flow_id,
        record_id,
        object_type,
        organization_id
    ) VALUES (
        p_flow_id,
        p_record_id,
        v_object_type,
        v_organization_id
    ) RETURNING id INTO v_queue_id;
    
    -- Run the debug process
    v_debug_output := debug_process_flow(v_queue_id);
    
    RETURN v_debug_output;
END;
$$ LANGUAGE plpgsql;

-- Function to check current record state
CREATE OR REPLACE FUNCTION check_record_state(
    p_table_name TEXT,
    p_record_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_record JSONB;
BEGIN
    EXECUTE format('
        SELECT to_jsonb(t)
        FROM %I t
        WHERE id = %L',
        p_table_name, p_record_id
    ) INTO v_record;
    
    RETURN v_record;
END;
$$ LANGUAGE plpgsql;

-- Create a simple direct update function to test database permissions
CREATE OR REPLACE FUNCTION test_direct_update(
    p_table_name TEXT,
    p_record_id UUID,
    p_field_name TEXT,
    p_value TEXT
) RETURNS TEXT AS $$
DECLARE
    v_sql TEXT;
    v_record_before JSONB;
    v_record_after JSONB;
BEGIN
    -- Get record before update
    EXECUTE format('
        SELECT to_jsonb(t)
        FROM %I t
        WHERE id = %L',
        p_table_name, p_record_id
    ) INTO v_record_before;
    
    -- Create update SQL
    v_sql := format('
        UPDATE %I
        SET %I = %L,
            updated_at = now()
        WHERE id = %L',
        p_table_name, p_field_name, p_value, p_record_id);
    
    -- Execute update
    BEGIN
        EXECUTE v_sql;
        
        -- Get record after update
        EXECUTE format('
            SELECT to_jsonb(t)
            FROM %I t
            WHERE id = %L',
            p_table_name, p_record_id
        ) INTO v_record_after;
        
        RETURN format('Update successful!
SQL: %s
Before: %s
After: %s', v_sql, v_record_before::text, v_record_after::text);
    EXCEPTION WHEN OTHERS THEN
        RETURN format('Update failed: %s
SQL: %s
Record before: %s', SQLERRM, v_sql, v_record_before::text);
    END;
END;
$$ LANGUAGE plpgsql;

-- Retrieve the most recent debug logs
CREATE OR REPLACE FUNCTION get_recent_debug_logs(limit_count INT DEFAULT 100)
RETURNS TABLE (
    id INT,
    timestamps TIMESTAMP WITH TIME ZONE,
    flow_id UUID,
    queue_id UUID,
    record_id UUID,
    step TEXT,
    message TEXT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.timestamps, d.flow_id, d.queue_id, d.record_id, d.step, d.message, d.details
    FROM debug_logs d
    ORDER BY d.timestamp DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;



SELECT test_direct_update(
    'leads', -- your table name
    '41f87df9-71d1-4b99-b379-d19c4ed5c542', -- your record ID
    'company', -- field to update
    'test_value_123' -- new value
);


SELECT create_test_flow(
    'leads', -- table name
    'status', -- condition field 
    'Qualified', -- condition value
    'company', -- update field
    'debug_value_456' -- update value
);


SELECT test_flow_directly(
    'flow-id-from-step-2', -- replace with the ID returned above
    '41f87df9-71d1-4b99-b379-d19c4ed5c542' -- your record ID
);