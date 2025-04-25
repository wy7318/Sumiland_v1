

-- Create locations table
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT,
    address TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    organization_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index on organization_id for locations
CREATE INDEX locations_organization_id_idx ON locations (organization_id);

-- Create inventories table (stock levels)
CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    current_stock NUMERIC NOT NULL DEFAULT 0,
    committed_stock NUMERIC DEFAULT 0,
    shelf_location TEXT,
    last_count_date TIMESTAMP WITH TIME ZONE,
    status TEXT,
    metadata JSONB,
    organization_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    -- Ensure product+location combination is unique per organization
    UNIQUE (product_id, location_id, organization_id)
);

-- Create indexes for inventories
CREATE INDEX inventories_product_id_idx ON inventories (product_id);
CREATE INDEX inventories_location_id_idx ON inventories (location_id);
CREATE INDEX inventories_organization_id_idx ON inventories (organization_id);

-- Create inventory_transactions table
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    transaction_type TEXT,
    quantity NUMERIC NOT NULL,
    unit_cost NUMERIC,
    total_cost NUMERIC,
    reference_id TEXT, -- PO/SO/Transfer number
    reference_type TEXT, -- PO/SO/Transfer
    notes TEXT,
    metadata JSONB,
    -- For transfers between locations
    source_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    organization_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for inventory_transactions
CREATE INDEX inventory_transactions_product_id_idx ON inventory_transactions (product_id);
CREATE INDEX inventory_transactions_location_id_idx ON inventory_transactions (location_id);
CREATE INDEX inventory_transactions_organization_id_idx ON inventory_transactions (organization_id);
CREATE INDEX inventory_transactions_reference_id_idx ON inventory_transactions (reference_id);
CREATE INDEX inventory_transactions_created_at_idx ON inventory_transactions (created_at);


-- Create triggers for updated_at timestamp
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventories_updated_at
BEFORE UPDATE ON inventories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for available stock (current - committed)
CREATE OR REPLACE VIEW available_inventory AS
SELECT 
    i.id,
    i.product_id,
    p.name AS product_name,
    p.sku,
    i.location_id,
    l.name AS location_name,
    i.current_stock,
    i.committed_stock,
    (i.current_stock - i.committed_stock) AS available_stock,
    p.avg_cost,
    (i.current_stock * p.avg_cost) AS inventory_value,
    i.organization_id,
    p.stock_unit
FROM 
    inventories i
    JOIN products p ON i.product_id = p.id
    JOIN locations l ON i.location_id = l.id;

