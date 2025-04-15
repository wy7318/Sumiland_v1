import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Save, X, AlertCircle, Mail, Phone, Building2, User, Globe,
  ArrowLeft, Edit, Calendar, UserCheck, Bookmark, FileText,
  MessageSquare, Briefcase, Target, CheckCircle, UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { UserSearch } from './UserSearch';
import { cn } from '../../lib/utils';
import { useOrganization } from '../../contexts/OrganizationContext';

type FormData = {
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  website: string;
  phone: string;
  description: string;
  product_interest: string;
  email_opt_out: boolean;
  status: string;
  lead_source: string;
  owner_id: string | null;
  organization_id: string;
  custom_fields?: Record<string, any>;
};

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  company: '',
  website: '',
  phone: '',
  description: '',
  product_interest: '',
  email_opt_out: false,
  status: '',
  lead_source: '',
  owner_id: null,
  organization_id: ''
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

export function LeadForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [leadStatuses, setLeadStatuses] = useState<PicklistValue[]>([]);
  const [leadSources, setLeadSources] = useState<PicklistValue[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchLead();
    } else if (organizations.length > 0) {
      setFormData(prev => ({
        ...prev,
        organization_id: selectedOrganization?.id
      }));
    }
  }, [id, organizations]);

  const fetchPicklists = async () => {
    try {
      // Fetch lead statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'lead_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setLeadStatuses(statusData || []);

      // If no lead is being edited, set default status
      if (!id && statusData) {
        const defaultStatus = statusData.find(s => s.is_default)?.value || statusData[0]?.value;
        if (defaultStatus) {
          setFormData(prev => ({ ...prev, status: defaultStatus }));
        }
      }

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

  const fetchLead = async () => {
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (lead) {
        setFormData({
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          company: lead.company || '',
          website: lead.website || '',
          phone: lead.phone || '',
          description: lead.description || '',
          product_interest: lead.product_interest || '',
          email_opt_out: lead.email_opt_out,
          status: lead.status,
          lead_source: lead.lead_source || '',
          owner_id: lead.owner_id,
          organization_id: lead.organization_id
        });

        // Fetch custom fields for this lead
        const { data: customFieldValues, error: customFieldsError } = await supabase
          .from('custom_field_values')
          .select('field_id, value')
          .eq('entity_id', id);

        if (customFieldsError) throw customFieldsError;

        // Convert custom field values to a key-value pair object
        const customFieldsData = customFieldValues?.reduce((acc, field) => {
          acc[field.field_id] = field.value;
          return acc;
        }, {} as Record<string, any>) || {};

        setCustomFields(customFieldsData);
      }
    } catch (err) {
      console.error('Error fetching lead:', err);
      setError('Failed to load lead');
      navigate('/admin/leads');
    }
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

    if (formData.website && !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(formData.website)) {
      setError('Invalid website URL');
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let leadId = id;

      if (id) {
        // Update existing lead
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id
          })
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        // Create new lead
        const { data: newLead, error: insertError } = await supabase
          .from('leads')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            created_by: userData.user.id,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // Set the new lead ID for custom fields
        if (newLead) {
          leadId = newLead.id;
        }
      }

      // Save custom field values
      if (leadId && userData.user) {
        for (const [fieldId, value] of Object.entries(customFields)) {
          const { error: valueError } = await supabase
            .from('custom_field_values')
            .upsert({
              organization_id: formData.organization_id,
              entity_id: leadId,
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

      navigate('/admin/leads');
    } catch (err) {
      console.error('Error saving lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = leadStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get style for source badge
  const getSourceStyle = (source: string) => {
    const sourceValue = leadSources.find(s => s.value === source);
    if (!sourceValue?.color) return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    return {
      backgroundColor: sourceValue.color,
      color: sourceValue.text_color || '#FFFFFF'
    };
  };

  // Find the current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!formData.status || !leadStatuses.length) return -1;
    return leadStatuses.findIndex(status =>
      status.value.toLowerCase() === formData.status.toLowerCase()
    );
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to manage leads.
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
              onClick={() => navigate('/admin/leads')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Leads</span>
            </button>

            {/* Right buttons group */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => navigate('/admin/leads')}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Lead'}
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
                  <div className="bg-indigo-100 rounded-full p-2.5">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:ring-0 outline-none w-full px-0 py-1"
                        placeholder="First Name"
                        required
                      />
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="text-2xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:ring-0 outline-none w-full px-0 py-1"
                        placeholder="Last Name"
                        required
                      />
                    </div>
                    <div className="flex items-center mt-1.5 space-x-3">
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="text-sm text-gray-600 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:ring-0 outline-none px-0 py-0.5"
                        placeholder="Company (optional)"
                      />
                      <select
                        value={formData.lead_source}
                        onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
                        className="px-3 py-1 text-xs font-medium rounded-full border focus:ring-2 focus:ring-indigo-200 outline-none"
                        style={getSourceStyle(formData.lead_source)}
                      >
                        <option value="">Select Source</option>
                        {leadSources.map(source => (
                          <option key={source.id} value={source.value}>
                            {source.label}
                          </option>
                        ))}
                      </select>
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

              {/* Status Bar using picklist values */}
              <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                {leadStatuses.length > 0 && (
                  <div className="relative pt-2">
                    {/* Progress bar track */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      {/* Progress bar fill - width based on current status */}
                      <div
                        className="absolute top-2 left-0 h-2 bg-indigo-500 rounded-full"
                        style={{
                          width: `${(getCurrentStatusIndex() + 1) * 100 / leadStatuses.length}%`,
                          transition: 'width 0.3s ease-in-out'
                        }}
                      ></div>
                    </div>

                    {/* Status indicators with dots */}
                    <div className="flex justify-between mt-1">
                      {leadStatuses.map((status, index) => {
                        // Determine if this status is active (current or passed)
                        const isActive = index <= getCurrentStatusIndex();
                        // Position dots evenly
                        const position = index / (leadStatuses.length - 1) * 100;

                        return (
                          <div
                            key={status.id}
                            className="flex flex-col items-center"
                            style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                          >
                            {/* Status dot */}
                            <div
                              className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}`}
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
                                  onChange={() => setFormData(prev => ({ ...prev, status: status.value }))}
                                  className="sr-only"
                                />
                                <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${formData.status === status.value
                                    ? 'text-indigo-700'
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
                      ? 'border-indigo-500 text-indigo-600'
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
                        <User className="w-5 h-5 text-indigo-500 mr-2" />
                        Contact Information
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-2 py-1 text-indigo-600 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:ring-0 outline-none"
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
                            className="w-full px-2 py-1 text-indigo-600 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:ring-0 outline-none"
                            placeholder="Phone number"
                          />
                        </div>

                        <div className="flex items-center">
                          <Globe className="w-5 h-5 text-gray-400 mr-3" />
                          <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full px-2 py-1 text-indigo-600 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:ring-0 outline-none"
                            placeholder="Website URL (e.g., https://example.com)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lead Details */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Bookmark className="w-5 h-5 text-indigo-500 mr-2" />
                        Lead Details
                      </h2>
                      <div className="space-y-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            placeholder="Add a description about this lead..."
                          />
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Product Interest</div>
                          <input
                            type="text"
                            value={formData.product_interest}
                            onChange={(e) => setFormData(prev => ({ ...prev, product_interest: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            placeholder="e.g., Pro Plan, Enterprise Solution"
                          />
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Email Preferences</div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.email_opt_out}
                              onChange={(e) => setFormData(prev => ({ ...prev, email_opt_out: e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">Opt out of email communications</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-8">
                    {/* Assignment */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-indigo-500 mr-2" />
                        Lead Assignment
                      </h2>
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-500 mb-1">Assign To</div>
                        <UserSearch
                          organizationId={formData.organization_id}
                          selectedUserId={formData.owner_id}
                          onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
                        />
                      </div>
                    </div>

                    {/* Lead Source Information */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Target className="w-5 h-5 text-indigo-500 mr-2" />
                        Lead Source
                      </h2>
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-500 mb-1">Source</div>
                        <select
                          value={formData.lead_source}
                          onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                        >
                          <option value="">Select Source</option>
                          {leadSources.map(source => (
                            <option key={source.id} value={source.value}>
                              {source.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Conversion Placeholder */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserPlus className="w-5 h-5 text-indigo-500 mr-2" />
                        Conversion Options
                      </h2>
                      <div className="text-gray-500 text-sm italic">
                        Save this lead before converting to a contact or opportunity.
                      </div>
                    </div>
                  </div>

                  {/* Custom Fields - Full Width */}
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-indigo-500 mr-2" />
                      Custom Fields
                    </h2>
                    <CustomFieldsForm
                      entityType="leads"
                      entityId={id}
                      organizationId={formData.organization_id}
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