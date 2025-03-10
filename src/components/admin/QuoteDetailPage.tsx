import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, DollarSign, User,
  CheckCircle, X, Send, Package, ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { AccountDetailsModal } from './AccountDetailsModal';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useAuth } from '../../contexts/AuthContext';

type Quote = {
  quote_id: string;
  quote_number: string;
  customer_id: string;
  vendor_id: string | null;
  quote_date: string;
  status: string;
  total_amount: number;
  subtotal: number; // Add subtotal
  tax_percent: number | null; // Add tax percentage
  tax_amount: number | null; // Add tax amount
  discount_percent: number | null; // Add discount percentage
  discount_amount: number | null; // Add discount amount
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  };
  items: {
    quote_dtl_id: string;
    item_name: string;
    item_desc: string | null;
    quantity: number;
    unit_price: number;
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
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [quoteStatuses, setQuoteStatuses] = useState<PicklistValue[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);

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
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setQuoteStatuses(statusData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchQuote = async () => {
    try {
      if (!id) return;
  
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
          customer:customers(*),
          items:quote_dtl(*)
        `)
        .eq('quote_id', id)
        .single();
  
      if (quoteError) throw quoteError;
  
      if (quoteData) {
        // Calculate discount_percent dynamically
        const subtotal = quoteData.subtotal || 0;
        const discountAmount = quoteData.discount_amount || 0;
        const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  
        // Set the quote data with calculated discount_percent
        setQuote({
          ...quoteData,
          discount_percent: discountPercent,
        });
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
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

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = quoteStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get label for status
  const getStatusLabel = (status: string) => {
    return quoteStatuses.find(s => s.value === status)?.label || status;
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
          <button
            onClick={handleCreateOrder}
            disabled={creatingOrder}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            {creatingOrder ? 'Creating Order...' : 'Create Order'}
          </button>
          <Link
            to={`/admin/quotes/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Quote
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
          </div>

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

            {/* Notes */}
            {quote.notes && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Notes</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              </div>
            )}

            {/* Add Custom Fields section */}
            <div className="md:col-span-2">
              <CustomFieldsSection
                entityType="quote"
                entityId={id || ''}
                organizationId={quote.organization_id}
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
                          {formatCurrency(item.quantity * item.unit_price)}
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
                      {quote.discount_percent !== null ? `${quote.discount_percent}%` : 'N/A'}
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

      {showAccountModal && quote.vendor && (
        <AccountDetailsModal
          vendor={quote.vendor}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}