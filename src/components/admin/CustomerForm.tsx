import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, AlertCircle, Mail, Phone, Building2, User, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';

type CustomerFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  company: string;
  vendor_id: string | null;
  organization_id?: string;
  lead_id?: string | null;
};

const initialFormData: CustomerFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  company: '',
  vendor_id: null,
  organization_id: '',
  lead_id: null
};

type Vendor = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { selectedOrganization } = useOrganization();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  
  // Search states
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  
  const vendorSearchRef = useRef<HTMLDivElement>(null);

  // Get lead data from navigation state if available
  const leadData = location.state?.leadData;

  useEffect(() => {
    if (leadData) {
      // Pre-fill form with lead data
      setFormData(prev => ({
        ...prev,
        first_name: leadData.first_name,
        last_name: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone || '',
        company: leadData.company || '',
        lead_id: leadData.lead_id,
        organization_id: selectedOrganization?.id || ''
      }));
    } else if (id) {
      fetchCustomer();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization?.id
      }));
    }
  }, [id, selectedOrganization, leadData]);

  useEffect(() => {
    if (vendorSearch) {
      const searchTerm = vendorSearch.toLowerCase();
      const filtered = vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm) ||
        vendor.type.toLowerCase().includes(searchTerm)
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors([]);
    }
  }, [vendorSearch, vendors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vendorSearchRef.current && !vendorSearchRef.current.contains(event.target as Node)) {
        setShowVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, type, status')
        .eq('status', 'active')
        .eq('organization_id', selectedOrganization?.id)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Failed to load vendors');
    }
  };

  const fetchCustomer = async () => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select(`
          *,
          vendor:vendors!customers_vendor_id_fkey(
            id,
            name,
            type,
            status
          )
        `)
        .eq('customer_id', id)
        .eq('organization_id', selectedOrganization?.id)
        .single();

      if (error) throw error;
      if (customer) {
        setFormData({
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email,
          phone: customer.phone || '',
          address_line1: customer.address_line1 || '',
          address_line2: customer.address_line2 || '',
          city: customer.city || '',
          state: customer.state || '',
          zip_code: customer.zip_code || '',
          country: customer.country || '',
          company: customer.company || '',
          vendor_id: customer.vendor_id,
          organization_id: selectedOrganization?.id,
          lead_id: customer.lead_id
        });
        if (customer.vendor) {
          setSelectedVendor(customer.vendor);
        }

        const { data: customFieldValues, error: customFieldsError } = await supabase
          .from('custom_field_values')
          .select('field_id, value')
          .eq('organization_id', selectedOrganization?.id)
          .eq('entity_id', id);

        if (customFieldsError) throw customFieldsError;

        const customFieldsData = customFieldValues?.reduce((acc, field) => {
          acc[field.field_id] = field.value;
          return acc;
        }, {} as Record<string, any>) || {};

        setCustomFields(customFieldsData);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError('Failed to load customer');
      navigate('/admin/customers');
    }
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData(prev => ({ ...prev, vendor_id: vendor.id }));
    setVendorSearch('');
    setShowVendorDropdown(false);
  };

  const validateForm = (): boolean => {
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return false;
    }

    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      setError('Invalid email address');
      return false;
    }

    if (formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      setError('Invalid phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      let customerId = id;

      // Add lead_id to the data if converting from lead
      const customerData = {
        ...formData,
        lead_id: leadData?.lead_id || null
      };

      if (id) {
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('customer_id', id);

        if (updateError) throw updateError;
      } else {
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (insertError) throw insertError;
        customerId = newCustomer.customer_id;

        // If converting from lead, update lead status
        if (leadData?.lead_id) {
          const { error: leadUpdateError } = await supabase
            .from('leads')
            .update({
              // status: 'Converted',
              is_converted: true,
              converted_at: new Date().toISOString(),
              converted_by: user?.id
            })
            .eq('id', leadData.lead_id);

          if (leadUpdateError) throw leadUpdateError;
        }
      }

      // Save custom field values
      if (customerId && user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: formData.organization_id,
              entity_id: customerId,
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

      navigate('/admin/customers');
    } catch (err) {
      console.error('Error saving customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  if (selectedOrganization.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage customers.
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
          {id ? 'Edit Customer' : 'Add New Customer'}
        </h1>
        <button
          onClick={() => navigate('/admin/customers')}
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
              First Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          <div ref={vendorSearchRef} className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account
            </label>
            {selectedVendor ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium">{selectedVendor.name}</p>
                    <p className="text-sm text-gray-500">Type: {selectedVendor.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendor(null);
                    setFormData(prev => ({ ...prev, vendor_id: null }));
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
              </div>
            )}

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
                          <div className="text-sm text-gray-500">
                            Type: {vendor.type}
                          </div>
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

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              value={formData.address_line1}
              onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address_line2}
              onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>

        <CustomFieldsForm
          entityType="customer"
          entityId={id}
          organizationId={selectedOrganization?.id}
          onChange={(values) => setCustomFields(values)}
          className="border-t border-gray-200 pt-6"
        />

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
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
            {loading ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}