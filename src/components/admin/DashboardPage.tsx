import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw
} from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { MiniTaskCalendar } from './MiniTaskCalendar';
import { DateTime } from 'luxon';

const MODULES = [
  { name: 'Cases', table: 'cases', icon: '📋', color: 'bg-blue-100 text-blue-800', idField: 'id', nameField: 'title', route: 'cases' },
  { name: 'Leads', table: 'leads', icon: '📋', color: 'bg-blue-100 text-blue-800', idField: 'id', nameField: 'company', route: 'leads' },
  { name: 'Accounts', table: 'vendors', icon: '🏢', color: 'bg-yellow-100 text-yellow-800', idField: 'id', nameField: 'name', route: 'vendors' },
  { name: 'Customers', table: 'customers', icon: '👤', color: 'bg-green-100 text-green-800', idField: 'customer_id', nameField: 'company', route: 'customers' },
  { name: 'Opportunities', table: 'opportunities', icon: '💼', color: 'bg-purple-100 text-purple-800', idField: 'id', nameField: 'name', route: 'opportunities' },
  { name: 'Quotes', table: 'quote_hdr', icon: '📝', color: 'bg-pink-100 text-pink-800', idField: 'quote_id', nameField: 'quote_number', route: 'quotes' },
  { name: 'Orders', table: 'order_hdr', icon: '📦', color: 'bg-red-100 text-red-800', idField: 'order_id', nameField: 'order_number', route: 'orders' }
];

function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring({ val: value, from: { val: 0 }, config: { tension: 170, friction: 26 } });

  return (
    <animated.p className="text-3xl font-bold text-gray-800">
      {spring.val.to((val) => Math.floor(val))}
    </animated.p>
  );
}

