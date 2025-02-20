DO $$ 
BEGIN
    -- Check and create RLS policies if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' 
        AND policyname = 'Customers viewable by authenticated users'
    ) THEN
        CREATE POLICY "Customers viewable by authenticated users"
            ON customers FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' 
        AND policyname = 'Customers modifiable by authenticated users'
    ) THEN
        CREATE POLICY "Customers modifiable by authenticated users"
            ON customers FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quote_hdr' 
        AND policyname = 'Quotes viewable by creator'
    ) THEN
        CREATE POLICY "Quotes viewable by creator"
            ON quote_hdr FOR SELECT
            TO authenticated
            USING (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quote_hdr' 
        AND policyname = 'Quotes modifiable by creator'
    ) THEN
        CREATE POLICY "Quotes modifiable by creator"
            ON quote_hdr FOR ALL
            TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quote_dtl' 
        AND policyname = 'Quote details viewable by quote creator'
    ) THEN
        CREATE POLICY "Quote details viewable by quote creator"
            ON quote_dtl FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM quote_hdr
                    WHERE quote_hdr.quote_id = quote_dtl.quote_id
                    AND quote_hdr.created_by = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quote_dtl' 
        AND policyname = 'Quote details modifiable by quote creator'
    ) THEN
        CREATE POLICY "Quote details modifiable by quote creator"
            ON quote_dtl FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM quote_hdr
                    WHERE quote_hdr.quote_id = quote_dtl.quote_id
                    AND quote_hdr.created_by = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM quote_hdr
                    WHERE quote_hdr.quote_id = quote_dtl.quote_id
                    AND quote_hdr.created_by = auth.uid()
                )
            );
    END IF;

    -- Ensure RLS is enabled
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quote_hdr ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quote_dtl ENABLE ROW LEVEL SECURITY;

END $$;