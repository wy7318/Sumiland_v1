import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Check, X, FileSpreadsheet, AlertCircle, Copy, FileDown, Eye,
  ShoppingBag, LayoutGrid, LayoutList, User, Building2, DollarSign,
  Calendar, UserCheck, Zap, Mail, Phone, Flag
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateQuotePDF } from '../../lib/pdf';
import { cn, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { KanbanBoard, KanbanCard } from './KanbanBoard';
import { useOrganization } from '../../contexts/OrganizationContext';

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
  owner_id: string | null;
  owner: {
    id: string;
    name: string;
  } | null;
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

function QuoteCard({ quote, onStatusChange, statuses, handleDelete, handleDuplicate, handleCreateOrder }: {
  quote: KanbanQuote;
  onStatusChange: (id: string, status: string) => void;
  statuses: PicklistValue[];
  handleDelete: (id: string) => void;
  handleDuplicate: (quote: Quote) => void;
  handleCreateOrder: (quote: Quote) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = statuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  return (
    <KanbanCard id={quote.id}>
      <div className="space-y-3 relative p-1">
        <div
          className="absolute top-0 right-0 p-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowActions(!showActions)}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold">Q</span>
          </div>
          <h4 className="font-medium text-gray-900">
            {quote.quote_number}
          </h4>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <DollarSign className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{formatCurrency(quote.total_amount)}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <User className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {quote.customer.first_name} {quote.customer.last_name}
          </span>
        </div>

        {quote.customer.company && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{quote.customer.company}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600 mt-1">
          <UserCheck className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          {quote.owner ? (
            <span className="font-medium">{quote.owner.name}</span>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span>{new Date(quote.created_at).toLocaleDateString()}</span>
        </div>

        {showActions && (
          <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={quote.status}
                onChange={(e) => onStatusChange(quote.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                style={getStatusStyle(quote.status)}
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <Link
                to={`/admin/quotes/${quote.quote_id}`}
                className="p-1.5 bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 transition-colors"
                title="View details"
                onClick={e => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(quote);
                }}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                title="Duplicate quote"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateOrder(quote);
                }}
                className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                title="Create order"
              >
                <ShoppingBag className="w-4 h-4" />
              </button>
              <Link
                to={`/admin/quotes/${quote.quote_id}/edit`}
                className="p-1.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors"
                title="Edit quote"
                onClick={e => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(quote.quote_id);
                }}
                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete quote"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {/* <div className="flex justify-center pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const doc = generateQuotePDF(quote);
                  doc.save(`${quote.quote_number}.pdf`);
                }}
                className="p-1.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors w-full flex items-center justify-center gap-2"
                title="Download PDF"
              >
                <FileDown className="w-4 h-4" />
                <span className="text-xs">Download PDF</span>
              </button>
            </div> */}
          </div>
        )}
      </div>
    </KanbanCard>
  );
}

