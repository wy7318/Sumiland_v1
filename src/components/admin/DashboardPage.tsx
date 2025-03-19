import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, BarChart2, LineChart, PieChart, Star, StarOff, FolderPlus,
  AlertCircle, Settings, Share2, RefreshCw
} from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { ReportBuilder } from './reports/ReportBuilder';
import { ReportViewer } from './reports/ReportViewer';
import { ReportFolderList } from './reports/ReportFolderList';
import { ResponsiveLine } from '@nivo/line'; // Install: npm i @nivo/line @nivo/core
import { ResponsiveBar } from '@nivo/bar'; // Install: npm i @nivo/bar @nivo/core
import { ResponsivePie } from '@nivo/pie'; // Import npm i @nivo/pie @nivo/core



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

const MODULES = [
  { name: 'Opportunities', table: 'opportunities', icon: '💼', color: 'bg-purple-100 text-purple-800', idField: 'id', nameField: 'name', route: 'opportunities' },
  { name: 'Quotes', table: 'quote_hdr', icon: '📝', color: 'bg-pink-100 text-pink-800', idField: 'quote_id', nameField: 'quote_number', route: 'quotes' },
  { name: 'Orders', table: 'order_hdr', icon: '📦', color: 'bg-red-100 text-red-800', idField: 'order_id', nameField: 'order_number', route: 'orders' },
  { name: 'Cases', table: 'cases', icon: '📋', color: 'bg-blue-100 text-blue-800', idField: 'id', nameField: 'title', route: 'cases' },
  { name: 'Leads', table: 'leads', icon: '📋', color: 'bg-blue-100 text-blue-800', idField: 'id', nameField: 'company', route: 'leads' },
  { name: 'Accounts', table: 'vendors', icon: '🏢', color: 'bg-yellow-100 text-yellow-800', idField: 'id', nameField: 'name', route: 'vendors' },
  { name: 'Customers', table: 'customers', icon: '👤', color: 'bg-green-100 text-green-800', idField: 'customer_id', nameField: 'company', route: 'customers' }
];

function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring({ val: value, from: { val: 0 }, config: { tension: 170, friction: 26 } });

  return (
    <animated.p className="text-3xl font-bold text-gray-800">
      {spring.val.to((val) => Math.floor(val))}
    </animated.p>
  );
}


