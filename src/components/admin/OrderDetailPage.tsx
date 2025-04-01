import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, DollarSign, User,
  CheckCircle, X, Send, Package, Truck, MapPin,
  ClipboardList, Clock, FileBarChart2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency, formatDateTime } from '../../lib/utils';
import { AccountDetailsModal } from './AccountDetailsModal';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { RelatedEmails } from './RelatedEmails';
import { RelatedTasks } from './RelatedTasks';
import { EmailConfigModal } from './EmailConfigModal';
import { EmailModal } from './EmailModal';
import { getEmailConfig } from '../../lib/email';


type Order = {
  order_id: string;
  order_number: string;
  customer_id: string;
  vendor_id: string | null;
  status: string;
  payment_status: 'Pending' | 'Partial Received' | 'Fully Received';
  payment_amount: number;
  total_amount: number;
  tax_percent: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  subtotal: number;
  notes: string | null;
  quote_id: string | null;
  quote_number: string | null;
  created_at: string;
  organization_id: string;
  // New fields
  owner_id: string | null;
  owner: {
    id: string;
    name: string;
  } | null;
  po_number: string | null;
  po_date: string | null;
  bill_to_customer_id: string | null;
  bill_to_customer: {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
  ship_to_customer_id: string | null;
  ship_to_customer: {
    customer_id: string;
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
  tracking_carrier: string | null;
  tracking_number: string | null;
  order_start_at: string | null;
  order_end_at: string | null;
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
  const { selectedOrganization } = useOrganization();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<PicklistValue[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [refreshEmailList, setRefreshEmailList] = useState(0);

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
        .eq('organization_id', selectedOrganization?.id)
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
          customer:customers(*),
          ship_to_customer:customers(customer_id, first_name, last_name, email, phone, company),
          bill_to_customer:customers(customer_id, first_name, last_name, email, phone, company)
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

  const handleEmailClick = async () => {
    if (!user) return;

    try {
      const config = await getEmailConfig(user.id);
      if (!config) {
        setShowEmailConfigModal(true);
      } else {
        setShowEmailModal(true);
      }
    } catch (err) {
      console.error('Error checking email config:', err);
      setError(err instanceof Error ? err.message : 'Failed to check email configuration');
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

  // Format date for display
  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to display address
  const renderAddress = (
    line1: string | null,
    line2: string | null,
    city: string | null,
    state: string | null,
    country: string | null
  ) => {
    if (!line1 && !city && !state && !country) return 'No address provided';

    return (
      <div className="text-sm text-gray-600">
        {line1 && <div>{line1}</div>}
        {line2 && <div>{line2}</div>}
        <div>
          {[city, state].filter(Boolean).join(', ')} {country && ` ${country}`}
        </div>
      </div>
    );
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
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-3/4 space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/admin/orders')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Orders
            </button>
            <div className="flex space-x-3">
              <Link
                to={`/admin/orders/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Order
              </Link>
              <Link
                to={`/admin/tasks/new?module=order_hdr&recordId=${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add Task
              </Link>
            </div>
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
                    {order.po_number && (
                      <div className="inline-flex items-center text-sm text-gray-600">
                        <FileBarChart2 className="w-4 h-4 mr-1" />
                        PO: {order.po_number}
                      </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Order Owner & Timeline */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {order.owner && (
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm text-gray-500">Owner:</div>
                          <div className="font-medium">{order.owner.name}</div>
                        </div>
                      </div>
                    )}

                    {(order.po_date || order.po_number) && (
                      <div className="flex items-start">
                        <FileBarChart2 className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">Purchase Order:</div>
                          <div className="font-medium">{order.po_number || 'N/A'}</div>
                          {order.po_date && (
                            <div className="text-sm text-gray-600">Date: {formatDate(order.po_date)}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {(order.order_start_at || order.order_end_at) && (
                      <div className="flex items-start">
                        <Clock className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">Timeline:</div>
                          {order.order_start_at && (
                            <div className="text-sm">
                              <span className="font-medium">Start:</span> {formatDate(order.order_start_at)}
                            </div>
                          )}
                          {order.order_end_at && (
                            <div className="text-sm">
                              <span className="font-medium">End:</span> {formatDate(order.order_end_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
                        <button
                          onClick={handleEmailClick}
                          className="ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Email
                        </button>
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

                {/* Shipping Information */}
                <div className="md:col-span-2">
                  <h2 className="text-lg font-semibold mb-4">Shipping Information</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-2 flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                          Shipping Address
                        </h3>
                        {order.ship_to_customer && (
                          <div className="mb-2">
                            <div className="font-medium">
                              {order.ship_to_customer.first_name} {order.ship_to_customer.last_name}
                            </div>
                            {order.ship_to_customer.company && (
                              <div className="text-sm text-gray-500">{order.ship_to_customer.company}</div>
                            )}
                          </div>
                        )}
                        {renderAddress(
                          order.shipping_address_line1,
                          order.shipping_address_line2,
                          order.shipping_city,
                          order.shipping_state,
                          order.shipping_country
                        )}
                      </div>

                      <div>
                        <h3 className="font-medium mb-2 flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-gray-500" />
                          Billing Address
                        </h3>
                        {order.bill_to_customer && (
                          <div className="mb-2">
                            <div className="font-medium">
                              {order.bill_to_customer.first_name} {order.bill_to_customer.last_name}
                            </div>
                            {order.bill_to_customer.company && (
                              <div className="text-sm text-gray-500">{order.bill_to_customer.company}</div>
                            )}
                          </div>
                        )}
                        {renderAddress(
                          order.billing_address_line1,
                          order.billing_address_line2,
                          order.billing_city,
                          order.billing_state,
                          order.billing_country
                        )}
                      </div>
                    </div>

                    {/* Tracking Information */}
                    {(order.tracking_number || order.tracking_carrier) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h3 className="font-medium mb-2 flex items-center">
                          <Truck className="w-4 h-4 mr-2 text-gray-500" />
                          Tracking Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {order.tracking_carrier && (
                            <div>
                              <div className="text-sm text-gray-500">Carrier:</div>
                              <div>{order.tracking_carrier}</div>
                            </div>
                          )}
                          {order.tracking_number && (
                            <div>
                              <div className="text-sm text-gray-500">Tracking Number:</div>
                              <div>{order.tracking_number}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="md:col-span-2">
                    <h2 className="text-lg font-semibold mb-4">Notes</h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                    </div>
                  </div>
                )}

                {/* Add Custom Fields section */}
                <div className="md:col-span-2">
                  <CustomFieldsSection
                    entityType="orders"
                    entityId={id || ''}
                    organizationId={selectedOrganization?.id}
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

          {/* Email Modals */}
          {showEmailConfigModal && (
            <EmailConfigModal
              onClose={() => setShowEmailConfigModal(false)}
              onSuccess={() => {
                setShowEmailConfigModal(false);
                setShowEmailModal(true);
              }}
            />
          )}

          {showEmailModal && order.customer && (
            <EmailModal
              to={order.customer.email}
              caseTitle={order.order_number}
              orgId={selectedOrganization?.id}
              caseId={id}
              onClose={() => setShowEmailModal(false)}
              onSuccess={() => {
                setShowEmailModal(false);
                setRefreshEmailList(prev => prev + 1); // 🔁 refresh RelatedEmails
              }}
            />
          )}

          {showAccountModal && order.vendor && (
            <AccountDetailsModal
              vendor={order.vendor}
              onClose={() => setShowAccountModal(false)}
            />
          )}
        </div>
      </div>
      {/* Related Tabs */}
      <div className="lg:w-1/4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Tab Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 flex items-center">
              <svg
                className="w-4 h-4 text-gray-500 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Related Records
            </h2>
          </div>

          {/* Tab Content */}
          <div className="divide-y divide-gray-200">
            <div className="p-4">
              <RelatedEmails
                recordId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshEmailList}
                title="Email Communications"
              />
            </div>
            <div className="p-4">
              <RelatedTasks
                recordId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshEmailList}
                title="Tasks"
              />
            </div>

            {/* You can add more related components here with the same styling */}
            {/* Example placeholder for another related component */}
            <div className="p-4">
              <div className="text-sm text-gray-500 italic">More related records would appear here</div>
            </div>
          </div>

          {/* Optional footer */}
          <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-right">
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              View All Related Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}