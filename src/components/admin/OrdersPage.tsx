import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, Package, Calendar, DollarSign, Building2, AlertCircle,
  FileDown, Send, User, LayoutGrid, LayoutList
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

type StatusOption = {
  value: string;
  label: string;
  color: string;
  text_color: string;
};

type ViewMode = 'list' | 'kanban';

// Order Card Component for Kanban View
function OrderCard({ order }: { order: KanbanOrder }) {
  return (
    <KanbanCard id={order.id}>
      <div className="space-y-2">
        <h4 className="font-medium">{order.order_number}</h4>

        <div className="flex items-center text-sm text-gray-500">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatCurrency(order.total_amount)}
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <User className="w-4 h-4 mr-1" />
          {order.customer.first_name} {order.customer.last_name}
        </div>

        {order.customer.company && (
          <div className="flex items-center text-sm text-gray-500">
            <Building2 className="w-4 h-4 mr-1" />
            {order.customer.company}
          </div>
        )}

        <div className={cn(
          "px-2 py-1 text-xs rounded-full inline-flex items-center",
          order.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
          order.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
          order.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
        )}>
          {order.payment_status}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Link
            to={`/admin/orders/${order.order_id}`}
            className="text-primary-600 hover:text-primary-900"
            onClick={e => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/orders/${order.order_id}/edit`}
            className="text-blue-600 hover:text-blue-900"
            onClick={e => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'order_number' | 'total_amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Define status options for Kanban board
  const orderStatuses: StatusOption[] = [
    { value: 'New', label: 'New', color: '#DBEAFE', text_color: '#1E40AF' },
    { value: 'In Progress', label: 'In Progress', color: '#FEF3C7', text_color: '#92400E' },
    { value: 'In Review', label: 'In Review', color: '#F3E8FF', text_color: '#6B21A8' },
    { value: 'Completed', label: 'Completed', color: '#DCFCE7', text_color: '#166534' },
    { value: 'Cancelled', label: 'Cancelled', color: '#FEE2E2', text_color: '#991B1B' }
  ];

  useEffect(() => {
    fetchOrders();
  }, [selectedOrganization]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_hdr')
        .select(`
          *,
          customer:customers(*),
          items:order_dtl(*)
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
      order.customer.company?.toLowerCase().includes(searchQuery.toLowerCase());

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

  // Transform status options for kanban board
  const kanbanStatuses = orderStatuses.map(status => ({
    id: status.value,
    value: status.value,
    label: status.label,
    color: status.color,
    text_color: status.textColor
  }));

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
        <h1 className="text-2xl font-bold">Order Management</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban View
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4 mr-2" />
                List View
              </>
            )}
          </button>
          <button
            onClick={() => exportToCSV()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <Link
            to="/admin/orders/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Link>
        </div>
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
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="In Review">In Review</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Payment Status</option>
              <option value="Pending">Pending</option>
              <option value="Partial Received">Partial Received</option>
              <option value="Fully Received">Fully Received</option>
            </select>

            {viewMode === 'list' && (
              <button
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <Filter className={cn(
                  "w-5 h-5 transition-transform",
                  sortOrder === 'desc' ? "transform rotate-180" : ""
                )} />
              </button>
            )}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.customer.first_name} {order.customer.last_name}
                      </div>
                      {order.customer.company && (
                        <div className="text-sm text-gray-500">
                          {order.customer.company}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                        className={cn(
                          "text-sm font-medium rounded-full px-3 py-1",
                          order.status === 'New' && "bg-blue-100 text-blue-800",
                          order.status === 'In Progress' && "bg-yellow-100 text-yellow-800",
                          order.status === 'In Review' && "bg-purple-100 text-purple-800",
                          order.status === 'Completed' && "bg-green-100 text-green-800",
                          order.status === 'Cancelled' && "bg-red-100 text-red-800"
                        )}
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="In Review">In Review</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        order.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
                        order.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
                        order.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
                      )}>
                        {order.payment_status}
                      </span>
                      <div className="text-sm text-gray-500 mt-1">
                        {((order.payment_amount / order.total_amount) * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid: {formatCurrency(order.payment_amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/orders/${order.order_id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          to={`/admin/orders/${order.order_id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(order.order_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1200px] p-4">
              <KanbanBoard
                items={kanbanOrders}
                statuses={kanbanStatuses}
                onStatusChange={handleKanbanStatusChange}
                renderCard={(order) => <OrderCard order={order as KanbanOrder} />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}