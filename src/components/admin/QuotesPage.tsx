import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, FileText, Edit, Trash2, FileDown,
  ChevronDown, ChevronUp, AlertCircle, ShoppingBag, Copy 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateQuotePDF } from '../../lib/pdf';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

type Quote = {
  quote_id: string;
  quote_number: string;
  customer_id: string;
  vendor_id: string | null;
  quote_date: string;
  status: string;
  total_amount: number;
  currency: string;
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

const STATUS_COLORS = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Expired': 'bg-purple-100 text-purple-800'
};

export function QuotesPage() {
  const navigate = useNavigate();
  const { organizations } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ field: keyof Quote; direction: 'asc' | 'desc' }>({
    field: 'created_at',
    direction: 'desc'
  });
  const [processingQuote, setProcessingQuote] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, [organizations]);

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
        .in('organization_id', organizations.map(org => org.id))
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

  // This is for debug purpose only for handleStatusChange
  const handleStatusChange = async (quoteId: string, newStatus: string) => {
  try {
    setProcessingQuote(quoteId);
    setError(null);

    // For Approved status, we'll use a direct SQL approach with better debugging
    if (newStatus === 'Approved') {
      // First, let's double-check if there's an order (just to be certain)
      console.log('Checking for existing orders...');
      const { data: orderCheck, error: checkError } = await supabase
        .from('order_hdr')
        .select('order_id, created_at')
        .eq('quote_id', quoteId);

      if (checkError) {
        console.error('Error checking for orders:', checkError);
      } else {
        console.log('Order check result:', orderCheck);
      }

      // Next, let's try to directly update the status with the RPC
      console.log('Attempting to approve quote:', quoteId);
      
      // Option 1: Try to directly disable the trigger temporarily (requires superuser permissions)
      // This would need to be done at the database level and is not recommended for production

      // Option 2: Use a custom RPC function that logs more details
      try {
        const { data, error } = await supabase.rpc('debug_approve_quote', {
          quote_id_param: quoteId
        });
        
        if (error) {
          console.error('RPC error:', error);
          throw error;
        }
        
        console.log('Approval result:', data);
        
        // Success! Fetch quotes and navigate
        await fetchQuotes();
        setTimeout(() => {
          navigate('/admin/orders');
        }, 1000);
      } catch (rpcError) {
        console.error('RPC execution error:', rpcError);
        
        // Try a direct update as a fallback
        console.log('Attempting direct update as fallback...');
        const { error: directError } = await supabase
          .from('quote_hdr')
          .update({
            status: 'Approved',
            updated_at: new Date().toISOString()
          })
          .eq('quote_id', quoteId);
        
        if (directError) {
          console.error('Direct update error:', directError);
          throw directError;
        } else {
          console.log('Direct update succeeded');
          await fetchQuotes();
          setTimeout(() => {
            navigate('/admin/orders');
          }, 1000);
        }
      }
    } else {
      // For non-Approved status changes, use the original approach
      const { error: updateError } = await supabase
        .from('quote_hdr')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', quoteId)
        .in('organization_id', organizations.map(org => org.id));

      if (updateError) throw updateError;
      await fetchQuotes();
    }
  } catch (err) {
    console.error('Final error caught:', err);
    setError(err instanceof Error ? err.message : 'Failed to update quote status');
    await fetchQuotes();
  } finally {
    setProcessingQuote(null);
  }
};

//   const handleStatusChange = async (quoteId: string, newStatus: string) => {
//   try {
//     setProcessingQuote(quoteId);
//     setError(null);

//     // For Approved status, use a different approach that bypasses the trigger
//     if (newStatus === 'Approved') {
//       // First manually update the status
//       const { error: updateError } = await supabase.rpc('set_quote_status_bypass_trigger', {
//         quote_id_param: quoteId,
//         new_status: newStatus
//       });

//       if (updateError) throw updateError;

//       // Then manually create the order if needed
//       const { data: orderData, error: orderError } = await supabase.rpc('create_order_from_quote', {
//         quote_id_param: quoteId
//       });

//       if (orderError) throw orderError;

//       // Navigate to orders
//       setTimeout(() => {
//         navigate('/admin/orders');
//       }, 1000);
//     } else {
//       // For non-Approved status changes, use the original approach
//       const { error: updateError } = await supabase
//         .from('quote_hdr')
//         .update({ 
//           status: newStatus, 
//           updated_at: new Date().toISOString()
//         })
//         .eq('quote_id', quoteId)
//         .in('organization_id', organizations.map(org => org.id));

//       if (updateError) throw updateError;
//       await fetchQuotes();
//     }
//   } catch (err) {
//     console.error('Error updating quote status:', err);
//     setError(err instanceof Error ? err.message : 'Failed to update quote status');
//     await fetchQuotes();
//   } finally {
//     setProcessingQuote(null);
//   }
// };

  const handleDelete = async (quoteId: string) => {
    if (!window.confirm('Are you sure you want to delete this quote?')) return;

    try {
      const { error } = await supabase
        .from('quote_hdr')
        .delete()
        .eq('quote_id', quoteId)
        .in('organization_id', organizations.map(org => org.id));

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
          vendor_id: quote.vendor_id,
          organization_id: quote.organization_id,
          total_amount: quote.total_amount,
          notes: quote.notes,
          status: 'Draft',
          created_by: userData.user.id,
          updated_by: userData.user.id
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create new quote items
      if (quote.items.length > 0) {
        const { error: detailsError } = await supabase
          .from('quote_dtl')
          .insert(
            quote.items.map(item => ({
              quote_id: newQuote.quote_id,
              item_name: item.item_name,
              item_desc: item.item_desc,
              quantity: item.quantity,
              unit_price: item.unit_price,
              organization_id: quote.organization_id
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
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
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
                            disabled={processingQuote === quote.quote_id}
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