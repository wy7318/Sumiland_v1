import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, DollarSign, User,
  CheckCircle, X, Send, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { AccountDetailsModal } from './AccountDetailsModal';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useAuth } from '../../contexts/AuthContext';

type Order = {
  order_id: string;
  order_number: string;
  customer_id: string;
  vendor_id: string | null;
  status: string;
  payment_status: 'Pending' | 'Partial Received' | 'Fully Received';
  payment_amount: number;
  total_amount: number;
  tax_percent: number | null; // ✅ Added
  tax_amount: number | null; // ✅ Added
  discount_amount: number | null; // ✅ Added
  subtotal: number; // ✅ Added
  notes: string | null;
  quote_id: string | null;
  quote_number: string | null;
  created_at: string;
  organization_id: string;
  vendor: {
    id: string;
    name: string;
    type: string;
    status: string;
    payment_terms: string | null;
    customer: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      company: string | null;
    } | null;
    shipping_address_line1: string | null;
    shipping_address_line2: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_country: string | null;
    billing_address_line1: string | null;
    billing_address_line2: string | null;
    billing_city: string | null;
    billing_state: string | null;
    billing_country: string | null;
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
    product_id: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    notes: string | null;
    item_name: string | null;
    description: string | null;
    product: {
      name: string;
      description: string;
    } | null;
  }[];
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

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<PicklistValue[]>([]);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchPicklists = async () => {
    try {
      // Fetch order statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'order_status')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setOrderStatuses(statusData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOrder = async () => {
    try {
      if (!id) return;

      // Get the order with quote information
      const { data: orderData, error: orderError } = await supabase
        .from('order_hdr')
        .select(`
          *,
          vendor:vendors(
            id,
            name,
            type,
            status,
            payment_terms,
            customer:customers!vendors_customer_id_fkey(
              first_name,
              last_name,
              email,
              phone,
              company
            ),
            shipping_address_line1,
            shipping_address_line2,
            shipping_city,
            shipping_state,
            shipping_country,
            billing_address_line1,
            billing_address_line2,
            billing_city,
            billing_state,
            billing_country
          ),
          customer:customers(*)
        `)
        .eq('order_id', id)
        .single();

      if (orderError) throw orderError;

      // If there's a quote_id, get the quote details and number
      let quoteDetails = null;
      let quoteNumber = null;
      if (orderData.quote_id) {
        // Get quote header for the quote number
        const { data: quoteHeader, error: quoteHeaderError } = await supabase
          .from('quote_hdr')
          .select('quote_number')
          .eq('quote_id', orderData.quote_id)
          .single();

        if (quoteHeaderError) throw quoteHeaderError;
        quoteNumber = quoteHeader.quote_number;

        // Get quote details
        const { data: quoteData, error: quoteError } = await supabase
          .from('quote_dtl')
          .select('*')
          .eq('quote_id', orderData.quote_id);

        if (quoteError) throw quoteError;
        quoteDetails = quoteData;
      }

      // Get order details
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_dtl')
        .select(`
          *,
          product:products(
            name,
            description
          )
        `)
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // Combine order details with quote details
      const items = itemsData.map((item: any, index: number) => {
        // If this item came from a quote, find the matching quote detail
        const quoteItem = quoteDetails?.[index]; // Match by index since they should be in same order

        return {
          ...item,
          item_name: quoteItem?.item_name || item.notes || 'Custom Item',
          description: item.description || quoteItem?.item_desc,
          unit_price: quoteItem?.unit_price || item.unit_price
        };
      });

      setOrder({
        ...orderData,
        quote_number: quoteNumber,
        items
      });
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id || !order) return;

      const { error } = await supabase
        .from('order_hdr')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', id);

      if (error) throw error;
      await fetchOrder();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = orderStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get label for status
  const getStatusLabel = (status: string) => {
    return orderStatuses.find(s => s.value === status)?.label || status;
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

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-2xl font-bold">{order.order_number}</h1>
                {order.quote_id && order.quote_number && (
                  <Link
                    to={`/admin/quotes/${order.quote_id}`}
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    From Quote: {order.quote_number}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-sm font-medium rounded-full px-3 py-1"
                  style={getStatusStyle(order.status)}
                >
                  {orderStatuses.map(status => (
                    <option key={status.id} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Information */}
            {order.vendor && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Account Information</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium">{order.vendor.name}</div>
                        <div className="text-sm text-gray-500">
                          Type: {order.vendor.type}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAccountModal(true)}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                  {order.vendor.customer && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          Contact: {order.vendor.customer.first_name} {order.vendor.customer.last_name}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <a
                          href={`mailto:${order.vendor.customer.email}`}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          {order.vendor.customer.email}
                        </a>
                      </div>
                      {order.vendor.customer.phone && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <a
                            href={`tel:${order.vendor.customer.phone}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            {order.vendor.customer.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">
                      {order.customer.first_name} {order.customer.last_name}
                    </div>
                    {order.customer.company && (
                      <div className="text-sm text-gray-500">
                        {order.customer.company}
                      </div>
                    )}
                  </div>
                </div>
                {order.customer.email && (
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                )}
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

            {/* Payment Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Payment Information</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tax ({order.tax_percent ?? 0}%):</span>
                  <span className="font-medium">{formatCurrency(order.tax_amount ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(order.discount_amount ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount Received:</span>
                  <span className="font-medium">{formatCurrency(order.payment_amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(order.total_amount - order.payment_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Status:</span>
                  <span className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full",
                    order.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
                    order.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
                    order.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
                  )}>
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Notes</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            )}

            {/* Add Custom Fields section */}
            <div className="md:col-span-2">
              <CustomFieldsSection
                entityType="order"
                entityId={id || ''}
                organizationId={order.organization_id}
                className="bg-gray-50 rounded-lg p-4"
              />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
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
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.product?.name || item.item_name || 'Custom Item'}
                          </div>
                          {(item.product?.description || item.description) && (
                            <div className="text-sm text-gray-500">
                              {item.product?.description || item.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.quantity}</div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(item.unit_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-4 text-right font-medium">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAccountModal && order.vendor && (
        <AccountDetailsModal
          vendor={order.vendor}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}