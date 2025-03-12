import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsForm } from './CustomFieldsForm';
import { UserSearch } from './UserSearch';
import { useOrganization } from '../../contexts/OrganizationContext';


type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type FormData = {
  title: string;
  type: string;
  sub_type: string;
  status: string;
  owner_id: string | null;
  description: string;
  resume_url: string | null;
};

const initialFormData: FormData = {
  title: '',
  type: '',
  sub_type: '',
  status: '',
  owner_id: null,
  description: '',
  resume_url: null
};

export function CaseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [caseTypes, setCaseTypes] = useState<PicklistValue[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<PicklistValue[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchPicklists();
    fetchStaff();
    if (id) {
      fetchCase();
    }
  }, [id]);

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

  const fetchCase = async () => {
    try {
      const { data: caseData, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (caseData) {
        setFormData({
          title: caseData.title,
          type: caseData.type,
          sub_type: caseData.sub_type || '',
          status: caseData.status,
          owner_id: caseData.owner_id,
          description: caseData.description,
          resume_url: caseData.resume_url,
          organization_id: caseData.organization_id
        });

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

      const caseData = {
        ...formData,
        sub_type: formData.sub_type || null,
        organization_id: orgData.organization_id,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.id
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {id ? 'Edit Case' : 'Create New Case'}
        </h1>
        <button
          onClick={() => navigate('/admin/cases')}
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
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value,
                sub_type: '' // Reset sub-type when type changes
              }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
            >
              <option value="">Select Type</option>
              {caseTypes.map(type => (
                <option key={type.id} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {formData.type === 'Design_Inquiry' && (
            <div>
              <label htmlFor="sub_type" className="block text-sm font-medium text-gray-700 mb-1">
                Design Category
              </label>
              <select
                id="sub_type"
                value={formData.sub_type}
                onChange={(e) => setFormData(prev => ({ ...prev, sub_type: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              >
                <option value="">Select Category</option>
                <option value="Graphic_Design">Graphic Design</option>
                <option value="Website_Design">Website Design</option>
                <option value="Package_Design">Package Design</option>
                <option value="Branding">Branding</option>
                <option value="Others">Others</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              required
              style={getStatusStyle(formData.status)}
            >
              <option value="">Select Status</option>
              {caseStatuses.map(status => (
                <option key={status.id} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <UserSearch
              organizationId={selectedOrganization?.id}
              selectedUserId={formData.owner_id}
              onSelect={(userId) => setFormData(prev => ({ ...prev, owner_id: userId }))}
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={5}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            required
          />
        </div>

        <CustomFieldsForm
          entityType="case"
          entityId={id}
          organizationId={selectedOrganization?.id}
          onChange={(customFieldValues) => setCustomFields(customFieldValues)}
          className="border-t border-gray-200 pt-6"
        />

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/cases')}
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
            {loading ? 'Saving...' : 'Save Case'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}