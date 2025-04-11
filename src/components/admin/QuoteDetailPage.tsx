import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, DollarSign, User,
  CheckCircle, X, Send, Package, ShoppingBag,
  MapPin, Clock, Award, Repeat, Bookmark, MessageSquare,
  Briefcase, CreditCard, UserCheck, Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
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

type Quote = {
  quote_id: string;
  quote_number: string;
  customer_id: string;
  vendor_id: string | null;
  quote_date: string;
  status: string;
  total_amount: number;
  subtotal: number;
  tax_percent: number | null;
  tax_amount: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  // New fields
  owner_id: string | null;
  bill_to_customer_id: string | null;
  ship_to_customer_id: string | null;
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
  expire_at: string | null;
  is_converted: boolean;
  converted_at: string | null;
  converted_to_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_status: string | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  };
  owner: {
    id: string;
    name: string;
  } | null;
  approver: {
    id: string;
    name: string;
    email: string;
  } | null;
  ship_to_customer: {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  } | null;
  bill_to_customer: {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  } | null;
  items: {
    quote_dtl_id: string;
    item_name: string;
    item_desc: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
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

export function QuoteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [quoteStatuses, setQuoteStatuses] = useState<PicklistValue[]>([]);
  const [approvalStatuses, setApprovalStatuses] = useState<PicklistValue[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { openEmailComposer } = useEmailComposer();
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [refreshEmailList, setRefreshEmailList] = useState(0);

  // New state for tabs
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchQuote();
    }
  }, [id]);

  const fetchPicklists = async () => {
    try {
      // Fetch quote statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setQuoteStatuses(statusData || []);

      // Fetch approval statuses
      const { data: approvalData, error: approvalError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_approval_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (approvalError) throw approvalError;
      setApprovalStatuses(approvalData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchQuote = async () => {
    try {
      if (!id) return;
      setLoading(true);

      // Step 1: Fetch the main quote data with vendor and items
      const { data: quoteData, error: quoteError } = await supabase
        .from('quote_hdr')
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
          )
        ),
        items:quote_dtl(*)
      `)
        .eq('quote_id', id)
        .single();

      if (quoteError) throw quoteError;
      if (!quoteData) {
        setError('Quote not found');
        setLoading(false);
        return;
      }

      console.log("Quote data:", quoteData);
      console.log("Ship to customer ID:", quoteData.ship_to_customer_id);
      console.log("Bill to customer ID:", quoteData.bill_to_customer_id);

      // Step 2: Fetch related data separately
      // Customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('first_name, last_name, email, company')
        .eq('customer_id', quoteData.customer_id)
        .single();

      if (customerError) throw customerError;

      // Owner
      let ownerData = null;
      if (quoteData.owner_id) {
        const { data: owner, error: ownerError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', quoteData.owner_id)
          .single();

        if (ownerError) throw ownerError;
        ownerData = owner;
      }

      // Approver
      let approverData = null;
      if (quoteData.approved_by) {
        const { data: approver, error: approverError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', quoteData.approved_by)
          .single();

        if (approverError) throw approverError;
        approverData = approver;
      }

      // Ship To Customer
      let shipToCustomerData = null;
      if (quoteData.ship_to_customer_id) {
        const { data: shipTo, error: shipToError } = await supabase
          .from('customers')
          .select('customer_id, first_name, last_name, email, company')
          .eq('customer_id', quoteData.ship_to_customer_id)
          .single();

        if (shipToError) {
          console.error("Error fetching ship_to_customer:", shipToError);
        } else {
          shipToCustomerData = shipTo;
          console.log("Ship to customer data:", shipToCustomerData);
        }
      }

      // Bill To Customer
      let billToCustomerData = null;
      if (quoteData.bill_to_customer_id) {
        const { data: billTo, error: billToError } = await supabase
          .from('customers')
          .select('customer_id, first_name, last_name, email, company')
          .eq('customer_id', quoteData.bill_to_customer_id)
          .single();

        if (billToError) {
          console.error("Error fetching bill_to_customer:", billToError);
        } else {
          billToCustomerData = billTo;
          console.log("Bill to customer data:", billToCustomerData);
        }
      }

      // Calculate discount_percent dynamically
      const subtotal = quoteData.subtotal || 0;
      const discountAmount = quoteData.discount_amount || 0;
      const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

      // Combine all data
      const combinedQuoteData = {
        ...quoteData,
        discount_percent: discountPercent,
        customer: customerData,
        owner: ownerData,
        approver: approverData,
        ship_to_customer: shipToCustomerData,
        bill_to_customer: billToCustomerData
      };

      console.log("Final combined quote data:", combinedQuoteData);
      setQuote(combinedQuoteData);
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = async () => {
    if (!user || !quote) return;

    try {
      const config = await getEmailConfig(user.id);
      if (!config) {
        setShowEmailConfigModal(true);
      } else {
        // Open email composer with stored state
        openEmailComposer({
          to: quote.customer.email,
          caseTitle: quote.quote_number,
          orgId: selectedOrganization?.id,
          caseId: id,
          autoClose: true,
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
      if (!id || !quote) return;

      const { error } = await supabase
        .from('quote_hdr')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', id);

      if (error) throw error;
      await fetchQuote();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleApprovalStatusChange = async (newStatus: string) => {
    try {
      if (!id || !quote || !user) return;

      const updates: any = {
        approval_status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If status is being changed to Approved, update approved_by and approved_at
      if (newStatus === 'Approved' && quote.approval_status !== 'Approved') {
        updates.approved_by = user.id;
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('quote_hdr')
        .update(updates)
        .eq('quote_id', id);

      if (error) throw error;
      await fetchQuote();
    } catch (err) {
      console.error('Error updating approval status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update approval status');
    }
  };

  const handleCreateOrder = async () => {
    try {
      if (!quote) {
        setError("Quote data is missing.");
        return;
      }

      setCreatingOrder(true);
      setError(null);

      // Get the authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        throw new Error('User not authenticated.');
      }

      const userId = userData.user.id;

      // Call the Supabase function to create an order
      const { data, error } = await supabase
        .rpc('create_order_from_quote', {
          quote_id_param: quote.quote_id,
          user_id_param: userId
        });

      if (error) {
        console.error('Supabase RPC Error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Supabase Function Error:', data.error);
        throw new Error(data.error);
      }
      const createdOrderId = data.order_id;

      // Update the quote_hdr table to mark the quote as converted
      const { error: updateError } = await supabase
        .from('quote_hdr')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_to_id: createdOrderId
        })
        .eq('quote_id', quote.quote_id);

      if (updateError) {
        console.error('Error updating quote_hdr after order creation:', updateError);
        throw updateError;
      }
      alert(`Order created successfully! Order ID: ${data.order_id}`);

      // Navigate to the orders page after successfully creating the order
      navigate('/admin/orders');
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      alert('Error creating order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCreatingOrder(false);
    }
  };

  // Format a full address from components
  const formatAddress = (line1: string | null, line2: string | null, city: string | null, state: string | null, country: string | null) => {
    const parts = [];
    if (line1) parts.push(line1);
    if (line2) parts.push(line2);

    const cityStateCountry = [];
    if (city) cityStateCountry.push(city);
    if (state) cityStateCountry.push(state);
    if (cityStateCountry.length > 0) parts.push(cityStateCountry.join(', '));

    if (country) parts.push(country);

    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = quoteStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get approval status style
  const getApprovalStatusStyle = (status: string) => {
    const statusValue = approvalStatuses.find(s => s.value === status);
    if (!statusValue?.color) {
      // Default colors if not found in picklist
      if (status === 'Approved') return { backgroundColor: '#10B981', color: '#FFFFFF' };
      if (status === 'Rejected') return { backgroundColor: '#EF4444', color: '#FFFFFF' };
      if (status === 'Pending') return { backgroundColor: '#F59E0B', color: '#FFFFFF' };
      return {};
    }
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get label for status
  const getStatusLabel = (status: string) => {
    return quoteStatuses.find(s => s.value === status)?.label || status;
  };

  // Get label for approval status
  const getApprovalStatusLabel = (status: string) => {
    return approvalStatuses.find(s => s.value === status)?.label || status;
  };

  // Get current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!quote || !quoteStatuses.length) return -1;
    return quoteStatuses.findIndex(status =>
      status.value.toLowerCase() === quote.status.toLowerCase()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        Quote not found
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/quotes')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Quotes</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            {!quote.is_converted ? (
              <button
                onClick={handleCreateOrder}
                disabled={creatingOrder}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                {creatingOrder ? 'Creating Order...' : 'Create Order'}
              </button>
            ) : (
              <Link
                to={`/admin/orders/${quote.converted_to_id}`}
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                View Order
              </Link>
            )}
            <Link
              to={`/admin/tasks/new?module=quote_hdr&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/quotes/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Quote
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Status */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 rounded-full p-2.5">
                  <FileText className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
                  <div className="flex items-center mt-1.5 space-x-3">
                    <span className="text-gray-500 text-sm">
                      Created on {new Date(quote.created_at).toLocaleDateString()}
                    </span>

                    {/* Approval Status Badge */}
                    {quote.approval_status && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full flex items-center"
                        style={getApprovalStatusStyle(quote.approval_status)}
                      >
                        {quote.approval_status === 'Approved' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : quote.approval_status === 'Rejected' ? (
                          <X className="w-3 h-3 mr-1" />
                        ) : (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {getApprovalStatusLabel(quote.approval_status)}
                      </span>
                    )}

                    {/* Total Badge */}
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {formatCurrency(quote.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Information Section */}
            {quote.is_converted && quote.converted_at && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center">
                  <Repeat className="w-5 h-5 text-blue-500 mr-2" />
                  <span className="font-medium text-blue-700">
                    Converted to Order on {new Date(quote.converted_at).toLocaleDateString()}
                  </span>
                  {quote.converted_to_id && (
                    <Link
                      to={`/admin/orders/${quote.converted_to_id}`}
                      className="ml-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      View Order
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Expiration Information */}
            {quote.expire_at && (
              <div className={`border rounded-xl p-4 mb-6 ${new Date(quote.expire_at) < new Date()
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200'
                }`}>
                <div className="flex items-center">
                  <Clock className={`w-5 h-5 mr-2 ${new Date(quote.expire_at) < new Date()
                    ? 'text-red-500'
                    : 'text-yellow-500'
                    }`} />
                  <span className={`font-medium ${new Date(quote.expire_at) < new Date()
                    ? 'text-red-700'
                    : 'text-yellow-700'
                    }`}>
                    {new Date(quote.expire_at) < new Date()
                      ? 'Expired on '
                      : 'Expires on '}
                    {new Date(quote.expire_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Status Bar */}
            <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {quoteStatuses.length > 0 && (
                <div className="relative pt-2">
                  {/* Progress bar track */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Progress bar fill - width based on current status */}
                    <div
                      className="absolute top-2 left-0 h-2 bg-blue-500 rounded-full"
                      style={{
                        width: `${(getCurrentStatusIndex() + 1) * 100 / quoteStatuses.length}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    ></div>
                  </div>

                  {/* Status indicators with dots */}
                  <div className="flex justify-between mt-1">
                    {quoteStatuses.map((status, index) => {
                      // Determine if this status is active (current or passed)
                      const isActive = index <= getCurrentStatusIndex();
                      // Position dots evenly
                      const position = index / (quoteStatuses.length - 1) * 100;

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
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
                <button
                  onClick={() => setActiveTab('approval')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'approval'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approval
                </button>
              </nav>
            </div>

            {/* Details Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-8">
                {/* Quote Items */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Package className="w-5 h-5 text-primary-500 mr-2" />
                    Quote Items
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
                        {quote.items.map((item) => (
                          <tr key={item.quote_dtl_id}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {item.item_name}
                                </div>
                                {item.item_desc && (
                                  <div className="text-sm text-gray-500">
                                    {item.item_desc}
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
                                {formatCurrency(item.line_total)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tax and Discount */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Tag className="w-5 h-5 text-primary-500 mr-2" />
                      Tax & Discount
                    </h2>
                    <div className="space-y-4">
                      {/* Tax Section */}
                      <div>
                        <h3 className="text-md font-medium mb-2">Tax Details</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Tax Percentage:</span>
                            <span className="text-sm text-gray-900">
                              {quote.tax_percent !== null ? `${quote.tax_percent}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Tax Amount:</span>
                            <span className="text-sm text-gray-900">
                              {quote.tax_amount !== null ? formatCurrency(quote.tax_amount) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-3"></div>

                      {/* Discount Section */}
                      <div>
                        <h3 className="text-md font-medium mb-2">Discount Details</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Discount Percentage:</span>
                            <span className="text-sm text-gray-900">
                              {quote.discount_percent !== null ? `${quote.discount_percent.toFixed(2)}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Discount Amount:</span>
                            <span className="text-sm text-gray-900">
                              {quote.discount_amount !== null ? formatCurrency(quote.discount_amount) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Summary */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 text-primary-500 mr-2" />
                      Price Summary
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(quote.subtotal)}
                        </span>
                      </div>

                      {quote.tax_amount !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tax:</span>
                          <span className="text-gray-900">
                            {formatCurrency(quote.tax_amount)}
                          </span>
                        </div>
                      )}

                      {quote.discount_amount !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-gray-900">
                            -{formatCurrency(quote.discount_amount)}
                          </span>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total:</span>
                          <span className="text-lg font-bold text-primary-700">
                            {formatCurrency(quote.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
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
                            {quote.customer.first_name} {quote.customer.last_name}
                          </div>
                          {quote.customer.company && (
                            <div className="text-sm text-gray-500">
                              {quote.customer.company}
                            </div>
                          )}
                        </div>
                      </div>

                      {quote.customer.email && (
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <a
                            href={`mailto:${quote.customer.email}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {quote.customer.email}
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
                    </div>
                  </div>

                  {/* Account Information */}
                  {quote.vendor && (
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
                              <div className="font-medium">{quote.vendor.name}</div>
                              <div className="text-sm text-gray-500">
                                Type: {quote.vendor.type}
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

                        {quote.vendor.customer && (
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">
                                Contact: {quote.vendor.customer.first_name} {quote.vendor.customer.last_name}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <a
                                href={`mailto:${quote.vendor.customer.email}`}
                                className="text-sm text-primary-600 hover:text-primary-700"
                              >
                                {quote.vendor.customer.email}
                              </a>
                            </div>

                            {quote.vendor.customer.phone && (
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 text-gray-400 mr-2" />
                                <a
                                  href={`tel:${quote.vendor.customer.phone}`}
                                  className="text-sm text-primary-600 hover:text-primary-700"
                                >
                                  {quote.vendor.customer.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Owner Information */}
                  {quote.owner && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-primary-500 mr-2" />
                        Owner Information
                      </h2>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                          <span className="text-primary-700 font-medium">
                            {quote.owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{quote.owner.name}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {quote.notes && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <FileText className="w-5 h-5 text-primary-500 mr-2" />
                        Notes
                      </h2>
                      <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                  )}
                </div>

                {/* Shipping & Billing Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shipping Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <MapPin className="w-5 h-5 text-primary-500 mr-2" />
                      Shipping Information
                    </h2>

                    {quote.ship_to_customer && (
                      <div className="flex items-center mb-4">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium">
                            {quote.ship_to_customer.first_name} {quote.ship_to_customer.last_name}
                          </div>
                          {quote.ship_to_customer.company && (
                            <div className="text-sm text-gray-500">
                              {quote.ship_to_customer.company}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(quote.shipping_address_line1 ||
                      quote.shipping_city ||
                      quote.shipping_state ||
                      quote.shipping_country) ? (
                      <div className="pl-2 border-l-2 border-primary-100 py-1 space-y-1">
                        {quote.shipping_address_line1 && (
                          <div className="text-gray-600">{quote.shipping_address_line1}</div>
                        )}
                        {quote.shipping_address_line2 && (
                          <div className="text-gray-600">{quote.shipping_address_line2}</div>
                        )}
                        <div className="text-gray-600">
                          {[
                            quote.shipping_city,
                            quote.shipping_state
                          ].filter(Boolean).join(', ')}
                        </div>
                        {quote.shipping_country && (
                          <div className="text-gray-600">{quote.shipping_country}</div>
                        )}
                      </div>
                    ) : (
                      !quote.ship_to_customer && (
                        <div className="text-sm text-gray-500 italic">
                          No shipping information provided
                        </div>
                      )
                    )}
                  </div>

                  {/* Billing Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 text-primary-500 mr-2" />
                      Billing Information
                    </h2>

                    {quote.bill_to_customer && (
                      <div className="flex items-center mb-4">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium">
                            {quote.bill_to_customer.first_name} {quote.bill_to_customer.last_name}
                          </div>
                          {quote.bill_to_customer.company && (
                            <div className="text-sm text-gray-500">
                              {quote.bill_to_customer.company}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(quote.billing_address_line1 ||
                      quote.billing_city ||
                      quote.billing_state ||
                      quote.billing_country) ? (
                      <div className="pl-2 border-l-2 border-primary-100 py-1 space-y-1">
                        {quote.billing_address_line1 && (
                          <div className="text-gray-600">{quote.billing_address_line1}</div>
                        )}
                        {quote.billing_address_line2 && (
                          <div className="text-gray-600">{quote.billing_address_line2}</div>
                        )}
                        <div className="text-gray-600">
                          {[
                            quote.billing_city,
                            quote.billing_state
                          ].filter(Boolean).join(', ')}
                        </div>
                        {quote.billing_country && (
                          <div className="text-gray-600">{quote.billing_country}</div>
                        )}
                      </div>
                    ) : (
                      !quote.bill_to_customer && (
                        <div className="text-sm text-gray-500 italic">
                          No billing information provided
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Custom Fields */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-primary-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="quotes"
                    entityId={id || ''}
                    organizationId={selectedOrganization?.id}
                  />
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

            {/* Approval Tab Content */}
            {activeTab === 'approval' && (
              <div className="space-y-8">
                {/* Approval Status Card */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-primary-500 mr-2" />
                    Approval Status
                  </h2>

                  <div className="space-y-4">
                    {/* Current Status */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50 p-4 rounded-xl">
                      <div className="flex items-center mb-3 md:mb-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                          style={{
                            backgroundColor: getApprovalStatusStyle(quote.approval_status || 'Pending').backgroundColor + '20',
                            color: getApprovalStatusStyle(quote.approval_status || 'Pending').color
                          }}
                        >
                          {quote.approval_status === 'Approved' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : quote.approval_status === 'Rejected' ? (
                            <X className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Current Status</div>
                          <div className="font-medium">
                            {getApprovalStatusLabel(quote.approval_status || 'Pending')}
                          </div>
                        </div>
                      </div>

                      <select
                        value={quote.approval_status || 'Pending'}
                        onChange={(e) => handleApprovalStatusChange(e.target.value)}
                        className="text-sm font-medium rounded-full px-4 py-2"
                        style={getApprovalStatusStyle(quote.approval_status || 'Pending')}
                      >
                        {approvalStatuses.length > 0 ? (
                          approvalStatuses.map(status => (
                            <option key={status.id} value={status.value}>
                              {status.label}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Approval Information */}
                    {quote.approval_status === 'Approved' && quote.approved_at && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          <span className="font-medium text-green-700">Approved</span>
                          {quote.approver && (
                            <span className="text-green-700 ml-2">
                              by {quote.approver.name} on {new Date(quote.approved_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Processing Notes */}
                    <div className="mt-4">
                      <h3 className="text-md font-medium mb-2">Processing Notes</h3>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          <p>When a quote is approved:</p>
                          <ul className="list-disc list-inside mt-1 ml-2">
                            <li>The approval status is set to "Approved"</li>
                            <li>The system records who approved it and when</li>
                            <li>The quote becomes eligible for conversion to an order</li>
                          </ul>
                        </div>
                      </div>
                    </div>
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
              to: quote.customer.email,
              caseTitle: quote.quote_number,
              orgId: selectedOrganization?.id,
              caseId: id,
              onSuccess: () => {
                setRefreshEmailList(prev => prev + 1);
              }
            });
          }}
        />
      )}

      {showEmailModal && quote.customer && (
        <EmailModal
          to={quote.customer.email}
          caseTitle={quote.quote_number}
          orgId={selectedOrganization?.id}
          caseId={id}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false);
            setRefreshEmailList(prev => prev + 1);
          }}
        />
      )}

      {showAccountModal && quote.vendor && (
        <AccountDetailsModal
          vendor={quote.vendor}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}