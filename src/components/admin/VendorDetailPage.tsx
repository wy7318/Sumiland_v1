import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  Globe, CheckCircle, DollarSign, Users, Bookmark,
  MapPin, CreditCard, FileText, MessageSquare, Briefcase
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

// Types (kept from original file)
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
  owner_id: string | null;
  parent_id: string | null;
  annual_revenue: number | null;
  website: string | null;
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

  // New state for tabs
  const [activeTab, setActiveTab] = useState('details');

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

  // Fetch functions kept the same as original
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

  // Find the current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!vendor || !accountStatuses.length) return -1;
    return accountStatuses.findIndex(status =>
      status.value.toLowerCase() === vendor.status.toLowerCase()
    );
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
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <span className="text-rose-700 font-medium">
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
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
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
                className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700"
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
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
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/vendors')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Accounts</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/tasks/new?module=vendors&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/vendors/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Account
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Status */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-rose-100 rounded-full p-2.5">
                  <Building2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
                  <div className="flex items-center mt-1.5 space-x-3">
                    <span
                      className="px-3 py-1 text-xs font-medium rounded-full"
                      style={getTypeStyle(vendor.type)}
                    >
                      {accountTypes.find(t => t.value === vendor.type)?.label || vendor.type}
                    </span>
                    <span className="text-gray-500 text-sm">
                      Created on {new Date(vendor.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar styled like the second screenshot */}
            <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {accountStatuses.length > 0 && (
                <div className="relative pt-2">
                  {/* Progress bar track */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Progress bar fill - width based on current status */}
                    <div
                      className="absolute top-2 left-0 h-2 bg-rose-500 rounded-full"
                      style={{
                        width: `${(getCurrentStatusIndex() + 1) * 100 / accountStatuses.length}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    ></div>
                  </div>

                  {/* Status indicators with dots */}
                  <div className="flex justify-between mt-1">
                    {accountStatuses.map((status, index) => {
                      // Determine if this status is active (current or passed)
                      const isActive = index <= getCurrentStatusIndex();
                      // Position dots evenly
                      const position = index / (accountStatuses.length - 1) * 100;

                      return (
                        <div
                          key={status.id}
                          className="flex flex-col items-center"
                          style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                        >
                          {/* Status dot */}
                          <div
                            className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-rose-500' : 'bg-gray-300'}`}
                            style={{
                              marginTop: '-10px',
                              boxShadow: '0 0 0 2px white'
                            }}
                          ></div>

                          {/* Status label */}
                          <button
                            onClick={() => handleStatusChange(status.value)}
                            className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors ${isActive ? 'text-rose-700' : 'text-gray-500 hover:text-gray-700'
                              }`}
                          >
                            {status.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'details'
                      ? 'border-rose-500 text-rose-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                      ? 'border-rose-500 text-rose-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'comments'
                      ? 'border-rose-500 text-rose-600'
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
                  {vendor.customer && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-rose-500 mr-2" />
                        Contact Information
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
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
                            className="text-rose-600 hover:text-rose-700"
                          >
                            {vendor.customer.email}
                          </a>
                        </div>
                        {vendor.customer.phone && (
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <a
                              href={`tel:${vendor.customer.phone}`}
                              className="text-rose-600 hover:text-rose-700"
                            >
                              {vendor.customer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Account Details */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-rose-500 mr-2" />
                      Account Details
                    </h2>
                    <div className="space-y-4">
                      {vendor.payment_terms && (
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Payment Terms</div>
                          <div className="text-gray-700">{vendor.payment_terms}</div>
                        </div>
                      )}
                      {/* Annual Revenue */}
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Annual Revenue</div>
                        <div className="text-gray-700 flex items-center">
                          <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                          {formatRevenueValue(vendor.annual_revenue)}
                        </div>
                      </div>
                      {/* Website */}
                      {vendor.website && (
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Website</div>
                          <div className="text-gray-700 flex items-center">
                            <Globe className="w-4 h-4 text-gray-400 mr-1" />
                            <a
                              href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-600 hover:text-rose-700 hover:underline"
                            >
                              {vendor.website}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Owner Information */}
                  {vendor.owner && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-rose-500 mr-2" />
                        Account Owner
                      </h2>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mr-3">
                          <span className="text-rose-700 font-medium">
                            {vendor.owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="font-medium">{vendor.owner.name}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Parent Account */}
                  {vendor.parent && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Users className="w-5 h-5 text-rose-500 mr-2" />
                        Parent Account
                      </h2>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div className="font-medium">{vendor.parent.name}</div>
                        </div>
                        <Link
                          to={`/admin/vendors/${vendor.parent.id}`}
                          className="text-rose-600 hover:text-rose-700 hover:underline text-sm"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Addresses Group */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <MapPin className="w-5 h-5 text-rose-500 mr-2" />
                      Addresses
                    </h2>

                    {/* Shipping Address */}
                    {(vendor.shipping_address_line1 || vendor.shipping_city || vendor.shipping_state || vendor.shipping_country) && (
                      <div className="mb-4">
                        <h3 className="text-md font-medium mb-2 text-gray-700">Shipping Address</h3>
                        <div className="pl-2 border-l-2 border-rose-100 py-1 space-y-1">
                          {vendor.shipping_address_line1 && (
                            <div className="text-gray-600">{vendor.shipping_address_line1}</div>
                          )}
                          {vendor.shipping_address_line2 && (
                            <div className="text-gray-600">{vendor.shipping_address_line2}</div>
                          )}
                          <div className="text-gray-600">
                            {[
                              vendor.shipping_city,
                              vendor.shipping_state,
                              vendor.shipping_country
                            ].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Billing Address */}
                    {(vendor.billing_address_line1 || vendor.billing_city || vendor.billing_state || vendor.billing_country) && (
                      <div>
                        <h3 className="text-md font-medium mb-2 text-gray-700">Billing Address</h3>
                        <div className="pl-2 border-l-2 border-rose-100 py-1 space-y-1">
                          {vendor.billing_address_line1 && (
                            <div className="text-gray-600">{vendor.billing_address_line1}</div>
                          )}
                          {vendor.billing_address_line2 && (
                            <div className="text-gray-600">{vendor.billing_address_line2}</div>
                          )}
                          <div className="text-gray-600">
                            {[
                              vendor.billing_city,
                              vendor.billing_state,
                              vendor.billing_country
                            ].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 text-rose-500 mr-2" />
                      Payment Information
                    </h2>
                    {vendor.payment_terms && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Payment Terms</div>
                        <div className="text-gray-700">{vendor.payment_terms}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes - Full Width */}
                {vendor.notes && (
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-rose-500 mr-2" />
                      Notes
                    </h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
                  </div>
                )}

                {/* Custom Fields - Full Width */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-rose-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="vendors"
                    entityId={id}
                    organizationId={selectedOrganization?.id}
                  />
                </div>
              </div>
            )}

            {/* Related Tab Content */}
            {activeTab === 'related' && (
              <div className="space-y-8">
                {/* Tasks */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedTasks
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                    title="Tasks"
                  />
                </div>

                {/* Customers */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedCustomers
                    vendorId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                    title="Customers"
                  />
                </div>

                {/* Quotes */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedQuotes
                    recordId={id}
                    vendorId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>

                {/* Orders */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedOrders
                    recordId={id}
                    vendorId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>

                {/* Cases */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedCases
                    recordId={id}
                    vendorId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                  />
                </div>

                {/* Opportunities */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedOpportunities
                    recordId={id}
                    vendorId={id}
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
                    <MessageSquare className="w-5 h-5 text-rose-500 mr-2" />
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-5 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
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