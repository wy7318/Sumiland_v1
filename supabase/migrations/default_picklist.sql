-- Function to insert default portfolio_category values
CREATE OR REPLACE FUNCTION insert_default_portfolio_category(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'portfolio_category', 'Product', 'Product', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'portfolio_category', 'Service', 'Service', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'portfolio_category', 'Project', 'Project', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF3E0', '#EF6C00'),
    (org_id, 'portfolio_category', 'Solution', 'Solution', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'portfolio_category', 'Investment', 'Investment', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default case_type values
CREATE OR REPLACE FUNCTION insert_default_case_type(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'case_type', 'TechnicalSupport', 'Technical Support', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8EAF6', '#3F51B5'),
    (org_id, 'case_type', 'BillingInquiry', 'Billing Inquiry', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'case_type', 'FeatureRequest', 'Feature Request', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F2F1', '#00796B'),
    (org_id, 'case_type', 'ProductDefect', 'Product Defect', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'case_type', 'GeneralQuestion', 'General Question', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#6A1B9A'),
    (org_id, 'case_type', 'Complaint', 'Complaint', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FAFAFA', '#616161')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default quote_status values
CREATE OR REPLACE FUNCTION insert_default_quote_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'quote_status', 'Draft', 'Draft', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'quote_status', 'Sent', 'Sent', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'quote_status', 'UnderReview', 'Under Review', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'quote_status', 'Accepted', 'Accepted', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'quote_status', 'Rejected', 'Rejected', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'quote_status', 'Expired', 'Expired', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FAFAFA', '#616161'),
    (org_id, 'quote_status', 'Revised', 'Revised', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default quote_approval_status values
CREATE OR REPLACE FUNCTION insert_default_quote_approval_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'quote_approval_status', 'PendingReview', 'Pending Review', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'quote_approval_status', 'Approved', 'Approved', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'quote_approval_status', 'Rejected', 'Rejected', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'quote_approval_status', 'NeedsRevision', 'Needs Revision', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'quote_approval_status', 'Escalated', 'Escalated', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default order_status values
CREATE OR REPLACE FUNCTION insert_default_order_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'order_status', 'New', 'New', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'order_status', 'Processing', 'Processing', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'order_status', 'OnHold', 'On Hold', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'order_status', 'Shipped', 'Shipped', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'order_status', 'Delivered', 'Delivered', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'order_status', 'Canceled', 'Canceled', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'order_status', 'Returned', 'Returned', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'order_status', 'Completed', 'Completed', false, true, 80, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#1B5E20')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default product_status values
CREATE OR REPLACE FUNCTION insert_default_product_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'product_status', 'Active', 'Active', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'product_status', 'Inactive', 'Inactive', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'product_status', 'Discontinued', 'Discontinued', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'product_status', 'ComingSoon', 'Coming Soon', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'product_status', 'OutOfStock', 'Out of Stock', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'product_status', 'LimitedStock', 'Limited Stock', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'product_status', 'OnBackorder', 'On Backorder', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default product_category values
CREATE OR REPLACE FUNCTION insert_default_product_category(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'product_category', 'Hardware', 'Hardware', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'product_category', 'Software', 'Software', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'product_category', 'Services', 'Services', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'product_category', 'Consumables', 'Consumables', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'product_category', 'Equipment', 'Equipment', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'product_category', 'Accessories', 'Accessories', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'product_category', 'Subscriptions', 'Subscriptions', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default product_stock_unit values
CREATE OR REPLACE FUNCTION insert_default_product_stock_unit(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'product_stock_unit', 'Each', 'Each', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'product_stock_unit', 'Dozen', 'Dozen', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'product_stock_unit', 'Box', 'Box', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'product_stock_unit', 'Case', 'Case', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'product_stock_unit', 'Pallet', 'Pallet', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'product_stock_unit', 'Pack', 'Pack', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'product_stock_unit', 'Kit', 'Kit', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default product_weight_unit values
CREATE OR REPLACE FUNCTION insert_default_product_weight_unit(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'product_weight_unit', 'Gram', 'Gram (g)', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'product_weight_unit', 'Kilogram', 'Kilogram (kg)', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'product_weight_unit', 'Ounce', 'Ounce (oz)', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'product_weight_unit', 'Pound', 'Pound (lb)', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'product_weight_unit', 'Ton', 'Ton (t)', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default account_type values
CREATE OR REPLACE FUNCTION insert_default_account_type(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'account_type', 'Customer', 'Customer', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'account_type', 'Prospect', 'Prospect', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'account_type', 'Partner', 'Partner', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'account_type', 'Vendor', 'Vendor', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'account_type', 'Distributor', 'Distributor', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'account_type', 'Reseller', 'Reseller', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0'),
    (org_id, 'account_type', 'Affiliate', 'Affiliate', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default account_status values
CREATE OR REPLACE FUNCTION insert_default_account_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'account_status', 'Active', 'Active', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'account_status', 'Inactive', 'Inactive', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'account_status', 'Pending', 'Pending', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'account_status', 'Former', 'Former', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'account_status', 'AtRisk', 'At Risk', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'account_status', 'VIP', 'VIP', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default lead_source values
CREATE OR REPLACE FUNCTION insert_default_lead_source(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'lead_source', 'Website', 'Website', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'lead_source', 'Referral', 'Referral', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'lead_source', 'TradeShow', 'Trade Show', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'lead_source', 'SocialMedia', 'Social Media', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'lead_source', 'EmailCampaign', 'Email Campaign', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'lead_source', 'ColdCall', 'Cold Call', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'lead_source', 'Advertising', 'Advertising', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0'),
    (org_id, 'lead_source', 'OnlineSearch', 'Online Search', false, true, 80, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#0D47A1'),
    (org_id, 'lead_source', 'Webinar', 'Webinar', false, true, 90, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#6A1B9A'),
    (org_id, 'lead_source', 'DirectMail', 'Direct Mail', false, true, 100, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#263238')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default opportunity_stage values
CREATE OR REPLACE FUNCTION insert_default_opportunity_stage(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'opportunity_stage', 'Qualification', 'Qualification', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'opportunity_stage', 'Discovery', 'Discovery', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'opportunity_stage', 'Proposal', 'Proposal', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'opportunity_stage', 'Negotiation', 'Negotiation', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0'),
    (org_id, 'opportunity_stage', 'Closing', 'Closing', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'opportunity_stage', 'Won', 'Won', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'opportunity_stage', 'Lost', 'Lost', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default opportunity_status values
CREATE OR REPLACE FUNCTION insert_default_opportunity_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'opportunity_status', 'Open', 'Open', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'opportunity_status', 'Working', 'Working', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'opportunity_status', 'Stalled', 'Stalled', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64'),
    (org_id, 'opportunity_status', 'ClosedWon', 'Closed Won', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'opportunity_status', 'ClosedLost', 'Closed Lost', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'opportunity_status', 'Dormant', 'Dormant', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FAFAFA', '#616161'),
    (org_id, 'opportunity_status', 'Reopened', 'Reopened', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default opportunity_type values
CREATE OR REPLACE FUNCTION insert_default_opportunity_type(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'opportunity_type', 'NewBusiness', 'New Business', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'opportunity_type', 'ExistingBusiness', 'Existing Business', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'opportunity_type', 'Upgrade', 'Upgrade', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'opportunity_type', 'Renewal', 'Renewal', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'opportunity_type', 'CrossSell', 'Cross-sell', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'opportunity_type', 'Upsell', 'Upsell', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default opportunity_product_status values
CREATE OR REPLACE FUNCTION insert_default_opportunity_product_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'opportunity_product_status', 'Proposed', 'Proposed', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'opportunity_product_status', 'Quoted', 'Quoted', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'opportunity_product_status', 'Ordered', 'Ordered', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'opportunity_product_status', 'Delivered', 'Delivered', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'opportunity_product_status', 'Canceled', 'Canceled', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'opportunity_product_status', 'Returned', 'Returned', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default case_priority values
CREATE OR REPLACE FUNCTION insert_default_case_priority(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'case_priority', 'Low', 'Low', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'case_priority', 'Medium', 'Medium', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'case_priority', 'High', 'High', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#D32F2F'),
    (org_id, 'case_priority', 'Critical', 'Critical', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#B71C1C'),
    (org_id, 'case_priority', 'Urgent', 'Urgent', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default case_origin values
CREATE OR REPLACE FUNCTION insert_default_case_origin(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'case_origin', 'Email', 'Email', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'case_origin', 'Phone', 'Phone', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32'),
    (org_id, 'case_origin', 'Web', 'Web', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'case_origin', 'InPerson', 'In Person', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'case_origin', 'SocialMedia', 'Social Media', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E0F7FA', '#00838F'),
    (org_id, 'case_origin', 'Chat', 'Chat', false, true, 60, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#EDE7F6', '#4527A0'),
    (org_id, 'case_origin', 'MobileApp', 'Mobile App', false, true, 70, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#ECEFF1', '#455A64')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;

-- Function to insert default case_status values (already exists in your example)
CREATE OR REPLACE FUNCTION insert_default_case_status(org_id uuid) 
RETURNS void AS $$
BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'case_status', 'New', 'New', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'case_status', 'Escalated', 'Escalated', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'case_status', 'InProgress', 'In Progress', false, true, 15, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'case_status', 'OnHold', 'On Hold', false, true, 25, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'case_status', 'Closed', 'Closed', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;
$$ LANGUAGE plpgsql;


BEGIN
  -- Insert default Lead Status values if they don't exist
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by)
  VALUES
    (org_id, 'lead_status', 'New', 'New', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'In_Progress', 'In Progress', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'Qualified', 'Qualified', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'Converted', 'Converted', false, true, 40, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1)),
    (org_id, 'lead_status', 'Lost', 'Lost', false, true, 50, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1))
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    -- Only update non-protected fields
    label = CASE 
      WHEN is_protected_picklist_value(EXCLUDED.type, EXCLUDED.value) THEN picklist_values.label 
      ELSE EXCLUDED.label 
    END,
    display_order = EXCLUDED.display_order;
END;




BEGIN
  INSERT INTO picklist_values 
    (organization_id, type, value, label, is_default, is_active, display_order, created_by, color, text_color)
  VALUES
    (org_id, 'case_status', 'New', 'New', true, true, 10, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E3F2FD', '#1976D2'),
    (org_id, 'case_status', 'Escalated', 'Escalated', false, true, 20, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFEBEE', '#C62828'),
    (org_id, 'case_status', 'InProgress', 'In Progress', false, true, 15, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#FFF8E1', '#FFA000'),
    (org_id, 'case_status', 'OnHold', 'On Hold', false, true, 25, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#F3E5F5', '#7B1FA2'),
    (org_id, 'case_status', 'Closed', 'Closed', false, true, 30, 
      (SELECT id FROM profiles WHERE is_super_admin = true LIMIT 1), '#E8F5E9', '#2E7D32')
  ON CONFLICT (organization_id, type, value) 
  DO UPDATE SET
    label = EXCLUDED.label,
    display_order = EXCLUDED.display_order,
    color = EXCLUDED.color,
    text_color = EXCLUDED.text_color;
END;


-- trigger when creating new org
create_default_picklists_for_org
