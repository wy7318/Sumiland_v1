import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, X, AlertCircle, Search, Building2, User, Mail, Phone,
  Calendar, DollarSign, Percent, Package, Plus, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';

type FormData = {
  name: string;
  account_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  stage: string;
  amount: string;
  probability: string;
  expected_close_date: string;
  lead_source: string;
  type: string;
  description: string;
  status: string;
  organization_id: string;
  products: {
    product_id: string | null;
    product_name?: string;
    quantity: number;
    unit_price: number;
    status: string;
    notes?: string;
  }[];
};

type Account = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
};

type Contact = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
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

const initialFormData: FormData = {
  name: '',
  account_id: null,
  contact_id: null,
  owner_id: null,
  stage: '',
  amount: '0',
  probability: '0',
  expected_close_date: '',
  lead_source: '',
  type: '',
  description: '',
  status: '',
  organization_id: '',
  products: []
};

export function OpportunityForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Search states
  const [accountSearch, setAccountSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  // Picklist states
  const [opportunityStages, setOpportunityStages] = useState<PicklistValue[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<PicklistValue[]>([]);
  const [opportunityStatuses, setOpportunityStatuses] = useState<PicklistValue[]>([]);
  const [productStatuses, setProductStatuses] = useState<PicklistValue[]>([]);
  const [leadSources, setLeadSources] = useState<PicklistValue[]>([]);

  // Refs for dropdowns
  const accountSearchRef = useRef<HTMLDivElement>(null);
  const contactSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchOpportunity();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: organizations[0].id
      }));
    }

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (accountSearchRef.current && !accountSearchRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (contactSearchRef.current && !contactSearchRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id, organizations]);

  useEffect(() => {
    if (accountSearch) {
      const searchTerm = accountSearch.toLowerCase();
      const filtered = accounts.filter(account => 
        account.name.toLowerCase().includes(searchTerm) ||
        account.email?.toLowerCase().includes(searchTerm) ||
        account.contact_person?.toLowerCase().includes(searchTerm)
      );
      setFilteredAccounts(filtered);
    } else {
      setFilteredAccounts([]);
    }
  }, [accountSearch, accounts]);

  useEffect(() => {
    if (contactSearch) {
      const searchTerm = contactSearch.toLowerCase();
      const filtered = contacts.filter(contact => 
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm)
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts([]);
    }
  }, [contactSearch, contacts]);

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

  const fetchPicklists = async () => {
    try {
      // Fetch opportunity stages
      const { data: stageData, error: stageError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_stage')
        .eq('is_active', true)
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
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setOpportunityTypes(typeData || []);

      // Fetch opportunity statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_status')
        .eq('is_active', true)
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
        .order('display_order', { ascending: true });

      if (productStatusError) throw productStatusError;
      setProductStatuses(productStatusData || []);

      // Fetch lead sources
      const { data: sourceData, error: sourceError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'lead_source')
        .eq('is_active', true)
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
          account:vendors(
            id,
            name,
            type,
            email,
            phone,
            contact_person
          ),
          contact:customers(
            customer_id,
            first_name,
            last_name,
            email,
            phone,
            company
          ),
          products:opportunity_products(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (opportunity) {
        setFormData({
          name: opportunity.name,
          account_id: opportunity.account_id,
          contact_id: opportunity.contact_id,
          owner_id: opportunity.owner_id,
          stage: opportunity.stage,
          amount: opportunity.amount.toString(),
          probability: opportunity.probability.toString(),
          expected_close_date: opportunity.expected_close_date || '',
          lead_source: opportunity.lead_source || '',
          type: opportunity.type || '',
          description: opportunity.description || '',
          status: opportunity.status,
          organization_id: opportunity.organization_id,
          products: opportunity.products.map(p => ({
            product_id: p.product_id,
            quantity: p.quantity,
            unit_price: p.unit_price,
            status: p.status,
            notes: p.notes || ''
          }))
        });

        if (opportunity.account) {
          setSelectedAccount(opportunity.account);
        }
        if (opportunity.contact) {
          setSelectedContact(opportunity.contact);
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

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts');
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setFormData(prev => ({ ...prev, account_id: account.id }));
    setAccountSearch('');
    setShowAccountDropdown(false);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData(prev => ({ ...prev, contact_id: contact.customer_id }));
    setContactSearch('');
    setShowContactDropdown(false);
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
                status: productStatuses[0]?.value || 'pending'
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
            status: productStatuses[0]?.value || 'pending'
          }
        ]
      }));
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setSelectedProductIndex(null);
  };

  const updateProduct = (index: number, field: keyof FormData['products'][0], value: any) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      const total = calculateTotal();
      const opportunityData = {
        ...formData,
        amount: parseFloat(formData.amount) || total,
        probability: parseInt(formData.probability) || 0,
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {id ? 'Edit Opportunity' : 'Create New Opportunity'}
        </h1>
        <button
          onClick={() => navigate('/admin/opportunities')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stage *
            </label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            >
              <option value="">Select Stage</option>
              {opportunityStages.map(stage => (
                <option key={stage.id} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div ref={accountSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            {selectedAccount ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium">{selectedAccount.name}</p>
                    <p className="text-sm text-gray-500">Type: {selectedAccount.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccount(null);
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
                  value={accountSearch}
                  onChange={(e) => {
                    setAccountSearch(e.target.value);
                    setShowAccountDropdown(true);
                    if (!accounts.length) {
                      fetchAccounts();
                    }
                  }}
                  onFocus={() => {
                    setShowAccountDropdown(true);
                    if (!accounts.length) {
                      fetchAccounts();
                    }
                  }}
                  placeholder="Search accounts..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

            <AnimatePresence>
              {showAccountDropdown && accountSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                >
                  {filteredAccounts.length > 0 ? (
                    <ul className="py-1 max-h-60 overflow-auto">
                      {filteredAccounts.map(account => (
                        <li
                          key={account.id}
                          onClick={() => handleAccountSelect(account)}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">{account.name}</div>
                          <div className="text-sm text-gray-500">
                            Type: {account.type}
                          </div>
                          {account.contact_person && (
                            <div className="text-sm text-gray-500">
                              Contact: {account.contact_person}
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

          <div ref={contactSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact
            </label>
            {selectedContact ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium">
                      {selectedContact.first_name} {selectedContact.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedContact.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    setFormData(prev => ({ ...prev, contact_id: null }));
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
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setShowContactDropdown(true);
                    if (!contacts.length) {
                      fetchContacts();
                    }
                  }}
                  onFocus={() => {
                    setShowContactDropdown(true);
                    if (!contacts.length) {
                      fetchContacts();
                    }
                  }}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

            <AnimatePresence>
              {showContactDropdown && contactSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                >
                  {filteredContacts.length > 0 ? (
                    <ul className="py-1 max-h-60 overflow-auto">
                      {filteredContacts.map(contact => (
                        <li
                          key={contact.customer_id}
                          onClick={() => handleContactSelect(contact)}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {contact.email}
                          </div>
                          {contact.company && (
                            <div className="text-sm text-gray-500">
                              {contact.company}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Probability (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expecte d Close Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lead Source
            </label>
            <select
              value={formData.lead_source}
              onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="">Select Source</option>
              {leadSources.map(source => (
                <option key={source.id} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="">Select Type</option>
              {opportunityTypes.map(type => (
                <option key={type.id} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Products</h2>
            <div ref={productSearchRef} className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedProductIndex === null ? '' : productSearch}
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
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
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              Price: ${product.price.toFixed(2)}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500">
                                {product.description}
                              </div>
                            )}
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
            {formData.products.map((product, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="font-medium">{product.product_name}</span>
                    </div>
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
                </div>

                <div className="mt-4">
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

                <div className="mt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Subtotal:</span>
                    <span className="ml-2 font-medium">
                      ${(product.quantity * product.unit_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <span className="text-lg font-medium">Total:</span>
              <span className="ml-2 text-xl font-bold">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <CustomFieldsForm
          entityType="opportunity"
          entityId={id}
          organizationId={formData.organization_id}
          onChange={(values) => setCustomFields(values)}
          className="border-t border-gray-200 pt-6"
        />

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/opportunities')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Opportunity'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}