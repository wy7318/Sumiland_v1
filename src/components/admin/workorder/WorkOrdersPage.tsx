import { useState, useEffect } from 'react';
import {
    Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
    Eye, UserCheck, Calendar, ClipboardList, AlertCircle,
    FileDown, BarChart2, Phone, MapPin, User, LayoutGrid, LayoutList, Layers,
    Clock, Check, X, Tag, Circle, Zap, ShoppingBag, Package, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { KanbanBoard, KanbanCard } from '../KanbanBoard';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { ReportsDashboardWO } from './ReportsDashboardWO'; // Import the report dashboard component


type WorkOrder = {
    id: string;
    work_order_number: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    scheduled_start_date: string | null;
    scheduled_end_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
    location_id: string | null;
    assigned_to: string | null;
    notes: string | null;
    order_id: string | null;
    organization_id: string;
    created_by: string;
    created_at: string;
    updated_by: string | null;
    updated_at: string;
    assignee: {
        name: string;
    } | null;
    location: {
        name: string;
    } | null;
    order: {
        order_number: string;
    } | null;
    items_count: number;
    tasks_count: number;
    completion_percentage: number;
};

type PicklistValue = {
    id: string;
    value: string;
    label: string;
    is_default: boolean;
    is_active: boolean;
    color: string | null;
    text_color: string | null;
};

type ViewMode = 'list' | 'kanban' | 'reports';

function WorkOrderCard({ workOrder, onStatusChange, statuses, staff, handleDelete, handleAssign }: {
    workOrder: WorkOrder;
    onStatusChange: (id: string, status: string) => void;
    statuses: PicklistValue[];
    staff: any[];
    handleDelete: (id: string) => void;
    handleAssign: (id: string, userId: string) => void;
}) {
    const [showActions, setShowActions] = useState(false);

    // Get style for status badge
    const getStatusStyle = (status: string) => {
        const statusValue = statuses.find(s => s.value === status);
        if (!statusValue?.color) return {};
        return {
            backgroundColor: statusValue.color,
            color: statusValue.text_color || '#FFFFFF'
        };
    };

    // Get style for priority
    const getPriorityStyle = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'low':
                return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
            case 'medium':
                return { backgroundColor: '#FFF8E1', color: '#F57F17' };
            case 'high':
                return { backgroundColor: '#FFEBEE', color: '#C62828' };
            case 'urgent':
                return { backgroundColor: '#B71C1C', color: '#FFFFFF' };
            default:
                return { backgroundColor: '#E3F2FD', color: '#1565C0' };
        }
    };

    return (
        <KanbanCard id={workOrder.id}>
            <div className="space-y-3 relative p-1">
                <div
                    className="absolute top-0 right-0 p-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowActions(!showActions)}
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
                </div>

                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">
                            {workOrder.work_order_number}
                        </div>
                        <h4 className="font-medium text-gray-800 truncate max-w-[180px]">
                            {workOrder.title}
                        </h4>
                    </div>
                </div>

                {workOrder.order && (
                    <div className="flex items-center text-sm text-gray-600">
                        <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">Order: {workOrder.order.order_number}</span>
                    </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">
                        {workOrder.scheduled_start_date
                            ? new Date(workOrder.scheduled_start_date).toLocaleDateString()
                            : 'Not scheduled'}
                    </span>
                </div>

                {workOrder.location && (
                    <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{workOrder.location.name}</span>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={getPriorityStyle(workOrder.priority)}
                    >
                        {workOrder.priority}
                    </span>
                    <div className="text-xs text-gray-500">
                        {workOrder.tasks_count > 0
                            ? `${Math.round(workOrder.completion_percentage)}% complete`
                            : 'No tasks'}
                    </div>
                </div>

                <div className="flex items-center text-sm text-gray-600 mt-1">
                    <UserCheck className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                    {workOrder.assignee ? (
                        <span className="font-medium">{workOrder.assignee.name}</span>
                    ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                    )}
                </div>

                {showActions && (
                    <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select
                                value={workOrder.status}
                                onChange={(e) => onStatusChange(workOrder.id, e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                style={getStatusStyle(workOrder.status)}
                            >
                                {statuses.map(status => (
                                    <option key={status.id} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Assign to</label>
                            <select
                                value={workOrder.assigned_to || ''}
                                onChange={(e) => handleAssign(workOrder.id, e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="">Unassigned</option>
                                {staff.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-between pt-2">
                            <Link
                                to={`/admin/work-orders/${workOrder.id}`}
                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                                title="View details"
                                onClick={e => e.stopPropagation()}
                            >
                                <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                                to={`/admin/work-orders/${workOrder.id}/edit`}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                                title="Edit work order"
                                onClick={e => e.stopPropagation()}
                            >
                                <Edit className="w-4 h-4" />
                            </Link>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(workOrder.id);
                                }}
                                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete work order"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </KanbanCard>
    );
}

export function WorkOrdersPage() {
    const { organizations } = useAuth();
    const { selectedOrganization } = useOrganization();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'scheduled_start_date' | 'status'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedWorkOrders, setSelectedWorkOrders] = useState<string[]>([]);
    const [workOrderStatuses, setWorkOrderStatuses] = useState<PicklistValue[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        fetchPicklists();
        fetchWorkOrders();
        fetchStaff();
    }, [selectedOrganization]);

    const fetchPicklists = async () => {
        try {
            // For demo, we'll use hardcoded statuses but in production this should come from picklist_values table
            setWorkOrderStatuses([
                { id: '1', value: 'draft', label: 'Draft', is_default: true, is_active: true, color: '#E5E7EB', text_color: '#374151' },
                { id: '2', value: 'scheduled', label: 'Scheduled', is_default: false, is_active: true, color: '#DBEAFE', text_color: '#1E40AF' },
                { id: '3', value: 'in_progress', label: 'In Progress', is_default: false, is_active: true, color: '#FEF3C7', text_color: '#92400E' },
                { id: '4', value: 'completed', label: 'Completed', is_default: false, is_active: true, color: '#D1FAE5', text_color: '#065F46' },
                { id: '5', value: 'cancelled', label: 'Cancelled', is_default: false, is_active: true, color: '#FEE2E2', text_color: '#B91C1C' }
            ]);

            // In reality, you'd fetch from Supabase:
            /*
            const { data: statusData, error: statusError } = await supabase
              .from('picklist_values')
              .select('id, value, label, is_default, is_active, color, text_color')
              .eq('type', 'work_order_status')
              .eq('is_active', true)
              .eq('organization_id', selectedOrganization?.id)
              .order('display_order', { ascending: true });
      
            if (statusError) throw statusError;
            setWorkOrderStatuses(statusData || []);
            */
        } catch (err) {
            console.error('Error fetching picklists:', err);
            setError('Failed to load picklist values');
        }
    };

    // Modify the fetchWorkOrders function to use explicit count queries:

    const fetchWorkOrders = async () => {
        try {
            setLoading(true);

            // Fetch work orders first
            const { data, error } = await supabase
                .from('work_orders')
                .select(`
                *,
                location:locations(name),
                order:order_hdr(order_number)
            `)
                .eq('organization_id', selectedOrganization?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get all unique assigned_to IDs
            const assigneeIds = data
                ?.filter(wo => wo.assigned_to)
                .map(wo => wo.assigned_to) || [];
            const uniqueAssigneeIds = [...new Set(assigneeIds)];

            // Fetch assignee profiles
            let profilesMap = {};
            if (uniqueAssigneeIds.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .in('id', uniqueAssigneeIds);

                if (profilesError) throw profilesError;
                profilesMap = (profilesData || []).reduce((map, profile) => {
                    map[profile.id] = profile;
                    return map;
                }, {});
            }

            // Process each work order with separate count queries
            const workOrdersWithCounts = await Promise.all((data || []).map(async (wo) => {
                // Get items count explicitly
                const { count: itemsCount, error: itemsError } = await supabase
                    .from('work_order_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('work_order_id', wo.id);

                if (itemsError) throw itemsError;

                // Get tasks count and status explicitly
                const { data: taskData, error: tasksError } = await supabase
                    .from('work_order_tasks')
                    .select('status')
                    .eq('work_order_id', wo.id);

                if (tasksError) throw tasksError;

                // Calculate task stats
                const totalTasks = taskData?.length || 0;
                const completedTasks = taskData?.filter(t => t.status === 'completed').length || 0;
                const completion_percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                // Add assignee data
                const assignee = wo.assigned_to ? profilesMap[wo.assigned_to] || null : null;

                return {
                    ...wo,
                    items_count: itemsCount || 0,
                    tasks_count: totalTasks,
                    completion_percentage,
                    assignee
                };
            }));

            setWorkOrders(workOrdersWithCounts);
        } catch (err) {
            console.error('Error fetching work orders:', err);
            setError(err instanceof Error ? err.message : 'Failed to load work orders');
        } finally {
            setLoading(false);
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
                .in('id', orgUsers?.map(uo => uo.user_id) || []);

            if (profilesError) throw profilesError;
            setStaff(profiles || []);
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    const handleStatusChange = async (workOrderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('work_orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', workOrderId);

            if (error) throw error;
            await fetchWorkOrders();
        } catch (err) {
            console.error('Error updating work order status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    const handleDelete = async (workOrderId: string) => {
        if (!window.confirm('Are you sure you want to delete this work order?')) return;

        try {
            const { error } = await supabase
                .from('work_orders')
                .delete()
                .eq('id', workOrderId);

            if (error) throw error;
            await fetchWorkOrders();
            setShowDeleteConfirm(null);
        } catch (err) {
            console.error('Error deleting work order:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete work order');
        }
    };

    const handleBulkAction = async (action: string) => {
        if (!selectedWorkOrders.length || !action) return;

        try {
            if (action === 'delete') {
                if (!window.confirm(`Are you sure you want to delete ${selectedWorkOrders.length} work orders?`)) {
                    return;
                }

                const { error } = await supabase
                    .from('work_orders')
                    .delete()
                    .in('id', selectedWorkOrders);

                if (error) throw error;
            } else if (action.startsWith('assign_')) {
                const userId = action.replace('assign_', '');
                const { error } = await supabase
                    .from('work_orders')
                    .update({
                        assigned_to: userId,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', selectedWorkOrders);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('work_orders')
                    .update({
                        status: action,
                        updated_at: new Date().toISOString()
                    })
                    .in('id', selectedWorkOrders);

                if (error) throw error;
            }

            await fetchWorkOrders();
            setSelectedWorkOrders([]);
        } catch (err) {
            console.error('Error performing bulk action:', err);
            setError(err instanceof Error ? err.message : 'Failed to perform action');
        }
    };

    const handleAssign = async (workOrderId: string, userId: string) => {
        try {
            const { error } = await supabase
                .from('work_orders')
                .update({
                    assigned_to: userId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', workOrderId);

            if (error) throw error;
            await fetchWorkOrders();
        } catch (err) {
            console.error('Error assigning work order:', err);
            setError(err instanceof Error ? err.message : 'Failed to assign work order');
        }
    };

    const filteredWorkOrders = workOrders.filter(wo => {
        const matchesSearch =
            wo.work_order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (wo.description && wo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (wo.assignee?.name && wo.assignee.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (wo.location?.name && wo.location.name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const sortedWorkOrders = [...filteredWorkOrders].sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];

        // Handle null values
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return sortOrder === 'asc' ? -1 : 1;
        if (bValue === null) return sortOrder === 'asc' ? 1 : -1;

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Get style for status badge
    const getStatusStyle = (status: string) => {
        const statusValue = workOrderStatuses.find(s => s.value === status);
        if (!statusValue?.color) return {};
        return {
            backgroundColor: statusValue.color,
            color: statusValue.text_color || '#FFFFFF'
        };
    };

    // Get label for status
    const getStatusLabel = (status: string) => {
        return workOrderStatuses.find(s => s.value === status)?.label || status;
    };

    // Get style for priority badge
    const getPriorityStyle = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'low':
                return { backgroundColor: '#E8F5E9', color: '#2E7D32' };
            case 'medium':
                return { backgroundColor: '#FFF8E1', color: '#F57F17' };
            case 'high':
                return { backgroundColor: '#FFEBEE', color: '#C62828' };
            case 'urgent':
                return { backgroundColor: '#B71C1C', color: '#FFFFFF' };
            default:
                return { backgroundColor: '#E3F2FD', color: '#1565C0' };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-500 bg-clip-text text-transparent">
                        Work Order Management
                    </h1>
                    <p className="text-gray-500 mt-1">Plan, track, and manage work orders for your business</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {/* Updated view mode toggle buttons */}
                    <div className="flex bg-white rounded-full shadow-sm border border-gray-200 p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'list'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <LayoutList className="w-4 h-4" />
                            <span>List</span>
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'kanban'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span>Kanban</span>
                        </button>
                        <button
                            onClick={() => setViewMode('reports')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${viewMode === 'reports'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <BarChart2 className="w-4 h-4" />
                            <span>Reports</span>
                        </button>
                    </div>

                    <Link
                        to="/admin/work-orders/new"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Work Order</span>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {/* Conditional rendering based on viewMode */}
            {viewMode === 'reports' ? (
                // Render the Reports Dashboard
                <ReportsDashboardWO />
            ) : (
                // Render List/Kanban Content
                <>

                {/* Search & Filters Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Filter className="w-5 h-5 text-indigo-500" />
                                Search & Filters
                            </h2>
                            <button
                                onClick={() => setFiltersExpanded(!filtersExpanded)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                        </div>

                        {filtersExpanded && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Search className="text-gray-400 w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search work orders by number, title, location, assignee..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                        >
                                            <option value="all">All Status</option>
                                            {workOrderStatuses.map(status => (
                                                <option key={status.id} value={status.value}>
                                                    {status.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <label className="text-sm text-gray-600 mb-1.5 font-medium">Priority Filter</label>
                                        <select
                                            value={priorityFilter}
                                            onChange={(e) => setPriorityFilter(e.target.value)}
                                            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                        >
                                            <option value="all">All Priorities</option>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>

                                    {selectedWorkOrders.length > 0 && viewMode === 'list' && (
                                        <div className="flex flex-col">
                                            <label className="text-sm text-gray-600 mb-1.5 font-medium">Bulk Actions</label>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleBulkAction(e.target.value);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                                                >
                                                    <option value="">Select Action</option>
                                                    <optgroup label="Change Status">
                                                        {workOrderStatuses.map(status => (
                                                            <option key={status.id} value={status.value}>
                                                                Set as {status.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                    <optgroup label="Assign To">
                                                        {staff.map(member => (
                                                            <option key={member.id} value={`assign_${member.id}`}>
                                                                Assign to {member.name}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                    <option value="delete">Delete Selected</option>
                                                </select>
                                                <span className="rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-sm font-medium">
                                                    {selectedWorkOrders.length} selected
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Work Orders Data */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {viewMode === 'list' ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-6 py-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWorkOrders.length === filteredWorkOrders.length && filteredWorkOrders.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedWorkOrders(filteredWorkOrders.map(wo => wo.id));
                                                        } else {
                                                            setSelectedWorkOrders([]);
                                                        }
                                                    }}
                                                    className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                />
                                            </th>
                                            <th
                                                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => {
                                                    setSortBy('created_at');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <span>Work Order</span>
                                                    {sortBy === 'created_at' && (
                                                        sortOrder === 'asc' ?
                                                            <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                            <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Details
                                            </th>
                                            <th
                                                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => {
                                                    setSortBy('status');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <span>Status</span>
                                                    {sortBy === 'status' && (
                                                        sortOrder === 'asc' ?
                                                            <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                            <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Priority
                                            </th>
                                            <th
                                                className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => {
                                                    setSortBy('scheduled_start_date');
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                }}
                                            >
                                                <div className="flex items-center">
                                                    <span>Schedule</span>
                                                    {sortBy === 'scheduled_start_date' && (
                                                        sortOrder === 'asc' ?
                                                            <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                                                            <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                                                    )}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Assignee
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Progress
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sortedWorkOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <ClipboardList className="w-12 h-12 text-gray-300 mb-2" />
                                                        <p className="text-lg font-medium">No work orders found</p>
                                                        <p className="text-sm">Try adjusting your search or filters</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedWorkOrders.map((workOrder) => (
                                                <tr key={workOrder.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedWorkOrders.includes(workOrder.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedWorkOrders(prev => [...prev, workOrder.id]);
                                                                } else {
                                                                    setSelectedWorkOrders(prev => prev.filter(id => id !== workOrder.id));
                                                                }
                                                            }}
                                                            className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 flex-shrink-0">
                                                                <Layers className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">
                                                                    {workOrder.work_order_number}
                                                                </div>
                                                                <div className="text-sm text-gray-600 font-medium">
                                                                    {workOrder.title}
                                                                </div>
                                                                {workOrder.order && (
                                                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                                                        <ShoppingBag className="w-3 h-3 mr-1" />
                                                                        Order: {workOrder.order.order_number}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1.5">
                                                            {workOrder.location && (
                                                                <div className="flex items-center text-sm">
                                                                    <MapPin className="w-4 h-4 text-gray-400 mr-1.5" />
                                                                    <span className="text-gray-700">
                                                                        {workOrder.location.name}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center text-sm">
                                                                <Package className="w-4 h-4 text-gray-400 mr-1.5" />
                                                                <span className="text-gray-700">
                                                                    {workOrder.items_count || 0} items
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center text-sm">
                                                                <FileText className="w-4 h-4 text-gray-400 mr-1.5" />
                                                                <span className="text-gray-700">
                                                                    {workOrder.tasks_count || 0} tasks
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <select
                                                            value={workOrder.status}
                                                            onChange={(e) => handleStatusChange(workOrder.id, e.target.value)}
                                                            className="text-sm font-medium rounded-full px-3 py-1.5 border-2 appearance-none cursor-pointer"
                                                            style={{
                                                                ...getStatusStyle(workOrder.status),
                                                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                                                                backgroundRepeat: 'no-repeat',
                                                                backgroundPosition: 'right 0.5rem center',
                                                                backgroundSize: '1.5em 1.5em',
                                                                paddingRight: '2.5rem'
                                                            }}
                                                        >
                                                            {workOrderStatuses.map(status => (
                                                                <option key={status.id} value={status.value}>
                                                                    {status.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className="px-3 py-1 text-xs font-medium rounded-full"
                                                            style={getPriorityStyle(workOrder.priority)}
                                                        >
                                                            {workOrder.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            {workOrder.scheduled_start_date ? (
                                                                <div className="flex items-center text-sm text-gray-700">
                                                                    <Calendar className="w-4 h-4 text-gray-400 mr-1.5" />
                                                                    {new Date(workOrder.scheduled_start_date).toLocaleDateString()}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-sm italic">Not scheduled</span>
                                                            )}
                                                            {workOrder.scheduled_end_date && (
                                                                <div className="text-xs text-gray-500">
                                                                    to {new Date(workOrder.scheduled_end_date).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <select
                                                            value={workOrder.assigned_to || ''}
                                                            onChange={(e) => handleAssign(workOrder.id, e.target.value)}
                                                            className="w-full text-sm rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 transition-all duration-200"
                                                        >
                                                            <option value="">Unassigned</option>
                                                            {staff.map((member) => (
                                                                <option key={member.id} value={member.id}>
                                                                    {member.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                                                            <div
                                                                className="bg-indigo-600 h-2.5 rounded-full"
                                                                style={{ width: `${workOrder.completion_percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="text-xs text-gray-500 text-right">
                                                            {Math.round(workOrder.completion_percentage)}% complete
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            <Link
                                                                to={`/admin/work-orders/${workOrder.id}`}
                                                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                                                                title="View details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Link>
                                                            <Link
                                                                to={`/admin/work-orders/${workOrder.id}/edit`}
                                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                                                                title="Edit work order"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                            {showDeleteConfirm === workOrder.id ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleDelete(workOrder.id)}
                                                                        className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                                                        title="Confirm delete"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowDeleteConfirm(null)}
                                                                        className="p-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                                                        title="Cancel"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setShowDeleteConfirm(workOrder.id)}
                                                                    className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                                                    title="Delete work order"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {sortedWorkOrders.length > 0 && (
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        Showing <span className="font-medium text-gray-700">{sortedWorkOrders.length}</span> of <span className="font-medium text-gray-700">{workOrders.length}</span> work orders
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-indigo-500" />
                                        <span className="text-gray-700 font-medium">{workOrders.length} total work orders</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-6">
                            <KanbanBoard
                                items={sortedWorkOrders}
                                statuses={workOrderStatuses}
                                onStatusChange={handleStatusChange}
                                renderCard={(workOrder) => (
                                    <WorkOrderCard
                                        workOrder={workOrder}
                                        onStatusChange={handleStatusChange}
                                        statuses={workOrderStatuses}
                                        staff={staff}
                                        handleDelete={handleDelete}
                                        handleAssign={handleAssign}
                                    />
                                )}
                            />
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
}