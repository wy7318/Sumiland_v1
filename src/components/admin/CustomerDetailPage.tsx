import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  Globe, CheckCircle, ChevronDown, ChevronUp,
  FileText, ShoppingBag, UserCheck, MessageSquare, Target
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useOrganization } from '../../contexts/OrganizationContext';


type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  created_at: string;
  organization_id: string;
  vendor_id: string | null;
  vendor: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
};

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  status: string;
  lead_source: string | null;
  created_at: string;
};

type Quote = {
  quote_id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  created_at: string;
};

type Order = {
  order_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
};

type Case = {
  id: string;
  title: string;
  type: string;
  sub_type: string | null;
  status: string;
  description: string;
  created_at: string;
};

type Opportunity = {
  id: string;
  name: string;
  amount: number;
  status: string;
  created_at: string;
};

type Feed = {
  id: string;
  content: string;
  parent_id: string | null;
  parent_type: 'Customer';
  reference_id: string;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  status: 'Active' | 'Deleted';
  profile: {
    name: string;
  };
};

type RelatedTab = {
  id: 'leads' | 'quotes' | 'orders' | 'cases' | 'opportunities';
  label: string;
  icon: typeof UserCheck;
  count: number;
};

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<string[]>([]);
  const [relatedLeads, setRelatedLeads] = useState<Lead[]>([]);
  const [relatedQuotes, setRelatedQuotes] = useState<Quote[]>([]);
  const [relatedOrders, setRelatedOrders] = useState<Order[]>([]);
  const [relatedCases, setRelatedCases] = useState<Case[]>([]);
  const [relatedOpportunities, setRelatedOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  useEffect(() => {
    if (customer) {
      fetchFeeds();
      fetchRelatedRecords();
    }
  }, [customer]);

  const fetchCustomer = async () => {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select(`
          *,
          vendor:vendors!customers_vendor_id_fkey(
            id,
            name,
            type,
            status
          )
        `)
        .eq('customer_id', id)
        .eq('organization_id', selectedOrganization?.id)
        .single();

      if (error) throw error;
      setCustomer(customer);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedRecords = async () => {
    if (!customer?.email) return;

    try {
      // Fetch related leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('email', customer.email)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;
      setRelatedLeads(leads || []);

      // Fetch related quotes
      const { data: quotes, error: quotesError } = await supabase
        .from('quote_hdr')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setRelatedQuotes(quotes || []);

      // Fetch related Opty
      const { data: opportunities, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('contact_id', customer.customer_id)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });
      
      if (opportunitiesError) throw opportunitiesError;
      console.log('Related Opportunities:', opportunities); // Debugging line
      setRelatedOpportunities(opportunities || []);

      // Fetch related orders
      const { data: orders, error: ordersError } = await supabase
        .from('order_hdr')
        .select('*')
        .eq('customer_id', customer.customer_id)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setRelatedOrders(orders || []);

      // Fetch related cases
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('contact_id', customer.customer_id)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;
      console.log(cases);
      setRelatedCases(cases || []);
    } catch (err) {
      console.error('Error fetching related records:', err);
    }
  };

  const fetchFeeds = async () => {
    if (!id || !customer) return;

    try {
      const { data, error } = await supabase
        .from('feeds')
        .select(`
          *,
          profile:profiles!feeds_created_by_fkey(name)
        `)
        .eq('reference_id', id)
        .eq('parent_type', 'Customer')
        .eq('status', 'Active')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !customer) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feeds')
        .insert([{
          content: newComment.trim(),
          parent_id: replyTo?.id || null,
          parent_type: 'Customer',
          reference_id: id,
          organization_id: customer.organization_id,
          created_by: userData.user.id,
          created_at: new Date().toISOString(),
          status: 'Active'
        }]);

      if (error) throw error;
      setNewComment('');
      setReplyTo(null);
      await fetchFeeds();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleUpdateComment = async (feedId: string, content: string) => {
    try {
      if (!customer) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feeds')
        .update({
          content: content.trim(),
          updated_by: userData.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedId)
        .eq('created_by', userData.user.id)
        .eq('organization_id', selectedOrganization?.id);

      if (error) throw error;
      setEditingFeed(null);
      await fetchFeeds();
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };

  const handleDeleteComment = async (feedId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('soft_delete_feed', {
        feed_id: feedId,
        user_id: userData.user.id
      });

      if (error) throw error;
      await fetchFeeds();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const toggleTab = (tabId: string) => {
    setExpandedTabs(prev => 
      prev.includes(tabId) 
        ? prev.filter(id => id !== tabId)
        : [...prev, tabId]
    );
  };

  const renderFeedItem = (feed: Feed, isReply = false) => {
    const isEditing = editingFeed?.id === feed.id;
    const replies = feeds.filter(f => f.parent_id === feed.id);

    return (
      <motion.div
        key={feed.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white rounded-lg shadow-sm p-4 space-y-2",
          isReply && "ml-8"
        )}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-700 font-medium">
                {feed.profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium">{feed.profile.name}</div>
              <div className="text-sm text-gray-500">
                {new Date(feed.created_at).toLocaleString()}
                {feed.updated_at && (
                  <span className="ml-2 text-xs">(edited)</span>
                )}
              </div>
            </div>
          </div>
          {feed.created_by === customer?.customer_id && !isEditing && (
            <div className="relative group">
              <button className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 hidden group-hover:block">
                <button
                  onClick={() => setEditingFeed(feed)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteComment(feed.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editingFeed.content}
              onChange={(e) => setEditingFeed({ ...editingFeed, content: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
              rows={3}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setEditingFeed(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateComment(feed.id, editingFeed.content)}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-700 whitespace-pre-wrap">{feed.content}</p>
            <div className="flex items-center space-x-4 text-sm">
              <button
                onClick={() => setReplyTo(feed)}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <Reply className="w-4 h-4 mr-1" />
                Reply
              </button>
            </div>
          </>
        )}

        {replies.length > 0 && (
          <div className="space-y-4 mt-4">
            {replies.map(reply => renderFeedItem(reply, true))}
          </div>
        )}
      </motion.div>
    );
  };

  const relatedTabs: RelatedTab[] = [
    { id: 'leads', label: 'Leads', icon: UserCheck, count: relatedLeads.length },
    { id: 'quotes', label: 'Quotes', icon: FileText, count: relatedQuotes.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: relatedOrders.length },
    { id: 'cases', label: 'Cases', icon: MessageSquare, count: relatedCases.length },
    { id: 'opportunities', label: 'Opportunities', icon: Target, count: relatedOpportunities.length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Customer not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Customers
        </button>
        <Link
          to={`/admin/customers/${id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Customer
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {customer.first_name} {customer.last_name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(customer.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">
                      {customer.first_name} {customer.last_name}
                    </div>
                    {customer.company && (
                      <div className="text-sm text-gray-500">
                        {customer.company}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-3" />
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {customer.email}
                  </a>
                </div>
                {customer.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Account Information */}
            {customer.vendor && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Account Information</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium">{customer.vendor.name}</div>
                      <div className="text-sm text-gray-500">
                        Type: {customer.vendor.type}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            {(customer.address_line1 || customer.city || customer.state || customer.country) && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Address</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-1">
                    {customer.address_line1 && (
                      <div>{customer.address_line1}</div>
                    )}
                    {customer.address_line2 && (
                      <div>{customer.address_line2}</div>
                    )}
                    <div>
                      {[
                        customer.city,
                        customer.state,
                        customer.zip_code,
                        customer.country
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Custom Fields section */}
            <div className="md:col-span-2">
              <CustomFieldsSection
                entityType="customer"
                entityId={id}
                organizationId={customer.organization_id}
                className="bg-gray-50 rounded-lg p-4"
              />
            </div>
          </div>

          {/* Related Lists */}
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold mb-4">Related Lists</h2>
            {relatedTabs.map(tab => (
              <div key={tab.id} className="bg-white border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleTab(tab.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2">
                    <tab.icon className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">{tab.label}</span>
                    <span className="text-sm text-gray-500">({tab.count})</span>
                  </div>
                  {expandedTabs.includes(tab.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedTabs.includes(tab.id) && (
                  <div className="border-t border-gray-200">
                    {tab.id === 'leads' && (
                      <div className="divide-y divide-gray-200">
                        {relatedLeads.map(lead => (
                          <div key={lead.id} className="p-4 hover:bg-gray-50">
                            <Link to={`/admin/leads/${lead.id}`} className="block">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                                  <div className="text-sm text-gray-500">{lead.company}</div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(lead.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {lead.status}
                                </span>
                                {lead.lead_source && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                    {lead.lead_source}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </div>
                        ))}
                        {relatedLeads.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            No related leads found
                          </div>
                        )}
                      </div>
                    )}

                    {tab.id === 'quotes' && (
                      <div className="divide-y divide-gray-200">
                        {relatedQuotes.map(quote => (
                          <div key={quote.quote_id} className="p-4 hover:bg-gray-50">
                            <Link to={`/admin/quotes/${quote.quote_id}`} className="block">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{quote.quote_number}</div>
                                  <div className="text-sm text-gray-500">
                                    {formatCurrency(quote.total_amount)}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(quote.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="mt-2">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {quote.status}
                                </span>
                              </div>
                            </Link>
                          </div>
                        ))}
                        {relatedQuotes.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            No related quotes found
                          </div>
                        )}
                      </div>
                    )}

                    {tab.id === 'orders' && (
                      <div className="divide-y divide-gray-200">
                        {relatedOrders.map(order => (
                          <div key={order.order_id} className="p-4 hover:bg-gray-50">
                            <Link to={`/admin/orders/${order.order_id}`} className="block">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{order.order_number}</div>
                                  <div className="text-sm text-gray-500">
                                    {formatCurrency(order.total_amount)}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {order.status}
                                </span>
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                  {order.payment_status}
                                </span>
                              </div>
                            </Link>
                          </div>
                        ))}
                        {relatedOrders.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            No related orders found
                          </div>
                        )}
                      </div>
                    )}

                    {tab.id === 'opportunities' && (
                      <div className="divide-y divide-gray-200">
                        {relatedOpportunities.map(opportunity => (
                          <div key={opportunity.id} className="p-4 hover:bg-gray-50">
                            <Link to={`/admin/opportunities/${opportunity.id}`} className="block">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{opportunity.opportunity_number}</div>
                                  <div className="text-sm text-gray-500">
                                    {formatCurrency(opportunity.amount)}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(opportunity.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="mt-2">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {opportunity.status}
                                </span>
                              </div>
                            </Link>
                          </div>
                        ))}
                        {relatedOpportunities.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            No related opportunities found
                          </div>
                        )}
                      </div>
                    )}

                    {tab.id === 'cases' && (
                      <div className="divide-y divide-gray-200">
                        {relatedCases.map(case_ => (
                          <div key={case_.id} className="p-4 hover:bg-gray-50">
                            <Link to={`/admin/cases/${case_.id}`} className="block">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{case_.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {case_.type}
                                    {case_.sub_type && ` / ${case_.sub_type}`}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(case_.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="mt-2">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {case_.status}
                                </span>
                              </div>
                            </Link>
                          </div>
                        ))}
                        {relatedCases.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            No related cases found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Feed Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Comments</h2>

            <div className="space-y-4">
              {/* Comment Form */}
              <form onSubmit={handleSubmitComment} className="space-y-4">
                {replyTo && (
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Replying to {replyTo.profile.name}'s comment
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </button>
                </div>
              </form>

              {/* Feed Items */}
              <div className="space-y-4">
                {feeds
                  .filter(feed => !feed.parent_id)
                  .map(feed => renderFeedItem(feed))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}