export function QuotesPage() {
  const navigate = useNavigate();
  const { organizations } = useAuth();
  const { selectedOrganization } = useOrganization();
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
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  useEffect(() => {
    fetchPicklists();
    fetchQuotes();
  }, [selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'quote_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
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

      // Step 1: Fetch quotes without owner profiles
      const { data, error } = await supabase
        .from('quote_hdr')
        .select(`
        *,
        customer:customers!quote_hdr_customer_id_fkey(*),
        vendor:vendors(*),
        items:quote_dtl(*)
      `)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Early return if no data
      if (!data || data.length === 0) {
        setQuotes([]);
        setLoading(false);
        return;
      }

      // Step 2: Get all unique owner IDs
      const ownerIds = data
        .map(quote => quote.owner_id)
        .filter(id => id !== null)
        .filter((id, index, self) => self.indexOf(id) === index);

      // Step 3: Fetch owner profiles if there are any
      let ownerProfiles = {};
      if (ownerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', ownerIds);

        if (profilesError) throw profilesError;

        ownerProfiles = (profilesData || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      // Step 4: Combine quotes with owner data
      const quotesWithOwners = data.map(quote => {
        return {
          ...quote,
          owner: quote.owner_id && ownerProfiles[quote.owner_id]
            ? {
              id: ownerProfiles[quote.owner_id].id,
              name: ownerProfiles[quote.owner_id].name
            }
            : null
        };
      });

      setQuotes(quotesWithOwners);

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
      setShowDeleteConfirm(null);
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
    (quote.customer.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (quote.owner?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  ).filter(quote =>
    statusFilter === 'all' || quote.status === statusFilter
  );

  // Add a wrapper function for the kanban board status change
  const handleKanbanStatusChange = async (itemId: string, newStatus: string) => {
    await handleStatusChange(itemId, newStatus);
  };

  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const kanbanQuotes: KanbanQuote[] = sortedQuotes.map(quote => ({
    ...quote,
    id: quote.quote_id
  }));

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = sortedQuotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-emerald-500 bg-clip-text text-transparent">
            Quote Management
          </h1>
          <p className="text-gray-500 mt-1">Create and manage customer quotes</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-teal-300"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Kanban View</span>
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4" />
                <span>List View</span>
              </>
            )}
          </button>
          <Link
            to="/admin/quotes/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-teal-700 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Quote</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-teal-500" />
              Search & Filters
            </h2>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {filtersExpanded && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search quotes by number, customer, company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Statuses</option>
                    {quoteStatuses.map(status => (
                      <option key={status.id} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Sort By</label>
                  <select
                    value={`${sortConfig.key}_${sortConfig.direction}`}
                    onChange={(e) => {
                      const [key, direction] = e.target.value.split('_');
                      setSortConfig({
                        key: key as keyof Quote,
                        direction: direction as 'asc' | 'desc'
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="created_at_desc">Date (Newest First)</option>
                    <option value="created_at_asc">Date (Oldest First)</option>
                    <option value="total_amount_desc">Amount (Highest First)</option>
                    <option value="total_amount_asc">Amount (Lowest First)</option>
                    <option value="quote_number_asc">Quote Number (A-Z)</option>
                    <option value="quote_number_desc">Quote Number (Z-A)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quotes Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {viewMode === 'list' ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quote Number
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-lg font-medium">No quotes found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedQuotes.map((quote) => (
                      <tr key={quote.quote_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="font-semibold">Q</span>
                            </div>
                            <div className="font-medium text-gray-900">
                              {quote.quote_number}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {quote.customer.first_name} {quote.customer.last_name}
                            </span>
                            {quote.customer.company && (
                              <span className="text-sm text-gray-500">
                                {quote.customer.company}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                            {new Date(quote.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserCheck className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                            <span className="text-sm text-gray-800">
                              {quote.owner ? quote.owner.name : 'Not assigned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(quote.total_amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote.quote_id, e.target.value)}
                            disabled={processingQuote === quote.quote_id}
                            className="text-sm font-medium rounded-full px-3 py-1.5 border-2 appearance-none cursor-pointer"
                            style={{
                              ...getStatusStyle(quote.status),
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.5em 1.5em',
                              paddingRight: '2.5rem'
                            }}
                          >
                            {quoteStatuses.map(status => (
                              <option key={status.id} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link
                              to={`/admin/quotes/${quote.quote_id}`}
                              className="p-1.5 bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 transition-colors"
                              title="View quote"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDuplicate(quote)}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                              title="Duplicate quote"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCreateOrder(quote)}
                              className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                              title="Create order"
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </button>
                            {/* <button
                              onClick={() => {
                                const doc = generateQuotePDF(quote);
                                doc.save(`${quote.quote_number}.pdf`);
                              }}
                              className="p-1.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                              title="Download PDF"
                            >
                              <FileDown className="w-4 h-4" />
                            </button> */}
                            <Link
                              to={`/admin/quotes/${quote.quote_id}/edit`}
                              className="p-1.5 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors"
                              title="Edit quote"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {showDeleteConfirm === quote.quote_id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(quote.quote_id)}
                                  className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                  title="Confirm delete"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="p-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(quote.quote_id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete quote"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{paginatedQuotes.length}</span> of <span className="font-medium text-gray-700">{filteredQuotes.length}</span> quotes
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-teal-500" />
                <span className="text-gray-700 font-medium">{formatCurrency(filteredQuotes.reduce((sum, quote) => sum + quote.total_amount, 0))} total value</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-white border border-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <KanbanBoard
              items={kanbanQuotes}
              statuses={quoteStatuses}
              onStatusChange={handleKanbanStatusChange}
              renderCard={(quote) => (
                <QuoteCard
                  quote={quote as KanbanQuote}
                  onStatusChange={handleStatusChange}
                  statuses={quoteStatuses}
                  handleDelete={handleDelete}
                  handleDuplicate={handleDuplicate}
                  handleCreateOrder={handleCreateOrder}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}