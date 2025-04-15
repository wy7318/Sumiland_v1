import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, Download, Clock,
  CheckCircle, X, Send, Reply, User, AlertTriangle, CheckSquare,
  Briefcase, MessageSquare, UserCheck, MapPin, Bookmark,
  Users, Calendar as CalendarIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { AccountDetailsModal } from './AccountDetailsModal';
import { CustomFieldsSection } from './CustomFieldsSection';
import { UserSearch } from './UserSearch';
import { EmailConfigModal } from './EmailConfigModal';
import { useEmailComposer } from './EmailProvider';
import { EmailModal } from './EmailModal';
import { getEmailConfig } from '../../lib/email';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { RelatedEmails } from './RelatedEmails';
import { RelatedTasks } from './RelatedTasks';
import { DateTime } from 'luxon'; // Import Luxon for timezone handling

type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_person?: string;
};

type Case = {
  id: string;
  title: string;
  type: string;
  sub_type: string | null;
  status: string;
  contact_id: string;
  owner_id: string | null;
  description: string;
  resume_url: string | null;
  attachment_url: string | null;
  created_at: string;
  organization_id: string;
  escalated_at: string | null;
  closed_at: string | null;
  origin: string | null;
  closed_by: string | null;
  escalated_by: string | null;
  priority: string | null;
  vendor_id: string | null; // Add this field
  vendor: Vendor | null; // Add this field
  contact: {
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
  escalated_by_user?: {
    id: string;
    name: string;
  } | null;
  closed_by_user?: {
    id: string;
    name: string;
  } | null;
};

type Feed = {
  id: string;
  content: string;
  parent_id: string | null;
  parent_type: 'Case';
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


export function CaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [caseTypes, setCaseTypes] = useState<PicklistValue[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<PicklistValue[]>([]);
  const [casePriorities, setCasePriorities] = useState<PicklistValue[]>([]);
  const [caseOrigins, setCaseOrigins] = useState<PicklistValue[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { openEmailComposer } = useEmailComposer();
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [refreshEmailList, setRefreshEmailList] = useState(0);
  const [orgTimezone, setOrgTimezone] = useState('UTC'); // Default timezone
  const [showAccountModal, setShowAccountModal] = useState(false);

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
        console.log('CaseDetailPage - Using timezone:', data.timezone);
      }
    };

    fetchTimezone();
  }, [selectedOrganization]);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchCase();
    }
  }, [id, orgTimezone]);

  useEffect(() => {
    if (caseData) {
      fetchFeeds();
    }
  }, [caseData]);

  const fetchPicklists = async () => {
    try {
      // Fetch case types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setCaseTypes(typeData || []);

      // Fetch case statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setCaseStatuses(statusData || []);

      // Fetch case priorities
      const { data: priorityData, error: priorityError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_priority')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (priorityError) throw priorityError;
      setCasePriorities(priorityData || []);

      // Fetch case origins
      const { data: originData, error: originError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_origin')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (originError) throw originError;
      setCaseOrigins(originData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchCase = async () => {
    try {
      if (!id) return;

      // First fetch the case data
      const { data: caseData, error } = await supabase
        .from('cases')
        .select(`
          *,
          contact:customers(*),
          owner:profiles!cases_owner_id_fkey(
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Enrich the case data with user information
      const enrichedCaseData = { ...caseData };

      // Fetch vendor information if vendor_id exists
      if (caseData.vendor_id) {
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', caseData.vendor_id)
          .single();

        if (!vendorError && vendorData) {
          enrichedCaseData.vendor = vendorData;
        }
      }

      // Fetch escalated_by user if it exists
      if (caseData.escalated_by) {
        const { data: escalatedByUser, error: escalatedByError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', caseData.escalated_by)
          .single();

        if (!escalatedByError && escalatedByUser) {
          enrichedCaseData.escalated_by_user = escalatedByUser;
        }
      }

      // Fetch closed_by user if it exists
      if (caseData.closed_by) {
        const { data: closedByUser, error: closedByError } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('id', caseData.closed_by)
          .single();

        if (!closedByError && closedByUser) {
          enrichedCaseData.closed_by_user = closedByUser;
        }
      }

      setCaseData(enrichedCaseData);
    } catch (err) {
      console.error('Error fetching case:', err);
      setError('Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeds = async () => {
    if (!id || !caseData) return;

    try {
      const { data, error } = await supabase
        .from('feeds')
        .select(`
          *,
          profile:profiles!feeds_created_by_fkey(name)
        `)
        .eq('reference_id', id)
        .eq('parent_type', 'Case')
        .eq('status', 'Active')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  // Format date with timezone
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';

    try {
      return DateTime
        .fromISO(dateTimeStr, { zone: 'UTC' })
        .setZone(orgTimezone)
        .toLocaleString(DateTime.DATETIME_SHORT);
    } catch (err) {
      console.error('Error formatting datetime:', err);
      return new Date(dateTimeStr).toLocaleString();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id || !caseData) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Initialize updates object
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If changing to Escalated status and it hasn't been escalated before
      if (newStatus === 'Escalated' && !caseData.escalated_by) {
        // Get current time in organization timezone
        const now = DateTime.now().setZone(orgTimezone)
          .toISO();

        updates.escalated_at = now;
        updates.escalated_by = userData.user.id;
      }

      // If changing to Closed status and it hasn't been closed before
      if (newStatus === 'Closed' && !caseData.closed_by) {
        // Get current time in organization timezone
        const now = DateTime.now().setZone(orgTimezone)
          .toISO();

        updates.closed_at = now;
        updates.closed_by = userData.user.id;
      }

      const { error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchCase();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAssign = async (userId: string | null) => {
    try {
      if (!id || !caseData) return;

      const { error } = await supabase
        .from('cases')
        .update({
          owner_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchCase();
    } catch (err) {
      console.error('Error assigning case:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign case');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !caseData) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feeds')
        .insert([{
          content: newComment.trim(),
          parent_id: replyTo?.id || null,
          parent_type: 'Case',
          reference_id: id,
          organization_id: selectedOrganization?.id,
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
      if (!caseData) return;

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

  const handleEmailClick = async () => {
    if (!user || !caseData?.contact) return;

    try {
      const config = await getEmailConfig(user.id);
      if (!config) {
        setShowEmailConfigModal(true);
      } else {
        // Open email composer with stored state
        openEmailComposer({
          to: caseData.contact.email,
          caseTitle: caseData.title,
          orgId: selectedOrganization?.id,
          caseId: id,
          autoClose: true, // Explicitly set to true to close after sending
          onSuccess: () => {
            // Refresh the email list after successful send
            setRefreshEmailList(prev => prev + 1);
          }
        });
      }
    } catch (err) {
      console.error('Error checking email config:', err);
      setError(err instanceof Error ? err.message : 'Failed to check email configuration');
    }
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = caseStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get style for type badge
  const getTypeStyle = (type: string) => {
    const typeValue = caseTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  // Get style for priority badge
  const getPriorityStyle = (priority: string) => {
    const priorityValue = casePriorities.find(p => p.value === priority);
    if (!priorityValue?.color) return {};
    return {
      backgroundColor: priorityValue.color,
      color: priorityValue.text_color || '#FFFFFF'
    };
  };

  // Get style for origin badge
  const getOriginStyle = (origin: string) => {
    const originValue = caseOrigins.find(o => o.value === origin);
    if (!originValue?.color) return {};
    return {
      backgroundColor: originValue.color,
      color: originValue.text_color || '#FFFFFF'
    };
  };

  // Get current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!caseData || !caseStatuses.length) return -1;
    return caseStatuses.findIndex(status =>
      status.value.toLowerCase() === caseData.status.toLowerCase()
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
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-medium">
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
          {feed.created_by === caseData?.id && !isEditing && (
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
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
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
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Case not found'}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/cases')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Cases</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/tasks/new?module=cases&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/cases/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Case
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Status */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full p-2.5">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
                  <div className="flex flex-wrap items-center mt-1.5 space-x-2">
                    <span
                      className="px-3 py-1 text-xs font-medium rounded-full"
                      style={getTypeStyle(caseData.type)}
                    >
                      {caseTypes.find(t => t.value === caseData.type)?.label || caseData.type}
                      {caseData.sub_type && (
                        <span className="ml-1">
                          / {caseData.sub_type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </span>

                    {/* Priority Badge */}
                    {caseData.priority && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full flex items-center"
                        style={getPriorityStyle(caseData.priority)}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {casePriorities.find(p => p.value === caseData.priority)?.label || caseData.priority}
                      </span>
                    )}

                    {/* Origin Badge */}
                    {caseData.origin && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full"
                        style={getOriginStyle(caseData.origin)}
                      >
                        {caseOrigins.find(o => o.value === caseData.origin)?.label || caseData.origin}
                      </span>
                    )}

                    <span className="text-gray-500 text-sm">
                      Created on {formatDateTime(caseData.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {caseStatuses.length > 0 && (
                <div className="relative pt-2">
                  {/* Progress bar track */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Progress bar fill - width based on current status */}
                    <div
                      className="absolute top-2 left-0 h-2 bg-blue-500 rounded-full"
                      style={{
                        width: `${(getCurrentStatusIndex() + 1) * 100 / caseStatuses.length}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    ></div>
                  </div>

                  {/* Status indicators with dots */}
                  <div className="flex justify-between mt-1">
                    {caseStatuses.map((status, index) => {
                      // Determine if this status is active (current or passed)
                      const isActive = index <= getCurrentStatusIndex();
                      // Position dots evenly
                      const position = index / (caseStatuses.length - 1) * 100;

                      return (
                        <div
                          key={status.id}
                          className="flex flex-col items-center"
                          style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
                        >
                          {/* Status dot */}
                          <div
                            className={`w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                            style={{
                              marginTop: '-10px',
                              boxShadow: '0 0 0 2px white'
                            }}
                          ></div>

                          {/* Status label */}
                          <button
                            onClick={() => handleStatusChange(status.value)}
                            className={`text-sm font-medium mt-2 px-3 py-1 rounded-full transition-colors ${isActive ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'
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
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'comments'
                      ? 'border-blue-500 text-blue-600'
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
                  {caseData.contact && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <User className="w-5 h-5 text-blue-500 mr-2" />
                        Contact Information
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium">
                              {caseData.contact.first_name} {caseData.contact.last_name}
                            </div>
                            {caseData.contact.company && (
                              <div className="text-sm text-gray-500">
                                {caseData.contact.company}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3" />
                          <a
                            href={`mailto:${caseData.contact.email}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {caseData.contact.email}
                          </a>
                        </div>

                        <button
                          onClick={handleEmailClick}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Email
                        </button>

                        {caseData.contact.phone && (
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <a
                              href={`tel:${caseData.contact.phone}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {caseData.contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vendor Information */}
                  {caseData.vendor && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Building2 className="w-5 h-5 text-blue-500 mr-2" />
                        Vendor Information
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="font-medium">{caseData.vendor.name}</div>
                          </div>
                          <button
                            onClick={() => setShowAccountModal(true)}
                            className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                          >
                            View Details
                          </button>
                        </div>

                        {caseData.vendor.email && (
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-3" />
                            <a
                              href={`mailto:${caseData.vendor.email}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {caseData.vendor.email}
                            </a>
                          </div>
                        )}

                        {caseData.vendor.phone && (
                          <div className="flex items-center">
                            <Phone className="w-5 h-5 text-gray-400 mr-3" />
                            <a
                              href={`tel:${caseData.vendor.phone}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {caseData.vendor.phone}
                            </a>
                          </div>
                        )}

                        {caseData.vendor.contact_person && (
                          <div className="flex items-center">
                            <User className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="text-gray-700">
                              {caseData.vendor.contact_person}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps Section */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Clock className="w-5 h-5 text-blue-500 mr-2" />
                      Timeline
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <CalendarIcon className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm text-gray-500">Created on</div>
                          <div className="font-medium">{formatDateTime(caseData.created_at)}</div>
                        </div>
                      </div>

                      {/* Escalation Information */}
                      {caseData.escalated_at && (
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-amber-500 mr-3" />
                          <div>
                            <div className="text-sm text-gray-500">Escalated on</div>
                            <div className="font-medium">
                              {formatDateTime(caseData.escalated_at)}
                              {caseData.escalated_by_user && (
                                <span className="ml-2 text-sm text-gray-500">
                                  by {caseData.escalated_by_user.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Closed Information */}
                      {caseData.closed_at && (
                        <div className="flex items-center">
                          <CheckSquare className="w-5 h-5 text-green-500 mr-3" />
                          <div>
                            <div className="text-sm text-gray-500">Closed on</div>
                            <div className="font-medium">
                              {formatDateTime(caseData.closed_at)}
                              {caseData.closed_by_user && (
                                <span className="ml-2 text-sm text-gray-500">
                                  by {caseData.closed_by_user.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Assignment */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <UserCheck className="w-5 h-5 text-blue-500 mr-2" />
                      Case Assignment
                    </h2>
                    <div className="space-y-4">
                      <UserSearch
                        organizationId={selectedOrganization?.id}
                        selectedUserId={caseData.owner_id}
                        onSelect={handleAssign}
                      />

                      {caseData.owner && (
                        <div className="flex items-center mt-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-700 font-medium">
                              {caseData.owner.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-gray-700">
                            Currently assigned to <span className="font-medium">{caseData.owner.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Files Section */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-2" />
                      Attachments
                    </h2>
                    <div className="space-y-4">
                      {caseData.resume_url && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="text-gray-700">Resume</div>
                          </div>
                          <a
                            href={caseData.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </div>
                      )}
                      {caseData.attachment_url && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="text-gray-700">Attachment</div>
                          </div>
                          <a
                            href={caseData.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </div>
                      )}
                      {!caseData.resume_url && !caseData.attachment_url && (
                        <div className="text-gray-500 italic text-sm">No attachments available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Case Description - Full Width */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <FileText className="w-5 h-5 text-blue-500 mr-2" />
                    Case Description
                  </h2>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {caseData.description || "No description provided."}
                  </div>
                </div>

                {/* Custom Fields - Full Width */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-blue-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="cases"
                    entityId={id}
                    organizationId={selectedOrganization?.id}
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
                    recordId={caseData.id}
                    organizationId={caseData.organization_id}
                    refreshKey={refreshEmailList}
                    title="Email Communications"
                  />
                </div>

                {/* Tasks */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedTasks
                    recordId={caseData.id}
                    organizationId={caseData.organization_id}
                    refreshKey={refreshEmailList}
                    title="Tasks"
                  />
                </div>

                {/* Additional related records */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 text-blue-500 mr-2" />
                    Other Related Records
                  </h2>
                  <div className="text-sm text-gray-500 italic py-2">
                    More related records would appear here
                  </div>
                </div>
              </div>
            )}

            {/* Comments Tab Content */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                {/* Comment Form */}
                <form onSubmit={handleSubmitComment} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 text-blue-500 mr-2" />
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
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

      {/* Email Modals */}
      {showEmailConfigModal && (
        <EmailConfigModal
          onClose={() => setShowEmailConfigModal(false)}
          onSuccess={() => {
            setShowEmailConfigModal(false);
            // After config is set up, open the email composer
            openEmailComposer({
              to: caseData.contact?.email,
              caseTitle: caseData.title,
              orgId: selectedOrganization?.id,
              caseId: id,
              onSuccess: () => {
                setRefreshEmailList(prev => prev + 1);
              }
            });
          }}
        />
      )}

      {showEmailModal && caseData.contact && (
        <EmailModal
          to={caseData.contact.email}
          caseTitle={caseData.title}
          orgId={selectedOrganization?.id}
          caseId={id}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false);
            setRefreshEmailList(prev => prev + 1);
          }}
        />
      )}

      {/* Account Details Modal */}
      {showAccountModal && caseData.vendor && (
        <AccountDetailsModal
          vendor={caseData.vendor}
          onClose={() => setShowAccountModal(false)}
        />
      )}
    </div>
  );
}