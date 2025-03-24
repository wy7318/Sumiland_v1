import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit, Download, RefreshCw } from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell, ResponsiveContainer 
} from 'recharts';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useOrganization } from '../../../contexts/OrganizationContext';

type Props = {
  report: Report;
  onClose: () => void;
  onEdit: (report: Report) => void;
};

type Report = {
  id: string;
  name: string;
  description: string | null;
  object_type: string;
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
  selected_fields: string[];
  is_template: boolean;
  template_id: string | null;
};

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe',
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
];

export function ReportViewer({ report, onClose, onEdit }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { selectedOrganization } = useOrganization();
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReportData();
  }, [report]);

  const processChartData = (rawData: any[]) => {
    const processedData = report.charts.map(chart => {
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

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Separate standard fields and custom fields (ending with '__c')
      const standardFields = report.selected_fields.filter(field => !field.endsWith('__c'));
      const customFields = report.selected_fields.filter(field => field.endsWith('__c'));
  
      console.log('Standard Fields:', standardFields);
      console.log('Custom Fields:', customFields);
  
      // Build the query for standard fields
      let query = supabase
        .from(report.object_type)
        .select(standardFields.join(','))
        .eq('organization_id', selectedOrganization?.id);
  
      // Apply filters
      report.filters.forEach(filter => {
        const { field, operator, value } = filter;

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

  
      // Apply date range if specified
      if (report.date_range?.field && report.date_range.start) {
        query = query.gte(report.date_range.field, report.date_range.start);
        if (report.date_range.end) {
          query = query.lte(report.date_range.field, report.date_range.end);
        }
      }
  
      // Apply sorting
      report.sorting.forEach(sort => {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      });
  
      // Get standard field data
      const { data: standardData, error: standardError } = await query;
      if (standardError) throw standardError;
  
      console.log('Standard Data:', standardData);
  
      // If there are custom fields, fetch their values
      let customData: Record<string, any>[] = [];
      let customFieldLabels: Record<string, string> = {}; // Map custom field names to their labels
      if (customFields.length > 0) {
        // Extract custom field names (remove '__c' suffix)
        const customFieldNames = customFields.map(field => field);
  
        console.log('Custom Field Names (without __c):', customFieldNames);
  
        // Get custom field definitions (including field_label)
        const { data: fieldDefs, error: fieldDefsError } = await supabase
          .from('custom_fields')
          .select('id, field_name, field_label')
          .in('field_name', customFieldNames)
          .eq('organization_id', selectedOrganization?.id);
  
        if (fieldDefsError) throw fieldDefsError;
  
        console.log('Custom Field Definitions:', fieldDefs);
  
        // Create a mapping of custom field names to their labels
        fieldDefs.forEach(def => {
          customFieldLabels[`${def.field_name}`] = def.field_label;
        });
  
        console.log('Custom Field Labels:', customFieldLabels);
  
        // Get custom field values for each record
        const { data: fieldValues, error: fieldValuesError } = await supabase
          .from('custom_field_values')
          .select('entity_id, field_id, value')
          .in('entity_id', standardData.map(record => record.id))
          .in('field_id', fieldDefs.map(def => def.id))
          .eq('organization_id', selectedOrganization?.id);
  
        if (fieldValuesError) throw fieldValuesError;
  
        console.log('Custom Field Values:', fieldValues);
  
        // Merge custom field values into standard data
        customData = standardData.map(record => {
          const customValues = fieldValues
            .filter(value => value.entity_id === record.id)
            .reduce((acc, value) => {
              const fieldDef = fieldDefs.find(def => def.id === value.field_id);
              if (fieldDef) {
                acc[`${fieldDef.field_name}`] = value.value;
              }
              return acc;
            }, {} as Record<string, any>);
          return { ...record, ...customValues };
        });
  
        console.log('Merged Data with Custom Fields:', customData);
      }
  
      // Use merged data or standard data
      const finalData = customData.length > 0 ? customData : standardData;
  
      console.log('Final Data:', finalData);
  
      // Process data for charts
      const processedChartData = processChartData(finalData);
      setChartData(processedChartData);
      setData(finalData || []);
  
      // Store custom field labels for rendering
      setCustomFieldLabels(customFieldLabels);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  const handleExport = () => {
    // Export data as CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );
    const csv = `${headers}\n${rows.join('\n')}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">{report.name}</h2>
            {report.description && (
              <p className="text-gray-600 mt-1">{report.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <RefreshCw className={cn(
                "w-5 h-5",
                refreshing && "animate-spin"
              )} />
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => onEdit(report)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Charts */}
            {report.charts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {chartData.map((chart, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium mb-4">{chart.title}</h3>
                    <div className="h-80">
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
                          <LineChart data={chart.data}>
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
                          </LineChart>
                        ) : (
                          <PieChart>
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
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {report.selected_fields.map(key => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {customFieldLabels[key] || key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((row, i) => (
                    <tr key={i}>
                      {report.selected_fields.map((field: any, j) => (
                        <td
                          key={j}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {typeof row[field] === 'object' ? JSON.stringify(row[field]) : row[field] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}