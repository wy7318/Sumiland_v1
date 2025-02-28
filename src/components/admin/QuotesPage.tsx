import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, FileText, Edit, Trash2, ChevronDown, ChevronUp, 
  Check, X, FileSpreadsheet, AlertCircle, Copy, FileDown, Eye,
  ShoppingBag
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

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

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

  useEffect(() => {
    fetchPicklists();
    fetchQuotes();
  }, [organizations]);

  const fetchPicklists = async () => {
    try {
      // Fetch quote statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_status')
        .eq('is_active', true)
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
      
      // Only fetch quotes for user's organizations
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

  const handleCreateOrder = async (quote: Quote) => {
    try {
      setProcessingQuote(quote.quote_id);
      setError(null);

      // Update quote status to Approved
      const { error: updateError } = await supabase
        .from('quote_hdr')
        .update({ 
          status: 'Approved',
          updated_at: new Date().toISOString()
        })
        .eq('quote_id', quote.quote_id);

      if (updateError) throw updateError;

      // The order will be created automatically via database trigger
      // Navigate to orders page
      navigate('/admin/orders');
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setProcessingQuote(null);
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
      </div>
    </div>
  );
}