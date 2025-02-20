DO $$ 
BEGIN
    -- Check if tables exist first
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
        CREATE TABLE customers (
            customer_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            first_name      VARCHAR(50) NOT NULL,
            last_name       VARCHAR(50) NOT NULL,
            email           VARCHAR(100) UNIQUE NOT NULL,
            phone           VARCHAR(20) UNIQUE,
            address_line1   VARCHAR(255) NOT NULL,
            address_line2   VARCHAR(255),
            city            VARCHAR(100) NOT NULL,
            state           VARCHAR(50) NOT NULL,
            zip_code        VARCHAR(20) NOT NULL,
            country         VARCHAR(50) NOT NULL,
            created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_hdr') THEN
        CREATE TABLE quote_hdr (
            quote_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_number    VARCHAR(20) UNIQUE NOT NULL,
            customer_id     uuid NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
            quote_date      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            status          VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
            total_amount    DECIMAL(10,2) DEFAULT 0.00,
            currency        VARCHAR(10) DEFAULT 'USD',
            notes           TEXT,
            created_by      uuid REFERENCES auth.users(id),
            created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_dtl') THEN
        CREATE TABLE quote_dtl (
            quote_dtl_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_id        uuid NOT NULL REFERENCES quote_hdr(quote_id) ON DELETE CASCADE,
            item_name       VARCHAR(100) NOT NULL,
            item_desc       TEXT,
            quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            unit_price      DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
            line_total      DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
            created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    -- Create triggers if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_customers_timestamp') THEN
        CREATE TRIGGER set_customers_timestamp
            BEFORE UPDATE ON customers
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_quote_hdr_timestamp') THEN
        CREATE TRIGGER set_quote_hdr_timestamp
            BEFORE UPDATE ON quote_hdr
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_quote_dtl_timestamp') THEN
        CREATE TRIGGER set_quote_dtl_timestamp
            BEFORE UPDATE ON quote_dtl
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'generate_quote_number') THEN
        CREATE TRIGGER generate_quote_number
            BEFORE INSERT ON quote_hdr
            FOR EACH ROW
            EXECUTE FUNCTION set_quote_number();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_total') THEN
        CREATE TRIGGER update_quote_total
            AFTER INSERT OR UPDATE OR DELETE ON quote_dtl
            FOR EACH ROW
            EXECUTE FUNCTION update_quote_total();
    END IF;

    -- Enable RLS
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quote_hdr ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quote_dtl ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers viewable by authenticated users') THEN
        CREATE POLICY "Customers viewable by authenticated users"
            ON customers FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Customers modifiable by authenticated users') THEN
        CREATE POLICY "Customers modifiable by authenticated users"
            ON customers FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Quotes viewable by creator') THEN
        CREATE POLICY "Quotes viewable by creator"
            ON quote_hdr FOR SELECT
            TO authenticated
            USING (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Quotes modifiable by creator') THEN
        CREATE POLICY "Quotes modifiable by creator"
            ON quote_hdr FOR ALL
            TO authenticated
            USING (created_by = auth.uid())
            WITH CHECK (created_by = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Quote details viewable by quote creator') THEN
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

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Quote details modifiable by quote creator') THEN
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

END $$;