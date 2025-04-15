import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, X, AlertCircle, Search, ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, FileText, Download, Clock, CheckCircle, AlertTriangle, CheckSquare,
  Briefcase, MessageSquare, UserCheck, MapPin, Bookmark, Send, Reply,
  Users, CalendarIcon, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { UserSearch } from './UserSearch';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';
import { DateTime } from 'luxon'; // Import Luxon for timezone handling

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
};

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Customer = {
  customer_id: string;
  id: string; // Some may use id instead of customer_id
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  vendor_id: string | null; // This is needed for auto-populating vendor_id
};

type FormData = {
  title: string;
  type: string;
  sub_type: string;
  status: string;
  owner_id: string | null;
  description: string;
  resume_url: string | null;
  escalated_at: string | null;
  closed_at: string | null;
  origin: string | null;
  closed_by: string | null;
  escalated_by: string | null;
  priority: string | null;
  contact_id: string | null;
  vendor_id: string | null;
  organization_id?: string;
};

const initialFormData: FormData = {
  title: '',
  type: '',
  sub_type: '',
  status: '',
  owner_id: null,
  description: '',
  resume_url: null,
  escalated_at: null,
  closed_at: null,
  origin: null,
  closed_by: null,
  escalated_by: null,
  priority: null,
  contact_id: null,
  vendor_id: null
};

