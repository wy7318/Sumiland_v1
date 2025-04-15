import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, X, Plus, Trash2, Search, Building2, Package, Scale,
  AlertCircle, Calendar, DollarSign, User, Mail, Phone, Percent,
  ArrowLeft, FileText, UserCheck, Clock, LinkIcon, Globe, Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { CustomFieldsForm } from './CustomFieldsForm';
import { UserSearch } from './UserSearch';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';

type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
};

type Vendor = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
};

type Opportunity = {
  id: string;
  name: string;
  stage: string;
  status: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_unit: 'weight' | 'quantity';
  weight_unit: string | null;
};

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type OpportunityProduct = {
  product_id: string | null;
  product_name?: string;
  quantity: number;
  unit_price: number;
  status: string;
  notes?: string;
};

type FormData = {
  name: string;
  account_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  stage: string;
  amount: string;
  probability: string;
  expected_close_date: string;
  close_date: string;
  competitor: string;
  parent_id: string | null;
  lead_source: string;
  type: string;
  description: string;
  status: string;
  lead_id: string | null;
  organization_id: string;
  products: OpportunityProduct[];
  custom_fields?: Record<string, any>;
};

const initialFormData: FormData = {
  name: '',
  account_id: null,
  contact_id: null,
  owner_id: null,
  stage: '',
  amount: '0',
  probability: '0',
  expected_close_date: '',
  close_date: '',
  competitor: '',
  parent_id: null,
  lead_source: '',
  type: '',
  description: '',
  status: '',
  lead_id: null,
  organization_id: '',
  products: []
};

