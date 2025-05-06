import { useState, useEffect } from 'react';
import {
    BarChart2, PieChart, TrendingUp, Calendar,
    Clock, DollarSign, Package, Users, FileDown, Filter, ChevronDown,
    ChevronUp, RefreshCw, Layers, LayoutList, LayoutGrid, FileText,
    AlertCircle, Tag, Circle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart as RechartsRieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { supabase } from '../../../lib/supabase';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { exportWorkOrderReports } from './exportWorkOrderReports';
import { exportWorkOrderReportsExcel } from './exportWorkOrderReportsExcel';
import { ExportReportsButton } from './ExportReportsButton';
import { ExportDropdown } from './ExportDropdown';

// Color constants
const COLORS = ['#4F46E5', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#3B82F6', '#6366F1'];
const STATUS_COLORS = {
    'draft': '#E5E7EB',
    'scheduled': '#DBEAFE',
    'in_progress': '#FEF3C7',
    'completed': '#D1FAE5',
    'cancelled': '#FEE2E2'
};

interface Organization {
    id: string;
    name: string;
    // Add other organization properties as needed
}

interface ReportData {
    statusCounts: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    priorityCounts: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    costBreakdown: Array<{
        name: string;
        value: number;
    }>;
    completionRate: any[];
    trendData: any[];
    laborHours: any[];
    itemConsumption: Array<{
        name: string;
        value: number;
    }>;
    kpis: {
        totalWorkOrders: number;
        openWorkOrders: number;
        completedLastMonth: number;
        avgCompletionTime: number;
        totalCost: number;
        avgTaskCompletion: number;
    };
}

export function ReportsDashboardWO() {
    const { selectedOrganization } = useOrganization();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<ReportData>({
        statusCounts: [],
        priorityCounts: [],
        costBreakdown: [],
        completionRate: [],
        trendData: [],
        laborHours: [],
        itemConsumption: [],
        kpis: {
            totalWorkOrders: 0,
            openWorkOrders: 0,
            completedLastMonth: 0,
            avgCompletionTime: 0,
            totalCost: 0,
            avgTaskCompletion: 0
        }
    });
    const [dateRange, setDateRange] = useState('last30days');
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        if (selectedOrganization?.id) {
            fetchReportData();
        }
    }, [selectedOrganization, dateRange]);

    const fetchReportData = async () => {
        if (!selectedOrganization?.id) {
            setError('No organization selected');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Status distribution
            const { data: statusData, error: statusError } = await supabase.rpc(
                'get_work_order_status_counts',
                { org_id: selectedOrganization.id }
            );

            if (statusError) throw statusError;

            // 2. Work order data - use work_orders table directly instead of non-existent summary view
            const { data: workOrdersData, error: workOrdersError } = await supabase
                .from('work_orders')
                .select(`
                  id, 
                  work_order_number,
                  title,
                  status,
                  priority,
                  scheduled_start_date,
                  scheduled_end_date,
                  actual_start_date,
                  actual_end_date
                `)
                .eq('organization_id', selectedOrganization.id);

            if (workOrdersError) throw workOrdersError;

            // 3. Task completion data - use the optimized work_order_tasks_status view
            const { data: taskStatsData, error: taskStatsError } = await supabase
                .from('work_order_tasks_status')
                .select(`
                  work_order_id,
                  total_tasks,
                  completed_tasks,
                  completion_percentage
                `)
                .eq('organization_id', selectedOrganization.id);

            if (taskStatsError) throw taskStatsError;

            // 4. Priority distribution
            const { data: priorityData, error: priorityError } = await supabase
                .from('work_orders')
                .select('priority')
                .eq('organization_id', selectedOrganization.id);

            if (priorityError) throw priorityError;

            // 5. Labor hours
            const { data: laborData, error: laborError } = await supabase
                .from('work_order_labor_summary')
                .select('*')
                .eq('organization_id', selectedOrganization.id);

            if (laborError) throw laborError;

            // 6. Inventory consumption
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('work_order_inventory_consumption')
                .select('*')
                .eq('organization_id', selectedOrganization.id)
                .order('total_cost', { ascending: false });

            if (inventoryError) throw inventoryError;

            // 7. Work order items with cost data (for cost breakdown)
            const { data: itemsData, error: itemsError } = await supabase
                .from('work_order_items')
                .select(`
                  id,
                  work_order_id,
                  type,
                  total_cost
                `)
                .eq('organization_id', selectedOrganization.id);

            if (itemsError) throw itemsError;

            const processedData = processReportData(
                statusData || [],
                workOrdersData || [],
                taskStatsData || [],
                priorityData || [],
                laborData || [],
                inventoryData || [],
                itemsData || []
            );

            setReportData(processedData);
        } catch (err) {
            console.error('Error fetching report data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const processReportData = (
        statusData: any[],
        workOrdersData: any[],
        taskStatsData: any[],
        priorityData: any[],
        laborData: any[],
        inventoryData: any[],
        itemsData: any[]
    ): ReportData => {
        // Status distribution
        const statusCounts = statusData.map(status => ({
            name: formatStatusName(status.status),
            value: status.count,
            color: STATUS_COLORS[status.status as keyof typeof STATUS_COLORS] || COLORS[0]
        }));

        // Priority distribution
        const priorityDistribution = priorityData.reduce((acc: { [key: string]: number }, curr) => {
            const priority = curr.priority || 'Unknown';
            acc[priority] = (acc[priority] || 0) + 1;
            return acc;
        }, {});

        const priorityCounts = Object.entries(priorityDistribution).map(([key, value], index) => ({
            name: formatPriorityName(key),
            value: value as number,
            color: COLORS[index % COLORS.length]
        }));

        // Cost breakdown - using work_order_items
        const costBreakdownMap = itemsData.reduce((acc: { [key: string]: number }, item) => {
            const type = item.type || 'Unknown';
            acc[type] = (acc[type] || 0) + (item.total_cost || 0);
            return acc;
        }, {});

        const costBreakdown = Object.entries(costBreakdownMap).map(([type, value]) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: value as number
        }));

        // Aggregate inventory items
        const aggregatedInventory = inventoryData.reduce((acc: any[], item: any) => {
            const existingItem = acc.find(i => i.name === item.product_name);
            if (existingItem) {
                existingItem.value += item.total_cost || 0;
            } else {
                acc.push({
                    name: item.product_name || 'Unknown Product',
                    value: item.total_cost || 0
                });
            }
            return acc;
        }, []);

        const itemConsumption = aggregatedInventory
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // Calculate KPIs
        // 1. Average Completion Time - fixed calculation
        const completedWorkOrders = workOrdersData.filter((wo: any) =>
            wo.status === 'completed' && wo.actual_start_date && wo.actual_end_date
        );

        let avgCompletionTime = 0;
        if (completedWorkOrders.length > 0) {
            const totalDays = completedWorkOrders.reduce((sum: number, wo: any) => {
                const startDate = new Date(wo.actual_start_date);
                const endDate = new Date(wo.actual_end_date);
                const diffTime = endDate.getTime() - startDate.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return sum + diffDays;
            }, 0);
            avgCompletionTime = Number((totalDays / completedWorkOrders.length).toFixed(1));
        }

        // 2. Average Task Completion - using the tasks_status view
        let avgTaskCompletion = 0;
        let totalTasks = 0;
        let completedTasks = 0;

        if (taskStatsData.length > 0) {
            totalTasks = taskStatsData.reduce((sum, stat) => sum + (stat.total_tasks || 0), 0);
            completedTasks = taskStatsData.reduce((sum, stat) => sum + (stat.completed_tasks || 0), 0);
            avgTaskCompletion = totalTasks > 0
                ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
                : 0;
        }

        // Other KPIs
        const totalWorkOrders = workOrdersData.length;
        const openWorkOrders = workOrdersData.filter((wo: any) =>
            ['draft', 'scheduled', 'in_progress'].includes(wo.status)
        ).length;

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const completedLastMonth = workOrdersData.filter((wo: any) => {
            if (wo.status !== 'completed') return false;
            const completionDate = wo.actual_end_date ? new Date(wo.actual_end_date) : null;
            return completionDate && completionDate >= oneMonthAgo;
        }).length;

        // Total cost from inventory and labor
        const inventoryCost = inventoryData.reduce((sum, item) => sum + (item.total_cost || 0), 0);
        const laborCost = laborData.reduce((sum, item) => sum + (item.total_labor_cost || 0), 0);
        const totalCost = inventoryCost + laborCost;

        return {
            statusCounts,
            priorityCounts,
            costBreakdown,
            completionRate: [], // Not used in the UI
            trendData: [], // Not used in the UI
            laborHours: [], // Not used in the UI
            itemConsumption,
            kpis: {
                totalWorkOrders,
                openWorkOrders,
                completedLastMonth,
                avgCompletionTime,
                totalCost,
                avgTaskCompletion
            }
        };
    };

    const formatStatusName = (status: string): string => {
        if (!status) return 'Unknown';
        return status.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatPriorityName = (priority: string): string => {
        if (!priority) return 'Unknown';
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    // Map date range value to human-readable text
    const getDateRangeText = (range: string): string => {
        switch (range) {
            case 'last7days': return 'Last 7 Days';
            case 'last30days': return 'Last 30 Days';
            case 'last90days': return 'Last 90 Days';
            case 'thisYear': return 'This Year';
            case 'lastYear': return 'Last Year';
            default: return 'Last 30 Days';
        }
    };

    const handleExportPDF = async () => {
        setExportLoading(true);
        try {
            await exportWorkOrderReports(
                reportData,
                selectedOrganization?.name || 'Organization',
                getDateRangeText(dateRange)
            );
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportExcel = () => {
        setExportLoading(true);
        try {
            exportWorkOrderReportsExcel(
                reportData,
                selectedOrganization?.name || 'Organization',
                getDateRangeText(dateRange)
            );
        } finally {
            setExportLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
                    <p className="text-gray-600 font-medium">{`${label}`}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color || entry.fill }} className="text-sm">
                            {`${entry.name}: ${typeof entry.value === 'number' ?
                                entry.name.includes('Cost') || entry.name === 'Amount ($)' ?
                                    `$${entry.value.toLocaleString()}` :
                                    entry.value.toLocaleString()
                                : entry.value}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Error loading report data</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-indigo-500" />
                            Report Filters
                        </h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchReportData}
                                className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                                title="Refresh data"
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setFiltersExpanded(!filtersExpanded)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                {filtersExpanded ?
                                    <ChevronUp className="w-5 h-5" /> :
                                    <ChevronDown className="w-5 h-5" />
                                }
                            </button>
                        </div>
                    </div>

                    {filtersExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col">
                                <label className="text-sm text-gray-600 mb-1.5 font-medium">Date Range</label>
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                >
                                    <option value="last7days">Last 7 Days</option>
                                    <option value="last30days">Last 30 Days</option>
                                    <option value="last90days">Last 90 Days</option>
                                    <option value="thisYear">This Year</option>
                                    <option value="lastYear">Last Year</option>
                                </select>
                            </div>

                            <div className="flex items-end justify-end col-span-2">
                                <ExportDropdown
                                    isLoading={exportLoading}
                                    onExportPDF={handleExportPDF}
                                    onExportExcel={handleExportExcel}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-sm font-medium">Total Work Orders</h3>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {reportData.kpis.totalWorkOrders}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-sm font-medium">Open Work Orders</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {reportData.kpis.openWorkOrders}
                    </div>
                    {reportData.kpis.totalWorkOrders > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                            {Math.round((reportData.kpis.openWorkOrders / reportData.kpis.totalWorkOrders) * 100)}% of total
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-sm font-medium">Completed Last Month</h3>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {reportData.kpis.completedLastMonth}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-sm font-medium">Avg. Completion Time</h3>
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {reportData.kpis.avgCompletionTime > 0 ? (
                            <>
                                {reportData.kpis.avgCompletionTime}
                                <span className="text-sm font-normal ml-1">days</span>
                            </>
                        ) : (
                            <span className="text-gray-400 text-lg">N/A</span>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-sm font-medium">Total Costs</h3>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        ${(reportData.kpis.totalCost / 1000).toFixed(1)}k
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-gray-500 text-sm font-medium">Avg. Task Completion</h3>
                        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {reportData.kpis.avgTaskCompletion > 0 ? (
                            <>{reportData.kpis.avgTaskCompletion}%</>
                        ) : (
                            <span className="text-gray-400 text-lg">N/A</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reportData.statusCounts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Work Order Status Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsRieChart>
                                    <Pie
                                        data={reportData.statusCounts}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {reportData.statusCounts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </RechartsRieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {reportData.costBreakdown.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Breakdown</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={reportData.costBreakdown}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="value" name="Amount ($)" fill="#4F46E5" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reportData.priorityCounts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Priority Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsRieChart>
                                    <Pie
                                        data={reportData.priorityCounts}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {reportData.priorityCounts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </RechartsRieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {reportData.itemConsumption.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Inventory Consumption</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={reportData.itemConsumption}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="value" name="Cost ($)" fill="#EC4899" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}