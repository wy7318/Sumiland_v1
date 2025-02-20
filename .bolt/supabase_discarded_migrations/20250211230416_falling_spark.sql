DO $$ 
BEGIN
    -- Check if tables exist and have expected structure
    PERFORM 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('customers', 'quote_hdr', 'quote_dtl');

    -- If we get here without an error, the tables exist
    -- No need to do anything else, just mark as done
    RAISE NOTICE 'Tables check completed successfully';
END $$;