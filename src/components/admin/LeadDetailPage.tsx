import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  Globe, CheckCircle, UserPlus, Target,
  Briefcase, MessageSquare, FileText, UserCheck,
  MapPin, Bookmark, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { CustomFieldsSection } from './CustomFieldsSection';
import { UserSearch } from './UserSearch';
import type { Database } from '../../lib/database.types';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useAuth } from '../../contexts/AuthContext';
import { EmailConfigModal } from './EmailConfigModal';
import { useEmailComposer } from './EmailProvider';
import { getEmailConfig } from '../../lib/email';
import { EmailModal } from './EmailModal';
import { RelatedEmails } from './RelatedEmails';
import { RelatedTasks } from './RelatedTasks';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  owner: {
    name: string;
  } | null;
};

type Feed = {
  id: string;
  content: string;
  parent_id: string | null;
  parent_type: 'Lead';
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

export function LeadDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<PicklistValue[]>([]);
  const [leadSources, setLeadSources] = useState<PicklistValue[]>([]);
  const [converting, setConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { openEmailComposer } = useEmailComposer();
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [refreshEmailList, setRefreshEmailList] = useState(0);

  // New state for tabs
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchLead();
    }
  }, [id]);

  useEffect(() => {
    if (lead) {
      fetchFeeds();
    }
  }, [lead]);

  const fetchPicklists = async () => {
    try {
      // Fetch lead statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'lead_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setLeadStatuses(statusData || []);

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

  const fetchLead = async () => {
    try {
      if (!id) return;

      const { data: lead, error } = await supabase
        .from('leads')
        .select(`
          *,
          owner:profiles!leads_owner_id_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setLead(lead);
    } catch (err) {
      console.error('Error fetching lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeds = async () => {
    if (!id || !lead) return;

    try {
      const { data, error } = await supabase
        .from('feeds')
        .select(`
          *,
          profile:profiles!feeds_created_by_fkey(name)
        `)
        .eq('reference_id', id)
        .eq('parent_type', 'Lead')
        .eq('status', 'Active')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleEmailClick = async () => {
    if (!user) return;

    try {
      const config = await getEmailConfig(user.id);
      if (!config) {
        setShowEmailConfigModal(true);
      } else {
        // Open email composer with stored state
        openEmailComposer({
          to: lead.email,
          caseTitle: lead.company,
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id || !lead) return;

      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchLead();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAssign = async (userId: string | null) => {
    try {
      if (!id || !lead) return;

      const { error } = await supabase
        .from('leads')
        .update({
          owner_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      await fetchLead();
    } catch (err) {
      console.error('Error assigning lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign lead');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !lead) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feeds')
        .insert([{
          content: newComment.trim(),
          parent_id: replyTo?.id || null,
          parent_type: 'Lead',
          reference_id: id,
          organization_id: lead.organization_id,
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
      if (!lead) return;

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

  const handleConvertToContact = async () => {
    if (!lead) return;
    setConverting(true);
    setConversionError(null);

    try {
      // Check if contact already exists
      const { data: existingContact, error: checkError } = await supabase
        .from('customers')
        .select('customer_id')
        .eq('email', lead.email)
        .eq('organization_id', selectedOrganization?.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingContact) {
        setConversionError('A contact with this email already exists');
        return;
      }

      // Redirect to customer form with pre-filled data
      navigate('/admin/customers/new', {
        state: {
          leadData: {
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            lead_id: lead.id
          }
        }
      });
    } catch (err) {
      console.error('Error during contact conversion:', err);
      setConversionError(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  const handleConvertToOpportunity = () => {
    if (!lead) return;

    // Redirect to opportunity form with pre-filled data
    navigate('/admin/opportunities/new', {
      state: {
        leadData: {
          name: `${lead.first_name} ${lead.last_name} Opportunity`,
          contact_id: lead.customer_id,
          lead_id: lead.id,
          lead_source: lead.lead_source,
          description: lead.description,
          organization_id: lead.organization_id,
          owner_id: lead.owner_id
        }
      }
    });
  };

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = leadStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get current status index for the progress bar
  const getCurrentStatusIndex = () => {
    if (!lead || !leadStatuses.length) return -1;
    return leadStatuses.findIndex(status =>
      status.value.toLowerCase() === lead.status.toLowerCase()
    );
  };

  // Get style for source badge
  const getSourceStyle = (source: string) => {
    const sourceValue = leadSources.find(s => s.value === source);
    if (!sourceValue?.color) return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    return {
      backgroundColor: sourceValue.color,
      color: sourceValue.text_color || '#FFFFFF'
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
          {feed.created_by === lead?.id && !isEditing && (
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Lead not found'}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/admin/leads')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Leads</span>
          </button>

          {/* Right buttons group */}
          <div className="flex space-x-3">
            <Link
              to={`/admin/tasks/new?module=leads&recordId=${id}`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Task
            </Link>
            <Link
              to={`/admin/leads/${id}/edit`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Lead
            </Link>
          </div>
        </div>

        {/* Card Header with Title and Status */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 rounded-full p-2.5">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {lead.first_name} {lead.last_name}
                  </h1>
                  <div className="flex items-center mt-1.5 space-x-3">
                    {lead.company && (
                      <span className="text-gray-600 text-sm">
                        {lead.company}
                      </span>
                    )}
                    {lead.lead_source && (
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full"
                        style={getSourceStyle(lead.lead_source)}
                      >
                        {leadSources.find(s => s.value === lead.lead_source)?.label || lead.lead_source}
                      </span>
                    )}
                    <span className="text-gray-500 text-sm">
                      Created on {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversion buttons */}
              <div className="mt-4 md:mt-0 flex gap-3">
                <button
                  onClick={handleConvertToContact}
                  disabled={converting}
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convert to Contact
                </button>
                <button
                  onClick={handleConvertToOpportunity}
                  disabled={converting}
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Convert to Opportunity
                </button>
              </div>
            </div>

            {/* Display conversion error if any */}
            {conversionError && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {conversionError}
              </div>
            )}

            {/* Status Bar using picklist values */}
            <div className="mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              {leadStatuses.length > 0 && (
                <div className="relative pt-2">
                  {/* Progress bar track */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    {/* Progress bar fill - width based on current status */}
                    <div
                      className="absolute top-2 left-0 h-2 bg-blue-500 rounded-full"
                      style={{
                        width: `${(getCurrentStatusIndex() + 1) * 100 / leadStatuses.length}%`,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    ></div>
                  </div>

                  {/* Status indicators with dots */}
                  <div className="flex justify-between mt-1">
                    {leadStatuses.map((status, index) => {
                      // Determine if this status is active (current or passed)
                      const isActive = index <= getCurrentStatusIndex();
                      // Position dots evenly
                      const position = index / (leadStatuses.length - 1) * 100;

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
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('related')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'related'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  Related
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-4 px-1 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === 'comments'
                      ? 'border-primary-500 text-primary-600'
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
                      <User className="w-5 h-5 text-primary-500 mr-2" />
                      Contact Information
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-400 mr-3" />
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {lead.email}
                        </a>
                      </div>

                      <button
                        onClick={handleEmailClick}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </button>

                      {lead.phone && (
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-400 mr-3" />
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {lead.phone}
                          </a>
                        </div>
                      )}

                      {lead.website && (
                        <div className="flex items-center">
                          <Globe className="w-5 h-5 text-gray-400 mr-3" />
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            {lead.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lead Details */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Bookmark className="w-5 h-5 text-primary-500 mr-2" />
                      Lead Details
                    </h2>
                    <div className="space-y-4">
                      {lead.description && (
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
                          <p className="text-gray-700 whitespace-pre-wrap">{lead.description}</p>
                        </div>
                      )}
                      {lead.product_interest && (
                        <div>
                          <div className="text-sm font-medium text-gray-500 mb-1">Product Interest</div>
                          <p className="text-gray-700">{lead.product_interest}</p>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Email Preferences</div>
                        <p className="text-gray-700 flex items-center">
                          {lead.email_opt_out ? (
                            <>
                              <X className="w-4 h-4 text-red-500 mr-1" />
                              Opted out of emails
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                              Opted in to emails
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Assignment */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <UserCheck className="w-5 h-5 text-primary-500 mr-2" />
                      Lead Assignment
                    </h2>
                    <div className="space-y-4">
                      <UserSearch
                        organizationId={lead.organization_id}
                        selectedUserId={lead.owner_id}
                        onSelect={handleAssign}
                      />

                      {lead.owner && (
                        <div className="flex items-center mt-4">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                            <span className="text-primary-700 font-medium">
                              {lead.owner.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-gray-700">
                            Currently assigned to <span className="font-medium">{lead.owner.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lead Source Information */}
                  {lead.lead_source && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <Target className="w-5 h-5 text-primary-500 mr-2" />
                        Lead Source
                      </h2>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div
                            className="px-4 py-2 rounded-full text-sm font-medium"
                            style={getSourceStyle(lead.lead_source)}
                          >
                            {leadSources.find(s => s.value === lead.lead_source)?.label || lead.lead_source}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Fields - Full Width */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Bookmark className="w-5 h-5 text-primary-500 mr-2" />
                    Custom Fields
                  </h2>
                  <CustomFieldsSection
                    entityType="leads"
                    entityId={id}
                    organizationId={lead.organization_id}
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
                    refreshKey={refreshEmailList}
                    title="Email Communications"
                  />
                </div>

                {/* Tasks */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <RelatedTasks
                    recordId={id}
                    organizationId={selectedOrganization?.id}
                    refreshKey={refreshEmailList}
                    title="Tasks"
                  />
                </div>

                {/* Additional related records */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 text-primary-500 mr-2" />
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
                    <MessageSquare className="w-5 h-5 text-primary-500 mr-2" />
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-5 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
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
              to: lead.email,
              caseTitle: lead.company,
              orgId: selectedOrganization?.id,
              caseId: id,
              onSuccess: () => {
                setRefreshEmailList(prev => prev + 1);
              }
            });
          }}
        />
      )}

      {showEmailModal && (
        <EmailModal
          to={lead.email}
          caseTitle={lead.company}
          orgId={selectedOrganization?.id}
          caseId={id}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => {
            setShowEmailModal(false);
            setRefreshEmailList(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}