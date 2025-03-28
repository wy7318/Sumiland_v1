import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Settings, AlertCircle, Database, Save, X, Check, List, Palette,
  BarChart2, LineChart, PieChart, HelpCircle, Eye, ChevronRight,
  Columns, RefreshCw, ChevronsRight, Sliders, FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrganization } from '../../../contexts/OrganizationContext';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer
} from 'recharts';

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
  { value: 'vendors', label: 'Accounts', table: 'vendors' },
  { value: 'customers', label: 'Customers', table: 'customers' },
  { value: 'leads', label: 'Leads', table: 'leads' },
  { value: 'opportunities', label: 'Opportunities', table: 'opportunities' },
  { value: 'cases', label: 'Cases', table: 'cases' },
  { value: 'quotes', label: 'Quotes', table: 'quotes' },
  { value: 'orders', label: 'Orders', table: 'orders' },
  { value: 'products', label: 'Products', table: 'products' }
];

const CHART_HELP = {
  'bar': {
    title: 'Bar Chart',
    description: 'Best for comparing values across categories',
    examples: [
      'Count of Leads by Status',
      'Sum of Order Amount by Month',
      'Average Deal Size by Sales Rep'
    ]
  },
  'line': {
    title: 'Line Chart',
    description: 'Best for showing trends over time',
    examples: [
      'Orders per Month',
      'Cumulative Sales by Quarter',
      'Lead Conversion Rate Over Time'
    ]
  },
  'pie': {
    title: 'Pie Chart',
    description: 'Best for showing parts of a whole',
    examples: [
      'Opportunities by Stage',
      'Revenue by Product Category',
      'Customers by Region'
    ]
  }
};

const AGGREGATION_HELP = {
  'count': 'Counts the number of records',
  'sum': 'Adds up numeric values',
  'avg': 'Calculates the average of numeric values'
};

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
];

type StepType = 'object' | 'fields' | 'filters' | 'grouping' | 'charts' | 'preview';

