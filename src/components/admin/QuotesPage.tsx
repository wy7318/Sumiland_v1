import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, FileText, Edit, Trash2, ChevronDown, ChevronUp, 
  Check, X, FileSpreadsheet, AlertCircle, Copy, FileDown, Eye,
  ShoppingBag, LayoutGrid, LayoutList, User, Building2, DollarSign
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateQuotePDF } from '../../lib/pdf';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { KanbanBoard, KanbanCard } from './KanbanBoard';

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
  vendor: {
    name: string;
    type: string;
  } | null;
  items: {
    quote_dtl_id: string;
    item_name: string;
    item_desc: string | null;
    quantity: number;
    unit_price: number;
  }[];
};

type KanbanQuote = Quote & {
  id: string;
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

type ViewMode = 'list' | 'kanban';

function QuoteCard({ quote }: { quote: KanbanQuote }) {
  return (
    <KanbanCard id={quote.id}>
      <div className="space-y-2">
        <h4 className="font-medium">{quote.quote_number}</h4>
        
        <div className="flex items-center text-sm text-gray-500">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatCurrency(quote.total_amount)}
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <User className="w-4 h-4 mr-1" />
          {quote.customer.first_name} {quote.customer.last_name}
        </div>

        {quote.customer.company && (
          <div className="flex items-center text-sm text-gray-500">
            <Building2 className="w-4 h-4 mr-1" />
            {quote.customer.company}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Link
            to={`/admin/quotes/${quote.quote_id}`}
            className="text-primary-600 hover:text-primary-900"
            onClick={e => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/quotes/${quote.quote_id}/edit`}
            className="text-blue-600 hover:text-blue-900"
            onClick={e => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </KanbanCard>
  );
}

export function QuotesPage() {
  const navigate = useNavigate();
  const { organizations } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [processingQuote, setProcessingQuote] = useState<string | null>(null);
  const [quoteStatuses, setQuoteStatuses] = useState<PicklistValue[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Quote;
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc'
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    fetchPicklists();
    fetchQuotes();
  }, [organizations]);

  const fetchPicklists = async () => {
    try {
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

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('quote_hdr')
        .select(`
          *,
          customer:customers(*),
          vendor:vendors(*),
          items:quote_dtl(*)
        `)
        .in('organization_id', organizations.map(org => org.id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      setProcessingQuote(quoteId);
      setError(null);

      const { error } = await supabase
        .from('quote_hdr')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', quoteId);

      if (error) throw error;
      await fetchQuotes();
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quote status');
    } finally {
      setProcessingQuote(null);
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
      await fetchQuotes();
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete quote');
    }
  };

  const handleDuplicate = async (quote: Quote) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

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

      navigate(`/admin/quotes/${newQuote.quote_id}/edit`);
    } catch (err) {
      console.error('Error duplicating quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to duplicate quote');
    }
  };

  const handleCreateOrder = async (quote: Quote) => {
    try {
      setProcessingQuote(quote.quote_id);
      setError(null);
  
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        throw new Error('User not authenticated.');
      }
  
      const userId = userData.user.id;
  
      const { data, error } = await supabase
        .rpc('create_order_from_quote', { 
          quote_id_param: quote.quote_id, 
          user_id_param: userId 
        });
  
      console.log('Supabase Function Response:', data);
  
      if (error) {
        console.error('Supabase RPC Error:', error);
        throw error;
      }
  
      if (data?.error) {
        console.error('Supabase Function Error:', data.error);
        throw new Error(data.error);
      }
  
      alert(`Order created successfully! Order ID: ${data.order_id}`);
  
      navigate('/admin/orders');
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      alert('Error creating order: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setProcessingQuote(null);
    }
  };

  const getStatusStyle = (status: string) => {
    const statusValue = quoteStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  const getStatusLabel = (status: string) => {
    return quoteStatuses.find(s => s.value === status)?.label || status;
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${quote.customer.first_name} ${quote.customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(quote => 
    statusFilter === 'all' || quote.status === statusFilter
  );

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const kanbanQuotes: KanbanQuote[] = sortedQuotes.map(quote => ({
    ...quote,
    id: `${quote.status}-${quote.quote_id}`
  }));

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = sortedQuotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center gap-4">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban View
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4 mr-2" />
                List View
              </>
            )}
          </button>
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
            <div className="max-w-lg flex items-center gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              >
                <option value="all">All Statuses</option>
                {quoteStatuses.map(status => (
                  <option key={status.id} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {viewMode === 'list' ? (
            <div className="flex flex-col">
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
                        {paginatedQuotes.map((quote) => (
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
                                className={`px-2 py-1 text-xs font-medium rounded-full`}
                                style={getStatusStyle(quote.status)} 
                              >
                                {quoteStatuses.map(status => (
                                  <option key={status.id} value={status.value}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => navigate(`/admin/quotes/${quote.quote_id}`)}
                                  className="text-primary-600 hover:text-primary-900"
                                  title="View Quote"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(quote)}
                                  className="text-primary-600 hover:text-primary-900"
                                  title="Duplicate Quote"
                                >
                                  <Copy className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleCreateOrder(quote)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Create Order"
                                >
                                  <ShoppingBag className="w-5 h-5" />
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
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                <KanbanBoard
                  items={kanbanQuotes}
                  statuses={quoteStatuses}
                  onStatusChange={handleStatusChange}
                  renderCard={(quote) => <QuoteCard quote={quote as KanbanQuote} />}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {paginatedQuotes.length} of {filteredQuotes.length} quotes
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}