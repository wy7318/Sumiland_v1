import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Settings, AlertCircle, Save, X, Check, List, Palette 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
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

// Define available tables and their picklist fields
const PICKLIST_FIELDS = {
  Lead: {
    label: 'Lead',
    fields: {
      status: 'Status',
      source: 'Source'
    }
  },
  Case: {
    label: 'Case',
    fields: {
      type: 'Type',
      status: 'Status'
    }
  },
  Quote: {
    label: 'Quote',
    fields: {
      status: 'Status'
    }
  },
  Order: {
    label: 'Order',
    fields: {
      status: 'Status'
    }
  },
  Product: {
    label: 'Product',
    fields: {
      status: 'Status',
      category: 'Category',
      stock_unit: 'Stock Unit Type',
      weight_unit: 'Weight Unit'
    }
  },
  Account: {
    label: 'Account',
    fields: {
      type: 'Type',
      status: 'Status'
    }
  },
  Opportunity: {
    label: 'Opportunity',
    fields: {
      stage: 'Stage',
      type: 'Type',
      status: 'Status'
    }
  },
  OpportunityProduct: {
    label: 'OpportunityProduct',
    fields: {
      status: 'Status'
    }
  },
  Portfolio: {
    label: 'Portfolio',
    fields: {
      category: 'Category'
    }
  }
} as const;

// Type for the table keys
type TableKey = keyof typeof PICKLIST_FIELDS;

// Create mapping for picklist types
const PICKLIST_TYPE_MAPPING = {
  'Lead.status': 'lead_status',
  'Lead.source': 'lead_source',
  'Case.type': 'case_type',
  'Case.status': 'case_status',
  'Quote.status': 'quote_status',
  'Order.status': 'order_status',
  'Product.status': 'product_status',
  'Product.category': 'product_category',
  'Product.stock_unit': 'product_stock_unit',
  'Product.weight_unit': 'product_weight_unit',
  'Account.type': 'account_type',
  'Account.status': 'account_status',
  'Opportunity.stage': 'opportunity_stage',
  'Opportunity.type': 'opportunity_type',
  'Opportunity.status': 'opportunity_status',
  'OpportunityProduct.status': 'opportunity_product_status',
  'Portfolio.category': 'portfolio_category'
} as const;

export function PicklistManagementPage() {
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [values, setValues] = useState<PicklistValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<TableKey>('Lead');
  const [selectedField, setSelectedField] = useState<string>('status');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    description: '',
    is_default: false,
    is_active: true,
    display_order: 0,
    color: '',
    text_color: ''
  });

  useEffect(() => {
    if (organizations.length > 0) {
      fetchPicklistValues();
    }
  }, [selectedTable, selectedField, organizations]);

  const fetchPicklistValues = async () => {
    console.log('selectedOrganization?.id : ' + selectedOrganization?.id);
    console.log('organizations.map(org => org.id) : ' + organizations.map(org => org.id));
    try {
      setLoading(true);
      const picklistType = getPicklistType();
      
      const { data, error } = await supabase
        .from('picklist_values')
        .select('*')
        .eq('type', picklistType)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;
      setValues(data || []);
    } catch (err) {
      console.error('Error fetching picklist values:', err);
      setError('Failed to load picklist values');
    } finally {
      setLoading(false);
    }
  };

  // Get the picklist type based on current selections
  const getPicklistType = () => {
    const key = `${selectedTable}.${selectedField}` as keyof typeof PICKLIST_TYPE_MAPPING;
    return PICKLIST_TYPE_MAPPING[key];
  };

  // Function to generate value from label
  const generateValue = (label: string): string => {
    return label
      .toLowerCase() // Convert to lowercase
      .trim() // Remove leading/trailing spaces
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace multiple hyphens with single underscore
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value.trim() || !formData.label.trim()) {
      setError('Label and value are required');
      return;
    }

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

      const picklistType = getPicklistType();

      if (editingId) {
        const { error: updateError } = await supabase
          .from('picklist_values')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id
          })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('picklist_values')
          .insert([{
            ...formData,
            type: picklistType,
            organization_id: orgData.organization_id,
            created_by: userData.user.id,
            updated_by: userData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      await fetchPicklistValues();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        value: '',
        label: '',
        description: '',
        is_default: false,
        is_active: true,
        display_order: 0,
        color: '',
        text_color: ''
      });
    } catch (err) {
      console.error('Error saving picklist value:', err);
      setError(err instanceof Error ? err.message : 'Failed to save picklist value');
    }
  };

  const handleEdit = (value: PicklistValue) => {
    setFormData({
      value: value.value,
      label: value.label,
      description: value.description || '',
      is_default: value.is_default,
      is_active: value.is_active,
      display_order: value.display_order,
      color: value.color || '',
      text_color: value.text_color || ''
    });
    setEditingId(value.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this value?')) return;

    try {
      const { error } = await supabase
        .from('picklist_values')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPicklistValues();
    } catch (err) {
      console.error('Error deleting picklist value:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete picklist value');
    }
  };

  const filteredValues = values.filter(value =>
    value.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    value.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    value.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold">Picklist Management</h1>
        <List className="w-8 h-8 text-primary-500" />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Table Selection */}
            <select
              value={selectedTable}
              onChange={(e) => {
                const newTable = e.target.value as TableKey;
                setSelectedTable(newTable);
                // Set first field of new table as selected
                const firstField = Object.keys(PICKLIST_FIELDS[newTable].fields)[0];
                setSelectedField(firstField);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              {Object.entries(PICKLIST_FIELDS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {/* Field Selection */}
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              {Object.entries(PICKLIST_FIELDS[selectedTable].fields).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  value: '',
                  label: '',
                  description: '',
                  is_default: false,
                  is_active: true,
                  display_order: values.length,
                  color: '',
                  text_color: ''
                });
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Value
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-200"
            >
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          label: newLabel,
                          value: generateValue(newLabel)
                        }));
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      readOnly
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Auto-generated from label
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.color || '#000000'}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="h-10 w-20 rounded border border-gray-300 p-1"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#000000"
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                      {formData.color && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: '' }))}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.text_color || '#FFFFFF'}
                        onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                        className="h-10 w-20 rounded border border-gray-300 p-1"
                      />
                      <input
                        type="text"
                        value={formData.text_color}
                        onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                        placeholder="#FFFFFF"
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                      {formData.text_color && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, text_color: '' }))}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Optional. Defaults to white for dark backgrounds, black for light backgrounds.
                    </p>
                  </div>

                  {/* Preview */}
                  {(formData.color || formData.text_color) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preview
                      </label>
                      <div className="p-4 rounded-lg border border-gray-200">
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium inline-block"
                          style={{
                            backgroundColor: formData.color || undefined,
                            color: formData.text_color || (formData.color ? '#FFFFFF' : undefined)
                          }}
                        >
                          {formData.label || 'Preview Text'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Set as Default</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Value' : 'Add Value'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
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
              {filteredValues.map((value) => (
                <tr key={value.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {value.is_default && (
                        <span className="mr-2 px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                          Default
                        </span>
                      )}
                      {value.value}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {value.label}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 line-clamp-2">
                      {value.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {value.color ? (
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium inline-block"
                          style={{
                            backgroundColor: value.color,
                            color: value.text_color || '#FFFFFF'
                          }}
                        >
                          Sample
                        </span>
                        <span className="text-sm text-gray-500">
                          {value.color}
                          {value.text_color && ` / ${value.text_color}`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {value.display_order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                      value.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {value.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(value)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {!value.is_default && (
                        <button
                          onClick={() => handleDelete(value.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredValues.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No values found
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