export function ReportBuilder({ onClose, onSave, editingReport }: Props) {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ObjectField[]>([]);
  const [showChartHelp, setShowChartHelp] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepType>('object');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewChartData, setPreviewChartData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const previewTimeoutRef = useRef<any>(null);

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

  // Initialize form data from editing report
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

      // Set initial step based on whether we're editing or creating
      setCurrentStep(editingReport ? 'fields' : 'object');
    }
  }, [editingReport]);

  // Fetch fields when object_type changes
  useEffect(() => {
    if (formData.object_type) {
      fetchObjectFields(formData.object_type);
      // If object type changes, auto-advance to fields step
      if (currentStep === 'object') {
        setCurrentStep('fields');
      }
    }
  }, [formData.object_type]);

  // Trigger preview refresh when form data changes
  useEffect(() => {
    if (formData.object_type && formData.selected_fields?.length) {
      // Cancel any pending preview refresh
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }

      // Debounce preview refresh to avoid too many requests
      previewTimeoutRef.current = setTimeout(() => {
        fetchPreviewData();
      }, 1000);
    }

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [formData.object_type, formData.selected_fields, formData.filters, formData.sorting, formData.charts]);

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

      // Combine and transform fields
      const allFields = [
        ...standardFields.map((field: any) => ({
          ...field,
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
      setError('Failed to load fields');
    }
  };

  const fetchPreviewData = async () => {
    if (!formData.object_type || !formData.selected_fields?.length) {
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);

      // Separate standard fields and custom fields (ending with '__c')
      const selectedFields = fields
        .filter(f => f.is_selected)
        .map(f => f.column_name);

      const standardFields = selectedFields.filter(field => !field.endsWith('__c'));
      const customFields = selectedFields.filter(field => field.endsWith('__c'));

      // Build the query for standard fields
      let query = supabase
        .from(formData.object_type)
        .select(standardFields.join(','))
        .eq('organization_id', selectedOrganization?.id)
        .limit(10); // Limit for preview

      // Apply filters
      if (formData.filters?.length) {
        formData.filters.forEach(filter => {
          const { field, operator, value } = filter;

          if (!field || !operator) return;

          if (operator === 'between' && value?.start && value?.end) {
            query = query.gte(field, value.start).lte(field, value.end);
          } else {
            switch (operator) {
              case '=':
                query = query.eq(field, value);
                break;
              case '!=':
                query = query.neq(field, value);
                break;
              case 'like':
                query = query.ilike(field, `%${value}%`);
                break;
              case '>':
                query = query.gt(field, value);
                break;
              case '<':
                query = query.lt(field, value);
                break;
            }
          }
        });
      }

      // Apply sorting
      if (formData.sorting?.length) {
        formData.sorting.forEach(sort => {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        });
      }

      // Get standard field data
      const { data: standardData, error: standardError } = await query;

      if (standardError) throw standardError;

      // If there are custom fields, fetch their values
      let finalData = standardData || [];

      // Process chart data
      let processedChartData: any[] = [];
      if (formData.charts?.length && finalData.length > 0) {
        processedChartData = processChartData(finalData);
      }

      setPreviewData(finalData);
      setPreviewChartData(processedChartData);
    } catch (err) {
      console.error('Error fetching preview data:', err);
      setPreviewError('Failed to load preview data');
    } finally {
      setPreviewLoading(false);
    }
  };

  const processChartData = (rawData: any[]) => {
    const processedData = (formData.charts || []).map(chart => {
      // Skip incomplete chart configurations
      if (!chart.x_field) {
        return { ...chart, data: [] };
      }

      // Group data by x-axis field
      const groupedData = rawData.reduce((acc: any, item: any) => {
        const xValue = item[chart.x_field] || 'Unknown';

        if (!acc[xValue]) {
          acc[xValue] = {
            [chart.x_field]: xValue,
            count: 0,
            sum: 0,
            total: 0,
            records: []
          };
        }

        acc[xValue].count++;
        if (chart.y_field) {
          const value = parseFloat(item[chart.y_field]) || 0;
          acc[xValue].sum += value;
          acc[xValue].total += value;
          acc[xValue].records.push(item);
        }

        return acc;
      }, {});

      // Convert grouped data to array format
      const chartData = Object.values(groupedData).map((group: any) => ({
        name: group[chart.x_field],
        value: chart.aggregation === 'count' ? group.count :
          chart.aggregation === 'sum' ? group.sum :
            chart.aggregation === 'avg' ? (group.total / group.count) : 0
      }));

      return {
        ...chart,
        data: chartData
      };
    });

    return processedData;
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
        organization_id: selectedOrganization?.id,
        created_by: user?.id,
        object_type: tableName,
        created_at: new Date().toISOString(),
        selected_fields: fields.filter(f => f.is_selected).map(f => f.column_name)
      };

      if (editingReport?.id) {
        const { error: updateError } = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', editingReport.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('reports')
          .insert([reportData]);

        if (insertError) throw insertError;
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

  const addChart = () => {
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
  };

  const updateChart = (index: number, updates: Partial<Report['charts'][0]>) => {
    setFormData(prev => ({
      ...prev,
      charts: prev.charts?.map((chart, i) =>
        i === index ? { ...chart, ...updates } : chart
      )
    }));
  };

  const removeChart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      charts: prev.charts?.filter((_, i) => i !== index)
    }));
  };

  const getFieldOptions = (fieldType?: 'date' | 'number' | 'all') => {
    return fields.filter(field => {
      if (!fieldType) return true;
      if (fieldType === 'date') {
        return field.data_type.includes('timestamp') || field.data_type.includes('date');
      }
      if (fieldType === 'number') {
        return field.data_type.includes('int') || field.data_type.includes('decimal') || field.data_type.includes('numeric');
      }
      return true;
    });
  };

  const steps: { key: StepType; label: string; icon: React.ReactNode }[] = [
    { key: 'object', label: 'Select Object', icon: <Database className="w-5 h-5" /> },
    { key: 'fields', label: 'Choose Fields', icon: <Columns className="w-5 h-5" /> },
    { key: 'filters', label: 'Set Filters', icon: <Filter className="w-5 h-5" /> },
    { key: 'charts', label: 'Add Charts', icon: <BarChart2 className="w-5 h-5" /> },
    { key: 'preview', label: 'Preview Report', icon: <Eye className="w-5 h-5" /> }
  ];

  const canAdvance = () => {
    switch (currentStep) {
      case 'object':
        return !!formData.object_type;
      case 'fields':
        return fields.some(f => f.is_selected);
      default:
        return true;
    }
  };

  const goToStep = (step: StepType) => {
    if (step === 'fields' && !formData.object_type) {
      // Can't go to fields without selecting an object
      return;
    }

    setCurrentStep(step);
  };

  const goToNextStep = () => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      goToStep(steps[currentIndex + 1].key);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1].key);
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
        className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {editingReport ? 'Edit Report' : 'Create New Report'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main content with steps and preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar with steps */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 py-6 flex flex-col">
            {/* Report name and type */}
            <div className="px-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name*
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Enter report name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Step navigation */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Report Steps
              </h3>
              <ul className="space-y-1">
                {steps.map((step, index) => (
                  <li key={step.key}>
                    <button
                      type="button"
                      onClick={() => goToStep(step.key)}
                      disabled={step.key === 'fields' && !formData.object_type}
                      className={cn(
                        "flex items-center w-full px-6 py-3 text-left",
                        currentStep === step.key ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100",
                        (step.key === 'fields' && !formData.object_type) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-full mr-3 text-white text-xs",
                        currentStep === step.key ? "bg-blue-600" : "bg-gray-400",
                      )}>
                        {index + 1}
                      </div>
                      <span>{step.label}</span>
                      {currentStep === step.key && (
                        <ChevronRight className="w-5 h-5 ml-auto" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Options and properties */}
            <div className="px-6 pt-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Report Properties
              </h3>
              <div className="space-y-2">
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
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 border-b border-red-100 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {currentStep === 'object' && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Select Object Type</h3>
                  <p className="text-gray-600 mb-4">
                    Choose the type of data you want to report on. This defines the primary object for your report.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {OBJECT_TYPES.map(type => (
                      <div key={type.value} className="col-span-1">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, object_type: type.value }))}
                          className={cn(
                            "w-full p-4 text-left border rounded-lg transition-colors",
                            formData.object_type === type.value
                              ? "bg-blue-50 border-blue-500"
                              : "border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex items-center">
                            <Database className={cn(
                              "w-5 h-5 mr-3",
                              formData.object_type === type.value ? "text-blue-600" : "text-gray-500"
                            )} />
                            <span className={cn(
                              "font-medium",
                              formData.object_type === type.value ? "text-blue-700" : "text-gray-800"
                            )}>
                              {type.label}
                            </span>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 'fields' && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Select Fields to Display</h3>
                  <p className="text-gray-600 mb-4">
                    Choose which fields to include in your report. These fields will be displayed as columns in the results.
                  </p>

                  <div className="bg-gray-50 p-4 rounded-lg mb-4 flex items-center">
                    <Search className="w-5 h-5 text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search fields..."
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {fields.map((field, index) => (
                      <label key={field.column_name} className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50">
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
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {field.display_name || field.column_name}
                          </div>
                          {field.data_type && (
                            <div className="text-xs text-gray-500">{field.data_type}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 'filters' && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Filter Criteria</h3>
                  <p className="text-gray-600 mb-4">
                    Narrow down your results by adding filter conditions. Only records matching these criteria will be included.
                  </p>

                  <div className="space-y-4">
                    {(formData.filters || []).map((filter, index) => {
                      const field = fields.find(f => f.column_name === filter.field);
                      const isDateField = field?.data_type.includes('date') || field?.data_type.includes('timestamp');

                      return (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            {/* Field Selector */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field
                              </label>
                              <select
                                value={filter.field}
                                onChange={e => {
                                  const newFilters = [...formData.filters!];
                                  newFilters[index].field = e.target.value;
                                  setFormData(prev => ({ ...prev, filters: newFilters }));
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                              >
                                <option value="">Select Field</option>
                                {fields.map(f => (
                                  <option key={f.column_name} value={f.column_name}>
                                    {f.display_name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Operator */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Operator
                              </label>
                              <select
                                value={filter.operator}
                                onChange={e => {
                                  const newFilters = [...formData.filters!];
                                  newFilters[index].operator = e.target.value;
                                  setFormData(prev => ({ ...prev, filters: newFilters }));
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                              >
                                {isDateField ? (
                                  <>
                                    <option value="=">Equals</option>
                                    <option value=">">After</option>
                                    <option value="<">Before</option>
                                    <option value="between">Between</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="=">Equals</option>
                                    <option value="!=">Not Equal</option>
                                    <option value="like">Contains</option>
                                    <option value="in">In</option>
                                  </>
                                )}
                              </select>
                            </div>

                            {/* Value Input */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Value
                              </label>
                              {isDateField && filter.operator === 'between' ? (
                                <div className="flex gap-2">
                                  <input
                                    type="date"
                                    value={filter.value?.start || ''}
                                    onChange={e => {
                                      const newFilters = [...formData.filters!];
                                      newFilters[index].value = {
                                        ...newFilters[index].value,
                                        start: e.target.value
                                      };
                                      setFormData(prev => ({ ...prev, filters: newFilters }));
                                    }}
                                    className="px-3 py-2 rounded-lg border border-gray-300 w-full text-sm"
                                  />
                                  <input
                                    type="date"
                                    value={filter.value?.end || ''}
                                    onChange={e => {
                                      const newFilters = [...formData.filters!];
                                      newFilters[index].value = {
                                        ...newFilters[index].value,
                                        end: e.target.value
                                      };
                                      setFormData(prev => ({ ...prev, filters: newFilters }));
                                    }}
                                    className="px-3 py-2 rounded-lg border border-gray-300 w-full text-sm"
                                  />
                                </div>
                              ) : isDateField ? (
                                <input
                                  type="date"
                                  value={filter.value || ''}
                                  onChange={e => {
                                    const newFilters = [...formData.filters!];
                                    newFilters[index].value = e.target.value;
                                    setFormData(prev => ({ ...prev, filters: newFilters }));
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={filter.value || ''}
                                  onChange={e => {
                                    const newFilters = [...formData.filters!];
                                    newFilters[index].value = e.target.value;
                                    setFormData(prev => ({ ...prev, filters: newFilters }));
                                  }}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                                />
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  const newFilters = formData.filters!.filter((_, i) => i !== index);
                                  setFormData(prev => ({ ...prev, filters: newFilters }));
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Filter Button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const newFilter = {
                            field: '',
                            operator: '=',
                            value: ''
                          };
                          setFormData(prev => ({
                            ...prev,
                            filters: [...(prev.filters || []), newFilter]
                          }));
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Filter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 'charts' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">Visualization</h3>
                      <p className="text-gray-600">
                        Add charts to visually represent your data
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowChartHelp(!showChartHelp)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                        title="Chart Help"
                      >
                        <HelpCircle className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={addChart}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Chart
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showChartHelp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 bg-blue-50 p-4 rounded-lg"
                      >
                        <h4 className="font-medium text-blue-900 mb-2">Chart Creation Guide</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {Object.entries(CHART_HELP).map(([type, help]) => (
                            <div key={type} className="bg-white p-4 rounded-md shadow-sm">
                              <h5 className="font-medium text-gray-900 mb-2">{help.title}</h5>
                              <p className="text-gray-600 mb-2">{help.description}</p>
                              <div className="text-sm text-gray-500">
                                <strong>Examples:</strong>
                                <ul className="list-disc list-inside ml-2">
                                  {help.examples.map((example, i) => (
                                    <li key={i}>{example}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    {(formData.charts || []).map((chart, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Chart {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeChart(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Chart Title
                            </label>
                            <input
                              type="text"
                              value={chart.title}
                              onChange={e => updateChart(index, { title: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                              placeholder="e.g., Orders by Month"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Chart Type
                            </label>
                            <select
                              value={chart.type}
                              onChange={e => updateChart(index, { type: e.target.value as 'bar' | 'line' | 'pie' })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                            >
                              <option value="bar">Bar Chart</option>
                              <option value="line">Line Chart</option>
                              <option value="pie">Pie Chart</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              X-Axis Field (Categories)
                            </label>
                            <select
                              value={chart.x_field}
                              onChange={e => updateChart(index, { x_field: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                            >
                              <option value="">Select Field</option>
                              {getFieldOptions().map(field => (
                                <option key={field.column_name} value={field.column_name}>
                                  {field.display_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Y-Axis Aggregation
                            </label>
                            <select
                              value={chart.aggregation || 'count'}
                              onChange={e => updateChart(index, { aggregation: e.target.value as 'count' | 'sum' | 'avg' })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                            >
                              <option value="count">Count Records</option>
                              <option value="sum">Sum Field</option>
                              <option value="avg">Average Field</option>
                            </select>
                          </div>

                          {chart.aggregation && chart.aggregation !== 'count' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Y-Axis Field (Value to {chart.aggregation === 'sum' ? 'Sum' : 'Average'})
                              </label>
                              <select
                                value={chart.y_field}
                                onChange={e => updateChart(index, { y_field: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                              >
                                <option value="">Select Field</option>
                                {getFieldOptions('number').map(field => (
                                  <option key={field.column_name} value={field.column_name}>
                                    {field.display_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Group By (Optional)
                            </label>
                            <select
                              value={chart.group_by || ''}
                              onChange={e => updateChart(index, { group_by: e.target.value || undefined })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-sm"
                            >
                              <option value="">None</option>
                              {getFieldOptions().map(field => (
                                <option key={field.column_name} value={field.column_name}>
                                  {field.display_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 'preview' && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Preview Results</h3>
                  <p className="text-gray-600 mb-4">
                    This is a preview of your report with sample data. Actual results may include more records.
                  </p>

                  {previewError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                      {previewError}
                    </div>
                  )}

                  {previewLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
                        <span className="text-gray-500">Loading preview...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Charts */}
                      {previewChartData.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {previewChartData.map((chart, index) => {
                            if (!chart.data?.length) return null;

                            return (
                              <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                                <h3 className="text-lg font-medium mb-4">{chart.title || `Chart ${index + 1}`}</h3>
                                <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    {chart.type === 'bar' ? (
                                      <BarChart data={chart.data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="name"
                                          angle={-45}
                                          textAnchor="end"
                                          height={80}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar
                                          dataKey="value"
                                          fill="#8884d8"
                                          name={chart.aggregation === 'count' ? 'Count' :
                                            chart.aggregation === 'sum' ? 'Sum' :
                                              'Average'}
                                        />
                                      </BarChart>
                                    ) : chart.type === 'line' ? (
                                      <RechartsLineChart data={chart.data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="name"
                                          angle={-45}
                                          textAnchor="end"
                                          height={80}
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                          type="monotone"
                                          dataKey="value"
                                          stroke="#8884d8"
                                          name={chart.aggregation === 'count' ? 'Count' :
                                            chart.aggregation === 'sum' ? 'Sum' :
                                              'Average'}
                                        />
                                      </RechartsLineChart>
                                    ) : (
                                      <RechartsPieChart>
                                        <Pie
                                          data={chart.data}
                                          dataKey="value"
                                          nameKey="name"
                                          cx="50%"
                                          cy="50%"
                                          outerRadius={80}
                                          label
                                        >
                                          {chart.data.map((entry: any, index: number) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={COLORS[index % COLORS.length]}
                                            />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                      </RechartsPieChart>
                                    )}
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Data Table */}
                      <div className="bg-white rounded-lg shadow border border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {fields.filter(f => f.is_selected).map(field => (
                                  <th
                                    key={field.column_name}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {field.display_name || field.column_name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {previewData.length > 0 ? (
                                previewData.map((row, i) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {fields.filter(f => f.is_selected).map((field, j) => (
                                      <td
                                        key={j}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                      >
                                        {typeof row[field.column_name] === 'object'
                                          ? JSON.stringify(row[field.column_name])
                                          : row[field.column_name] ?? ''}
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={fields.filter(f => f.is_selected).length}
                                    className="px-6 py-4 text-center text-sm text-gray-500"
                                  >
                                    No data available for preview
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {previewData.length > 0 && (
                          <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
                            Showing {previewData.length} records (preview limited to 10 rows)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep === 'object'}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md",
                  currentStep === 'object'
                    ? "opacity-50 cursor-not-allowed text-gray-400 border border-gray-200"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                Back
              </button>

              {currentStep === 'preview' ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !formData.name || !formData.object_type}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Report'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!canAdvance()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm font-medium"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}