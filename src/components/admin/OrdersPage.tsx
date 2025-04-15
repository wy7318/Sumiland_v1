import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, Package, Calendar, DollarSign, Building2, AlertCircle,
  FileDown, Send, User, LayoutGrid, LayoutList, UserCheck,
  Zap, Check, X, CreditCard, Wallet, Clock, ShoppingBag,
  CheckCircle, CircleDashed, CircleDot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { KanbanBoard, KanbanCard } from './KanbanBoard';

type Order = {
  order_id: string;
  order_number: string;
  customer_id: string;
  vendor_id: string | null;
  status: string;
  payment_status: 'Pending' | 'Partial Received' | 'Fully Received';
  payment_amount: number;
  total_amount: number;
  notes: string | null;
  quote_id: string | null;
  created_at: string;
  organization_id: string;
  owner_id: string | null;
  owner: {
    id: string;
    name: string;
  } | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  };
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    notes: string | null;
    product: {
      name: string;
    };
  }[];
};

// Type for Kanban compatibility
type KanbanOrder = Order & {
  id: string; // Required for KanbanBoard
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

type ViewMode = 'list' | 'kanban';

// Order Card Component for Kanban View
function OrderCard({ order, onStatusChange, statuses, handleDelete }: {
  order: KanbanOrder;
  onStatusChange: (id: string, status: string) => void;
  statuses: PicklistValue[];
  handleDelete: (id: string) => void;
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

  // Get payment status badge color
  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'Pending':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: <CircleDashed className="w-3.5 h-3.5 mr-1.5 text-gray-500 flex-shrink-0" />
        };
      case 'Partial Received':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          icon: <CircleDot className="w-3.5 h-3.5 mr-1.5 text-orange-500 flex-shrink-0" />
        };
      case 'Fully Received':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-green-500 flex-shrink-0" />
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: <CircleDashed className="w-3.5 h-3.5 mr-1.5 text-gray-500 flex-shrink-0" />
        };
    }
  };

  const paymentInfo = getPaymentStatusInfo(order.payment_status);

  return (
    <KanbanCard id={order.id}>
      <div className="space-y-3 relative p-1">
        <div
          className="absolute top-0 right-0 p-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowActions(!showActions)}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold">O</span>
          </div>
          <h4 className="font-medium text-gray-900">
            {order.order_number}
          </h4>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <DollarSign className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{formatCurrency(order.total_amount)}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <User className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {order.customer.first_name} {order.customer.last_name}
          </span>
        </div>

        {order.customer.company && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{order.customer.company}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600 mt-1">
          <UserCheck className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          {order.owner ? (
            <span className="font-medium">{order.owner.name}</span>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span>{new Date(order.created_at).toLocaleDateString()}</span>
        </div>

        <div className={`flex items-center text-sm rounded-full px-2 py-1 ${paymentInfo.bg} ${paymentInfo.text}`}>
          {paymentInfo.icon}
          <span className="font-medium">{order.payment_status}</span>
          <span className="ml-1 text-xs">
            ({((order.payment_amount / order.total_amount) * 100).toFixed(0)}%)
          </span>
        </div>

        {showActions && (
          <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                style={getStatusStyle(order.status)}
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <Link
                to={`/admin/orders/${order.order_id}`}
                className="p-1.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors"
                title="View details"
                onClick={e => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
              </Link>
              <Link
                to={`/admin/orders/${order.order_id}/edit`}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                title="Edit order"
                onClick={e => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(order.order_id);
                }}
                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete order"
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

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStatuses, setOrderStatuses] = useState<PicklistValue[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'order_number' | 'total_amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);


  useEffect(() => {
    fetchPicklists();
    fetchOrders();
  }, [selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'order_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setOrderStatuses(statusData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_hdr')
        .select(`
          *,
          customer:customers(*),
          items:order_dtl(*),
          owner:profiles!order_owner_id_fkey(
            id,
            name
          )
        `)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_hdr')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Wrapper for kanban status change
  const handleKanbanStatusChange = async (itemId: string, newStatus: string) => {
    await handleStatusChange(itemId, newStatus);
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabase
        .from('order_hdr')
        .delete()
        .eq('order_id', orderId);

      if (error) throw error;
      await fetchOrders();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete order');
    }
  };

  const exportToCSV = () => {
    // Implementation for CSV export
    console.log("Export to CSV");
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (order.owner?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;

    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return (aValue < bValue ? -1 : 1) * multiplier;
  });

  // Transform orders for kanban view
  const kanbanOrders: KanbanOrder[] = sortedOrders.map(order => ({
    ...order,
    id: order.order_id // Use order_id directly as the id for kanban
  }));

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = orderStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color
    };
  };

  const getStatusLabel = (status: string) => {
    return orderStatuses.find(s => s.value === status)?.label || status;
  };

  // Get payment status badge styling
  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-gray-100 text-gray-800';
      case 'Partial Received':
        return 'bg-orange-100 text-orange-800';
      case 'Fully Received':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
            Order Management
          </h1>
          <p className="text-gray-500 mt-1">Track and manage customer orders</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-amber-300"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Kanban View</span>
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4" />
                <span>List View</span>
              </>
            )}
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-amber-300"
          >
            <FileDown className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <Link
            to="/admin/orders/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-amber-700 hover:to-orange-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-500" />
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
                  placeholder="Search orders by number, customer, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Status</option>
                    {orderStatuses.map(status => (
                      <option key={status.id} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Payment Status</label>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Payment Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial Received">Partial Received</option>
                    <option value="Fully Received">Fully Received</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Sort By</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-200 bg-white flex-grow"
                    >
                      <option value="created_at">Date Created</option>
                      <option value="order_number">Order Number</option>
                      <option value="total_amount">Total Amount</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                      className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    >
                      <ChevronUp className={`w-5 h-5 text-gray-500 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {viewMode === 'list' ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-lg font-medium">No orders found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="font-semibold">O</span>
                            </div>
                            <div className="font-medium text-gray-900">
                              {order.order_number}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {order.customer.first_name} {order.customer.last_name}
                            </span>
                            {order.customer.company && (
                              <span className="text-sm text-gray-500">
                                {order.customer.company}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                            className="text-sm font-medium rounded-full px-3 py-1.5 border-2 appearance-none cursor-pointer"
                            style={{
                              ...getStatusStyle(order.status),
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.5em 1.5em',
                              paddingRight: '2.5rem'
                            }}
                          >
                            {orderStatuses.map(status => (
                              <option key={status.id} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserCheck className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                            <span className="text-sm text-gray-800">
                              {order.owner ? order.owner.name : 'Not assigned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center ${getPaymentStatusClass(order.payment_status)}`}>
                              {order.payment_status === 'Pending' && <CircleDashed className="w-3.5 h-3.5 mr-1.5" />}
                              {order.payment_status === 'Partial Received' && <CircleDot className="w-3.5 h-3.5 mr-1.5" />}
                              {order.payment_status === 'Fully Received' && <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                              {order.payment_status}
                            </span>
                            <div className="text-sm text-gray-500 mt-1 flex items-center">
                              <Wallet className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                              {((order.payment_amount / order.total_amount) * 100).toFixed(0)}% paid
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Paid: {formatCurrency(order.payment_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link
                              to={`/admin/orders/${order.order_id}`}
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors"
                              title="View order"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/orders/${order.order_id}/edit`}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                              title="Edit order"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {showDeleteConfirm === order.order_id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(order.order_id)}
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
                                onClick={() => setShowDeleteConfirm(order.order_id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete order"
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

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{paginatedOrders.length}</span> of <span className="font-medium text-gray-700">{filteredOrders.length}</span> orders
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-gray-700 font-medium">{formatCurrency(filteredOrders.reduce((sum, order) => sum + order.total_amount, 0))} total value</span>
              </div>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6">
            <KanbanBoard
              items={kanbanOrders}
                statuses={orderStatuses}
              onStatusChange={handleKanbanStatusChange}
              renderCard={(order) => (
                <OrderCard
                  order={order as KanbanOrder}
                  onStatusChange={handleStatusChange}
                  statuses={orderStatuses}
                  handleDelete={handleDelete}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}