import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, DollarSign, User,
  CheckCircle, X, Send, Package, ShoppingBag,
  MapPin, Clock, Award, Repeat
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
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [refreshEmailList, setRefreshEmailList] = useState(0);

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

  // const fetchQuote = async () => {
  //   try {
  //     if (!id) return;

  //     const { data: quoteData, error: quoteError } = await supabase
  //       .from('quote_hdr')
  //       .select(`
  //       *,
  //       vendor:vendors(
  //         id,
  //         name,
  //         type,
  //         status,
  //         payment_terms,
  //         customer:customers!vendors_customer_id_fkey(
  //           first_name,
  //           last_name,
  //           email,
  //           phone,
  //           company
  //         )
  //       ),
  //       customer:customers!quote_hdr_customer_id_fkey(*),
  //       ship_to_customer:customers!quote_hdr_customer_id_fkey(customer_id, first_name, last_name, email, company),
  //       bill_to_customer:customers!quote_hdr_customer_id_fkey(customer_id, first_name, last_name, email, company),
  //       items:quote_dtl(*)
  //     `)
  //       .eq('quote_id', id)
  //       .single();

  //     if (quoteError) throw quoteError;

  //     if (quoteData) {
  //       // Calculate discount_percent dynamically
  //       const subtotal = quoteData.subtotal || 0;
  //       const discountAmount = quoteData.discount_amount || 0;
  //       const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

  //       // Set the quote data with calculated discount_percent
  //       setQuote({
  //         ...quoteData,
  //         discount_percent: discountPercent,
  //       });
  //     }
  //   } catch (err) {
  //     console.error('Error fetching quote:', err);
  //     setError(err instanceof Error ? err.message : 'Failed to load quote');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Add console.log statements to debug the issue
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

      // ✅ Step 2: Update the quote_hdr table to mark the quote as converted
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
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-3/4 space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/admin/quotes')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Quotes
            </button>
            <div className="flex items-center gap-4">
              {!quote.is_converted ? (
                <button
                  onClick={handleCreateOrder}
                  disabled={creatingOrder}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {creatingOrder ? 'Creating Order...' : 'Create Order'}
                </button>
              ) : (
                <Link
                  to={`/admin/orders/${quote.converted_to_id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  View Order
                </Link>
              )}
              <div className="flex space-x-3">
                <Link
                  to={`/admin/quotes/${id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Quote
                </Link>
                <Link
                  to={`/admin/tasks/new?module=quote_hdr&recordId=${id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add Task
                </Link>
              </div>
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
                  <h1 className="text-2xl font-bold mb-2">{quote.quote_number}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(quote.created_at).toLocaleDateString()}
                    </span>
                    <select
                      value={quote.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="text-sm font-medium rounded-full px-3 py-1"
                      style={getStatusStyle(quote.status)}
                    >
                      {quoteStatuses.map(status => (
                        <option key={status.id} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Approval Status */}
                <div className="mt-4 md:mt-0">
                  <div className="flex flex-col items-end">
                    <div className="text-sm text-gray-500 mb-2">Approval Status</div>
                    <select
                      value={quote.approval_status || 'Pending'}
                      onChange={(e) => handleApprovalStatusChange(e.target.value)}
                      className="text-sm font-medium rounded-full px-3 py-1"
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
                </div>
              </div>

              {/* Approval Information Section */}
              {quote.approval_status === 'Approved' && quote.approved_at && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
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

              {/* Conversion Information Section */}
              {quote.is_converted && quote.converted_at && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
                <div className={`border rounded-lg p-4 mb-6 ${new Date(quote.expire_at) < new Date()
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Account Information */}
                {quote.vendor && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Account Information</h2>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
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
                          className="text-primary-600 hover:text-primary-700 text-sm"
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
                          <button
                            onClick={handleEmailClick}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Email
                          </button>
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

                {/* Customer Information */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
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
                  </div>
                </div>

                {/* Owner Information */}
                {quote.owner && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Owner Information</h2>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="font-medium">{quote.owner.name}</div>
                          {quote.owner.name && (
                            <div className="text-sm text-gray-500">
                              {quote.owner.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {quote.notes && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Notes</h2>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                  </div>
                )}

                {/* Shipping & Billing Information */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Shipping Information */}
                    <div>
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                        Shipping Information
                      </h2>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        {quote.ship_to_customer && (
                          <div className="flex items-center">
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
                          quote.shipping_country) && (
                            <div className="flex items-start">
                              <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                              <div className="text-gray-600">
                                {quote.shipping_address_line1 && (
                                  <div>{quote.shipping_address_line1}</div>
                                )}
                                {quote.shipping_address_line2 && (
                                  <div>{quote.shipping_address_line2}</div>
                                )}
                                <div>
                                  {[
                                    quote.shipping_city,
                                    quote.shipping_state
                                  ].filter(Boolean).join(', ')}
                                </div>
                                {quote.shipping_country && (
                                  <div>{quote.shipping_country}</div>
                                )}
                              </div>
                            </div>
                          )}
                        {!quote.shipping_address_line1 &&
                          !quote.shipping_city &&
                          !quote.shipping_state &&
                          !quote.shipping_country &&
                          !quote.ship_to_customer && (
                            <div className="text-sm text-gray-500 italic">
                              No shipping information provided
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Billing Information */}
                    <div>
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-gray-500" />
                        Billing Information
                      </h2>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        {quote.bill_to_customer && (
                          <div className="flex items-center">
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
                          quote.billing_country) && (
                            <div className="flex items-start">
                              <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                              <div className="text-gray-600">
                                {quote.billing_address_line1 && (
                                  <div>{quote.billing_address_line1}</div>
                                )}
                                {quote.billing_address_line2 && (
                                  <div>{quote.billing_address_line2}</div>
                                )}
                                <div>
                                  {[
                                    quote.billing_city,
                                    quote.billing_state
                                  ].filter(Boolean).join(', ')}
                                </div>
                                {quote.billing_country && (
                                  <div>{quote.billing_country}</div>
                                )}
                              </div>
                            </div>
                          )}
                        {!quote.billing_address_line1 &&
                          !quote.billing_city &&
                          !quote.billing_state &&
                          !quote.billing_country &&
                          !quote.bill_to_customer && (
                            <div className="text-sm text-gray-500 italic">
                              No billing information provided
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Custom Fields section */}
                <div className="md:col-span-2">
                  <CustomFieldsSection
                    entityType="quotes"
                    entityId={id || ''}
                    organizationId={selectedOrganization?.id}
                    className="bg-gray-50 rounded-lg p-4"
                  />
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Quote Items</h2>
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

                {/* Tax and Discount Section */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Tax Details</h3>
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

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Discount Details</h3>
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

                {/* Total Amount Section */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Subtotal:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(quote.subtotal)}
                    </span>
                  </div>
                  {quote.tax_amount !== null && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-semibold">Tax:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(quote.tax_amount)}
                      </span>
                    </div>
                  )}
                  {quote.discount_amount !== null && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-semibold">Discount:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(quote.discount_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(quote.total_amount)}
                    </span>
                  </div>
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

          {showEmailModal && quote.customer && (
            <EmailModal
              to={quote.customer.email}
              caseTitle={quote.quote_number}
              orgId={selectedOrganization?.id}
              caseId={id}
              onClose={() => setShowEmailModal(false)}
              onSuccess={() => {
                setShowEmailModal(false);
                setRefreshEmailList(prev => prev + 1); // 🔁 refresh RelatedEmails
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