export function OpportunityForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const location = useLocation();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [activeTab, setActiveTab] = useState('details');

  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showOpportunityDropdown, setShowOpportunityDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedParentOpportunity, setSelectedParentOpportunity] = useState<Opportunity | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [opportunityStages, setOpportunityStages] = useState<PicklistValue[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<PicklistValue[]>([]);
  const [opportunityStatuses, setOpportunityStatuses] = useState<PicklistValue[]>([]);
  const [productStatuses, setProductStatuses] = useState<PicklistValue[]>([]);
  const [leadSources, setLeadSources] = useState<PicklistValue[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const customerSearchRef = useRef<HTMLDivElement>(null);
  const vendorSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const opportunitySearchRef = useRef<HTMLDivElement>(null);

  // Get lead data from navigation state if available
  const leadData = location.state?.leadData;

  useEffect(() => {
    fetchPicklists();
    if (leadData) {
      // Pre-fill form with lead data
      setFormData(prev => ({
        ...prev,
        name: leadData.name,
        contact_id: leadData.contact_id,
        lead_id: leadData.lead_id,
        lead_source: leadData.lead_source,
        description: leadData.description,
        organization_id: leadData.organization_id,
        owner_id: leadData.owner_id
      }));
    } else if (id) {
      fetchOpportunity();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization?.id
      }));
    }
  }, [id, selectedOrganization, leadData]);

  useEffect(() => {
    if (customerSearch) {
      const searchTerm = customerSearch.toLowerCase();
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(searchTerm) ||
        customer.last_name.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm) ||
        customer.company?.toLowerCase().includes(searchTerm)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  useEffect(() => {
    if (vendorSearch) {
      const searchTerm = vendorSearch.toLowerCase();
      const filtered = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm) ||
        vendor.email?.toLowerCase().includes(searchTerm) ||
        vendor.contact_person?.toLowerCase().includes(searchTerm)
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors([]);
    }
  }, [vendorSearch, vendors]);

  useEffect(() => {
    if (productSearch) {
      const searchTerm = productSearch.toLowerCase();
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearch, products]);

  useEffect(() => {
    if (opportunitySearch) {
      const searchTerm = opportunitySearch.toLowerCase();
      const filtered = opportunities.filter(opportunity =>
        opportunity.name.toLowerCase().includes(searchTerm) &&
        opportunity.id !== id
      );
      setFilteredOpportunities(filtered);
    } else {
      setFilteredOpportunities([]);
    }
  }, [opportunitySearch, opportunities, id]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (opportunitySearchRef.current && !opportunitySearchRef.current.contains(event.target as Node)) {
        setShowOpportunityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPicklists = async () => {
    try {
      // Fetch opportunity stages
      const { data: stageData, error: stageError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_stage')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (stageError) throw stageError;
      setOpportunityStages(stageData || []);

      // If no opportunity is being edited, set default stage
      if (!id && stageData) {
        const defaultStage = stageData.find(s => s.is_default)?.value || stageData[0]?.value;
        if (defaultStage) {
          setFormData(prev => ({ ...prev, stage: defaultStage }));
        }
      }

      // Fetch opportunity types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setOpportunityTypes(typeData || []);

      // Fetch opportunity statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setOpportunityStatuses(statusData || []);

      // If no opportunity is being edited, set default status
      if (!id && statusData) {
        const defaultStatus = statusData.find(s => s.is_default)?.value || statusData[0]?.value;
        if (defaultStatus) {
          setFormData(prev => ({ ...prev, status: defaultStatus }));
        }
      }

      // Fetch product statuses
      const { data: productStatusData, error: productStatusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_product_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (productStatusError) throw productStatusError;
      setProductStatuses(productStatusData || []);

      // Fetch lead sources
      const { data: sourceData, error: sourceError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'lead_source')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (sourceError) throw sourceError;
      setLeadSources(sourceData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOpportunity = async () => {
    try {
      const { data: opportunity, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          account:vendors(*),
          contact:customers(*),
          products:opportunity_products(*, product:products(id, name))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (opportunity) {
        // Format the date fields properly for the form
        let formattedCloseDate = '';
        if (opportunity.close_date) {
          // Parse the datetime and format as YYYY-MM-DD for the date input
          try {
            const dateObj = new Date(opportunity.close_date);
            formattedCloseDate = dateObj.toISOString().split('T')[0];
          } catch (e) {
            console.error('Error parsing close_date:', e);
          }
        }

        setFormData({
          name: opportunity.name,
          account_id: opportunity.account_id,
          contact_id: opportunity.contact_id,
          owner_id: opportunity.owner_id || null,
          stage: opportunity.stage,
          amount: opportunity.amount.toString(),
          probability: opportunity.probability.toString(),
          expected_close_date: opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toISOString().split('T')[0] : '',
          close_date: formattedCloseDate,
          competitor: opportunity.competitor || '',
          parent_id: opportunity.parent_id,
          lead_source: opportunity.lead_source || '',
          type: opportunity.type || '',
          description: opportunity.description || '',
          status: opportunity.status,
          lead_id: opportunity.lead_id,
          organization_id: opportunity.organization_id,
          products: opportunity.products.map((p: any) => ({
            product_id: p.product_id,
            product_name: p.product?.name,
            quantity: p.quantity,
            unit_price: p.unit_price,
            status: p.status,
            notes: p.notes || '' // Convert null notes to empty string
          }))
        });

        setCreatedAt(opportunity.created_at);

        if (opportunity.account) {
          setSelectedVendor(opportunity.account);
        }
        if (opportunity.contact) {
          setSelectedCustomer(opportunity.contact);
        }

        // Fetch parent opportunity if it exists
        if (opportunity.parent_id) {
          const { data: parentOpportunity, error: parentError } = await supabase
            .from('opportunities')
            .select('id, name, stage, status')
            .eq('id', opportunity.parent_id)
            .single();

          if (!parentError && parentOpportunity) {
            setSelectedParentOpportunity(parentOpportunity);
          }
        }

        // Fetch custom fields
        const { data: customFieldValues, error: customFieldsError } = await supabase
          .from('custom_field_values')
          .select('field_id, value')
          .eq('entity_id', id);

        if (customFieldsError) throw customFieldsError;

        const customFieldsData = customFieldValues?.reduce((acc, field) => {
          acc[field.field_id] = field.value;
          return acc;
        }, {} as Record<string, any>) || {};

        setCustomFields(customFieldsData);
      }
    } catch (err) {
      console.error('Error fetching opportunity:', err);
      setError('Failed to load opportunity');
      navigate('/admin/opportunities');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors');
    }
  };

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, name, stage, status')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError('Failed to load opportunities');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, contact_id: customer.customer_id }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData(prev => ({ ...prev, account_id: vendor.id }));
    setVendorSearch('');
    setShowVendorDropdown(false);
  };

  const handleOpportunitySelect = (opportunity: Opportunity) => {
    setSelectedParentOpportunity(opportunity);
    setFormData(prev => ({ ...prev, parent_id: opportunity.id }));
    setOpportunitySearch('');
    setShowOpportunityDropdown(false);
  };

  const handleProductSelect = (product: Product) => {
    if (selectedProductIndex !== null) {
      // Update existing product
      setFormData(prev => ({
        ...prev,
        products: prev.products.map((item, index) =>
          index === selectedProductIndex
            ? {
              product_id: product.id,
              product_name: product.name,
              quantity: 1,
              unit_price: product.price,
              status: productStatuses[0]?.value || 'pending',
              notes: '' // Initialize notes as empty string
            }
            : item
        )
      }));
    } else {
      // Add new product
      setFormData(prev => ({
        ...prev,
        products: [
          ...prev.products,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            status: productStatuses[0]?.value || 'pending',
            notes: '' // Initialize notes as empty string
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const updateProduct = (index: number, field: keyof OpportunityProduct, value: any) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.products.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  // Get style for stage badge
  const getStageStyle = (stage: string) => {
    const stageValue = opportunityStages.find(s => s.value === stage);
    if (!stageValue?.color) return {};
    return {
      backgroundColor: stageValue.color,
      color: stageValue.text_color || '#FFFFFF'
    };
  };

  // Get stage label
  const getStageLabel = (stage: string) => {
    return opportunityStages.find(s => s.value === stage)?.label || stage;
  };

  // Get style for type badge
  const getTypeStyle = (type: string | null) => {
    if (!type) return {};
    const typeValue = opportunityTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  // Get type label
  const getTypeLabel = (type: string | null) => {
    if (!type) return '';
    return opportunityTypes.find(t => t.value === type)?.label || type;
  };

  // Get current stage index for the progress bar
  const getCurrentStageIndex = () => {
    if (!formData.stage || !opportunityStages.length) return -1;
    return opportunityStages.findIndex(stage =>
      stage.value.toLowerCase() === formData.stage.toLowerCase()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const total = calculateTotal();

      // Format dates for database submission
      let closeDateForDb = null;
      if (formData.close_date) {
        // Add time component to make it a valid datetime
        closeDateForDb = new Date(`${formData.close_date}T00:00:00.000Z`).toISOString();
      }

      const opportunityData = {
        ...formData,
        amount: parseFloat(formData.amount) || total,
        probability: parseInt(formData.probability) || 0,
        close_date: closeDateForDb,
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      };

      // Remove products from the opportunity data
      const { products, ...opportunityDataWithoutProducts } = opportunityData;

      let opportunityId = id;

      if (id) {
        // Update existing opportunity
        const { error: updateError } = await supabase
          .from('opportunities')
          .update(opportunityDataWithoutProducts)
          .eq('id', id);

        if (updateError) throw updateError;

        // Delete existing products
        const { error: deleteError } = await supabase
          .from('opportunity_products')
          .delete()
          .eq('opportunity_id', id);

        if (deleteError) throw deleteError;
      } else {
        // Create new opportunity
        const { data: newOpportunity, error: insertError } = await supabase
          .from('opportunities')
          .insert([{
            ...opportunityDataWithoutProducts,
            created_by: user?.id,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        opportunityId = newOpportunity.id;
      }

      // If converting from lead, update lead status and conversion details
      if (leadData?.lead_id) {
        const { error: leadUpdateError } = await supabase
          .from('leads')
          .update({
            status: 'Converted',
            is_converted: true,
            conversion_type: 'opportunity',
            converted_to_id: opportunityId,
            converted_at: new Date().toISOString(),
            converted_by: user?.id
          })
          .eq('id', leadData.lead_id);

        if (leadUpdateError) throw leadUpdateError;
      }

      // Insert products
      if (formData.products.length > 0) {
        const { error: productsError } = await supabase
          .from('opportunity_products')
          .insert(
            formData.products.map(product => ({
              opportunity_id: opportunityId,
              product_id: product.product_id,
              quantity: product.quantity,
              unit_price: product.unit_price,
              subtotal: product.quantity * product.unit_price,
              status: product.status,
              notes: product.notes,
              organization_id: formData.organization_id
            }))
          );

        if (productsError) throw productsError;
      }

      // Save custom field values
      if (user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: formData.organization_id,
              entity_id: opportunityId,
              field_id: fieldId,
              value,
              created_by: user.id,
              updated_by: user.id,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,field_id,entity_id'
            });

          if (valueError) {
            console.error('Error saving custom field value:', valueError);
          }
        }
      }

      navigate('/admin/opportunities');
    } catch (err) {
      console.error('Error saving opportunity:', err);
      setError(err instanceof Error ? err.message : 'Failed to save opportunity');
    } finally {
      setLoading(false);
    }
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage opportunities.
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/opportunities')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Opportunities</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(id ? `/admin/opportunities/${id}` : '/admin/opportunities')}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Opportunity'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Card Header with Title and Value */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 rounded-full p-2.5">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full text-2xl font-bold text-gray-900 border-0 focus:ring-0 focus:outline-none bg-transparent"
                      placeholder="Opportunity Name *"
                      required
                    />
                    <div className="flex items-center mt-1.5 space-x-3">
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                        className="px-3 py-1 text-xs font-medium rounded-full border-0 bg-gray-100 focus:ring-0 focus:outline-none"
                      >
                        <option value="">Select Type</option>
                        {opportunityTypes.map(type => (
                          <option key={type.id} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500 text-sm">
                        {id ? `Created on ${new Date(createdAt || '').toLocaleDateString()}` : 'New Opportunity'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount and Probability */}
                <div className="mt-4 md:mt-0">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 text-gray-400 mr-1" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="text-2xl font-bold text-purple-700 border-0 focus:ring-0 focus:outline-none bg-transparent w-32 text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center bg-green-100 rounded-full px-3 py-1 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                        className="w-12 text-sm font-medium text-right text-green-800 border-0 focus:ring-0 focus:outline-none bg-transparent"
                      />
                      <span className="text-sm font-medium text-green-800">% Probability</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent Opportunity Section */}
              <div ref={opportunitySearchRef} className="relative mb-6">
                {selectedParentOpportunity ? (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-blue-800">Parent Opportunity</h3>
                        <div className="flex items-center mt-1">
                          <LinkIcon className="w-4 h-4 text-blue-600 mr-2" />
                          <span className="text-blue-600 font-medium">
                            {selectedParentOpportunity.name}
                          </span>
                          <span
                            className="ml-2 px-2 py-1 text-xs font-medium rounded-full"
                            style={getStageStyle(selectedParentOpportunity.stage)}
                          >
                            {getStageLabel(selectedParentOpportunity.stage)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParentOpportunity(null);
                          setFormData(prev => ({ ...prev, parent_id: null }));
                        }}
                        className="p-1 hover:bg-blue-100 rounded-full"
                      >
                        <X className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Opportunity
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={opportunitySearch}
                        onChange={(e) => {
                          setOpportunitySearch(e.target.value);
                          setShowOpportunityDropdown(true);
                          if (!opportunities.length) {
                            fetchOpportunities();
                          }
                        }}
                        onFocus={() => {
                          setShowOpportunityDropdown(true);
                          if (!opportunities.length) {
                            fetchOpportunities();
                          }
                        }}
                        placeholder="Search for parent opportunity..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>

                    <AnimatePresence>
                      {showOpportunityDropdown && opportunitySearch && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                        >
                          {filteredOpportunities.length > 0 ? (
                            <ul className="py-1 max-h-60 overflow-auto">
                              {filteredOpportunities.map(opportunity => (
                                <li
                                  key={opportunity.id}
                                  onClick={() => handleOpportunitySelect(opportunity)}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="font-medium">{opportunity.name}</div>
                                  <div className="text-sm text-gray-500">
                                    Stage: {opportunityStages.find(s => s.value === opportunity.stage)?.label || opportunity.stage}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="p-4 text-gray-500">
                              No opportunities found
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Status Bar */}
              <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                {opportunityStages.length > 0 && (
                  <div className="relative pt-2">
                    {/* Progress bar track */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      {/* Progress bar fill - width based on current status */}
                      <div
                        className="absolute top-2 left-0 h-2 bg-purple-500 rounded-full"
                        style={{
                          width: `${(getCurrentStageIndex() + 1) * 100 / opportunityStages.length}%`,
                          transition: 'width 0.3s ease-in-out'
                        }}
                      ></div>
                    </div>

                    {/* Status indicators with dots */}
                    <div className="flex justify-between mt-1">
                      {opportunityStages.map((stage, index) => {
                        // Determine if this status is active (current or passed)
                        const isActive = index <= getCurrentStageIndex();
                        // Position dots evenly
                        const position = index / (opportunityStages.length - 1) * 100;

                        return (
                          <div
                            key={stage.id}
                            className="flex flex-col items-center"
                            style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            {/* Status dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-purple-500' : 'bg-gray-300'}`}
                              style={{
                                marginTop: '-10px',
                                boxShadow: '0 0 0 2px white'
                              }}
                            ></div>

                            {/* Status label */}
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, stage: stage.value }))}
                              className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors ${isActive ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                              {stage.label}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'products'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('customFields')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'customFields'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Custom Fields
                  </button>
                </nav>
              </div>

              {/* Details Tab Content */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-8">
                    {/* Key Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <DollarSign className="w-5 h-5 text-purple-500 mr-2" />
                        Opportunity Information
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Expected Close:</span>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <input
                              type="date"
                              value={formData.expected_close_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                              className="border-0 bg-transparent focus:ring-0 pl-0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Close Date:</span>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <input
                              type="date"
                              value={formData.close_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, close_date: e.target.value }))}
                              className="border-0 bg-transparent focus:ring-0 pl-0"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Lead Source:</span>
                          <select
                            value={formData.lead_source}
                            onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
                            className="border-0 bg-transparent focus:ring-0 text-right"
                          >
                            <option value="">Select Source</option>
                            {leadSources.map(source => (
                              <option key={source.id} value={source.value}>
                                {source.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Competitor:</span>
                          <input
                            type="text"
                            value={formData.competitor}
                            onChange={(e) => setFormData(prev => ({ ...prev, competitor: e.target.value }))}
                            className="border-0 bg-transparent focus:ring-0 text-right"
                            placeholder="Enter competitor"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Status:</span>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            className="border-0 bg-transparent focus:ring-0 text-right"
                            required
                          >
                            <option value="">Select Status</option>
                            {opportunityStatuses.map(status => (
                              <option key={status.id} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Account Information */}
                    <div ref={vendorSearchRef} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-purple-500 mr-2" />
                        Account Information
                      </h2>

                      {selectedVendor ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                              <div className="font-medium">{selectedVendor.name}</div>
                              <div className="text-sm text-gray-500">
                                Type: {selectedVendor.type}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVendor(null);
                              setFormData(prev => ({ ...prev, account_id: null }));
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={vendorSearch}
                            onChange={(e) => {
                              setVendorSearch(e.target.value);
                              setShowVendorDropdown(true);
                              if (!vendors.length) {
                                fetchVendors();
                              }
                            }}
                            onFocus={() => {
                              setShowVendorDropdown(true);
                              if (!vendors.length) {
                                fetchVendors();
                              }
                            }}
                            placeholder="Search accounts..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                          />

                          <AnimatePresence>
                            {showVendorDropdown && vendorSearch && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                              >
                                {filteredVendors.length > 0 ? (
                                  <ul className="py-1 max-h-60 overflow-auto">
                                    {filteredVendors.map(vendor => (
                                      <li
                                        key={vendor.id}
                                        onClick={() => handleVendorSelect(vendor)}
                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <div className="font-medium">{vendor.name}</div>
                                        {vendor.contact_person && (
                                          <div className="text-sm text-gray-500">
                                            Contact: {vendor.contact_person}
                                          </div>
                                        )}
                                        {vendor.email && (
                                          <div className="text-sm text-gray-500">
                                            {vendor.email}
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="p-4 text-gray-500">
                                    No accounts found
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Owner Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-purple-500 mr-2" />
                        Owner Information
                      </h2>
                      <UserSearch
                        organizationId={selectedOrganization?.id}
                        selectedUserId={formData.owner_id}
                        onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Contact Information */}
                    <div ref={customerSearchRef} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-purple-500 mr-2" />
                        Contact Information
                      </h2>

                      {selectedCustomer ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <User className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="font-medium">
                                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                                </div>
                                {selectedCustomer.company && (
                                  <div className="text-sm text-gray-500">
                                    {selectedCustomer.company}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setFormData(prev => ({ ...prev, contact_id: null }));
                              }}
                              className="p-1 hover:bg-gray-100 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {selectedCustomer.email && (
                            <div className="flex items-center">
                              <Mail className="w-5 h-5 text-gray-400 mr-3" />
                              <span className="text-gray-700">
                                {selectedCustomer.email}
                              </span>
                            </div>
                          )}

                          {selectedCustomer.phone && (
                            <div className="flex items-center">
                              <Phone className="w-5 h-5 text-gray-400 mr-3" />
                              <span className="text-gray-700">
                                {selectedCustomer.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setShowCustomerDropdown(true);
                              if (!customers.length) {
                                fetchCustomers();
                              }
                            }}
                            onFocus={() => {
                              setShowCustomerDropdown(true);
                              if (!customers.length) {
                                fetchCustomers();
                              }
                            }}
                            placeholder="Search contacts..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                          />

                          <AnimatePresence>
                            {showCustomerDropdown && customerSearch && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                              >
                                {filteredCustomers.length > 0 ? (
                                  <ul className="py-1 max-h-60 overflow-auto">
                                    {filteredCustomers.map(customer => (
                                      <li
                                        key={customer.customer_id}
                                        onClick={() => handleCustomerSelect(customer)}
                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <div className="font-medium">
                                          {customer.first_name} {customer.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {customer.email}
                                        </div>
                                        {customer.company && (
                                          <div className="text-sm text-gray-500">
                                            {customer.company}
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="p-4 text-gray-500">
                                    No contacts found
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Timeline (simplified for edit form) */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Clock className="w-5 h-5 text-purple-500 mr-2" />
                        Timeline Information
                      </h2>
                      <div className="space-y-4">
                        {createdAt && (
                          <div className="flex items-start">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 mr-3">
                              <Calendar className="w-4 h-4 text-purple-700" />
                            </div>
                            <div>
                              <div className="font-medium">Created</div>
                              <div className="text-sm text-gray-500">
                                {new Date(createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="text-sm text-gray-500 italic">
                          {id ? 'Editing existing opportunity' : 'Creating new opportunity'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description - Full Width */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-purple-500 mr-2" />
                      Description
                    </h2>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="Enter opportunity description..."
                    />
                  </div>
                </div>
              )}

              {/* Products Tab Content */}
              {activeTab === 'products' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center">
                      <Package className="w-5 h-5 text-purple-500 mr-2" />
                      Products
                    </h2>
                    <div ref={productSearchRef} className="relative">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={selectedProductIndex === null ? productSearch : ''}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setShowProductDropdown(true);
                            if (!products.length) {
                              fetchProducts();
                            }
                          }}
                          onFocus={() => {
                            setShowProductDropdown(true);
                            if (!products.length) {
                              fetchProducts();
                            }
                          }}
                          placeholder="Search products..."
                          className="w-64 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductIndex(null);
                            setProductSearch('');
                            setShowProductDropdown(true);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </button>
                      </div>

                      <AnimatePresence>
                        {showProductDropdown && productSearch && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                          >
                            {filteredProducts.length > 0 ? (
                              <ul className="py-1 max-h-60 overflow-auto">
                                {filteredProducts.map(product => (
                                  <li
                                    key={product.id}
                                    onClick={() => handleProductSelect(product)}
                                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <div className="flex items-center">
                                      {product.stock_unit === 'quantity' ? (
                                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                                      ) : (
                                        <Scale className="w-4 h-4 text-gray-400 mr-2" />
                                      )}
                                      <div>
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-gray-500">
                                          Price: ${product.price.toFixed(2)} |
                                          {product.stock_unit === 'quantity' ? ' Units' : ` Weight (${product.weight_unit})`}
                                        </div>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="p-4 text-gray-500">
                                No products found
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formData.products.length === 0 ? (
                      <div className="bg-gray-50 p-8 rounded-lg text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-700 mb-1">No Products Added</h3>
                        <p className="text-gray-500 mb-4">Search and add products to this opportunity</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductIndex(null);
                            setProductSearch('');
                            setShowProductDropdown(true);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </button>
                      </div>
                    ) : (
                      formData.products.map((product, index) => (
                        <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center">
                              <Package className="w-5 h-5 text-purple-500 mr-2" />
                              <span className="font-medium">{product.product_name || 'Unknown Product'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="text-red-600 hover:text-red-700 p-1 rounded-full hover:bg-gray-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit Price
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={product.unit_price}
                                onChange={(e) => updateProduct(index, 'unit_price', parseFloat(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                              </label>
                              <select
                                value={product.status}
                                onChange={(e) => updateProduct(index, 'status', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                                required
                              >
                                <option value="">Select Status</option>
                                {productStatuses.map(status => (
                                  <option key={status.id} value={status.value}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subtotal
                              </label>
                              <div className="px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 font-medium">
                                ${(product.quantity * product.unit_price).toFixed(2)}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <textarea
                                value={product.notes}
                                onChange={(e) => updateProduct(index, 'notes', e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-700">Total:</span>
                      <span className="text-xl font-bold text-purple-700">
                        ${calculateTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Fields Tab Content */}
              {activeTab === 'customFields' && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Tag className="w-5 h-5 text-purple-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsForm
                    entityType="opportunities"
                    entityId={id}
                    organizationId={selectedOrganization?.id}
                    onChange={(values) => setCustomFields(values)}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}