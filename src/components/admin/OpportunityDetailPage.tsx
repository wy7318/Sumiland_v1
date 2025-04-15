import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, Package, DollarSign, User,
  ChevronDown, ChevronUp, Send, Reply, X,
  UserCheck, Clock, Target, Globe, LinkIcon,
  Briefcase, MessageSquare, Bookmark, Tag,
  Flag, Star, Percent, MapPin, FileBarChart2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { CustomFieldsSection } from './CustomFieldsSection';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { RelatedTasks } from './RelatedTasks';
import { RelatedQuotes } from './RelatedQuotes';
import { RelatedOrders } from './RelatedOrders';
import { RelatedEmails } from './RelatedEmails';
import { AccountDetailsModal } from './AccountDetailsModal';
import { DateTime } from 'luxon';

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
  parent_id: string | null; // Added parent_id field
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  contact: {
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null;
  owner: {
    id: string;
    name: string;
  } | null;
  parent: { // Added parent opportunity data
    id: string;
    name: string;
    stage: string;
    status: string;
  } | null;
  products: OpportunityProduct[];
};

type OpportunityProduct = {
  id: string;
  opportunity_id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock_unit: 'weight' | 'quantity';
    weight_unit: string | null;
  } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  status: string;
  notes: string | null;
  created_at: string;
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
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [opportunityStages, setOpportunityStages] = useState<PicklistValue[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<PicklistValue[]>([]);
  const [leadSources, setLeadSources] = useState<PicklistValue[]>([]);
  const [productStatuses, setProductStatuses] = useState<PicklistValue[]>([]);
  const [refreshRecordsList, setRefreshRecordsList] = useState(0);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [orgTimezone, setOrgTimezone] = useState('UTC');

  // New state for tabs
  const [activeTab, setActiveTab] = useState('details');

  // Fetch organization timezone
  useEffect(() => {
    const fetchTimezone = async () => {
      if (!selectedOrganization?.id) return;

      const { data, error } = await supabase
        .from('organizations')
        .select('timezone')
        .eq('id', selectedOrganization.id)
        .single();

      if (error) {
        console.error('Failed to fetch org timezone:', error);
        return;
      }

      if (data?.timezone) {
        setOrgTimezone(data.timezone);
      }
    };

    fetchTimezone();
  }, [selectedOrganization]);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchOpportunity();
    }
  }, [id, orgTimezone]);

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
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (stageError) throw stageError;
      setOpportunityStages(stageData || []);

      // Fetch opportunity types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setOpportunityTypes(typeData || []);

      // Fetch lead sources
      const { data: sourceData, error: sourceError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'lead_source')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (sourceError) throw sourceError;
      setLeadSources(sourceData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOpportunity = async () => {
    try {
      if (!id) return;

      const { data: opportunityData, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          account:vendors(id, name, type),
          contact:customers(*),
          owner:profiles!opportunities_owner_id_fkey(id, name),
          products:opportunity_products(
            id,
            product_id, 
            quantity, 
            unit_price, 
            subtotal, 
            status,
            notes,
            created_at,
            product:products(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // If opportunity has a parent_id, fetch the parent opportunity in a separate query
      if (opportunityData && opportunityData.parent_id) {
        const { data: parentOpportunity, error: parentError } = await supabase
          .from('opportunities')
          .select('id, name, stage, status')
          .eq('id', opportunityData.parent_id)
          .single();

        if (!parentError && parentOpportunity) {
          // Add the parent data to the opportunity object
          opportunityData.parent = parentOpportunity;
        }
      }

      setOpportunity(opportunityData);
    } catch (err) {
      console.error('Error fetching opportunity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  };

  // Get style for status badge
  const getProductStatusStyle = (status: string) => {
    const statusValue = productStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get status label
  const getProductStatusLabel = (status: string) => {
    return productStatuses.find(s => s.value === status)?.label || status;
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
        .eq('organization_id', selectedOrganization?.id)
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

  // Get style for stage badge
  const getStageStyle = (stage: string) => {
    const stageValue = opportunityStages.find(s => s.value === stage);
    if (!stageValue?.color) return {};
    return {
      backgroundColor: stageValue.color,
      color: stageValue.text_color || '#FFFFFF'
    };
  };

  // Get stage label
  const getStageLabel = (stage: string) => {
    return opportunityStages.find(s => s.value === stage)?.label || stage;
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

  // Get type label
  const getTypeLabel = (type: string | null) => {
    if (!type) return '';
    return opportunityTypes.find(t => t.value === type)?.label || type;
  };

  // Get source label
  const getSourceLabel = (source: string | null) => {
    if (!source) return '';
    return leadSources.find(s => s.value === source)?.label || source;
  };

  // Get current stage index for the progress bar
  const getCurrentStageIndex = () => {
    if (!opportunity || !opportunityStages.length) return -1;
    return opportunityStages.findIndex(stage =>
      stage.value.toLowerCase() === opportunity.stage.toLowerCase()
    );
  };

  // Format date with timezone
  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    try {
      return DateTime
        .fromISO(dateStr, { zone: 'UTC' })
        .setZone(orgTimezone)
        .toLocaleString(DateTime.DATE_MED);
    } catch (err) {
      console.error('Error formatting date:', err);
      return new Date(dateStr).toLocaleDateString();
    }
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
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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

  // Calculate the total for all products
  const calculateTotal = () => {
    if (!opportunity?.products) return 0;
    return opportunity.products.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
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
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/opportunities')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Opportunities</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/tasks/new?module=opportunities&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/opportunities/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Opportunity
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Value */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 rounded-full p-2.5">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{opportunity.name}</h1>
                  <div className="flex items-center mt-1.5 space-x-3">
                    {opportunity.type && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full"
                        style={getTypeStyle(opportunity.type)}
                      >
                        {getTypeLabel(opportunity.type)}
                      </span>
                    )}
                    <span className="text-gray-500 text-sm">
                      Created on {formatDate(opportunity.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount and Probability */}
              <div className="mt-4 md:mt-0">
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-bold text-purple-700">
                    {formatCurrency(opportunity.amount)}
                  </span>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 mt-1">
                    {opportunity.probability}% Probability
                  </span>
                </div>
              </div>
            </div>

            {/* Parent Opportunity Section - Added from original design */}
            {opportunity.parent && (
              <div className="mb-6 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800">Parent Opportunity</h3>
                    <div className="flex items-center mt-1">
                      <LinkIcon className="w-4 h-4 text-blue-600 mr-2" />
                      <Link
                        to={`/admin/opportunities/${opportunity.parent.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {opportunity.parent.name}
                      </Link>
                      <span
                        className="ml-2 px-2 py-1 text-xs font-medium rounded-full"
                        style={getStageStyle(opportunity.parent.stage)}
                      >
                        {opportunityStages.find(s => s.value === opportunity.parent.stage)?.label || opportunity.parent.stage}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Bar */}
            <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {opportunityStages.length > 0 && (
                <div className="relative pt-2">
                  {/* Progress bar track */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Progress bar fill - width based on current status */}
                    <div
                      className="absolute top-2 left-0 h-2 bg-purple-500 rounded-full"
                      style={{
                        width: `${(getCurrentStageIndex() + 1) * 100 / opportunityStages.length}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    ></div>
                  </div>

                  {/* Status indicators with dots */}
                  <div className="flex justify-between mt-1">
                    {opportunityStages.map((stage, index) => {
                      // Determine if this status is active (current or passed)
                      const isActive = index <= getCurrentStageIndex();
                      // Position dots evenly
                      const position = index / (opportunityStages.length - 1) * 100;

                      return (
                        <div
                          key={stage.id}
                          className="flex flex-col items-center"
                          style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                        >
                          {/* Status dot */}
                          <div
                            className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-purple-500' : 'bg-gray-300'}`}
                            style={{
                              marginTop: '-10px',
                              boxShadow: '0 0 0 2px white'
                            }}
                          ></div>

                          {/* Status label */}
                          <button
                            onClick={() => handleStageChange(stage.value)}
                            className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors ${isActive ? 'text-purple-700' : 'text-gray-500 hover:text-gray-700'
                              }`}
                          >
                            {stage.label}
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
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'products'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'comments'
                      ? 'border-purple-500 text-purple-600'
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
                  {/* Key Information */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 text-purple-500 mr-2" />
                      Opportunity Information
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(opportunity.amount)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Probability:</span>
                        <div className="flex items-center">
                          <Percent className="w-4 h-4 text-green-500 mr-1" />
                          <span className="font-medium">{opportunity.probability}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Expected Close:</span>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          <span>{opportunity.expected_close_date ?
                            formatDate(opportunity.expected_close_date) :
                            'Not set'}
                          </span>
                        </div>
                      </div>

                      {opportunity.type && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span
                            className="px-3 py-1 text-xs font-medium rounded-full"
                            style={getTypeStyle(opportunity.type)}
                          >
                            {getTypeLabel(opportunity.type)}
                          </span>
                        </div>
                      )}

                      {opportunity.lead_source && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Lead Source:</span>
                          <span className="font-medium">{getSourceLabel(opportunity.lead_source)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Account Information */}
                  {opportunity.account && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-purple-500 mr-2" />
                        Account Information
                      </h2>
                      <div className="space-y-4">
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
                            className="text-purple-600 hover:text-purple-700 hover:underline text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Owner Information */}
                  {opportunity.owner && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <UserCheck className="w-5 h-5 text-purple-500 mr-2" />
                        Owner Information
                      </h2>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                          <span className="text-purple-700 font-medium">
                            {opportunity.owner.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="font-medium">{opportunity.owner.name}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Contact Information */}
                  {opportunity.contact && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-purple-500 mr-2" />
                        Contact Information
                      </h2>
                      <div className="space-y-4">
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

                        {opportunity.contact.email && (
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <a
                              href={`mailto:${opportunity.contact.email}`}
                              className="text-purple-600 hover:text-purple-700"
                            >
                              {opportunity.contact.email}
                            </a>
                          </div>
                        )}

                        {opportunity.contact.phone && (
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <a
                              href={`tel:${opportunity.contact.phone}`}
                              className="text-purple-600 hover:text-purple-700"
                            >
                              {opportunity.contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Clock className="w-5 h-5 text-purple-500 mr-2" />
                      Timeline
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 mr-3">
                          <Calendar className="w-4 h-4 text-purple-700" />
                        </div>
                        <div>
                          <div className="font-medium">Created</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(opportunity.created_at)}
                          </div>
                        </div>
                      </div>

                      {opportunity.expected_close_date && (
                        <div className="flex items-start">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 mr-3">
                            <Flag className="w-4 h-4 text-blue-700" />
                          </div>
                          <div>
                            <div className="font-medium">Expected Close Date</div>
                            <div className="text-sm text-gray-500">
                              {formatDate(opportunity.expected_close_date)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description - Full Width */}
                {opportunity.description && (
                  <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-purple-500 mr-2" />
                      Description
                    </h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
                  </div>
                )}

                {/* Custom Fields - Full Width */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-purple-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="opportunities"
                    entityId={id || ''}
                    organizationId={selectedOrganization?.id}
                  />
                </div>
              </div>
            )}

            {/* Products Tab Content */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <Package className="w-5 h-5 text-purple-500 mr-2" />
                    Products
                  </h2>
                  <Link
                    to={`/admin/opportunities/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Products
                  </Link>
                </div>

                {opportunity.products && opportunity.products.length > 0 ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subtotal
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {opportunity.products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {product.product?.stock_unit === 'quantity' ? (
                                    <Package className="flex-shrink-0 h-5 w-5 text-gray-400 mr-3" />
                                  ) : (
                                    <Scale className="flex-shrink-0 h-5 w-5 text-gray-400 mr-3" />
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {product.product?.name || 'Unknown Product'}
                                    </div>
                                    {product.product?.description && (
                                      <div className="text-sm text-gray-500 max-w-xs truncate">
                                        {product.product.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(product.unit_price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(product.quantity * product.unit_price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                  style={getProductStatusStyle(product.status)}
                                >
                                  {getProductStatusLabel(product.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={3} className="px-6 py-4 text-right font-medium text-gray-700">
                              Total:
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">
                              {formatCurrency(calculateTotal())}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Product Details Cards */}
                    <div className="mt-8 space-y-4">
                      <h3 className="text-md font-medium text-gray-700 mb-3">Product Details</h3>
                      {opportunity.products.map((product) => (
                        <div key={`detail-${product.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center">
                              {product.product?.stock_unit === 'quantity' ? (
                                <Package className="w-5 h-5 text-purple-500 mr-2" />
                              ) : (
                                <Scale className="w-5 h-5 text-purple-500 mr-2" />
                              )}
                              <span className="font-medium text-gray-900">{product.product?.name || 'Unknown Product'}</span>
                            </div>
                            <span
                              className="px-2 py-1 text-xs leading-5 font-semibold rounded-full"
                              style={getProductStatusStyle(product.status)}
                            >
                              {getProductStatusLabel(product.status)}
                            </span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="text-sm font-medium text-gray-500">Quantity</div>
                                <div className="mt-1 text-sm text-gray-900">{product.quantity}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-500">Unit Price</div>
                                <div className="mt-1 text-sm text-gray-900">{formatCurrency(product.unit_price)}</div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-500">Subtotal</div>
                                <div className="mt-1 text-sm font-bold text-gray-900">
                                  {formatCurrency(product.quantity * product.unit_price)}
                                </div>
                              </div>
                            </div>

                            {product.notes && (
                              <div className="mt-4">
                                <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                                  {product.notes}
                                </div>
                              </div>
                            )}

                            <div className="mt-4 text-xs text-gray-500">
                              Added on {formatDate(product.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 rounded-lg text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-700 mb-1">No Products Added</h3>
                    <p className="text-gray-500 mb-4">This opportunity doesn't have any products yet</p>
                    <Link
                      to={`/admin/opportunities/${id}/edit`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Add Products
                    </Link>
                  </div>
                )}
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

                {/* Emails */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedEmails
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshRecordsList}
                    title="Email Communications"
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
                    <MessageSquare className="w-5 h-5 text-purple-500 mr-2" />
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
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

      {/* Account Modal */}
      {showAccountModal && opportunity.account && (
        <AccountDetailsModal
          vendor={{
            id: opportunity.account.id,
            name: opportunity.account.name,
            type: opportunity.account.type
          }}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}