export function CaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [previousStatus, setPreviousStatus] = useState<string>('');
  const [caseTypes, setCaseTypes] = useState<PicklistValue[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<PicklistValue[]>([]);
  const [casePriorities, setCasePriorities] = useState<PicklistValue[]>([]);
  const [caseOrigins, setCaseOrigins] = useState<PicklistValue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [orgTimezone, setOrgTimezone] = useState('UTC'); // Default timezone
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  // Add ref for customer search dropdown
  const customerSearchRef = useRef<HTMLDivElement>(null);

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
        console.log('CaseForm - Using timezone:', data.timezone);
      }
    };

    fetchTimezone();
  }, [selectedOrganization]);

  useEffect(() => {
    fetchPicklists();
    fetchStaff();
    if (id) {
      fetchCase();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization?.id
      }));
    }
  }, [id, orgTimezone]); // Add orgTimezone as dependency to re-fetch when it changes

  // Set the previous status when formData.status changes
  useEffect(() => {
    if (formData.status) {
      setPreviousStatus(formData.status);
    }
  }, []);

  // Handle customer search filtering
  useEffect(() => {
    if (customerSearch) {
      const filtered = customers.filter(customer =>
        customer.first_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.last_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.company?.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (formData.vendor_id) {
      fetchVendorById(formData.vendor_id);
    } else {
      setSelectedVendor(null);
    }
  }, [formData.vendor_id]);

  const fetchVendorById = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedVendor(data);
      }
    } catch (err) {
      console.error('Error fetching vendor:', err);
    }
  };

  const fetchPicklists = async () => {
    try {
      // Fetch case types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (typeError) throw typeError;
      setCaseTypes(typeData || []);

      // If no case is being edited, set default type
      if (!id && typeData) {
        const defaultType = typeData.find(t => t.is_default)?.value || typeData[0]?.value;
        if (defaultType) {
          setFormData(prev => ({ ...prev, type: defaultType }));
        }
      }

      // Fetch case statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (statusError) throw statusError;
      setCaseStatuses(statusData || []);

      // If no case is being edited, set default status
      if (!id && statusData) {
        const defaultStatus = statusData.find(s => s.is_default)?.value || statusData[0]?.value;
        if (defaultStatus) {
          setFormData(prev => ({ ...prev, status: defaultStatus }));
        }
      }

      // Fetch case priority
      const { data: priorityData, error: priorityError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_priority')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (priorityError) throw priorityError;
      setCasePriorities(priorityData || []);

      // If no case is being edited, set default status
      if (!id && priorityData) {
        const defaultPriority = priorityData.find(s => s.is_default)?.value || priorityData[0]?.value;
        if (defaultPriority) {
          setFormData(prev => ({ ...prev, priority: defaultPriority }));
        }
      }

      // Fetch case origin
      const { data: originData, error: originError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_origin')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (originError) throw originError;
      setCaseOrigins(originData || []);

      // If no case is being edited, set default status
      if (!id && originData) {
        const defaultOrigin = originData.find(s => s.is_default)?.value || originData[0]?.value;
        if (defaultOrigin) {
          setFormData(prev => ({ ...prev, origin: defaultOrigin }));
        }
      }
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchStaff = async () => {
    try {
      // Get all users from the same organizations
      const { data: orgUsers, error: orgUsersError } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', selectedOrganization?.id);

      if (orgUsersError) throw orgUsersError;

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', orgUsers?.map(ou => ou.user_id) || []);

      if (profilesError) throw profilesError;
      setStaff(profiles || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  // Add function to fetch customers
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

  // Add function to handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);

    setFormData(prev => ({
      ...prev,
      contact_id: customer.customer_id || customer.id,
      vendor_id: customer.vendor_id
    }));

    setCustomerSearch('');
    setShowCustomerDropdown(false);

    // If the customer has a vendor_id, fetch vendor details
    if (customer.vendor_id) {
      fetchVendorById(customer.vendor_id);
    }
  };

  // Add function to fetch customer by ID
  const fetchCustomerById = async (customerId) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) {
        // Try with id field if customer_id fails
        const { data: altData, error: altError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();

        if (altError) throw altError;
        if (altData) {
          setSelectedCustomer(altData);
        }
      } else if (data) {
        setSelectedCustomer(data);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  };

  const fetchCase = async () => {
    try {
      const { data: caseData, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Format dates using organization timezone
      const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return null;
        try {
          // Parse UTC datetime and convert to organization timezone
          return DateTime
            .fromISO(dateTimeString, { zone: 'UTC' })
            .setZone(orgTimezone)
            .toISO({ includeOffset: false, suppressMilliseconds: true })
            .slice(0, 16); // Gets YYYY-MM-DDThh:mm
        } catch (err) {
          console.error('Error formatting datetime:', err);
          return null;
        }
      };

      if (caseData) {
        setFormData({
          title: caseData.title,
          type: caseData.type,
          sub_type: caseData.sub_type || '',
          status: caseData.status,
          owner_id: caseData.owner_id,
          description: caseData.description,
          resume_url: caseData.resume_url,
          escalated_at: formatDateTime(caseData.escalated_at),
          closed_at: formatDateTime(caseData.closed_at),
          origin: caseData.origin,
          closed_by: caseData.closed_by,
          escalated_by: caseData.escalated_by,
          priority: caseData.priority,
          organization_id: caseData.organization_id,
          contact_id: caseData.contact_id,
          vendor_id: caseData.vendor_id
        });

        // Fetch customer data if contact_id exists
        if (caseData.contact_id) {
          fetchCustomerById(caseData.contact_id);
        }

        // Fetch custom fields for this case
        const { data: customFieldValues, error: customFieldsError } = await supabase
          .from('custom_field_values')
          .select('field_id, value')
          .eq('entity_id', id);

        if (customFieldsError) throw customFieldsError;

        // Convert custom field values to a key-value pair object
        const customFieldsData = customFieldValues.reduce((acc, field) => {
          acc[field.field_id] = field.value;
          return acc;
        }, {} as Record<string, any>);

        setCustomFields(customFieldsData);
      }
    } catch (err) {
      console.error('Error fetching case:', err);
      setError('Failed to load case');
      navigate('/admin/cases');
    }
  };

  // Convert local timezone datetime to UTC for submission
  const convertToUTC = (localDateTimeStr) => {
    if (!localDateTimeStr) return null;

    try {
      // Parse the datetime string as being in the organization timezone
      return DateTime
        .fromISO(localDateTimeStr, { zone: orgTimezone })
        .toUTC()
        .toISO();
    } catch (err) {
      console.error('Error converting datetime to UTC:', err);
      return null;
    }
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle status changes and automatically set escalated_by and closed_by
  const handleStatusChange = (newStatus) => {
    // Save the current status before updating
    const currentStatus = formData.status;

    // Check if this is the initial load or a real change
    if (previousStatus && currentStatus !== newStatus) {
      const updates = { status: newStatus };

      // If changing to Escalated status and it hasn't been escalated before
      if (newStatus === 'Escalated' && currentStatus !== 'Escalated' && !formData.escalated_by) {
        // Get current time in organization timezone
        const now = DateTime.now().setZone(orgTimezone)
          .toISO({ includeOffset: false, suppressMilliseconds: true })
          .slice(0, 16); // YYYY-MM-DDThh:mm format

        updates.escalated_at = now;
        updates.escalated_by = user?.id || null;
      }

      // If changing to Closed status and it hasn't been closed before
      if (newStatus === 'Closed' && currentStatus !== 'Closed' && !formData.closed_by) {
        // Get current time in organization timezone
        const now = DateTime.now().setZone(orgTimezone)
          .toISO({ includeOffset: false, suppressMilliseconds: true })
          .slice(0, 16); // YYYY-MM-DDThh:mm format

        updates.closed_at = now;
        updates.closed_by = user?.id || null;
      }

      // Update the form data with all changes
      setFormData(prev => ({ ...prev, ...updates }));
    } else {
      // Just update the status if it's the initial load
      setFormData(prev => ({ ...prev, status: newStatus }));
    }

    // Update the previous status for the next change
    setPreviousStatus(newStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get organization ID
      const { data: orgData } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userData.user.id)
        .eq('organization_id', selectedOrganization?.id)
        .single();

      if (!orgData?.organization_id) throw new Error('No organization found');

      // Check status and set escalated_by/closed_by if needed
      let updatedFormData = { ...formData };

      // If status is Escalated but escalated_by is not set, set it now
      if (formData.status === 'Escalated' && !formData.escalated_by) {
        updatedFormData.escalated_by = userData.user.id;

        // If escalated_at is also not set, set it to current time
        if (!formData.escalated_at) {
          updatedFormData.escalated_at = DateTime.now().setZone(orgTimezone)
            .toISO({ includeOffset: false, suppressMilliseconds: true })
            .slice(0, 16);
        }
      }

      // If status is Closed but closed_by is not set, set it now
      if (formData.status === 'Closed' && !formData.closed_by) {
        updatedFormData.closed_by = userData.user.id;

        // If closed_at is also not set, set it to current time
        if (!formData.closed_at) {
          updatedFormData.closed_at = DateTime.now().setZone(orgTimezone)
            .toISO({ includeOffset: false, suppressMilliseconds: true })
            .slice(0, 16);
        }
      }

      // Convert dates back to UTC for storage
      const caseData = {
        ...updatedFormData,
        escalated_at: convertToUTC(updatedFormData.escalated_at),
        closed_at: convertToUTC(updatedFormData.closed_at),
        sub_type: updatedFormData.sub_type || null,
        organization_id: orgData.organization_id,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id,
        contact_id: updatedFormData.contact_id,
        vendor_id: updatedFormData.vendor_id
      };

      let caseId: string;

      if (id) {
        // Update existing case
        const { error: updateError } = await supabase
          .from('cases')
          .update(caseData)
          .eq('id', id);

        if (updateError) throw updateError;
        caseId = id;
      } else {
        // Create new case
        const { data: newCase, error: insertError } = await supabase
          .from('cases')
          .insert([{
            ...caseData,
            created_at: new Date().toISOString(),
            created_by: userData.user.id
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        caseId = newCase.id;
      }

      // Save custom field values
      if (caseId && userData.user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: orgData.organization_id,
              entity_id: caseId,
              field_id: fieldId,
              value,
              created_by: userData.user.id,
              updated_by: userData.user.id,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'organization_id,field_id,entity_id'
            });

          if (valueError) {
            console.error('Error saving custom field value:', valueError);
          }
        }
      }

      navigate('/admin/cases');
    } catch (err) {
      console.error('Error saving case:', err);
      setError(err instanceof Error ? err.message : 'Failed to save case');
    } finally {
      setLoading(false);
    }
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = caseStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get style for type badge
  const getTypeStyle = (type: string) => {
    const typeValue = caseTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  // Get style for priority badge
  const getPriorityStyle = (priority: string) => {
    const priorityValue = casePriorities.find(p => p.value === priority);
    if (!priorityValue?.color) return {};
    return {
      backgroundColor: priorityValue.color,
      color: priorityValue.text_color || '#FFFFFF'
    };
  };

  // Get style for origin badge
  const getOriginStyle = (origin: string) => {
    const originValue = caseOrigins.find(o => o.value === origin);
    if (!originValue?.color) return {};
    return {
      backgroundColor: originValue.color,
      color: originValue.text_color || '#FFFFFF'
    };
  };

  // Get user info by ID
  const getUserInfo = (userId) => {
    if (!userId) return null;
    const userInfo = staff.find(s => s.id === userId);
    return userInfo || null;
  };

  // Format date for display 
  const getReadableDate = (dateTimeStr) => {
    if (!dateTimeStr) return '';

    try {
      // Format the date for display
      return DateTime
        .fromISO(dateTimeStr, { zone: orgTimezone })
        .toLocaleString(DateTime.DATETIME_SHORT);
    } catch (err) {
      return dateTimeStr;
    }
  };

  // Find the current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!formData.status || !caseStatuses.length) return -1;
    return caseStatuses.findIndex(status =>
      status.value.toLowerCase() === formData.status.toLowerCase()
    );
  };

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigate('/admin/cases')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Cases</span>
            </button>

            {/* Right buttons group */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/admin/cases')}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Case'}
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
                  <div className="bg-blue-100 rounded-full p-2.5">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:ring-0 outline-none w-full px-0 py-1"
                      placeholder="Case Title"
                      required
                    />
                    <div className="flex flex-wrap items-center mt-1.5 space-x-2">
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          type: e.target.value,
                          sub_type: '' // Reset sub-type when type changes
                        }))}
                        className="px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-blue-200 outline-none"
                        style={getTypeStyle(formData.type)}
                        required
                      >
                        <option value="">Select Type</option>
                        {caseTypes.map(type => (
                          <option key={type.id} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>

                      {formData.type === 'Design_Inquiry' && (
                        <select
                          value={formData.sub_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, sub_type: e.target.value }))}
                          className="px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-blue-200 outline-none"
                        >
                          <option value="">Select Category</option>
                          <option value="Graphic_Design">Graphic Design</option>
                          <option value="Website_Design">Website Design</option>
                          <option value="Package_Design">Package Design</option>
                          <option value="Branding">Branding</option>
                          <option value="Others">Others</option>
                        </select>
                      )}

                      {/* Priority Badge */}
                      <select
                        value={formData.priority || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        className="px-3 py-1 text-xs font-medium rounded-full flex items-center border-0 focus:ring-2 focus:ring-blue-200 outline-none"
                        style={getPriorityStyle(formData.priority)}
                      >
                        <option value="">Select Priority</option>
                        {casePriorities.map(priority => (
                          <option key={priority.id} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>

                      {/* Origin Badge */}
                      <select
                        value={formData.origin || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                        className="px-3 py-1 text-xs font-medium rounded-full border-0 focus:ring-2 focus:ring-blue-200 outline-none"
                        style={getOriginStyle(formData.origin)}
                      >
                        <option value="">Select Origin</option>
                        {caseOrigins.map(origin => (
                          <option key={origin.id} value={origin.value}>
                            {origin.label}
                          </option>
                        ))}
                      </select>

                      <span className="text-gray-500 text-sm">
                        Organization:
                        <select
                          value={formData.organization_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, organization_id: e.target.value }))}
                          className="ml-2 px-2 py-0 text-sm border-0 bg-transparent focus:ring-0 outline-none"
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

              {/* Status Bar using picklist values */}
              <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                {caseStatuses.length > 0 && (
                  <div className="relative pt-2">
                    {/* Progress bar track */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      {/* Progress bar fill - width based on current status */}
                      <div
                        className="absolute top-2 left-0 h-2 bg-blue-500 rounded-full"
                        style={{
                          width: `${(getCurrentStatusIndex() + 1) * 100 / caseStatuses.length}%`,
                          transition: 'width 0.3s ease-in-out'
                        }}
                      ></div>
                    </div>

                    {/* Status indicators with dots */}
                    <div className="flex justify-between mt-1">
                      {caseStatuses.map((status, index) => {
                        // Determine if this status is active (current or passed)
                        const isActive = index <= getCurrentStatusIndex();
                        // Position dots evenly
                        const position = index / (caseStatuses.length - 1) * 100;

                        return (
                          <div
                            key={status.id}
                            className="flex flex-col items-center"
                            style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            {/* Status dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                              style={{
                                marginTop: '-10px',
                                boxShadow: '0 0 0 2px white'
                              }}
                            ></div>

                            {/* Status label */}
                            <div className="mt-2">
                              <label
                                className={`inline-flex items-center cursor-pointer`}
                              >
                                <input
                                  type="radio"
                                  name="status"
                                  value={status.value}
                                  checked={formData.status === status.value}
                                  onChange={() => handleStatusChange(status.value)}
                                  className="sr-only"
                                />
                                <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${formData.status === status.value
                                    ? 'text-blue-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                  }`}>
                                  {status.label}
                                </span>
                              </label>
                            </div>
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
                      ? 'border-blue-500 text-blue-600'
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
                    <div ref={customerSearchRef} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-blue-500 mr-2" />
                        Contact Information
                      </h2>

                      {selectedCustomer ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
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
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(null);
                                setFormData(prev => ({ ...prev, contact_id: null, vendor_id: null }));
                              }}
                              className="p-1 hover:bg-gray-100 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <span className="text-blue-600">
                              {selectedCustomer.email}
                            </span>
                          </div>

                          {selectedCustomer.phone && (
                            <div className="flex items-center">
                              <Phone className="w-5 h-5 text-gray-400 mr-3" />
                              <span className="text-blue-600">
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
                            placeholder="Search customers..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
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
                                        key={customer.customer_id || customer.id}
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
                      )}
                    </div>

                    {/* Vendor Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-blue-500 mr-2" />
                        Vendor Information
                      </h2>
                      <div className="space-y-4">
                        {selectedVendor ? (
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                                <div className="font-medium">{selectedVendor.name}</div>
                              </div>
                            </div>

                            {selectedVendor.email && (
                              <div className="flex items-center">
                                <Mail className="w-5 h-5 text-gray-400 mr-3" />
                                <span className="text-blue-600">{selectedVendor.email}</span>
                              </div>
                            )}

                            {selectedVendor.phone && (
                              <div className="flex items-center">
                                <Phone className="w-5 h-5 text-gray-400 mr-3" />
                                <span className="text-blue-600">{selectedVendor.phone}</span>
                              </div>
                            )}

                            {selectedVendor.contact_person && (
                              <div className="flex items-center">
                                <User className="w-5 h-5 text-gray-400 mr-3" />
                                <div className="text-gray-700">
                                  {selectedVendor.contact_person}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">
                            {formData.vendor_id ?
                              'Loading vendor information...' :
                              'Vendor will be automatically assigned from the selected customer'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamps Section */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Clock className="w-5 h-5 text-blue-500 mr-2" />
                        Timeline
                      </h2>
                      <div className="space-y-4">
                        {/* Escalation Information */}
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Escalated Date</div>
                          <div className="flex items-center">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mr-3" />
                            <input
                              type="datetime-local"
                              value={formData.escalated_at || ''}
                              onChange={(e) => handleDateChange('escalated_at', e.target.value)}
                              className="px-2 py-1 text-gray-700 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:ring-0 outline-none"
                            />
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {formData.status === 'Escalated' && !formData.escalated_at &&
                              'Will be set automatically on save. Time is in ' + orgTimezone + ' timezone.'}
                          </div>
                        </div>

                        {/* Escalated By */}
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Escalated By</div>
                          <div className="flex items-center">
                            <User className="w-5 h-5 text-amber-500 mr-3" />
                            <div className="text-gray-700">
                              {formData.escalated_by ?
                                (getUserInfo(formData.escalated_by)?.name || 'Unknown User') :
                                (formData.status === 'Escalated' ? 'Will be set on save' : 'Not escalated')}
                            </div>
                          </div>
                        </div>

                        {/* Closed Information */}
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Closed Date</div>
                          <div className="flex items-center">
                            <CheckSquare className="w-5 h-5 text-green-500 mr-3" />
                            <input
                              type="datetime-local"
                              value={formData.closed_at || ''}
                              onChange={(e) => handleDateChange('closed_at', e.target.value)}
                              className="px-2 py-1 text-gray-700 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:ring-0 outline-none"
                            />
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {formData.status === 'Closed' && !formData.closed_at &&
                              'Will be set automatically on save. Time is in ' + orgTimezone + ' timezone.'}
                          </div>
                        </div>

                        {/* Closed By */}
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Closed By</div>
                          <div className="flex items-center">
                            <User className="w-5 h-5 text-green-500 mr-3" />
                            <div className="text-gray-700">
                              {formData.closed_by ?
                                (getUserInfo(formData.closed_by)?.name || 'Unknown User') :
                                (formData.status === 'Closed' ? 'Will be set on save' : 'Not closed')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Assignment */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-blue-500 mr-2" />
                        Case Assignment
                      </h2>
                      <div className="space-y-4">
                        <UserSearch
                          organizationId={selectedOrganization?.id}
                          selectedUserId={formData.owner_id}
                          onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
                        />
                      </div>
                    </div>

                    {/* Files Section */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <FileText className="w-5 h-5 text-blue-500 mr-2" />
                        Attachments
                      </h2>
                      <div className="space-y-4">
                        <div className="text-gray-500 italic text-sm">
                          Attachments can be uploaded after case creation
                        </div>

                        {formData.resume_url && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="w-5 h-5 text-gray-400 mr-3" />
                              <div className="text-gray-700">Resume</div>
                            </div>
                            <a
                              href={formData.resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Case Description - Full Width */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-2" />
                      Case Description
                    </h2>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={5}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      placeholder="Add detailed description of the case..."
                      required
                    />
                  </div>

                  {/* Custom Fields - Full Width */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-blue-500 mr-2" />
                      Custom Fields
                    </h2>
                    <CustomFieldsForm
                      entityType="cases"
                      entityId={id}
                      organizationId={selectedOrganization?.id}
                      onChange={(customFieldValues) => setCustomFields(customFieldValues)}
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