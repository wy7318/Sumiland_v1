import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, AlertCircle, Search, User, Mail, Phone, Building2, Check, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { CustomFieldsForm } from './CustomFieldsForm';
import { useOrganization } from '../../contexts/OrganizationContext';
import { UserSearch } from './UserSearch'; // Import UserSearch component
import { Loader } from '@googlemaps/js-api-loader';


type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
};

type ParentVendor = {
  id: string;
  name: string;
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

type FormData = {
  name: string;
  type: string;
  customer_id: string | null;
  status: string;
  payment_terms: string;
  notes: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  use_shipping_for_billing: boolean;
  organization_id: string;
  custom_fields?: Record<string, any>;
  // New fields
  owner_id: string | null;
  parent_id: string | null;
  annual_revenue: number | null;
  website: string;
};

const initialFormData: FormData = {
  name: '',
  type: '',
  customer_id: null,
  status: '',
  payment_terms: '',
  notes: '',
  shipping_address_line1: '',
  shipping_address_line2: '',
  shipping_city: '',
  shipping_state: '',
  shipping_country: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_state: '',
  billing_country: '',
  use_shipping_for_billing: false,
  organization_id: '',
  // New fields initialized
  owner_id: null,
  parent_id: null,
  annual_revenue: null,
  website: ''
};

export function VendorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [accountTypes, setAccountTypes] = useState<PicklistValue[]>([]);
  const [accountStatuses, setAccountStatuses] = useState<PicklistValue[]>([]);

  // New states for parent vendor
  const [parentVendors, setParentVendors] = useState<ParentVendor[]>([]);
  const [parentVendorSearch, setParentVendorSearch] = useState('');
  const [filteredParentVendors, setFilteredParentVendors] = useState<ParentVendor[]>([]);
  const [showParentVendorDropdown, setShowParentVendorDropdown] = useState(false);
  const [selectedParentVendor, setSelectedParentVendor] = useState<ParentVendor | null>(null);

  const customerSearchRef = useRef<HTMLDivElement>(null);
  const parentVendorSearchRef = useRef<HTMLDivElement>(null);

  // References for Google Maps Places Autocomplete
  const shippingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const billingAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchVendor();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization?.id
      }));
    }

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (parentVendorSearchRef.current && !parentVendorSearchRef.current.contains(event.target as Node)) {
        setShowParentVendorDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id, selectedOrganization]);

  // Load Google Maps API
  useEffect(() => {
    // Initialize Google Maps with the Loader
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["places"]
    });

    loader.load().then(() => {
      const shippingInput = document.getElementById('shipping-address-line1') as HTMLInputElement;
      const billingInput = document.getElementById('billing-address-line1') as HTMLInputElement;

      if (shippingInput) {
        shippingAutocompleteRef.current = new google.maps.places.Autocomplete(shippingInput, {
          types: ['address'],
          fields: ['address_components', 'formatted_address']
        });

        shippingAutocompleteRef.current.addListener('place_changed', () => {
          const place = shippingAutocompleteRef.current?.getPlace();
          if (place?.address_components) {
            updateAddressFromPlace(place, 'shipping');
          }
        });
      }

      if (billingInput && !formData.use_shipping_for_billing) {
        billingAutocompleteRef.current = new google.maps.places.Autocomplete(billingInput, {
          types: ['address'],
          fields: ['address_components', 'formatted_address']
        });

        billingAutocompleteRef.current.addListener('place_changed', () => {
          const place = billingAutocompleteRef.current?.getPlace();
          if (place?.address_components) {
            updateAddressFromPlace(place, 'billing');
          }
        });
      }
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });
  }, [formData.use_shipping_for_billing]);

  // Function to extract address components from Google Maps
  const updateAddressFromPlace = (place: google.maps.places.PlaceResult, type: 'shipping' | 'billing') => {
    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let country = '';

    place.address_components?.forEach(component => {
      const type = component.types[0];
      switch (type) {
        case 'street_number':
          streetNumber = component.long_name;
          break;
        case 'route':
          route = component.long_name;
          break;
        case 'locality':
          city = component.long_name;
          break;
        case 'administrative_area_level_1':
          state = component.short_name;
          break;
        case 'postal_code':
          zipCode = component.long_name;
          break;
        case 'country':
          country = component.long_name;
          break;
      }
    });

    setFormData(prev => ({
      ...prev,
      [`${type}_address_line1`]: `${streetNumber} ${route}`.trim(),
      [`${type}_city`]: city,
      [`${type}_state`]: state,
      [`${type}_country`]: country
    }));
  };

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

  // Filter parent vendors based on search
  useEffect(() => {
    if (parentVendorSearch) {
      const searchTerm = parentVendorSearch.toLowerCase();
      const filtered = parentVendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm)
      );
      setFilteredParentVendors(filtered);
    } else {
      setFilteredParentVendors([]);
    }
  }, [parentVendorSearch, parentVendors]);

  const fetchPicklists = async () => {
    try {
      // Fetch account types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'account_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (typeError) throw typeError;
      setAccountTypes(typeData || []);

      // If no account is being edited, set default type
      if (!id && typeData) {
        const defaultType = typeData.find(t => t.is_default)?.value || typeData[0]?.value;
        if (defaultType) {
          setFormData(prev => ({ ...prev, type: defaultType }));
        }
      }

      // Fetch account statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'account_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (statusError) throw statusError;
      setAccountStatuses(statusData || []);

      // If no account is being edited, set default status
      if (!id && statusData) {
        const defaultStatus = statusData.find(s => s.is_default)?.value || statusData[0]?.value;
        if (defaultStatus) {
          setFormData(prev => ({ ...prev, status: defaultStatus }));
        }
      }
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchVendor = async () => {
    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select(`
          *,
          customer:customers!vendors_customer_id_fkey(
            first_name,
            last_name,
            email,
            phone,
            company
          )
        `)
        .eq('id', id)
        .eq('organization_id', selectedOrganization?.id)
        .single();
      
      // Second query: Get the parent vendor in a separate query if needed
      let parentVendor = null;
      if (vendor && vendor.parent_id) {
        const { data: parent, error: parentError } = await supabase
          .from('vendors')
          .select('id, name')
          .eq('id', vendor.parent_id)
          .single();

        if (!parentError) {
          parentVendor = parent;
        }
      }

      if (error) throw error;
      if (vendor) {
        setFormData({
          name: vendor.name,
          type: vendor.type || '',
          customer_id: vendor.customer_id,
          status: vendor.status,
          payment_terms: vendor.payment_terms || '',
          notes: vendor.notes || '',
          shipping_address_line1: vendor.shipping_address_line1 || '',
          shipping_address_line2: vendor.shipping_address_line2 || '',
          shipping_city: vendor.shipping_city || '',
          shipping_state: vendor.shipping_state || '',
          shipping_country: vendor.shipping_country || '',
          billing_address_line1: vendor.billing_address_line1 || '',
          billing_address_line2: vendor.billing_address_line2 || '',
          billing_city: vendor.billing_city || '',
          billing_state: vendor.billing_state || '',
          billing_country: vendor.billing_country || '',
          use_shipping_for_billing: vendor.use_shipping_for_billing || false,
          organization_id: vendor.organization_id,
          // New fields
          owner_id: vendor.owner_id || null,
          parent_id: vendor.parent_id || null,
          annual_revenue: vendor.annual_revenue || null,
          website: vendor.website || ''
        });
        if (vendor.customer) {
          setSelectedCustomer(vendor.customer);
        }
        if (parentVendor) {
          setSelectedParentVendor(parentVendor);
        }
      }

      // Fetch parent vendors for dropdown (excluding current vendor)
      fetchParentVendors();
    } catch (err) {
      console.error('Error fetching account:', err);
      setError('Failed to load account or you do not have access');
      navigate('/admin/vendors');
    }
  };

  const fetchParentVendors = async () => {
    try {
      let query = supabase
        .from('vendors')
        .select('id, name')
        .eq('organization_id', selectedOrganization?.id)
        .order('name');

      // Exclude current vendor from the list
      if (id) {
        query = query.neq('id', id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setParentVendors(data || []);
    } catch (err) {
      console.error('Error fetching parent vendors:', err);
      setError('Failed to load potential parent accounts');
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

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({ ...prev, customer_id: customer.customer_id }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const handleParentVendorSelect = (vendor: ParentVendor) => {
    setSelectedParentVendor(vendor);
    setFormData(prev => ({ ...prev, parent_id: vendor.id }));
    setParentVendorSearch('');
    setShowParentVendorDropdown(false);
  };

  const handleUseShippingForBilling = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      use_shipping_for_billing: checked,
      ...(checked ? {
        billing_address_line1: prev.shipping_address_line1,
        billing_address_line2: prev.shipping_address_line2,
        billing_city: prev.shipping_city,
        billing_state: prev.shipping_state,
        billing_country: prev.shipping_country
      } : {})
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Account name is required');
      return false;
    }

    if (!formData.type) {
      setError('Account type is required');
      return false;
    }

    if (!formData.organization_id) {
      setError('Organization is required');
      return false;
    }

    // Validate website format if provided
    if (formData.website && !isValidUrl(formData.website)) {
      setError('Please enter a valid website URL');
      return false;
    }

    return true;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      // Check if string is empty
      if (!url.trim()) return true;

      // Add protocol if missing
      const urlWithProtocol = url.match(/^(http|https):\/\//) ? url : `https://${url}`;
      new URL(urlWithProtocol);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      let vendorId = id;

      // Remove custom_fields from the payload
      const { custom_fields, ...vendorData } = formData;

      if (id) {
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            ...vendorData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('organization_id', formData.organization_id);

        if (updateError) throw updateError;
      } else {
        const { data: newVendor, error: insertError } = await supabase
          .from('vendors')
          .insert([{
            ...vendorData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        vendorId = newVendor.id;
      }

      // Save custom field values
      if (custom_fields && vendorId && user) {
        for (const [fieldId, value] of Object.entries(custom_fields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: formData.organization_id,
              entity_id: vendorId,
              field_id: fieldId,
              value,
              created_by: user.id,
              updated_by: user.id,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'organization_id,field_id,entity_id',
            });

          if (valueError) {
            console.error('Error saving custom field value:', valueError);
          }
        }
      }

      navigate('/admin/vendors');
    } catch (err) {
      console.error('Error saving vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = accountStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get style for type badge
  const getTypeStyle = (type: string) => {
    const typeValue = accountTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage accounts.
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
          {id ? 'Edit Account' : 'Add New Account'}
        </h1>
        <button
          onClick={() => navigate('/admin/vendors')}
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
              Account Name *
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
              Organization
            </label>
            <select
              value={formData.organization_id}
              onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            >
              <option value="">Select Organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* New Owner Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Owner
            </label>
            <UserSearch
              organizationId={selectedOrganization?.id}
              selectedUserId={formData.owner_id}
              onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
            />
          </div>

          {/* New Parent Account Field */}
          <div ref={parentVendorSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Account
            </label>
            {selectedParentVendor ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">{selectedParentVendor.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedParentVendor(null);
                    setFormData(prev => ({ ...prev, parent_id: null }));
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
                  value={parentVendorSearch}
                  onChange={(e) => {
                    setParentVendorSearch(e.target.value);
                    setShowParentVendorDropdown(true);
                    if (!parentVendors.length) {
                      fetchParentVendors();
                    }
                  }}
                  onFocus={() => {
                    setShowParentVendorDropdown(true);
                    if (!parentVendors.length) {
                      fetchParentVendors();
                    }
                  }}
                  placeholder="Search parent accounts..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

            <AnimatePresence>
              {showParentVendorDropdown && parentVendorSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                >
                  {filteredParentVendors.length > 0 ? (
                    <ul className="py-1 max-h-60 overflow-auto">
                      {filteredParentVendors.map(vendor => (
                        <li
                          key={vendor.id}
                          onClick={() => handleParentVendorSelect(vendor)}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">{vendor.name}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-gray-500">
                      No matching accounts found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              style={getTypeStyle(formData.type)}
              required
            >
              <option value="">Select Type</option>
              {accountTypes.map(type => (
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
              style={getStatusStyle(formData.status)}
              required
            >
              <option value="">Select Status</option>
              {accountStatuses.map(status => (
                <option key={status.id} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* New Annual Revenue Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Revenue
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.annual_revenue || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                annual_revenue: e.target.value ? parseFloat(e.target.value) : null
              }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              placeholder="0.00"
            />
          </div>

          {/* New Website Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                placeholder="www.example.com"
              />
            </div>
          </div>

          <div ref={customerSearchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Information
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setFormData(prev => ({ ...prev, customer_id: null }));
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
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            )}

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
                      No customers found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Terms
            </label>
            <input
              type="text"
              value={formData.payment_terms}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              placeholder="e.g., Net 30"
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="shipping-address-line1"
                type="text"
                value={formData.shipping_address_line1}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
                placeholder="Type to search for an address"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.shipping_address_line2}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.shipping_city}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_city: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.shipping_state}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_state: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.shipping_country}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_country: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Billing Address</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.use_shipping_for_billing}
                onChange={(e) => handleUseShippingForBilling(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Same as shipping</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                id="billing-address-line1"
                type="text"
                value={formData.billing_address_line1}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line1: e.target.value }))}
                disabled={formData.use_shipping_for_billing}
                placeholder={!formData.use_shipping_for_billing ? "Type to search for an address" : undefined}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.billing_address_line2}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_address_line2: e.target.value }))}
                disabled={formData.use_shipping_for_billing}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.billing_city}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                disabled={formData.use_shipping_for_billing}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.billing_state}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
                disabled={formData.use_shipping_for_billing}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.billing_country}
                onChange={(e) => setFormData(prev => ({ ...prev, billing_country: e.target.value }))}
                disabled={formData.use_shipping_for_billing}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        {/* Custom Fields */}
        <CustomFieldsForm
          entityType="vendors"
          entityId={id}
          organizationId={selectedOrganization?.id}
          onChange={(customFieldValues) => {
            setFormData(prev => ({
              ...prev,
              custom_fields: customFieldValues
            }));
          }}
          className="border-t border-gray-200 pt-6"
        />

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/vendors')}
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
            {loading ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}