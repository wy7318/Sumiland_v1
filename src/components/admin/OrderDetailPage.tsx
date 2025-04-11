import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, DollarSign, User,
  CheckCircle, X, Send, Package, Truck, MapPin,
  ClipboardList, Clock, FileBarChart2, LinkIcon,
  Briefcase, MessageSquare, CreditCard, Tag,
  UserCheck, Download, Bookmark
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
import { useEmailComposer } from './EmailProvider';
import { EmailModal } from './EmailModal';
import { getEmailConfig } from '../../lib/email';
import { SquarePaymentLinkButton } from './SquarePaymentLinkButton';
import { TestSquareWebhookButton } from './TestSquareWebhookButton';


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
  const { openEmailComposer } = useEmailComposer();
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [refreshEmailList, setRefreshEmailList] = useState(0);
  // Add states for Square integration
  const [squareInvoice, setSquareInvoice] = useState(null);

  // New state for tabs
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchOrder();
      // Also fetch Square invoice info if available
      fetchSquareInvoice();
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

  // Add function to fetch Square invoice information
  const fetchSquareInvoice = async () => {
    try {
      if (!id || !selectedOrganization?.id) return;

      const { data, error } = await supabase
        .from('square_invoices')
        .select('*')
        .eq('order_id', id)
        .eq('organization_id', selectedOrganization.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Square invoice:', error);
      }

      if (data) {
        setSquareInvoice(data);
      }
    } catch (err) {
      console.error('Error in fetchSquareInvoice:', err);
    }
  };

  const handleEmailClick = async () => {
    if (!user) return;

    try {
      const config = await getEmailConfig(user.id);
      if (!config) {
        setShowEmailConfigModal(true);
      } else {
        // Open email composer with stored state
        openEmailComposer({
          to: order.customer.email,
          caseTitle: order.order_number,
          orgId: selectedOrganization?.id,
          caseId: id,
          autoClose: true, // Explicitly set to true to close after sending
          onSuccess: () => {
            // Refresh the email list after successful send
            setRefreshEmailList(prev => prev + 1);
          }
        });
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

  // Get current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!order || !orderStatuses.length) return -1;
    return orderStatuses.findIndex(status =>
      status.value.toLowerCase() === order.status.toLowerCase()
    );
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
      <div className="pl-2 border-l-2 border-primary-100 py-1 space-y-1">
        {line1 && <div className="text-gray-600">{line1}</div>}
        {line2 && <div className="text-gray-600">{line2}</div>}
        <div className="text-gray-600">
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
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/orders')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Orders</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/tasks/new?module=order_hdr&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/orders/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Order
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Status */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 rounded-full p-2.5">
                  <Package className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
                  <div className="flex items-center mt-1.5 space-x-3">
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
                    <span className="text-gray-500 text-sm">
                      Created on {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Status Badge */}
              <div className="mt-4 md:mt-0">
                <span className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full inline-flex items-center",
                  order.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
                  order.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
                  order.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
                )}>
                  {order.payment_status === 'Fully Received' && <CheckCircle className="w-4 h-4 mr-1" />}
                  {order.payment_status === 'Partial Received' && <Clock className="w-4 h-4 mr-1" />}
                  {order.payment_status === 'Pending' && <Clock className="w-4 h-4 mr-1" />}
                  {order.payment_status}
                </span>
              </div>
            </div>

            {/* Status Bar */}
            <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {orderStatuses.length > 0 && (
                <div className="relative pt-2">
                  {/* Progress bar track */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Progress bar fill - width based on current status */}
                    <div
                      className="absolute top-2 left-0 h-2 bg-blue-500 rounded-full"
                      style={{
                        width: `${(getCurrentStatusIndex() + 1) * 100 / orderStatuses.length}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    ></div>
                  </div>

                  {/* Status indicators with dots */}
                  <div className="flex justify-between mt-1">
                    {orderStatuses.map((status, index) => {
                      // Determine if this status is active (current or passed)
                      const isActive = index <= getCurrentStatusIndex();
                      // Position dots evenly
                      const position = index / (orderStatuses.length - 1) * 100;

                      return (
                        <div
                          key={status.id}
                          className="flex flex-col items-center"
                          style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                        >
                          {/* Status dot */}
                          <div
                            className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                            style={{
                              marginTop: '-10px',
                              boxShadow: '0 0 0 2px white'
                            }}
                          ></div>

                          {/* Status label */}
                          <button
                            onClick={() => handleStatusChange(status.value)}
                            className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors ${isActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
                              }`}
                          >
                            {status.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'payment'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
              </nav>
            </div>

            {/* Details Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-8">
                {/* Order Items */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Package className="w-5 h-5 text-primary-500 mr-2" />
                    Order Items
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
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
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="w-5 h-5 text-primary-500 mr-2" />
                      Customer Information
                    </h2>
                    <div className="space-y-4">
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

                      <button
                        onClick={handleEmailClick}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </button>

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

                  {/* Account Information */}
                  {order.vendor && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-primary-500 mr-2" />
                        Account Information
                      </h2>
                      <div className="space-y-4">
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
                            className="text-primary-600 hover:text-primary-700 hover:underline text-sm"
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

                  {/* Order Details */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <ClipboardList className="w-5 h-5 text-primary-500 mr-2" />
                      Order Details
                    </h2>
                    <div className="space-y-4">
                      {order.owner && (
                        <div className="flex items-center">
                          <UserCheck className="w-5 h-5 text-gray-400 mr-3" />
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

                  {/* Tracking Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Truck className="w-5 h-5 text-primary-500 mr-2" />
                      Tracking Information
                    </h2>
                    {(order.tracking_number || order.tracking_carrier) ? (
                      <div className="space-y-4">
                        {order.tracking_carrier && (
                          <div className="flex items-start">
                            <Tag className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                            <div>
                              <div className="text-sm text-gray-500">Carrier:</div>
                              <div className="font-medium">{order.tracking_carrier}</div>
                            </div>
                          </div>
                        )}

                        {order.tracking_number && (
                          <div className="flex items-start">
                            <LinkIcon className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                            <div>
                              <div className="text-sm text-gray-500">Tracking Number:</div>
                              <div className="font-medium">{order.tracking_number}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No tracking information available
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping & Billing Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shipping Address */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <MapPin className="w-5 h-5 text-primary-500 mr-2" />
                      Shipping Address
                    </h2>

                    {order.ship_to_customer && (
                      <div className="flex items-center mb-4">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium">
                            {order.ship_to_customer.first_name} {order.ship_to_customer.last_name}
                          </div>
                          {order.ship_to_customer.company && (
                            <div className="text-sm text-gray-500">
                              {order.ship_to_customer.company}
                            </div>
                          )}
                        </div>
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

                  {/* Billing Address */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 text-primary-500 mr-2" />
                      Billing Address
                    </h2>

                    {order.bill_to_customer && (
                      <div className="flex items-center mb-4">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium">
                            {order.bill_to_customer.first_name} {order.bill_to_customer.last_name}
                          </div>
                          {order.bill_to_customer.company && (
                            <div className="text-sm text-gray-500">
                              {order.bill_to_customer.company}
                            </div>
                          )}
                        </div>
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

                {/* Notes */}
                {order.notes && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-primary-500 mr-2" />
                      Notes
                    </h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}

                {/* Custom Fields */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-primary-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="orders"
                    entityId={id || ''}
                    organizationId={selectedOrganization?.id}
                  />
                </div>
              </div>
            )}

            {/* Payment Tab Content */}
            {activeTab === 'payment' && (
              <div className="space-y-8">
                {/* Payment Summary */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 text-primary-500 mr-2" />
                    Payment Summary
                  </h2>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Tax ({order.tax_percent ?? 0}%):</span>
                      <span className="font-medium">{formatCurrency(order.tax_amount ?? 0)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(order.discount_amount ?? 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-4">
                      <span className="text-lg font-semibold">Total Amount:</span>
                      <span className="text-lg font-bold">{formatCurrency(order.total_amount)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Amount Received:</span>
                      <span className="font-medium text-green-600">{formatCurrency(order.payment_amount)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-4">
                      <span className="text-lg font-semibold">Balance Due:</span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(order.total_amount - order.payment_amount)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={cn(
                        "px-3 py-1 text-sm font-medium rounded-full inline-flex items-center",
                        order.payment_status === 'Pending' && "bg-gray-100 text-gray-800",
                        order.payment_status === 'Partial Received' && "bg-orange-100 text-orange-800",
                        order.payment_status === 'Fully Received' && "bg-green-100 text-green-800"
                      )}>
                        {order.payment_status === 'Fully Received' && <CheckCircle className="w-4 h-4 mr-1" />}
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Square Payment */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 text-primary-500 mr-2" />
                    Payment Options
                  </h2>

                  {order.payment_status !== 'Fully Received' ? (
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        Create a payment link to allow your customer to pay for this order online.
                      </p>

                      <SquarePaymentLinkButton order={order} />

                      {squareInvoice && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Square Invoice Status:</span>
                            <span className={cn(
                              "px-2 py-1 text-xs font-medium rounded-full",
                              squareInvoice.status === 'DRAFT' && "bg-gray-100 text-gray-800",
                              squareInvoice.status === 'UNPAID' && "bg-yellow-100 text-yellow-800",
                              squareInvoice.status === 'SCHEDULED' && "bg-blue-100 text-blue-800",
                              squareInvoice.status === 'PARTIALLY_PAID' && "bg-orange-100 text-orange-800",
                              squareInvoice.status === 'PAID' && "bg-green-100 text-green-800",
                              squareInvoice.status === 'CANCELED' && "bg-red-100 text-red-800"
                            )}>
                              {squareInvoice.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 bg-green-50 p-4 rounded-xl">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <p className="text-green-700">
                        This order has been fully paid.
                      </p>
                    </div>
                  )}

                  {/* Add test webhook button if in development mode */}
                  {process.env.NODE_ENV === 'development' && squareInvoice && order.payment_status !== 'Fully Received' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500 italic mb-2">Development Testing:</div>
                      <TestSquareWebhookButton
                        squareInvoiceId={squareInvoice.square_invoice_id}
                        orderId={id}
                        organizationId={selectedOrganization?.id}
                        onSuccess={() => {
                          // Refresh the order data to show updated payment status
                          fetchOrder();
                        }}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Related Tab Content */}
            {activeTab === 'related' && (
              <div className="space-y-8">
                {/* Email Communications */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedEmails
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshEmailList}
                    title="Email Communications"
                  />
                </div>

                {/* Tasks */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedTasks
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshEmailList}
                    title="Tasks"
                  />
                </div>

                {/* Additional related records */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 text-primary-500 mr-2" />
                    Other Related Records
                  </h2>
                  <div className="text-sm text-gray-500 italic py-2">
                    More related records would appear here
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modals */}
      {showEmailConfigModal && (
        <EmailConfigModal
          onClose={() => setShowEmailConfigModal(false)}
          onSuccess={() => {
            setShowEmailConfigModal(false);
            // After config is set up, open the email composer
            openEmailComposer({
              to: order.customer.email,
              caseTitle: order.order_number,
              orgId: selectedOrganization?.id,
              caseId: id,
              onSuccess: () => {
                setRefreshEmailList(prev => prev + 1);
              }
            });
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
            setRefreshEmailList(prev => prev + 1);
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
  );
}