import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  DollarSign, Percent, Package, FileText, ShoppingBag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { CustomFieldsSection } from './CustomFieldsSection';
import { AccountDetailsModal } from './AccountDetailsModal';
import { useAuth } from '../../contexts/AuthContext';

type Opportunity = {
  id: string;
  name: string;
  account_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  lead_source: string | null;
  lead_id: string | null;
  type: string | null;
  description: string | null;
  status: string;
  created_at: string;
  organization_id: string;
  account: {
    name: string;
    type: string;
  } | null;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
  owner: {
    name: string;
  } | null;
  products: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    status: string;
    product: {
      name: string;
      description: string | null;
    };
  }[];
};

type Feed = {
  id: string;
  content: string;
  parent_id: string | null;
  parent_type: 'Opportunity';
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

export function OpportunityDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const { organizations, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [opportunityStages, setOpportunityStages] = useState<PicklistValue[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<PicklistValue[]>([]);
  const [productStatuses, setProductStatuses] = useState<PicklistValue[]>([]);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchOpportunity();
    }
  }, [id]);

  useEffect(() => {
    if (opportunity) {
      fetchFeeds();
    }
  }, [opportunity]);

  const fetchPicklists = async () => {
    try {
      // Fetch opportunity stages
      const { data: stageData, error: stageError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_stage')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (stageError) throw stageError;
      setOpportunityStages(stageData || []);

      // Fetch opportunity types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_type')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setOpportunityTypes(typeData || []);

      // Fetch product statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_product_status')
        .eq('is_active', true)
        .eq('organization_id', organizations.map(org => org.id))
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setProductStatuses(statusData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOpportunity = async () => {
    try {
      if (!id) return;
  
      const { data: opportunity, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          account:vendors(name, type),
          contact:customers(
            first_name,
            last_name,
            email,
            phone,
            company
          ),
          owner:profiles!opportunities_owner_id_fkey(name),
          products:opportunity_products(
            id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            status,
            product:products(
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .single();
  
      if (error) throw error;
      setOpportunity(opportunity);
    } catch (err) {
      console.error('Error fetching opportunity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeds = async () => {
    if (!id || !opportunity) return;

    try {
      const { data, error } = await supabase
        .from('feeds')
        .select(`
          *,
          profile:profiles!feeds_created_by_fkey(name)
        `)
        .eq('reference_id', id)
        .eq('parent_type', 'Opportunity')
        .eq('status', 'Active')
        .eq('organization_id', opportunity.organization_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleStageChange = async (newStage: string) => {
    try {
      if (!id || !opportunity) return;

      const { error } = await supabase
        .from('opportunities')
        .update({
          stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchOpportunity();
    } catch (err) {
      console.error('Error updating stage:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const handleProductStatusChange = async (productId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('opportunity_products')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;
      await fetchOpportunity();
    } catch (err) {
      console.error('Error updating product status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product status');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !opportunity) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feeds')
        .insert([{
          content: newComment.trim(),
          parent_id: replyTo?.id || null,
          parent_type: 'Opportunity',
          reference_id: id,
          organization_id: opportunity.organization_id,
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
      if (!opportunity) return;

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
        .eq('organization_id', opportunity.organization_id);

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

  // Get style for stage badge
  const getStageStyle = (stage: string) => {
    const stageValue = opportunityStages.find(s => s.value === stage);
    if (!stageValue?.color) return {};
    return {
      backgroundColor: stageValue.color,
      color: stageValue.text_color || '#FFFFFF'
    };
  };

  // Get style for type badge
  const getTypeStyle = (type: string | null) => {
    if (!type) return {};
    const typeValue = opportunityTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  // Get style for product status badge
  const getProductStatusStyle = (status: string) => {
    const statusValue = productStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
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
          {feed.created_by === opportunity?.id && !isEditing && (
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Opportunity not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/opportunities')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Opportunities
        </button>
        <div className="flex items-center gap-4">
          <Link
            to={`/admin/opportunities/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Opportunity
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">{opportunity.opportunity_number}</h1>
              <h2 className="text-lg text-gray-500">{opportunity.name}</h2>
              <div className="flex items-center gap-4">
                <select
                  value={opportunity.stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="text-sm font-medium rounded-full px-3 py-1"
                  style={getStageStyle(opportunity.stage)}
                >
                  {opportunityStages.map(stage => (
                    <option key={stage.id} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
                {opportunity.type && (
                  <span
                    className="px-2 py-1 text-xs font-medium rounded-full"
                    style={getTypeStyle(opportunity.type)}
                  >
                    {opportunityTypes.find(t => t.value === opportunity.type)?.label || opportunity.type}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(opportunity.amount)}
              </div>
              <div className="text-sm text-gray-500">
                Probability: {opportunity.probability}%
              </div>
              {opportunity.expected_close_date && (
                <div className="text-sm text-gray-500">
                  Expected Close: {new Date(opportunity.expected_close_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Information */}
            {opportunity.account && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Account Information</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium">{opportunity.account.name}</div>
                        <div className="text-sm text-gray-500">
                          Type: {opportunity.account.type}
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
                </div>
              </div>
            )}

            {/* Contact Information */}
            {opportunity.contact && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium">
                        {opportunity.contact.first_name} {opportunity.contact.last_name}
                      </div>
                      {opportunity.contact.company && (
                        <div className="text-sm text-gray-500">
                          {opportunity.contact.company}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${opportunity.contact.email}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {opportunity.contact.email}
                    </a>
                  </div>
                  {opportunity.contact.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-400 mr-3" />
                      <a
                        href={`tel:${opportunity.contact.phone}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {opportunity.contact.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {opportunity.description && (
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold mb-4">Description</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {opportunity.description}
                  </p>
                </div>
              </div>
            )}

            {/* Custom Fields */}
            <div className="md:col-span-2">
              <CustomFieldsSection
                entityType="opportunity"
                entityId={id}
                organizationId={opportunity.organization_id}
                className="bg-gray-50 rounded-lg p-4"
              />
            </div>
          </div>

          {/* Products Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Products</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {opportunity.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {product.product.name}
                            </div>
                            {product.product.description && (
                              <div className="text-sm text-gray-500">
                                {product.product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.quantity}</div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(product.unit_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.subtotal)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={product.status}
                          onChange={(e) => handleProductStatusChange(product.id, e.target.value)}
                          className="text-sm font-medium rounded-full px-3 py-1"
                          style={getProductStatusStyle(product.status)}
                        >
                          {productStatuses.map(status => (
                            <option key={status.id} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-4 text-right font-medium">
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(opportunity.amount)}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Comments Section */}
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

      {showAccountModal && opportunity.account && (
        <AccountDetailsModal
          vendor={opportunity.account}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}