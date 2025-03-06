import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Settings, AlertCircle, Database, Save, X, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

type CustomField = {
  id: string;
  entity_type: 'case' | 'vendor' | 'customer' | 'product' | 'order' | 'quote' | 'lead' |'opportunity';
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi_select' | 'url' | 'email' | 'phone' | 'currency';
  field_label: string;
  description: string | null;
  is_required: boolean;
  is_searchable: boolean;
  default_value: any;
  options: string[] | null;
  validation_rules: any;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  organization_id: string;
};

const ENTITY_TYPES = [
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'lead', label: 'Leads' },
  { value: 'case', label: 'Cases' },
  { value: 'vendor', label: 'Accounts' },
  { value: 'customer', label: 'Customers' },
  { value: 'product', label: 'Products' },
  { value: 'order', label: 'Orders' },
  { value: 'quote', label: 'Quotes' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'currency', label: 'Currency' }
];

const initialFormData = {
  entity_type: 'lead' as const,
  field_name: '',
  field_type: 'text' as const,
  field_label: '',
  description: '',
  is_required: false,
  is_searchable: false,
  default_value: null,
  options: null,
  validation_rules: null,
  display_order: 0,
  status: 'active' as const
};

export function CustomFieldsPage() {
  const { user, organizations } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
  }, [organizations]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .order('entity_type')
        .order('display_order');

      if (error) throw error;
      setFields(data || []);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to perform this action');
      return;
    }

    setProcessingAction('save');
    setError(null);

    try {
      const fieldData = {
        ...formData,
        organization_id: organizations[0]?.id,
        field_name: formData.field_name.toLowerCase().replace(/\s+/g, '_'),
        options: formData.field_type === 'select' || formData.field_type === 'multi_select'
          ? formData.options
          : null,
        created_by: user.id,
        updated_by: user.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('custom_fields')
          .update({
            ...fieldData,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_fields')
          .insert([{
            ...fieldData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      await fetchFields();
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
    } catch (err) {
      console.error('Error saving custom field:', err);
      setError(err instanceof Error ? err.message : 'Failed to save custom field');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleEdit = (field: CustomField) => {
    setFormData({
      entity_type: field.entity_type,
      field_name: field.field_name,
      field_type: field.field_type,
      field_label: field.field_label,
      description: field.description || '',
      is_required: field.is_required,
      is_searchable: field.is_searchable,
      default_value: field.default_value,
      options: field.options,
      validation_rules: field.validation_rules,
      display_order: field.display_order,
      status: field.status
    });
    setEditingId(field.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this custom field? This will also delete all values stored for this field.')) {
      return;
    }

    try {
      setProcessingAction(id);
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchFields();
    } catch (err) {
      console.error('Error deleting custom field:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete custom field');
    } finally {
      setProcessingAction(null);
    }
  };

  const filteredFields = fields.filter(field => {
    const matchesSearch = 
      field.field_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.field_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEntity = entityFilter === 'all' || field.entity_type === entityFilter;
    const matchesStatus = statusFilter === 'all' || field.status === statusFilter;

    return matchesSearch && matchesEntity && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Custom Fields</h1>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData(initialFormData);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom Field
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit Custom Field' : 'New Custom Field'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(initialFormData);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity Type *
                  </label>
                  <select
                    value={formData.entity_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      entity_type: e.target.value as CustomField['entity_type']
                    }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    required
                  >
                    {ENTITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type *
                  </label>
                  <select
                    value={formData.field_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      field_type: e.target.value as CustomField['field_type'],
                      options: e.target.value === 'select' || e.target.value === 'multi_select' 
                        ? [] 
                        : null
                    }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    required
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Label *
                  </label>
                  <input
                    type="text"
                    value={formData.field_label}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      field_label: e.target.value,
                      field_name: e.target.value.toLowerCase().replace(/\s+/g, '_')
                    }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={formData.field_name}
                    readOnly
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Auto-generated from field label
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  />
                </div>

                {(formData.field_type === 'select' || formData.field_type === 'multi_select') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Options *
                    </label>
                    <div className="space-y-2">
                      {formData.options?.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(formData.options || [])];
                              newOptions[index] = e.target.value;
                              setFormData(prev => ({ ...prev, options: newOptions }));
                            }}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = formData.options?.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, options: newOptions }));
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          options: [...(prev.options || []), ''] 
                        }))}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                      </button>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Settings
                  </label>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_required}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          is_required: e.target.checked 
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>Required field</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_searchable}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          is_searchable: e.target.checked 
                        }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>Searchable</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Order
                      </label>
                      <input
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          display_order: parseInt(e.target.value) 
                        }))}
                        min="0"
                        className="w-24 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData(initialFormData);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction === 'save'}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {processingAction === 'save' ? 'Saving...' : 'Save Field'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search custom fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Entities</option>
              {ENTITY_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFields.map((field) => (
                <tr key={field.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {field.field_label}
                    </div>
                    <div className="text-sm text-gray-500">
                      {field.field_name}
                    </div>
                    {field.description && (
                      <div className="text-sm text-gray-500">
                        {field.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {ENTITY_TYPES.find(t => t.value === field.entity_type)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {field.is_required ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      field.status === 'active'
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {field.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(field)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(field.id)}
                        disabled={processingAction === field.id}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFields.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No custom fields found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}