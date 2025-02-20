import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, FileText, Edit, Trash2, FileDown,
  ChevronDown, ChevronUp, AlertCircle, ShoppingBag, Copy 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateQuotePDF } from '../../lib/pdf';
import { cn, formatCurrency } from '../../lib/utils';

type Quote = {
  quote_id: string;
  quote_number: string;
  customer_id: string;
  quote_date: string;
  status: string;
  total_amount: number;
  currency: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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

type SortConfig = {
  key: keyof Quote;
  direction: 'asc' | 'desc';
};

const STATUS_COLORS = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Expired': 'bg-purple-100 text-purple-800'
};

export function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'created_at',
    direction: 'desc'
  });
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_hdr')
        .select(`
          *,
          customer:customers(*),
          items:quote_dtl(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      setError(null);
      
      const { error: updateError } = await supabase
        .from('quote_hdr')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', quoteId);

      if (updateError) throw updateError;

      // If status was changed to Approved, wait briefly then navigate to orders
      if (newStatus === 'Approved') {
        setTimeout(() => {
          navigate('/admin/orders');
        }, 1000);
      } else {
        await fetchQuotes();
      }
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quote status');
      // Refresh quotes to get current statuses
      await fetchQuotes();
    }
  };

  const handleCreateOrder = async (quote: Quote) => {
    try {
      setError(null);
      setProcessingOrder(quote.quote_id);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: orderId, error: orderError } = await supabase.rpc(
        'create_order_from_quote',
        { 
          quote_id_param: quote.quote_id,
          user_id_param: userData.user.id
        }
      );

      if (orderError) throw orderError;

      // Navigate to orders page
      navigate('/admin/orders');
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      // Refresh quotes to get current statuses
      await fetchQuotes();
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleDelete = async (quoteId: string) => {
    if (!window.confirm('Are you sure you want to delete this quote?')) return;

    try {
      const { error } = await supabase
        .from('quote_hdr')
        .delete()
        .eq('quote_id', quoteId);

      if (error) throw error;
      setQuotes(quotes.filter(q => q.quote_id !== quoteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quote');
    }
  };

  const handleDuplicate = async (quote: Quote) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create new quote header
      const { data: newQuote, error: quoteError } = await supabase
        .from('quote_hdr')
        .insert([{
          customer_id: quote.customer_id,
          total_amount: quote.total_amount,
          notes: quote.notes,
          status: 'Draft',
          created_by: userData.user.id,
          updated_by: userData.user.id
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Get quote items
      const { data: items, error: itemsError } = await supabase
        .from('quote_dtl')
        .select('*')
        .eq('quote_id', quote.quote_id);

      if (itemsError) throw itemsError;

      // Create new quote items
      if (items && items.length > 0) {
        const { error: detailsError } = await supabase
          .from('quote_dtl')
          .insert(
            items.map(item => ({
              quote_id: newQuote.quote_id,
              item_name: item.item_name,
              item_desc: item.item_desc,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          );

        if (detailsError) throw detailsError;
      }

      // Navigate to edit page of new quote
      navigate(`/admin/quotes/${newQuote.quote_id}/edit`);
    } catch (err) {
      console.error('Error duplicating quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate quote');
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${quote.customer.first_name} ${quote.customer.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all quotes in your account including their number, customer, and status.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/admin/quotes/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="max-w-lg flex items-center">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search quotes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Quote Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Total
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sortedQuotes.map((quote) => (
                      <tr key={quote.quote_id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {quote.quote_number}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {quote.customer.first_name} {quote.customer.last_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(quote.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <select
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote.quote_id, e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[quote.status as keyof typeof STATUS_COLORS]}`}
                          >
                            <option value="Draft">Draft</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Expired">Expired</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleDuplicate(quote)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Duplicate Quote"
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                const doc = generateQuotePDF(quote);
                                doc.save(`${quote.quote_number}.pdf`);
                              }}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded-full"
                              title="Download PDF"
                            >
                              <FileDown className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleCreateOrder(quote)}
                              className={cn(
                                "p-2 rounded-full",
                                quote.status === 'Approved' || processingOrder === quote.quote_id
                                  ? "text-gray-400 cursor-not-allowed"
                                  : "text-green-600 hover:bg-green-50"
                              )}
                              title={
                                quote.status === 'Approved' 
                                  ? 'Order already created' 
                                  : 'Create Order'
                              }
                              disabled={quote.status === 'Approved' || processingOrder === quote.quote_id}
                            >
                              <ShoppingBag className={cn(
                                "w-5 h-5",
                                quote.status === 'Approved' ? 'opacity-50' : '',
                                processingOrder === quote.quote_id ? 'animate-pulse' : ''
                              )} />
                            </button>
                            <Link
                              to={`/admin/quotes/${quote.quote_id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(quote.quote_id)}
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
        </div>
      </div>
    </div>
  );
}