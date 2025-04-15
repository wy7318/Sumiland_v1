import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, X, AlertCircle, Mail, Phone, Building2, User, Search, Calendar, Users,
  ArrowLeft, Edit, UserCheck, MapPin, Bookmark, FileText, MessageSquare, Briefcase,
  Globe, CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { UserSearch } from './UserSearch';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';
import { DateTime } from 'luxon'; // Import Luxon for timezone handling

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
  owner_id?: string | null;
  birthdate?: string | null;
  gender?: string | null;
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
  lead_id: null,
  owner_id: null,
  birthdate: '',
  gender: '',
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
  const [activeTab, setActiveTab] = useState('details');
  const [orgTimezone, setOrgTimezone] = useState('UTC');

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
      // Format birthdate from lead data if it exists
      let formattedBirthdate = null;
      if (leadData.birthdate) {
        // Parse the date and format it to yyyy-MM-dd
        const birthdateObj = new Date(leadData.birthdate);
        formattedBirthdate = birthdateObj.toISOString().split('T')[0]; // Gets just the date part
      }

      // Pre-fill form with lead data
      setFormData(prev => ({
        ...prev,
        first_name: leadData.first_name,
        last_name: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone || '',
        company: leadData.company || '',
        lead_id: leadData.lead_id,
        owner_id: leadData.owner_id,
        birthdate: formattedBirthdate,
        gender: leadData.gender,
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

  // Fetch organization timezone
  useEffect(() => {
    const fetchTimezone = async () => {
      if (!selectedOrganization?.id) return;

      const { data, error } = await supabase
        .from('organizations')
        .select('timezone')
        .eq('id', selectedOrganization.id)
        .single();

      if (error) {
        console.error('Failed to fetch org timezone:', error);
        return;
      }

      if (data?.timezone) {
        setOrgTimezone(data.timezone);
        console.log('CustomerForm - Using timezone:', data.timezone);
      }
    };

    fetchTimezone();
  }, [selectedOrganization]);

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
        // Format birthdate to yyyy-MM-dd if it exists
        let formattedBirthdate = null;
        if (customer.birthdate) {
          // Parse the date using Luxon with the organization timezone
          // This ensures we correctly represent the date that was stored in UTC
          const birthdateInOrgTz = DateTime.fromISO(customer.birthdate, { zone: orgTimezone });

          // Format to YYYY-MM-DD for the date input
          formattedBirthdate = birthdateInOrgTz.toFormat('yyyy-MM-dd');
        }

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
          lead_id: customer.lead_id,
          owner_id: customer.owner_id,
          birthdate: formattedBirthdate,
          gender: customer.gender
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

    // Validate birthdate is in correct format if provided
    // This should be handled automatically by the date input now, but keeping as a safeguard
    if (formData.birthdate && typeof formData.birthdate === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthdate)) {
      setError('Invalid birthdate format. Use YYYY-MM-DD');
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

      // Handle birthdate with timezone
      let formattedBirthdate = null;
      if (formData.birthdate) {
        // Create a DateTime object in the org timezone at the start of the day
        const birthdateInOrgTz = DateTime.fromISO(`${formData.birthdate}T00:00:00`, { zone: orgTimezone });

        // Convert to UTC for storage (ensures consistent date regardless of time component)
        formattedBirthdate = birthdateInOrgTz.toUTC().toISO();
      }

      // Add lead_id to the data if converting from lead
      const customerData = {
        ...formData,
        lead_id: leadData?.lead_id || null,
        // Use the timezone-adjusted birthdate
        birthdate: formattedBirthdate
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
              status: 'Converted',
              is_converted: true,
              conversion_type: 'contact',
              converted_to_id: customerId,
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

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage customers.
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate('/admin/customers')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Customers</span>
            </button>

            {/* Right buttons group */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/admin/customers')}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-cyan-600 hover:bg-cyan-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>

          {/* Card Header with Title and Status */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              {error && (
                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {error}
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-cyan-100 rounded-full p-2.5">
                    <User className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none w-full px-0 py-1"
                        placeholder="First Name"
                        required
                      />
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none w-full px-0 py-1"
                        placeholder="Last Name"
                        required
                      />
                    </div>
                    <div className="flex items-center mt-1.5 space-x-3">
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="text-sm text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none w-full px-0 py-0.5"
                        placeholder="Company (optional)"
                      />
                      <span className="text-gray-500 text-sm">
                        Organization:
                        <select
                          value={formData.organization_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
                          className="ml-2 px-2 py-0 text-sm border-0 bg-transparent focus:ring-0 outline-none"
                          required
                        >
                          <option value="">Select</option>
                          {organizations.map(org => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </button>
                  <button
                    type="button"
                    disabled
                    className="py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 border-transparent text-gray-400 cursor-not-allowed"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Related
                  </button>
                  <button
                    type="button"
                    disabled
                    className="py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 border-transparent text-gray-400 cursor-not-allowed"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comments
                  </button>
                </nav>
              </div>

              {/* Details Tab Content */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-8">
                    {/* Contact Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-cyan-500 mr-2" />
                        Contact Information
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-2 py-1 text-cyan-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            placeholder="Email address"
                            required
                          />
                        </div>

                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-400 mr-3" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-2 py-1 text-cyan-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            placeholder="Phone number"
                          />
                        </div>

                        {/* Gender */}
                        <div className="flex items-center">
                          <Users className="w-5 h-5 text-gray-400 mr-3" />
                          <div className="text-gray-700 w-full">
                            <select
                              value={formData.gender || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                              className="w-full px-2 py-1 text-gray-700 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Non-Binary">Non-Binary</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          </div>
                        </div>

                        {/* Birthdate */}
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                          <input
                            type="date"
                            value={formData.birthdate || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, birthdate: e.target.value }))}
                            className="w-full px-2 py-1 text-gray-700 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Owner Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-cyan-500 mr-2" />
                        Owner Information
                      </h2>
                      <UserSearch
                        organizationId={selectedOrganization?.id}
                        selectedUserId={formData.owner_id}
                        onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Account Information */}
                    <div ref={vendorSearchRef} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-cyan-500 mr-2" />
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
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                          />
                        </div>
                      )}

                      <AnimatePresence>
                        {showVendorDropdown && vendorSearch && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-10 w-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
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

                    {/* Address */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <MapPin className="w-5 h-5 text-cyan-500 mr-2" />
                        Address
                      </h2>
                      <div className="pl-2 border-l-2 border-cyan-100 py-1 space-y-3">
                        <input
                          type="text"
                          value={formData.address_line1}
                          onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                          className="w-full px-2 py-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                          placeholder="Address Line 1"
                        />

                        <input
                          type="text"
                          value={formData.address_line2}
                          onChange={(e) => setFormData(prev => ({ ...prev, address_line2: e.target.value }))}
                          className="w-full px-2 py-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                          placeholder="Address Line 2"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full px-2 py-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            placeholder="City"
                          />

                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                            className="w-full px-2 py-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            placeholder="State"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={formData.zip_code}
                            onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                            className="w-full px-2 py-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            placeholder="ZIP Code"
                          />

                          <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                            className="w-full px-2 py-1 text-gray-600 bg-transparent border-b border-gray-300 focus:border-cyan-500 focus:ring-0 outline-none"
                            placeholder="Country"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Fields - Full Width */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-cyan-500 mr-2" />
                      Custom Fields
                    </h2>
                    <CustomFieldsForm
                      entityType="customers"
                      entityId={id}
                      organizationId={selectedOrganization?.id}
                      onChange={(values) => setCustomFields(values)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}