function formatDateToOrgTimezone(date: string | Date, timezone: string = 'UTC') {
  if (!date) return 'Invalid date';

  try {
    const iso = typeof date === 'string' ? date : date.toISOString();
    const dateTime = DateTime.fromISO(iso, { zone: 'utc' });

    if (!dateTime.isValid) {
      console.error("Invalid DateTime created:", dateTime.invalidReason, dateTime.invalidExplanation);
      return 'Invalid date';
    }

    const converted = dateTime.setZone(timezone);

    if (!converted.isValid) {
      console.error("Invalid timezone conversion:", converted.invalidReason, converted.invalidExplanation);
      return 'Timezone error';
    }

    return converted.toFormat('MMM dd, yyyy, h:mm:ss a');
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Date error';
  }
}

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [orgTimezone, setOrgTimezone] = useState<string>('UTC');
  const [timezoneLoaded, setTimezoneLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
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
    const fetchOrgTimezone = async () => {
      if (!selectedOrganization?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('timezone')
          .eq('id', selectedOrganization.id)
          .single();

        if (error) {
          console.error('Error fetching organization timezone:', error);
          return;
        }

        if (data?.timezone) {
          setOrgTimezone(data.timezone);
        }
      } catch (err) {
        console.error('Error in fetchOrgTimezone:', err);
      } finally {
        setTimezoneLoaded(true);
      }
    };

    fetchOrgTimezone();
  }, [selectedOrganization?.id]);

  useEffect(() => {
    if (timezoneLoaded) {
      console.log("Organization timezone loaded:", orgTimezone);
      fetchData(rangeType);
    }
  }, [timezoneLoaded, orgTimezone]);

  const fetchData = async (range: 'daily' | 'monthly' | 'yearly' | 'custom' = 'daily') => {
    setLoading(true);

    let startDate: string;
    let endDate: string;

    const today = DateTime.now().setZone(orgTimezone);
    console.log("Organization timezone:", selectedOrganization?.timezone);
    console.log("today:", today);

    switch (range) {
      case 'daily': {
        const start = today.startOf('day').toUTC();
        const end = today.endOf('day').toUTC();
        startDate = start.toISO();
        endDate = end.toISO();
        break;
      }

      case 'monthly': {
        const start = today.startOf('month').toUTC();
        const end = today.endOf('month').toUTC();
        startDate = start.toISO();
        endDate = end.toISO();
        break;
      }

      case 'yearly': {
        const start = today.startOf('year').toUTC();
        const end = today.endOf('year').toUTC();
        startDate = start.toISO();
        endDate = end.toISO();
        break;
      }

      case 'custom': {
        if (!customStartDate || !customEndDate) {
          alert('Please select both start and end dates.');
          setLoading(false);
          return;
        }
        const start = DateTime.fromISO(customStartDate, { zone: orgTimezone }).startOf('day').toUTC();
        const end = DateTime.fromISO(customEndDate, { zone: orgTimezone }).endOf('day').toUTC();
        startDate = start.toISO();
        endDate = end.toISO();
        break;
      }
      default:
        const fallbackStart = today.startOf('day').toUTC();
        const fallbackEnd = today.endOf('day').toUTC();
        startDate = fallbackStart.toISO();
        endDate = fallbackEnd.toISO();
        break;
    }

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
              margin={{ top: 10, right: 40, bottom: 30, left: 40 }}
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
              margin={{ top: 10, right: 40, bottom: 30, left: 40 }}
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

    const grouped: { [timestamp: string]: { label: string, total: number } } = {};

    records.forEach(record => {
      const createdAt = record.created_at ? new Date(record.created_at) : null;
      if (!createdAt || isNaN(createdAt.getTime())) return;

      let amount = 0;
      if (moduleName === 'Opportunities') amount = record.amount ?? 0;
      else if (moduleName === 'Quotes' || moduleName === 'Orders') amount = record.total_amount ?? 0;

      let label = '';
      let groupKey = ''; // Used as timestamp for sorting

      switch (rangeType) {
        case 'daily':
          label = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // "14:00"
          groupKey = createdAt.setMinutes(0, 0, 0).toString(); // Hour precision
          break;
        case 'monthly':
          label = createdAt.toLocaleDateString([], { day: '2-digit', month: 'short' }); // "05 Mar"
          groupKey = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).getTime().toString();
          break;
        case 'yearly':
          label = createdAt.toLocaleDateString([], { month: 'short' }); // "Mar"
          groupKey = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1).getTime().toString();
          break;
        case 'custom':
          const diffDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 30) {
            label = createdAt.toLocaleDateString([], { day: '2-digit', month: 'short' }); // "05 Mar"
            groupKey = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).getTime().toString();
          } else if (diffDays < 365) {
            label = createdAt.toLocaleDateString([], { month: 'short', year: 'numeric' }); // "Mar 2025"
            groupKey = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1).getTime().toString();
          } else {
            label = createdAt.getFullYear().toString(); // "2025"
            groupKey = new Date(createdAt.getFullYear(), 0, 1).getTime().toString();
          }
          break;
        default:
          label = createdAt.toISOString().split('T')[0]; // "2025-03-24"
          groupKey = createdAt.getTime().toString();
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { label, total: 0 };
      }
      grouped[groupKey].total += amount;
    });

    // Sort by timestamp ascending
    const sortedDataPoints = Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([_, value]) => ({
        x: value.label,
        y: parseFloat(value.total.toFixed(2))
      }));

    return [
      {
        id: `${moduleName} Amount`,
        color: 'hsl(220, 70%, 50%)',
        data: sortedDataPoints
      }
    ];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Highlights!</h1>
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

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Key Metrics Section */}
        <div className="lg:col-span-4">
          {/* First row: Cases, Leads, Accounts, Customers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {loading ? (
              // Show skeleton loaders while loading
              Array.from({ length: 4 }).map((_, index) => (
                <SkeletonLoader key={`row1-${index}`} />
              ))
            ) : (
              // Show actual content when data is loaded
              MODULES.filter(module => ['Cases', 'Leads', 'Accounts', 'Customers'].includes(module.name)).map(module => {
                const moduleData = data[module.table] || { records: [], count: 0 };

                return (
                  <motion.div
                    key={module.table}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl p-4 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-2xl ${module.color} px-2 py-1 rounded-xl shadow-inner`}>
                        {module.icon}
                      </div>
                      <Link
                        to={`/admin/${module.route}`}
                        className="text-xs text-primary-600 hover:underline font-medium"
                      >
                        View All
                      </Link>
                    </div>

                    <h2 className="text-base font-semibold mb-2 text-gray-800">{module.name}</h2>

                    <div className="mb-3 space-y-2">
                      <AnimatedCount value={moduleData.count} />

                      {/* Pie Chart */}
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
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      {moduleData.records.length > 0 ? (
                        moduleData.records.slice(0, 2).map((rec: any) => (
                          <Link
                            to={`/admin/${module.route}/${rec[module.idField]}`}
                            key={rec[module.idField]}
                            className="block p-2 rounded-lg hover:bg-gray-100 transition"
                          >
                            <p className="font-medium text-gray-800">{rec[module.nameField] || 'No Title'}</p>
                            <p className="text-xs text-gray-500">
                              {formatDateToOrgTimezone(rec.created_at, orgTimezone)}
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

          {/* Second row: Opportunities, Quotes, Orders (larger) */}
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              // Show skeleton loaders while loading
              Array.from({ length: 3 }).map((_, index) => (
                <SkeletonLoader key={`row2-${index}`} />
              ))
            ) : (
              // Show actual content when data is loaded
              MODULES.filter(module => ['Opportunities', 'Quotes', 'Orders'].includes(module.name)).map(module => {
                const moduleData = data[module.table] || { records: [], count: 0 };

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
                      <ChartWithToggle
                        records={moduleData.records}
                        rangeType={rangeType}
                        moduleName={module.name}
                      />
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
                              {formatDateToOrgTimezone(rec.created_at, orgTimezone)}
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
        </div>

        {/* Task Calendar Section */}
        <div className="lg:col-span-1">
          <MiniTaskCalendar />
        </div>
      </div>

      {/* Add a link to the Reports page */}
      <div className="mt-8 flex justify-center">
        <Link
          to="/admin/reports"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-colors"
        >
          Go to Reports
        </Link>
      </div>
    </div>
  );
}

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