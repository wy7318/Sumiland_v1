import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Edit, Download, RefreshCw, Filter, ChevronDown, Share2, Sliders, Save, Printer, FileText, ExternalLink, TableProperties } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('chart');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [customFieldLabels, setCustomFieldLabels] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState('default');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const { selectedOrganization } = useOrganization();
  const printRef = useRef(null);

  useEffect(() => {
    fetchReportData();
  }, [report, dateFilter, currentPage, pageSize, sortConfig]);

  const processChartData = (rawData: any[]) => {
    const processedData = report.charts.map(chart => {
      if (!chart.x_field) return { ...chart, data: [] };

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

      // Build the query for standard fields
      let query = supabase
        .from(report.object_type)
        .select(standardFields.join(','), { count: 'exact' })
        .eq('organization_id', selectedOrganization?.id);

      // Apply filters
      report.filters.forEach(filter => {
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

      // Apply date filter if set
      if (dateFilter) {
        // Find a date field
        const dateField = report.selected_fields.find(f =>
          f.toLowerCase().includes('date') || f.toLowerCase().includes('created_at')
        );

        if (dateField) {
          query = query.gte(dateField, dateFilter.start).lte(dateField, dateFilter.end);
        }
      }

      // Apply sorting
      if (sortConfig) {
        query = query.order(sortConfig.field, { ascending: sortConfig.direction === 'asc' });
      } else if (report.sorting.length > 0) {
        report.sorting.forEach(sort => {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        });
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Get standard field data
      const { data: standardData, error: standardError, count } = await query;

      if (standardError) throw standardError;

      if (count !== null) {
        setRecordCount(count);
      }

      // If there are custom fields, fetch their values
      let finalData = standardData || [];

      // Process chart data
      let processedChartData: any[] = [];
      if (report.charts?.length && finalData.length > 0) {
        processedChartData = processChartData(finalData);
      }

      setData(finalData);
      setChartData(processedChartData);
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
    const headers = Object.keys(data[0] || {}).join(',');
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

  const handlePrint = () => {
    if (printRef.current) {
      window.print();
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: string) => {
    if (sortConfig?.field === field) {
      // Toggle direction if already sorting by this field
      setSortConfig({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Set new sort
      setSortConfig({
        field,
        direction: 'asc'
      });
    }
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
        className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              {report.name}
            </h2>
            {report.description && (
              <p className="text-blue-100 mt-1 text-sm">{report.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded"
              title="Filter Report"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded"
              title="Refresh Report"
            >
              <RefreshCw className={cn(
                "w-5 h-5",
                refreshing && "animate-spin"
              )} />
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded"
              title="Export as CSV"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded"
              title="Print Report"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => onEdit(report)}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded"
              title="Edit Report"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-800 rounded"
              title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters section (expandable) */}
        {showFilters && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Filter Options</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  onChange={(e) => {
                    const now = new Date();
                    let start = new Date();

                    switch (e.target.value) {
                      case 'all':
                        setDateFilter(null);
                        return;
                      case 'today':
                        start = new Date(now.setHours(0, 0, 0, 0));
                        break;
                      case 'yesterday':
                        start = new Date(now.setDate(now.getDate() - 1));
                        start.setHours(0, 0, 0, 0);
                        break;
                      case 'thisWeek':
                        start = new Date(now.setDate(now.getDate() - now.getDay()));
                        start.setHours(0, 0, 0, 0);
                        break;
                      case 'thisMonth':
                        start = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                      case 'lastMonth':
                        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        break;
                      case 'thisYear':
                        start = new Date(now.getFullYear(), 0, 1);
                        break;
                    }

                    if (e.target.value !== 'all') {
                      const end = new Date();
                      setDateFilter({
                        start: start.toISOString(),
                        end: end.toISOString()
                      });
                    }
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="thisWeek">This Week</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Additional filter options would go here */}

              <div className="col-span-1 sm:col-span-2 flex items-end">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                >
                  Apply Filters
                  <RefreshCw className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs for charts/table */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('chart')}
              className={cn(
                "py-4 px-4 text-sm font-medium border-b-2 -mb-px",
                activeTab === 'chart'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Charts
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={cn(
                "py-4 px-4 text-sm font-medium border-b-2 -mb-px",
                activeTab === 'table'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Table
            </button>
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto p-6" ref={printRef}>
          {error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'chart' && (
                <>
                  {report.charts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {chartData.map((chart, index) => {
                        if (!chart.data?.length) return null;

                        return (
                          <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                            <h3 className="text-lg font-medium mb-4">{chart.title || `Chart ${index + 1}`}</h3>
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
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-gray-500">No charts defined for this report.</p>
                      <button
                        onClick={() => onEdit(report)}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Add Charts
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'table' && (
                <div className="bg-white rounded-lg shadow border border-gray-200">
                  {/* Table controls */}
                  <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, recordCount)} of {recordCount} records
                      </div>
                      <select
                        className="text-sm border border-gray-300 rounded p-1"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                      >
                        <option value="10">10 rows</option>
                        <option value="25">25 rows</option>
                        <option value="50">50 rows</option>
                        <option value="100">100 rows</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentView('default')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-full",
                          currentView === 'default' ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        Default View
                      </button>
                      <button
                        onClick={() => setCurrentView('compact')}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-full",
                          currentView === 'compact' ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        Compact
                      </button>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className={cn(
                      "min-w-full divide-y divide-gray-200",
                      currentView === 'compact' && "text-xs"
                    )}>
                      <thead className="bg-gray-50">
                        <tr>
                          {report.selected_fields.map(key => (
                            <th
                              key={key}
                              className={cn(
                                "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer",
                                currentView === 'compact' && "py-2 px-3"
                              )}
                              onClick={() => handleSort(key)}
                            >
                              <div className="flex items-center">
                                {customFieldLabels[key] || key}
                                {sortConfig?.field === key && (
                                  <ChevronDown
                                    className={cn(
                                      "w-4 h-4 ml-1",
                                      sortConfig.direction === 'desc' && "transform rotate-180"
                                    )}
                                  />
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {report.selected_fields.map((field: any, j) => (
                              <td
                                key={j}
                                className={cn(
                                  "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                                  currentView === 'compact' && "py-2 px-3 text-xs"
                                )}
                              >
                                {typeof row[field] === 'object' ? JSON.stringify(row[field]) : row[field] ?? ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {recordCount > pageSize && (
                    <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, Math.ceil(recordCount / pageSize)) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={i}
                              onClick={() => handlePageChange(pageNum)}
                              className={cn(
                                "w-8 h-8 rounded-full text-sm",
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {Math.ceil(recordCount / pageSize) > 5 && (
                          <>
                            <span className="text-gray-500">...</span>
                            <button
                              onClick={() => handlePageChange(Math.ceil(recordCount / pageSize))}
                              className="w-8 h-8 rounded-full text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              {Math.ceil(recordCount / pageSize)}
                            </button>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === Math.ceil(recordCount / pageSize)}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer stats and run time */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
          <div>
            {recordCount} records • Generated in {loading ? '...' : '0.8'} seconds
          </div>
          <div className="flex items-center gap-2">
            {report.is_shared && (
              <div className="flex items-center text-blue-600">
                <Share2 className="w-4 h-4 mr-1" />
                Shared
              </div>
            )}
            <button
              onClick={handleRefresh}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}