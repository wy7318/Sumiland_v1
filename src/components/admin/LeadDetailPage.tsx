import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, Send, Reply, X, User,
  Globe, CheckCircle, UserPlus, Target
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { CustomFieldsSection } from './CustomFieldsSection';
import { UserSearch } from './UserSearch';
import type { Database } from '../../lib/database.types';
import { useOrganization } from '../../contexts/OrganizationContext';

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

  if (error || !lead) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Lead not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/leads')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Leads
        </button>
        <Link
          to={`/admin/leads/${id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Lead
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{lead.first_name} {lead.last_name}</h1>
              <div className="flex items-center gap-4">
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-sm font-medium rounded-full px-3 py-1"
                  style={getStatusStyle(lead.status)}
                >
                  {leadStatuses.map(status => (
                    <option key={status.id} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                {lead.lead_source && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {leadSources.find(s => s.value === lead.lead_source)?.label || lead.lead_source}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 md:mt-0 flex gap-4">
              <button
                onClick={handleConvertToContact}
                disabled={converting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Convert to Contact
              </button>
              <button
                onClick={handleConvertToOpportunity}
                disabled={converting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Target className="w-4 h-4 mr-2" />
                Convert to Opportunity
              </button>
            </div>
          </div>

          {conversionError && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {conversionError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </div>
                    {lead.company && (
                      <div className="text-sm text-gray-500">
                        {lead.company}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-3" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {lead.email}
                  </a>
                </div>
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
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {lead.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Assignment</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <UserSearch
                  organizationId={lead.organization_id}
                  selectedUserId={lead.owner_id}
                  onSelect={handleAssign}
                />
              </div>
            </div>

            {/* Lead Details */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Lead Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
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
                  <p className="text-gray-700">
                    {lead.email_opt_out ? 'Opted out of emails' : 'Opted in to emails'}
                  </p>
                </div>
              </div>
            </div>

            {/* Add Custom Fields section */}
            <div className="md:col-span-2">
              <CustomFieldsSection
                entityType="lead"
                entityId={id}
                organizationId={lead.organization_id}
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
  );
}