export function DashboardPage() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any>({});
  const [rangeType, setRangeType] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const chartColors = {
    Opportunities: '#8b5cf6',
    Quotes: '#ec4899',
    Orders: '#f43f5e',
  };

  const chartCurves = {
    Opportunities: 'monotoneX',
    Quotes: 'natural',
    Orders: 'linear',
  };

  const [totalsByDay, setTotalsByDay] = useState({
    opportunities: 0,
    quotes: 0,
    orders: 0
  });

  useEffect(() => {
    fetchReports();
  }, [selectedOrganization]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (range: 'daily' | 'monthly' | 'yearly' | 'custom' = 'daily') => {
    setLoading(true);

    let startDate: string;
    const today = new Date();

    switch (range) {
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString();
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) {
          alert('Please select both start and end dates.');
          setLoading(false);
          return;
        }
        startDate = new Date(customStartDate).toISOString();
        break;
      case 'daily':
      default:
        startDate = new Date(today.toISOString().split('T')[0] + 'T00:00:00Z').toISOString();
        break;
    }

    const endDate = range === 'custom' ? new Date(customEndDate).toISOString() : today.toISOString();

    const results: any = {};

    for (const module of MODULES) {
      // Base fields to select
      let selectFields = `${module.idField}, ${module.nameField}, created_at`;

      // Add fields for amount calculations
      if (module.table === 'opportunities') {
        selectFields += ', amount';
      } else if (module.table === 'quote_hdr' || module.table === 'order_hdr') {
        selectFields += ', total_amount';
      }

      // Add fields needed for PieChart grouping toggle
      let extraFields = '';
      if (module.name === 'Leads') {
        extraFields = ', status, lead_source';
      } else if (module.name === 'Cases') {
        extraFields = ', status, type';
      } else if (module.name === 'Accounts') {
        extraFields = ', status, type';
      } else if (module.name === 'Customers') {
        extraFields = ', type';
      }

      selectFields += extraFields;

      // Query records with all necessary fields
      const { data: records, error } = await supabase
        .from(module.table)
        .select(selectFields)
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      // Query count for summary
      const { count, error: countError } = await supabase
        .from(module.table)
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Log any errors
      if (error || countError) {
        console.error(`Error loading ${module.name}:`, error || countError);
      }

      // Save results
      results[module.table] = {
        records: records || [],
        count: count || 0
      };
    }



    // Fetch total amounts in range
    const [oppTotalRes, quoteTotalRes, orderTotalRes] = await Promise.all([
      supabase.from('opportunities')
        .select('amount')
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase.from('quote_hdr')
        .select('total_amount')
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase.from('order_hdr')
        .select('total_amount')
        .eq('organization_id', selectedOrganization?.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    ]);

    const oppTotal = oppTotalRes.data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const quoteTotal = quoteTotalRes.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
    const orderTotal = orderTotalRes.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;

    setTotalsByDay({
      opportunities: oppTotal,
      quotes: quoteTotal,
      orders: orderTotal
    });

    setData(results);
    setLoading(false);
  };

  function PieChartCard({ records, moduleName }) {
    const [groupByField, setGroupByField] = useState(() => {
      if (moduleName === 'Leads') return 'status';
      if (moduleName === 'Cases') return 'status';
      if (moduleName === 'Accounts') return 'status';
      if (moduleName === 'Customers') return 'type';
      return 'status';
    });

    const toggleOptions = () => {
      if (moduleName === 'Leads') {
        setGroupByField(prev => (prev === 'status' ? 'lead_source' : 'status'));
      } else if (moduleName === 'Cases') {
        setGroupByField(prev => (prev === 'status' ? 'type' : 'status'));
      } else if (moduleName === 'Accounts') {
        setGroupByField(prev => (prev === 'status' ? 'type' : 'status'));
      }
      // Customers always use 'type' – no toggle needed
    };

    if (!records || records.length === 0) return <p className="text-xs text-gray-400 italic">No data for pie chart</p>;

    const grouped = {};
    records.forEach(record => {
      const key = record[groupByField] || 'Unknown';
      grouped[key] = (grouped[key] || 0) + 1;
    });

    const pieData = Object.keys(grouped).map(key => ({
      id: key,
      label: key,
      value: grouped[key],
    }));

    const showToggle = moduleName === 'Leads' || moduleName === 'Cases' || moduleName === 'Accounts';

    return (
      <div className="space-y-2">
        {showToggle && (
          <button
            onClick={toggleOptions}
            className="text-xs px-2 py-1 rounded font-medium border bg-gray-100 hover:bg-gray-200"
          >
            Group by: {groupByField}
          </button>
        )}

        <div className="h-60">
          <ResponsivePie
            data={pieData}
            margin={{ top: 40, right: 20, bottom: 40, left: 20 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            colors={{ scheme: 'paired' }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            radialLabelsSkipAngle={10}
            radialLabelsTextColor="#333333"
            radialLabelsLinkColor={{ from: 'color' }}
            sliceLabelsSkipAngle={10}
            sliceLabelsTextColor="#ffffff"
            tooltip={({ datum }) => (
              <div className="bg-white px-2 py-1 border rounded shadow text-xs">
                <strong>{datum.id}</strong>: {datum.value}
              </div>
            )}
          />
        </div>
      </div>
    );
  }


  function ChartWithToggle({
    records,
    rangeType,
    moduleName
  }: {
    records: any[];
    rangeType: string;
    moduleName: string;
  }) {
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');

    const groupedData = prepareLineChartData(records, rangeType, moduleName);
    const barData = groupedData[0]?.data || [];

    if (!groupedData.length || barData.length === 0) {
      return <p className="text-xs text-gray-400 italic mt-2">No data for chart</p>;
    }

    return (
      <div className="space-y-2">
        {/* Toggle Buttons ABOVE Graph */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setChartType('line')}
            className={cn("text-xs px-2 py-1 rounded font-medium border",
              chartType === 'line' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300')}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={cn("text-xs px-2 py-1 rounded font-medium border",
              chartType === 'bar' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300')}
          >
            Bar
          </button>
        </div>

        {/* Chart Display */}
        <div className="h-40">
          {chartType === 'line' ? (
            <ResponsiveLine
              data={groupedData}
              margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
              curve={chartCurves[moduleName]}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                legend: 'Time',
                legendOffset: 25,
                legendPosition: 'middle'
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                legend: 'Amount',
                legendOffset: -35,
                legendPosition: 'middle'
              }}
              enablePoints={true}
              pointSize={6}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              useMesh={true}
              enableGridX={false}
              colors={[chartColors[moduleName]]}
              tooltip={({ point }) => (
                <div className="bg-white px-2 py-1 border rounded shadow text-xs">
                  <strong>{point.data.xFormatted}</strong>: ${point.data.yFormatted}
                </div>
              )}
            />
          ) : (
            <ResponsiveBar
              data={barData}
              keys={['y']}
              indexBy="x"
              margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
              padding={0.3}
              colors={[chartColors[moduleName]]}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                legend: 'Time',
                legendOffset: 25,
                legendPosition: 'middle'
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                legend: 'Amount',
                legendOffset: -35,
                legendPosition: 'middle'
              }}
              tooltip={({ data }) => (
                <div className="bg-white px-2 py-1 border rounded shadow text-xs">
                  <strong>{data.x}</strong>: ${data.y}
                </div>
              )}
            />
          )}
        </div>
      </div>
    );
  }



  function prepareLineChartData(records: any[], rangeType: string, moduleName: string) {
    if (!records || records.length === 0) return [];

    // Determine group key function based on rangeType
    const groupKeyFn = (date: Date) => {
      if (rangeType === 'daily') return date.getHours(); // 0–23
      if (rangeType === 'monthly') return date.getDate(); // 1–31
      if (rangeType === 'yearly') return date.getMonth() + 1; // 1–12

      // Custom Range Grouping
      const now = new Date();
      const rangeDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
      if (rangeDays < 30) return date.getDate(); // Day
      if (rangeDays < 365) return date.getMonth() + 1; // Month
      return date.getFullYear(); // Year
    };

    // Grouped amount sum
    const grouped: { [key: string]: number } = {};

    records.forEach(record => {
      const createdAt = record.created_at ? new Date(record.created_at) : null;
      if (!createdAt || isNaN(createdAt.getTime())) return;

      // Correct field based on module
      let amount = 0;
      if (moduleName === 'Opportunities') amount = record.amount ?? 0;
      else if (moduleName === 'Quotes' || moduleName === 'Orders') amount = record.total_amount ?? 0;

      const key = groupKeyFn(createdAt).toString();
      grouped[key] = (grouped[key] || 0) + amount;
    });

    // Sort by time key
    const sortedKeys = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
    const dataPoints = sortedKeys.map(key => ({
      x: key,
      y: parseFloat(grouped[key].toFixed(2)) // format to 2 decimal places
    }));
    console.log(`[${moduleName}] Chart Data:`, dataPoints);


    return [
      {
        id: `${moduleName} Amount`,
        color: 'hsl(220, 70%, 50%)',
        data: dataPoints
      }
    ];
  }






  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const { error } = await supabase
        .from('reports')
        .update({ is_favorite: !report.is_favorite })
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to update report');
    }
  };

  const handleShareToggle = async (reportId: string) => {
    try {
      const report = reports.find(r => r.id === reportId);
      if (!report) return;

      const { error } = await supabase
        .from('reports')
        .update({ is_shared: !report.is_shared })
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error toggling share:', err);
      setError(err instanceof Error ? err.message : 'Failed to update report');
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      await fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete report');
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setShowReportBuilder(true);
  };

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteReports = filteredReports.filter(report => report.is_favorite);
  const otherReports = filteredReports.filter(report => !report.is_favorite);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Key Metrics</h1>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {['daily', 'monthly', 'yearly'].map(type => (
            <button
              key={type}
              onClick={() => {
                setRangeType(type as any);
                fetchData(type as any);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium border shadow-sm transition",
                rangeType === type
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setRangeType('custom')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium border shadow-sm transition",
              rangeType === 'custom'
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            Custom Range
          </button>
        </div>

        {rangeType === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm"
            />
            <span className="text-sm text-gray-500">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm"
            />
            <button
              onClick={() => fetchData('custom')}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 shadow"
            >
              Apply
            </button>
          </div>
        )}
      </div>



      <div className="flex justify-between items-center">

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          aria-label="Refresh Metrics"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </button>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Show skeleton loaders while loading
          Array.from({ length: MODULES.length }).map((_, index) => (
            <SkeletonLoader key={index} />
          ))
        ) : (
          // Show actual content when data is loaded
          MODULES.map(module => {
            const moduleData = data[module.table] || { records: [], count: 0 };
            const isTopCard = ['Opportunities', 'Quotes', 'Orders'].includes(module.name);


            return (
              <motion.div
                key={module.table}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl p-5 hover:scale-[1.02] transition-transform"

              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-3xl ${module.color} px-3 py-1 rounded-xl shadow-inner`}>
                    {module.icon}
                  </div>
                  <Link
                    to={`/admin/${module.route}`}
                    className="text-sm text-primary-600 hover:underline font-medium"
                  >
                    View All
                  </Link>
                </div>

                <h2 className="text-lg font-semibold mb-2 text-gray-800">{module.name}</h2>

                <div className="mb-3 space-y-2">
                  <AnimatedCount value={moduleData.count} />
                  <p className={cn("text-sm font-medium",
                    module.name === 'Opportunities' && "text-purple-600",
                    module.name === 'Quotes' && "text-pink-600",
                    module.name === 'Orders' && "text-red-600"
                  )}>
                    Total: $
                    {(module.name === 'Opportunities'
                      ? totalsByDay.opportunities
                      : module.name === 'Quotes'
                        ? totalsByDay.quotes
                        : module.name === 'Orders'
                          ? totalsByDay.orders
                          : 0
                    ).toLocaleString()}
                  </p>

                  {/* Line Chart */}
                  {module.name === 'Opportunities' || module.name === 'Quotes' || module.name === 'Orders' ? (
                    <ChartWithToggle
                      records={moduleData.records}
                      rangeType={rangeType}
                      moduleName={module.name}
                    />
                  ) : (
                    <PieChartCard
                      records={moduleData.records}
                      moduleName={module.name}
                      groupByField={
                        module.name === 'Leads' ? 'lead_source' :
                          module.name === 'Cases' ? 'type' :
                            module.name === 'Accounts' ? 'type' :
                              module.name === 'Customers' ? 'type' :
                                'status'
                      }
                    />
                  )}

                </div>


                <div className="space-y-2 text-sm text-gray-600">
                  {moduleData.records.length > 0 ? (
                    moduleData.records.slice(0, 3).map((rec: any) => (
                      <Link
                        to={`/admin/${module.route}/${rec[module.idField]}`}
                        key={rec[module.idField]}
                        className="block p-2 rounded-lg hover:bg-gray-100 transition"
                      >
                        <p className="font-medium text-gray-800">{rec[module.nameField] || 'No Title'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(rec.created_at).toLocaleString()}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-400">No new records</p>
                  )}
                </div>
              </motion.div>

            );
          })
        )}
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => {
            setEditingReport(null);
            setShowReportBuilder(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Report
        </button>

      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Favorite Reports */}
      {favoriteReports.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Favorite Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onFavorite={handleFavoriteToggle}
                onShare={handleShareToggle}
                onDelete={handleDelete}
                onSelect={setSelectedReport}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Reports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onFavorite={handleFavoriteToggle}
              onShare={handleShareToggle}
              onDelete={handleDelete}
              onSelect={setSelectedReport}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>

      {/* Report Builder Modal */}
      {showReportBuilder && (
        <ReportBuilder
          onClose={() => {
            setShowReportBuilder(false);
            setEditingReport(null);
          }}
          onSave={fetchReports}
          editingReport={editingReport}
        />
      )}

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onEdit={() => {
            setSelectedReport(null);
            handleEdit(selectedReport);
          }}
        />
      )}
    </div>
  );
}

type ReportCardProps = {
  report: Report;
  onFavorite: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (report: Report) => void;
  onEdit: (report: Report) => void;
};

function SkeletonLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="h-6 w-24 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <div className="h-8 w-16 bg-gray-200 rounded mb-4 animate-pulse"></div>
      <div className="space-y-2">
        {[1, 2, 3].map((_, index) => (
          <div key={index} className="p-2 rounded-lg">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-24 bg-gray-200 rounded mt-1 animate-pulse"></div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ReportCard({ report, onFavorite, onShare, onDelete, onSelect, onEdit }: ReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium">{report.name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onFavorite(report.id)}
              className={cn(
                "p-1 rounded-full",
                report.is_favorite
                  ? "text-yellow-500 hover:bg-yellow-50"
                  : "text-gray-400 hover:bg-gray-50"
              )}
            >
              {report.is_favorite ? (
                <Star className="w-5 h-5" />
              ) : (
                <StarOff className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onShare(report.id)}
              className={cn(
                "p-1 rounded-full",
                report.is_shared
                  ? "text-primary-500 hover:bg-primary-50"
                  : "text-gray-400 hover:bg-gray-50"
              )}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {report.description && (
          <p className="text-sm text-gray-600 mb-4">{report.description}</p>
        )}

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Settings className="w-4 h-4 mr-1" />
          {report.object_type}
          {report.charts.length > 0 && (
            <>
              <span className="mx-2">•</span>
              {report.charts.map(chart => {
                switch (chart.type) {
                  case 'bar':
                    return <BarChart2 key={chart.title} className="w-4 h-4 text-primary-500" />;
                  case 'line':
                    return <LineChart key={chart.title} className="w-4 h-4 text-green-500" />;
                  case 'pie':
                    return <PieChart key={chart.title} className="w-4 h-4 text-purple-500" />;
                  default:
                    return null;
                }
              })}
            </>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => onSelect(report)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View Report
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(report)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded-full"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(report.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded-full"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}