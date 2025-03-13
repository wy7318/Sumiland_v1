import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Settings, AlertCircle, Database, Save, X, Check, List, Palette,
  BarChart2, LineChart, PieChart
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';

type ObjectField = {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  display_name?: string;
  is_selected?: boolean;
};

type Props = {
  onClose: () => void;
  onSave: () => void;
  editingReport?: Report;
};

type Report = {
  id: string;
  name: string;
  description: string | null;
  object_type: string;
  selected_fields: string[];
  filters: any[];
  grouping: string[];
  sorting: { field: string; direction: 'asc' | 'desc' }[];
  date_range?: {
    field: string;
    start: string | null;
    end: string | null;
  };
  charts: {
    type: 'bar' | 'line' | 'pie';
    title: string;
    x_field: string;
    y_field: string;
    group_by?: string;
    aggregation?: 'count' | 'sum' | 'avg';
  }[];
  is_favorite: boolean;
  is_shared: boolean;
  folder_id: string | null;
  created_at: string;
  created_by: string;
  organization_id: string;
};

// Map of object types to their related tables
const OBJECT_RELATIONS = {
  'quote': {
    main: 'quote_hdr',
    details: 'quote_dtl',
    fields: [
      { name: 'quote_number', display: 'Quote Number' },
      { name: 'customer:customers(first_name,last_name)', display: 'Customer Name' },
      { name: 'status', display: 'Status' },
      { name: 'total_amount', display: 'Total Amount' },
      { name: 'created_at', display: 'Created Date' },
      { name: 'items:quote_dtl(item_name,quantity,unit_price,line_total)', display: 'Line Items' }
    ]
  },
  'order': {
    main: 'order_hdr',
    details: 'order_dtl',
    fields: [
      { name: 'order_number', display: 'Order Number' },
      { name: 'customer:customers(first_name,last_name)', display: 'Customer Name' },
      { name: 'status', display: 'Status' },
      { name: 'payment_status', display: 'Payment Status' },
      { name: 'total_amount', display: 'Total Amount' },
      { name: 'created_at', display: 'Created Date' },
      { name: 'items:order_dtl(item_name,quantity,unit_price,subtotal)', display: 'Line Items' }
    ]
  },
  'opportunity': {
    main: 'opportunities',
    details: 'opportunity_products',
    fields: [
      { name: 'opportunity_number', display: 'Opportunity Number' },
      { name: 'name', display: 'Name' },
      { name: 'stage', display: 'Stage' },
      { name: 'status', display: 'Status' },
      { name: 'amount', display: 'Amount' },
      { name: 'probability', display: 'Probability' },
      { name: 'expected_close_date', display: 'Expected Close Date' },
      { name: 'created_at', display: 'Created Date' },
      { name: 'products:opportunity_products(product:products(name),quantity,unit_price,subtotal,status)', display: 'Products' }
    ]
  }
};

const OBJECT_TYPES = [
  { value: 'vendor', label: 'Accounts', table: 'vendors' },
  { value: 'customer', label: 'Customers', table: 'customers' },
  { value: 'lead', label: 'Leads', table: 'leads' },
  { value: 'opportunity', label: 'Opportunities', table: 'opportunities' },
  { value: 'case', label: 'Cases', table: 'cases' },
  { value: 'quote', label: 'Quotes', table: 'quotes' },
  { value: 'order', label: 'Orders', table: 'orders' },
  { value: 'product', label: 'Products', table: 'products' }
];

