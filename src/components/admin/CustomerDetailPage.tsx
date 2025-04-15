import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  Globe, CheckCircle, ChevronDown, ChevronUp,
  FileText, ShoppingBag, UserCheck, MessageSquare, Target,
  Users, Bookmark, MapPin, CreditCard, Briefcase, Heart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency, formatDate } from '../../lib/utils'; // Add formatDate if not already exists
import { CustomFieldsSection } from './CustomFieldsSection';
import { useOrganization } from '../../contexts/OrganizationContext';
import { RelatedTasks } from './RelatedTasks';
import { RelatedEmails } from './RelatedEmails';
import { RelatedLeads } from './RelatedLeads';
import { RelatedQuotes } from './RelatedQuotes';
import { RelatedOrders } from './RelatedOrders';
import { RelatedCases } from './RelatedCases';
import { RelatedOpportunities } from './RelatedOpportunities';
import { useAuth } from '../../contexts/AuthContext';

// Types (kept from original file)
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
  owner_id: string | null;
  birthdate: string | null;
  gender: string | null;
  // No status field in customers table
  vendor: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
  owner: {
    id: string;
    name: string;
    email: string;
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

type PicklistValue = {
  id: string;
  value: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  color: string | null;
  text_color: string | null;
};

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selectedOrganization } = useOrganization();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [refreshRecordsList, setRefreshRecordsList] = useState(0);

  // New states for the redesigned UI
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  useEffect(() => {
    if (customer) {
      fetchFeeds();
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
          ),
          owner:profiles!customers_owner_id_fkey(
            id,
            name
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

  // Format date for display
  const formatBirthdate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
              <span className="text-cyan-700 font-medium">
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
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
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
                className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
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
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/customers')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Customers</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/tasks/new?module=customers&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/customers/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-cyan-600 hover:bg-cyan-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Customer
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Status */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-cyan-100 rounded-full p-2.5">
                  <User className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </h1>
                  <div className="flex items-center mt-1.5 space-x-3">
                    {customer.company && (
                      <span className="text-gray-600 text-sm">
                        {customer.company}
                      </span>
                    )}
                    <span className="text-gray-500 text-sm">
                      Created on {new Date(customer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>



            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'comments'
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Comments
                </button>
              </nav>
            </div>

            {/* Details Tab Content */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                  {/* Contact Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="w-5 h-5 text-cyan-500 mr-2" />
                      Contact Information
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-cyan-600 hover:text-cyan-700"
                        >
                          {customer.email}
                        </a>
                      </div>

                      {customer.phone && (
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-400 mr-3" />
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-cyan-600 hover:text-cyan-700"
                          >
                            {customer.phone}
                          </a>
                        </div>
                      )}

                      {/* Gender */}
                      {customer.gender && (
                        <div className="flex items-center">
                          <Users className="w-5 h-5 text-gray-400 mr-3" />
                          <div className="text-gray-700">
                            Gender: {customer.gender}
                          </div>
                        </div>
                      )}

                      {/* Birthdate */}
                      {customer.birthdate && (
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                          <div className="text-gray-700">
                            Born: {formatBirthdate(customer.birthdate)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner Information */}
                  {customer.owner && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-cyan-500 mr-2" />
                        Owner Information
                      </h2>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center mr-3">
                          <span className="text-cyan-700 font-medium">
                            {customer.owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{customer.owner.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.owner.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Account Information */}
                  {customer.vendor && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-cyan-500 mr-2" />
                        Account Information
                      </h2>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium">{customer.vendor.name}</div>
                            <div className="text-sm text-gray-500">
                              Type: {customer.vendor.type}
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/admin/vendors/${customer.vendor.id}`}
                          className="text-cyan-600 hover:text-cyan-700 hover:underline text-sm"
                        >
                          View Account
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {(customer.address_line1 || customer.city || customer.state || customer.country) && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <MapPin className="w-5 h-5 text-cyan-500 mr-2" />
                        Address
                      </h2>
                      <div className="pl-2 border-l-2 border-cyan-100 py-1 space-y-1">
                        {customer.address_line1 && (
                          <div className="text-gray-600">{customer.address_line1}</div>
                        )}
                        {customer.address_line2 && (
                          <div className="text-gray-600">{customer.address_line2}</div>
                        )}
                        <div className="text-gray-600">
                          {[
                            customer.city,
                            customer.state,
                            customer.zip_code,
                            customer.country
                          ].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Fields - Full Width */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-cyan-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="customers"
                    entityId={id}
                    organizationId={customer.organization_id}
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
                    refreshKey={refreshRecordsList}
                    title="Email Communications"
                    customerEmail={customer.email}
                  />
                </div>

                {/* Tasks */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedTasks
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                    title="Tasks"
                  />
                </div>

                {/* Leads */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedLeads
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                    customerEmail={customer.email}
                  />
                </div>

                {/* Quotes */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedQuotes
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>

                {/* Orders */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedOrders
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>

                {/* Cases */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedCases
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>

                {/* Opportunities */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedOpportunities
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>
              </div>
            )}

            {/* Comments Tab Content */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                {/* Comment Form */}
                <form onSubmit={handleSubmitComment} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 text-cyan-500 mr-2" />
                    Add Comment
                  </h2>

                  {replyTo && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-4">
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-5 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </button>
                  </div>
                </form>

                {/* Comment List */}
                <div className="space-y-4">
                  {feeds
                    .filter(feed => !feed.parent_id)
                    .map(feed => renderFeedItem(feed))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}