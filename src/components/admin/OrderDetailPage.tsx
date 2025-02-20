import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, User, Building2, Mail, Phone, Calendar,
  FileText, Edit, Clock, CheckCircle, AlertCircle,
  DollarSign, Percent, Save, FileText as Quote
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';

type Order = {
  order_id: string;
  order_number: string;
  customer_id: string;
  quote_id: string | null;
  quote_number: string | null;
  status: 'New' | 'In Progress' | 'In Review' | 'Completed' | 'Cancelled';
  payment_status: 'Pending' | 'Partial Received' | 'Fully Received';
  payment_amount: number;
  payment_percent: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
    phone: string | null;
  };
  items: {
    order_dtl_id: string;
    product_id: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    notes: string | null;
  }[];
  quote?: {
    quote_number: string;
  };
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

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentPercent, setPaymentPercent] = useState<number>(0);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  useEffect(() => {
    if (order) {
      setPaymentAmount(order.payment_amount);
      setPaymentPercent(order.payment_percent || 0);
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      if (!id) return;

      const { data: orderData, error } = await supabase
        .from('order_hdr')
        .select(`
          *,
          customer:customers(*),
          items:order_dtl(*),
          quote:quote_hdr(quote_number)
        `)
        .eq('order_id', id)
        .single();

      if (error) throw error;

      // Transform the data to include quote_number directly in the order object
      const transformedOrder = {
        ...orderData,
        quote_number: orderData.quote?.quote_number || null
      };

      setOrder(transformedOrder);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: Order['status']) => {
    try {
      if (!id) return;

      const { error } = await supabase
        .from('order_hdr')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id);

      if (error) {
        // Check for the specific validation error message
        if (error.message.includes('Order cannot be completed until payment is fully received')) {
          throw new Error('Order cannot be completed until payment is fully received');
        }
        throw error;
      }
      
      await fetchOrder();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handlePaymentUpdate = async () => {
    try {
      if (!id || !order) return;
      setIsUpdatingPayment(true);
      setError(null);

      const { error } = await supabase
        .from('order_hdr')
        .update({ 
          payment_amount: paymentAmount,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id);

      if (error) throw error;
      await fetchOrder();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update payment');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handlePaymentPercentChange = (percent: number) => {
    if (!order) return;
    
    // Validate percent is between 0 and 100
    const validPercent = Math.max(0, Math.min(100, percent));
    setPaymentPercent(validPercent);

    // Calculate new payment amount based on percentage
    const newAmount = (validPercent / 100) * order.total_amount;
    setPaymentAmount(newAmount);
  };

  const handlePaymentAmountChange = (amount: number) => {
    if (!order) return;
    
    // Validate amount is between 0 and total
    const validAmount = Math.max(0, Math.min(order.total_amount, amount));
    setPaymentAmount(validAmount);
    
    // Calculate and update percentage
    const newPercent = (validAmount / order.total_amount) * 100;
    setPaymentPercent(newPercent);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        Order not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/orders')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Orders
        </button>
        <Link
          to={`/admin/orders/${id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Order
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{order.order_number}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(order.created_at).toLocaleTimeString()}
                </span>
                {order.quote_id && order.quote_number && (
                  <Link 
                    to={`/admin/quotes/${order.quote_id}/edit`}
                    className="flex items-center text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <Quote className="w-4 h-4 mr-1" />
                    Quote: {order.quote_number}
                  </Link>
                )}
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value as Order['status'])}
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium border-2",
                  STATUS_COLORS[order.status]
                )}
              >
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Status</div>
                  <span className={cn(
                    "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                    STATUS_COLORS[order.status]
                  )}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Payment Status</div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                      PAYMENT_STATUS_COLORS[order.payment_status]
                    )}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Payment Details</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => handlePaymentAmountChange(parseFloat(e.target.value))}
                          min="0"
                          max={order.total_amount}
                          step="0.01"
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        />
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        of {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={paymentPercent}
                        onChange={(e) => handlePaymentPercentChange(parseFloat(e.target.value))}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>
                    <button
                      onClick={handlePaymentUpdate}
                      disabled={isUpdatingPayment}
                      className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isUpdatingPayment ? 'Saving...' : 'Save Payment'}
                    </button>
                  </div>
                </div>
                {order.notes && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                    <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">
                      {order.customer.first_name} {order.customer.last_name}
                    </div>
                  </div>
                </div>
                {order.customer.company && (
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                    <div>{order.customer.company}</div>
                  </div>
                )}
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-3" />
                  <a
                    href={`mailto:${order.customer.email}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {order.customer.email}
                  </a>
                </div>
                {order.customer.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {order.customer.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.order_dtl_id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.notes}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}