export function ReportBuilder({ onClose, onSave, editingReport }: Props) {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ObjectField[]>([]);
  const [formData, setFormData] = useState<Partial<Report>>(
    editingReport || {
      name: '',
      description: '',
      object_type: '',
      selected_fields: [],
      filters: [],
      grouping: [],
      sorting: [],
      charts: [],
      is_favorite: false,
      is_shared: false,
      folder_id: null
    }
  );

  useEffect(() => {
    if (formData.object_type) {
      fetchObjectFields(formData.object_type);
    }
  }, [formData.object_type]);

  useEffect(() => {
    if (editingReport) {
      setFormData({
        ...editingReport,
        name: editingReport.name || '',
        description: editingReport.description || '',
        object_type: editingReport.object_type || '',
        selected_fields: editingReport.selected_fields || [],
        filters: editingReport.filters || [],
        grouping: editingReport.grouping || [],
        sorting: editingReport.sorting || [],
        charts: editingReport.charts || [],
        is_favorite: editingReport.is_favorite || false,
        is_shared: editingReport.is_shared || false,
        folder_id: editingReport.folder_id || null,
      });
    }
  }, [editingReport]); // Only update when editingReport changes


  // Fetch fields when object_type changes
  useEffect(() => {
    if (formData.object_type) {
      fetchObjectFields(formData.object_type);
    }
  }, [formData.object_type]);


  const fetchObjectFields = async (objectType: string) => {
    try {
      // Get predefined fields for special objects
      const relation = OBJECT_RELATIONS[objectType as keyof typeof OBJECT_RELATIONS];
      if (relation) {
        const fields = relation.fields.map(f => ({
          column_name: f.name,
          data_type: 'text',
          is_nullable: true,
          column_default: null,
          display_name: f.display,
          is_selected: editingReport?.selected_fields?.includes(f.name) || false
        }));
        setFields(fields);
        return;
      }

      // Get custom fields
      const { data: customFields, error: customError } = await supabase
        .from('custom_fields')
        .select('field_name, field_type, field_label, is_required')
        .eq('entity_type', objectType)
        .eq('organization_id', selectedOrganization?.id)
        .eq('status', 'active')
        .order('display_order');

      if (customError) throw customError;

      // Get standard fields
      const tableName = OBJECT_TYPES.find(t => t.value === objectType)?.table || `${objectType}s`;
      const { data: standardFields, error: standardError } = await supabase
        .rpc('get_object_fields', { object_name: tableName });

      if (standardError) throw standardError;

      // Combine standard and custom fields
      const allFields = [
        ...standardFields.map((field: any) => ({
          column_name: field.column_name,
          data_type: field.data_type,
          is_nullable: field.is_nullable,
          column_default: field.column_default,
          display_name: field.column_name.split('_').map((w: string) => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' '),
          is_selected: editingReport?.selected_fields?.includes(field.column_name) || false
        })),
        ...(customFields || []).map(field => ({
          column_name: field.field_name,
          data_type: field.field_type,
          is_nullable: !field.is_required,
          column_default: null,
          display_name: field.field_label,
          is_selected: editingReport?.selected_fields?.includes(field.field_name) || false
        }))
      ];

      setFields(allFields);
    } catch (err) {
      console.error('Error fetching fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.object_type) {
      setError('Name and object type are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the correct table name
      const relation = OBJECT_RELATIONS[formData.object_type as keyof typeof OBJECT_RELATIONS];
      const tableName = relation?.main || OBJECT_TYPES.find(t => t.value === formData.object_type)?.table || `${formData.object_type}s`;

      const reportData = {
        ...formData,
        object_type: tableName,
        organization_id: selectedOrganization?.id,
        created_by: user?.id,
        created_at: new Date().toISOString()
      };

      if (editingReport?.id) {
        const { error } = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', editingReport.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reports')
          .insert([reportData]);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving report:', err);
      setError(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {editingReport ? 'Edit Report' : 'Create New Report'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
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
                Report Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Object Type *
              </label>
              <select
                value={formData.object_type}
                onChange={e => setFormData(prev => ({ ...prev, object_type: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                required
              >
                <option value="">Select Object Type</option>
                {OBJECT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              />
            </div>
          </div>

          {formData.object_type && fields.length > 0 && (
            <>
              {/* Fields Selection */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Select Fields to Display</h3>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <label key={field.column_name} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={field.is_selected || formData.selected_fields?.includes(field.column_name)}
                        onChange={(e) => {
                          // Update field selection state
                          const newFields = [...fields];
                          newFields[index] = { ...field, is_selected: e.target.checked };
                          setFields(newFields);

                          // Update form data
                          const newSelectedFields = e.target.checked
                            ? [...(formData.selected_fields || []), field.column_name]
                            : (formData.selected_fields || []).filter(f => f !== field.column_name);
                          setFormData(prev => ({ ...prev, selected_fields: newSelectedFields }));
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{field.display_name || field.column_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filters Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Filters</h3>
                <div className="space-y-4">
                  {formData.filters?.map((filter, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <select
                        value={filter.field}
                        onChange={e => {
                          const newFilters = [...(formData.filters || [])];
                          newFilters[index] = { ...filter, field: e.target.value };
                          setFormData(prev => ({ ...prev, filters: newFilters }));
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      >
                        <option value="">Select Field</option>
                        {fields.map(field => (
                          <option key={field.column_name} value={field.column_name}>
                            {field.display_name || field.column_name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={filter.operator}
                        onChange={e => {
                          const newFilters = [...(formData.filters || [])];
                          newFilters[index] = { ...filter, operator: e.target.value };
                          setFormData(prev => ({ ...prev, filters: newFilters }));
                        }}
                        className="w-40 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                      </select>

                      <input
                        type="text"
                        value={filter.value}
                        onChange={e => {
                          const newFilters = [...(formData.filters || [])];
                          newFilters[index] = { ...filter, value: e.target.value };
                          setFormData(prev => ({ ...prev, filters: newFilters }));
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        placeholder="Value"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const newFilters = [...(formData.filters || [])];
                          newFilters.splice(index, 1);
                          setFormData(prev => ({ ...prev, filters: newFilters }));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        filters: [
                          ...(prev.filters || []),
                          { field: '', operator: 'equals', value: '' }
                        ]
                      }));
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Filter
                  </button>
                </div>
              </div>

              {/* Grouping Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Group By</h3>
                <div className="space-y-4">
                  {formData.grouping?.map((field, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <select
                        value={field}
                        onChange={e => {
                          const newGrouping = [...(formData.grouping || [])];
                          newGrouping[index] = e.target.value;
                          setFormData(prev => ({ ...prev, grouping: newGrouping }));
                        }}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      >
                        <option value="">Select Field</option>
                        {fields.map(field => (
                          <option key={field.column_name} value={field.column_name}>
                            {field.display_name || field.column_name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          const newGrouping = [...(formData.grouping || [])];
                          newGrouping.splice(index, 1);
                          setFormData(prev => ({ ...prev, grouping: newGrouping }));
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        grouping: [...(prev.grouping || []), '']
                      }));
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Group By
                  </button>
                </div>
              </div>

              {/* Charts Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Charts</h3>
                <div className="space-y-4">
                  {formData.charts?.map((chart, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {chart.type === 'bar' && <BarChart2 className="w-5 h-5 text-primary-500" />}
                          {chart.type === 'line' && <LineChart className="w-5 h-5 text-green-500" />}
                          {chart.type === 'pie' && <PieChart className="w-5 h-5 text-purple-500" />}
                          <input
                            type="text"
                            value={chart.title}
                            onChange={e => {
                              const newCharts = [...(formData.charts || [])];
                              newCharts[index] = { ...chart, title: e.target.value };
                              setFormData(prev => ({ ...prev, charts: newCharts }));
                            }}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                            placeholder="Chart Title"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={chart.type}
                            onChange={e => {
                              const newCharts = [...(formData.charts || [])];
                              newCharts[index] = { 
                                ...chart, 
                                type: e.target.value as 'bar' | 'line' | 'pie' 
                              };
                              setFormData(prev => ({ ...prev, charts: newCharts }));
                            }}
                            className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                          >
                            <option value="bar">Bar Chart</option>
                            <option value="line">Line Chart</option>
                            <option value="pie">Pie Chart</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const newCharts = [...(formData.charts || [])];
                              newCharts.splice(index, 1);
                              setFormData(prev => ({ ...prev, charts: newCharts }));
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select
                          value={chart.x_field}
                          onChange={e => {
                            const newCharts = [...(formData.charts || [])];
                            newCharts[index] = { ...chart, x_field: e.target.value };
                            setFormData(prev => ({ ...prev, charts: newCharts }));
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        >
                          <option value="">X-Axis Field</option>
                          {fields.map(field => (
                            <option key={field.column_name} value={field.column_name}>
                              {field.display_name || field.column_name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={chart.y_field}
                          onChange={e => {
                            const newCharts = [...(formData.charts || [])];
                            newCharts[index] = { ...chart, y_field: e.target.value };
                            setFormData(prev => ({ ...prev, charts: newCharts }));
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        >
                          <option value="">Y-Axis Field</option>
                          {fields.map(field => (
                            <option key={field.column_name} value={field.column_name}>
                              {field.display_name || field.column_name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={chart.aggregation}
                          onChange={e => {
                            const newCharts = [...(formData.charts || [])];
                            newCharts[index] = { ...chart, aggregation: e.target.value as 'count' | 'sum' | 'avg' };
                            setFormData(prev => ({ ...prev, charts: newCharts }));
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        >
                          <option value="">Select Aggregation</option>
                          <option value="count">Count</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                        </select>

                        <select
                          value={chart.group_by}
                          onChange={e => {
                            const newCharts = [...(formData.charts || [])];
                            newCharts[index] = { ...chart, group_by: e.target.value };
                            setFormData(prev => ({ ...prev, charts: newCharts }));
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        >
                          <option value="">Group By (Optional)</option>
                          {fields.map(field => (
                            <option key={field.column_name} value={field.column_name}>
                              {field.display_name || field.column_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        charts: [
                          ...(prev.charts || []),
                          {
                            type: 'bar',
                            title: '',
                            x_field: '',
                            y_field: '',
                            aggregation: 'count'
                          }
                        ]
                      }));
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chart
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-gray-200 pt-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_favorite}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    is_favorite: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Add to Favorites</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_shared}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    is_shared: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Share with Organization</span>
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}