import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  Globe, CheckCircle, DollarSign, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn, formatCurrency } from '../../lib/utils';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useOrganization } from '../../contexts/OrganizationContext';
import { RelatedTasks } from './RelatedTasks';
import { RelatedQuotes } from './RelatedQuotes';
import { RelatedOrders } from './RelatedOrders';
import { RelatedCustomers } from './RelatedCustomers';
import { RelatedCases } from './RelatedCases';
import { RelatedOpportunities } from './RelatedOpportunities';

type Vendor = {
  id: string;
  name: string;
  type: string;
  status: string;
  payment_terms: string | null;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
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
  organization_id: string;
  notes: string | null;
  created_at: string;
  // New fields
  owner_id: string | null;
  parent_id: string | null;
  annual_revenue: number | null;
  website: string | null;
  // Related entities
  owner: {
    id: string;
    name: string;
  } | null;
  parent: {
    id: string;
    name: string;
  } | null;
};

type Feed = {
  id: string;
  content: string;
  parent_id: string | null;
  parent_type: 'Vendor';
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

export function VendorDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [accountTypes, setAccountTypes] = useState<PicklistValue[]>([]);
  const [accountStatuses, setAccountStatuses] = useState<PicklistValue[]>([]);
  const [refreshRecordsList, setRefreshRecordsList] = useState(0);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchVendor();
    }
  }, [id]);

  useEffect(() => {
    if (vendor) {
      fetchFeeds();
    }
  }, [vendor]);

  const fetchPicklists = async () => {
    try {
      // Fetch account types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'account_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setAccountTypes(typeData || []);

      // Fetch account statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'account_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setAccountStatuses(statusData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchVendor = async () => {
    try {
      if (!id) return;

      // Fetch vendor with related customer data
      const { data: vendorData, error } = await supabase
        .from('vendors')
        .select(`
          *,
          customer:customers!vendors_customer_id_fkey(
            first_name,
            last_name,
            email,
            phone,
            company
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Now fetch the owner profile data
      let ownerData = null;
      if (vendorData.owner_id) {
        const { data: owner, error: ownerError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', vendorData.owner_id)
          .single();

        if (ownerError) {
          console.error("Error fetching owner:", ownerError);
        } else {
          ownerData = owner;
        }
      }

      // Fetch parent vendor data if present
      let parentData = null;
      if (vendorData.parent_id) {
        const { data: parent, error: parentError } = await supabase
          .from('vendors')
          .select('id, name')
          .eq('id', vendorData.parent_id)
          .single();

        if (parentError) {
          console.error("Error fetching parent vendor:", parentError);
        } else {
          parentData = parent;
        }
      }

      // Combine all data
      const enrichedVendorData = {
        ...vendorData,
        owner: ownerData,
        parent: parentData
      };

      setVendor(enrichedVendorData);
    } catch (err) {
      console.error('Error fetching vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to load vendor');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeds = async () => {
    if (!id || !vendor) return;

    try {
      const { data, error } = await supabase
        .from('feeds')
        .select(`
          *,
          profile:profiles!feeds_created_by_fkey(name)
        `)
        .eq('reference_id', id)
        .eq('parent_type', 'Vendor')
        .eq('status', 'Active')
        .eq('organization_id', vendor.organization_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id || !vendor) return;

      const { error } = await supabase
        .from('vendors')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchVendor();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !vendor) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feeds')
        .insert([{
          content: newComment.trim(),
          parent_id: replyTo?.id || null,
          parent_type: 'Vendor',
          reference_id: id,
          organization_id: vendor.organization_id,
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
      if (!vendor) return;

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
        .eq('organization_id', vendor.organization_id);

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

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = accountStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get style for type badge
  const getTypeStyle = (type: string) => {
    const typeValue = accountTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  // Format currency with proper formatting
  const formatRevenueValue = (value: number | null) => {
    if (value === null) return 'Not specified';
    return formatCurrency(value);
  };

  const renderFeedItem = (feed: Feed, isReply = false) => {
    const isEditing = editingFeed?.id === feed.id;
    const isOwner = feed.created_by === vendor?.id;
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
          {isOwner && !isEditing && (
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

  if (error || !vendor) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Vendor not found'}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-3/4 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/vendors')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Accounts
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/vendors/${id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Account
            </Link>
            <Link
              to={`/admin/tasks/new?module=vendors&recordId=${id}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
          </div>
        </div>


        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">{vendor.name}</h1>
                <div className="flex items-center gap-4">
                  <span
                    className="px-2 py-1 text-xs font-medium rounded-full"
                    style={getTypeStyle(vendor.type)}
                  >
                    {accountTypes.find(t => t.value === vendor.type)?.label || vendor.type}
                  </span>
                  <select
                    value={vendor.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-sm font-medium rounded-full px-3 py-1"
                    style={getStatusStyle(vendor.status)}
                  >
                    {accountStatuses.map(status => (
                      <option key={status.id} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Information */}
              {vendor.customer && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium">
                          {vendor.customer.first_name} {vendor.customer.last_name}
                        </div>
                        {vendor.customer.company && (
                          <div className="text-sm text-gray-500">
                            {vendor.customer.company}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-gray-400 mr-3" />
                      <a
                        href={`mailto:${vendor.customer.email}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {vendor.customer.email}
                      </a>
                    </div>
                    {vendor.customer.phone && (
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-gray-400 mr-3" />
                        <a
                          href={`tel:${vendor.customer.phone}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {vendor.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Details */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Account Details</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  {vendor.payment_terms && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Payment Terms</div>
                      <div className="text-gray-700">{vendor.payment_terms}</div>
                    </div>
                  )}
                  {/* Annual Revenue - New Field */}
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Annual Revenue</div>
                    <div className="text-gray-700 flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                      {formatRevenueValue(vendor.annual_revenue)}
                    </div>
                  </div>
                  {/* Website - New Field */}
                  {vendor.website && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Website</div>
                      <div className="text-gray-700 flex items-center">
                        <Globe className="w-4 h-4 text-gray-400 mr-1" />
                        <a
                          href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {vendor.website}
                        </a>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Created</div>
                    <div className="text-gray-700">
                      {new Date(vendor.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Information - New Section */}
              {vendor.owner && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Account Owner</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium">{vendor.owner.name}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parent Account - New Section */}
              {vendor.parent && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Parent Account</h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-400 mr-3" />
                        <div className="font-medium">{vendor.parent.name}</div>
                      </div>
                      <Link
                        to={`/admin/vendors/${vendor.parent.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {(vendor.shipping_address_line1 || vendor.shipping_city || vendor.shipping_state || vendor.shipping_country) && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-1">
                      {vendor.shipping_address_line1 && (
                        <div>{vendor.shipping_address_line1}</div>
                      )}
                      {vendor.shipping_address_line2 && (
                        <div>{vendor.shipping_address_line2}</div>
                      )}
                      <div>
                        {[
                          vendor.shipping_city,
                          vendor.shipping_state,
                          vendor.shipping_country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Address */}
              {(vendor.billing_address_line1 || vendor.billing_city || vendor.billing_state || vendor.billing_country) && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Billing Address</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-1">
                      {vendor.billing_address_line1 && (
                        <div>{vendor.billing_address_line1}</div>
                      )}
                      {vendor.billing_address_line2 && (
                        <div>{vendor.billing_address_line2}</div>
                      )}
                      <div>
                        {[
                          vendor.billing_city,
                          vendor.billing_state,
                          vendor.billing_country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {vendor.notes && (
                <div className="md:col-span-2">
                  <h2 className="text-lg font-semibold mb-4">Notes</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
                  </div>
                </div>
              )}

              {/* Add Custom Fields section */}
              <div className="md:col-span-2">
                <CustomFieldsSection
                  entityType="vendors"
                  entityId={id}
                  organizationId={selectedOrganization?.id}
                  className="bg-gray-50 rounded-lg p-4"
                />
              </div>
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

      {/* Related Tabs Sidebar */}
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
            {/* Tasks */}
            <div className="p-4">
              <RelatedTasks
                recordId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshRecordsList}
                title="Tasks"
              />
            </div>

            {/* Customers */}
            <div className="p-4">
              <RelatedCustomers
                vendorId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshRecordsList}
                title="Customers"
              />
            </div>

            {/* Quotes Section */}
            <div className="p-4">
              <RelatedQuotes
                recordId={id}
                vendorId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshRecordsList}
              />
            </div>

            {/* Orders Section */}
            <div className="p-4">
              <RelatedOrders
                recordId={id}
                vendorId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshRecordsList}
              />
            </div>

            

            {/* Cases Section */}
            <div className="p-4">
              <RelatedCases
                recordId={id}
                vendorId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshRecordsList}
              />
            </div>

            {/* Opportunities Section */}
            <div className="p-4">
              <RelatedOpportunities
                recordId={id}
                vendorId={id}
                organizationId={selectedOrganization?.id}
                refreshKey={refreshRecordsList}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}