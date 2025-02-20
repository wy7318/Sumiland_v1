import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, Package, AlertCircle, FileDown 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';

type Order = {
  order_id: string;
  order_number: string;
  customer_id: string;
  status: 'New' | 'In Progress' | 'In Review' | 'Completed' | 'Cancelled';
  payment_status: 'Pending' | 'Partial Received' | 'Fully Received';
  payment_amount: number;
  payment_percent: number;
  total_amount: number;
  notes: string | null;
  quote_id: string | null;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
    company: string | null;
    email: string;
  };
  items: {
    order_dtl_id: string;
    product_id: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    notes: string | null;
  }[];
};

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'In Review': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'Cancelled': 'bg-red-100 text-red-800'
};

const PAYMENT_STATUS_COLORS = {
  'Pending': 'bg-gray-100 text-gray-800',
  'Partial Received': 'bg-orange-100 text-orange-800',
  'Fully Received': 'bg-green-100 text-green-800'
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'order_number' | 'total_amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('order_hdr')
        .select(`
          *,
          customer:customers(
            first_name,
            last_name,
            company,
            email
          ),
          items:order_dtl(*)
        `)
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

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
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
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  const handlePaymentUpdate = async (orderId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('order_hdr')
        .update({ 
          payment_amount: amount,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchQuery.toLowerCase());

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

  // Calculate metrics
  const metrics = {
    totalOrders: orders.length,
    totalValue: orders.reduce((sum, order) => sum + order.total_amount, 0),
    byStatus: Object.fromEntries(
      ['New', 'In Progress', 'In Review', 'Completed', 'Cancelled'].map(status => [
        status,
        orders.filter(order => order.status === status).length
      ])
    ),
    byPaymentStatus: Object.fromEntries(
      ['Pending', 'Partial Received', 'Fully Received'].map(status => [
        status,
        orders.filter(order => order.payment_status === status).length
      ])
    )
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <Package className="w-8 h-8 text-primary-500" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold">{metrics.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Value</h3>
          <p className="text-3xl font-bold">{formatCurrency(metrics.totalValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Orders</h3>
          <p className="text-3xl font-bold">
            {metrics.byStatus['In Progress'] + metrics.byStatus['In Review']}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Payments</h3>
          <p className="text-3xl font-bold">{metrics.byPaymentStatus['Pending']}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
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

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="created_at">Sort by Date</option>
              <option value="order_number">Sort by Order Number</option>
              <option value="total_amount">Sort by Amount</option>
            </select>

            <button
              onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Filter className={cn(
                "w-5 h-5 transition-transform",
                sortOrder === 'desc' ? "transform rotate-180" : ""
              )} />
            </button>
          </div>
        </div>

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
                      onChange={(e) => handleStatusChange(order.order_id, e.target.value as Order['status'])}
                      className={cn(
                        "text-sm font-medium rounded-full px-3 py-1",
                        STATUS_COLORS[order.status]
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
                      PAYMENT_STATUS_COLORS[order.payment_status]
                    )}>
                      {order.payment_status}
                    </span>
                    <div className="text-sm text-gray-500 mt-1">
                      {order.payment_percent}%
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
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this order?')) {
                            // Handle delete
                          }
                        }}
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
      </div>
    </div>
  );
}