-- RLS Policies for multi-tenant security
-- Locations RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations are viewable by organization members only" 
    ON locations FOR SELECT
    USING (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Locations are insertable by organization members only" 
    ON locations FOR INSERT
    WITH CHECK (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Locations are updatable by organization members only" 
    ON locations FOR UPDATE
    USING (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Inventories RLS
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventories are viewable by organization members only" 
    ON inventories FOR SELECT
    USING (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Inventories are insertable by organization members only" 
    ON inventories FOR INSERT
    WITH CHECK (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Inventories are updatable by organization members only" 
    ON inventories FOR UPDATE
    USING (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

-- Inventory Transactions RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory transactions are viewable by organization members only" 
    ON inventory_transactions FOR SELECT
    USING (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));

CREATE POLICY "Inventory transactions are insertable by organization members only" 
    ON inventory_transactions FOR INSERT
    WITH CHECK (organization_id = auth.uid() OR organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ));


-- inventory functions
-- Function to receive inventory (purchase)
CREATE OR REPLACE FUNCTION receive_inventory(
    p_product_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_unit_cost NUMERIC,
    p_reference_id TEXT,
    p_reference_type TEXT DEFAULT 'purchase',
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_current_stock NUMERIC;
    v_current_avg_cost NUMERIC;
    v_transaction_id UUID;
    v_inventory_id UUID;
    v_new_avg_cost NUMERIC;
BEGIN
    -- Get organization ID from the product
    SELECT organization_id INTO v_organization_id
    FROM products
    WHERE id = p_product_id;
    
    -- Check if organization ID exists
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Get or create inventory record
    SELECT id, current_stock INTO v_inventory_id, v_current_stock
    FROM inventories
    WHERE product_id = p_product_id AND location_id = p_location_id AND organization_id = v_organization_id;
    
    IF v_inventory_id IS NULL THEN
        -- Create new inventory record if it doesn't exist
        INSERT INTO inventories (
            product_id,
            location_id,
            current_stock,
            organization_id,
            created_by
        ) VALUES (
            p_product_id,
            p_location_id,
            p_quantity,
            v_organization_id,
            auth.uid()
        )
        RETURNING id, current_stock INTO v_inventory_id, v_current_stock;
    ELSE
        -- Update existing inventory record
        UPDATE inventories
        SET 
            current_stock = current_stock + p_quantity,
            updated_by = auth.uid()
        WHERE id = v_inventory_id
        RETURNING current_stock INTO v_current_stock;
    END IF;
    
    -- Create transaction record
    INSERT INTO inventory_transactions (
        product_id,
        location_id,
        transaction_type,
        quantity,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        metadata,
        organization_id,
        created_by
    ) VALUES (
        p_product_id,
        p_location_id,
        'purchase',
        p_quantity,
        p_unit_cost,
        p_quantity * p_unit_cost,
        p_reference_id,
        p_reference_type,
        p_notes,
        p_metadata,
        v_organization_id,
        auth.uid()
    )
    RETURNING id INTO v_transaction_id;
    
    -- Calculate new weighted average cost
    SELECT avg_cost INTO v_current_avg_cost
    FROM products
    WHERE id = p_product_id;
    
    IF v_current_avg_cost IS NULL OR v_current_avg_cost = 0 THEN
        v_new_avg_cost := p_unit_cost;
    ELSE
        -- Calculate based on existing stock and new purchase
        -- Formula: (CurrentStock * CurrentAvgCost + NewQuantity * NewCost) / (CurrentStock + NewQuantity)
        -- Note: CurrentStock here is before adding new quantity
        v_new_avg_cost := ((v_current_stock - p_quantity) * v_current_avg_cost + p_quantity * p_unit_cost) / v_current_stock;
    END IF;
    
    -- Update product with new average cost and last purchase cost
    UPDATE products
    SET 
        avg_cost = v_new_avg_cost,
        last_purchase_cost = p_unit_cost,
        updated_by = auth.uid()
    WHERE id = p_product_id;
    
    RETURN v_transaction_id;
END;
$$;

-- Function to process sales
CREATE OR REPLACE FUNCTION process_sale(
    p_product_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_reference_id TEXT,
    p_reference_type TEXT DEFAULT 'sale',
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_current_stock NUMERIC;
    v_avg_cost NUMERIC;
    v_transaction_id UUID;
    v_inventory_id UUID;
BEGIN
    -- Get organization ID and average cost from the product
    SELECT organization_id, avg_cost INTO v_organization_id, v_avg_cost
    FROM products
    WHERE id = p_product_id;
    
    -- Check if organization ID exists
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Get inventory record
    SELECT id, current_stock INTO v_inventory_id, v_current_stock
    FROM inventories
    WHERE product_id = p_product_id AND location_id = p_location_id AND organization_id = v_organization_id;
    
    IF v_inventory_id IS NULL THEN
        RAISE EXCEPTION 'No inventory record found for this product at this location';
    END IF;
    
    -- Check if we have enough stock
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_stock, p_quantity;
    END IF;
    
    -- Update inventory record
    UPDATE inventories
    SET 
        current_stock = current_stock - p_quantity,
        updated_by = auth.uid()
    WHERE id = v_inventory_id;
    
    -- Create transaction record
    INSERT INTO inventory_transactions (
        product_id,
        location_id,
        transaction_type,
        quantity,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        metadata,
        organization_id,
        created_by
    ) VALUES (
        p_product_id,
        p_location_id,
        'sale',
        -p_quantity,  -- Negative quantity for sales
        v_avg_cost,
        -p_quantity * v_avg_cost, -- Negative total cost for sales
        p_reference_id,
        p_reference_type,
        p_notes,
        p_metadata,
        v_organization_id,
        auth.uid()
    )
    RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$;

-- Function to reserve inventory (commit stock)
CREATE OR REPLACE FUNCTION reserve_inventory(
    p_product_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_reference_id TEXT,
    p_reference_type TEXT DEFAULT 'reservation',
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_inventory_id UUID;
    v_current_stock NUMERIC;
    v_committed_stock NUMERIC;
    v_available_stock NUMERIC;
BEGIN
    -- Get organization ID from the product
    SELECT organization_id INTO v_organization_id
    FROM products
    WHERE id = p_product_id;
    
    -- Check if organization ID exists
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Get inventory record
    SELECT id, current_stock, committed_stock 
    INTO v_inventory_id, v_current_stock, v_committed_stock
    FROM inventories
    WHERE product_id = p_product_id AND location_id = p_location_id AND organization_id = v_organization_id;
    
    IF v_inventory_id IS NULL THEN
        RAISE EXCEPTION 'No inventory record found for this product at this location';
    END IF;
    
    -- Calculate available stock
    v_available_stock := v_current_stock - v_committed_stock;
    
    -- Check if we have enough available stock
    IF v_available_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient available stock. Available: %, Requested: %', v_available_stock, p_quantity;
    END IF;
    
    -- Update committed stock
    UPDATE inventories
    SET 
        committed_stock = committed_stock + p_quantity,
        updated_by = auth.uid()
    WHERE id = v_inventory_id;
    
    -- Create a transaction record for the reservation
    INSERT INTO inventory_transactions (
        product_id,
        location_id,
        transaction_type,
        quantity,
        reference_id,
        reference_type,
        notes,
        organization_id,
        created_by
    ) VALUES (
        p_product_id,
        p_location_id,
        'adjustment',
        0,  -- No change to actual stock
        p_reference_id,
        p_reference_type,
        p_notes || ' (Reserved ' || p_quantity || ' units)',
        v_organization_id,
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$;

-- Function to release reserved inventory
CREATE OR REPLACE FUNCTION release_reservation(
    p_product_id UUID,
    p_location_id UUID,
    p_quantity NUMERIC,
    p_reference_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_inventory_id UUID;
    v_committed_stock NUMERIC;
BEGIN
    -- Get organization ID from the product
    SELECT organization_id INTO v_organization_id
    FROM products
    WHERE id = p_product_id;
    
    -- Check if organization ID exists
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Get inventory record
    SELECT id, committed_stock INTO v_inventory_id, v_committed_stock
    FROM inventories
    WHERE product_id = p_product_id AND location_id = p_location_id AND organization_id = v_organization_id;
    
    IF v_inventory_id IS NULL THEN
        RAISE EXCEPTION 'No inventory record found for this product at this location';
    END IF;
    
    -- Check if there's enough committed stock to release
    IF v_committed_stock < p_quantity THEN
        RAISE EXCEPTION 'Attempting to release more than committed. Committed: %, Requested: %', v_committed_stock, p_quantity;
    END IF;
    
    -- Update committed stock
    UPDATE inventories
    SET 
        committed_stock = committed_stock - p_quantity,
        updated_by = auth.uid()
    WHERE id = v_inventory_id;
    
    -- Create a transaction record for the release
    INSERT INTO inventory_transactions (
        product_id,
        location_id,
        transaction_type,
        quantity,
        reference_id,
        reference_type,
        notes,
        organization_id,
        created_by
    ) VALUES (
        p_product_id,
        p_location_id,
        'adjustment',
        0,  -- No change to actual stock
        p_reference_id,
        'reservation_release',
        p_notes || ' (Released ' || p_quantity || ' units from reservation)',
        v_organization_id,
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$;

-- Function to transfer inventory between locations
CREATE OR REPLACE FUNCTION transfer_inventory(
    p_product_id UUID,
    p_source_location_id UUID,
    p_destination_location_id UUID,
    p_quantity NUMERIC,
    p_reference_id TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organization_id UUID;
    v_source_inventory_id UUID;
    v_dest_inventory_id UUID;
    v_current_stock NUMERIC;
    v_avg_cost NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Get organization ID and average cost from the product
    SELECT organization_id, avg_cost INTO v_organization_id, v_avg_cost
    FROM products
    WHERE id = p_product_id;
    
    -- Check if organization ID exists
    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Check if source and destination are different
    IF p_source_location_id = p_destination_location_id THEN
        RAISE EXCEPTION 'Source and destination locations must be different';
    END IF;
    
    -- Get source inventory record
    SELECT id, current_stock INTO v_source_inventory_id, v_current_stock
    FROM inventories
    WHERE product_id = p_product_id AND location_id = p_source_location_id AND organization_id = v_organization_id;
    
    IF v_source_inventory_id IS NULL THEN
        RAISE EXCEPTION 'No inventory record found for this product at the source location';
    END IF;
    
    -- Check if we have enough stock at source
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock at source location. Available: %, Requested: %', v_current_stock, p_quantity;
    END IF;
    
    -- Get or create destination inventory record
    SELECT id INTO v_dest_inventory_id
    FROM inventories
    WHERE product_id = p_product_id AND location_id = p_destination_location_id AND organization_id = v_organization_id;
    
    IF v_dest_inventory_id IS NULL THEN
        -- Create new inventory record if it doesn't exist
        INSERT INTO inventories (
            product_id,
            location_id,
            current_stock,
            organization_id,
            created_by
        ) VALUES (
            p_product_id,
            p_destination_location_id,
            p_quantity,
            v_organization_id,
            auth.uid()
        )
        RETURNING id INTO v_dest_inventory_id;
    ELSE
        -- Update existing destination inventory
        UPDATE inventories
        SET 
            current_stock = current_stock + p_quantity,
            updated_by = auth.uid()
        WHERE id = v_dest_inventory_id;
    END IF;
    
    -- Update source inventory
    UPDATE inventories
    SET 
        current_stock = current_stock - p_quantity,
        updated_by = auth.uid()
    WHERE id = v_source_inventory_id;
    
    -- Create transaction record
    INSERT INTO inventory_transactions (
        product_id,
        location_id,
        transaction_type,
        quantity,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        source_location_id,
        destination_location_id,
        organization_id,
        created_by
    ) VALUES (
        p_product_id,
        p_source_location_id,
        'transfer_out',
        -p_quantity,  -- Negative for source
        v_avg_cost,
        -p_quantity * v_avg_cost,
        p_reference_id,
        'transfer',
        p_notes,
        p_source_location_id,
        p_destination_location_id,
        v_organization_id,
        auth.uid()
    )
    RETURNING id INTO v_transaction_id;
    
    -- Create corresponding transfer_in transaction
    INSERT INTO inventory_transactions (
        product_id,
        location_id,
        transaction_type,
        quantity,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        source_location_id,
        destination_location_id,
        organization_id,
        created_by
    ) VALUES (
        p_product_id,
        p_destination_location_id,
        'transfer_in',
        p_quantity,  -- Positive for destination
        v_avg_cost,
        p_quantity * v_avg_cost,
        p_reference_id,
        'transfer',
        p_notes,
        p_source_location_id,
        p_destination_location_id,
        v_organization_id,
        auth.uid()
    );
    
    RETURN v_transaction_id;
END;
$$;


-- First drop the existing constraint
ALTER TABLE locations DROP CONSTRAINT locations_organization_id_fkey;

-- Then add the correct constraint
ALTER TABLE locations ADD CONSTRAINT locations_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

SELECT organization_id 
    FROM products



-- Drop the existing constraint
ALTER TABLE inventories DROP CONSTRAINT inventories_organization_id_fkey;

-- Add the correct constraint (assuming you have an organizations table)
ALTER TABLE inventories ADD CONSTRAINT inventories_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Also fix the same issue on inventory_transactions table if needed
ALTER TABLE inventory_transactions DROP CONSTRAINT inventory_transactions_organization_id_fkey;
ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;



