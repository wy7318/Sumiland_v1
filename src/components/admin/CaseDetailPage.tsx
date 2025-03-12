import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Building2, Mail, Phone, Calendar,
  Edit, AlertCircle, FileText, Download, Clock, Calendar as CalendarIcon,
  CheckCircle, X, Send, Reply, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { CustomFieldsSection } from './CustomFieldsSection';
import { UserSearch } from './UserSearch';
import { useOrganization } from '../../contexts/OrganizationContext';

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
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null; // Make contact optional
  owner: {
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
  const { selectedOrganization } = useOrganization();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const { organizations, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Feed | null>(null);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [caseTypes, setCaseTypes] = useState<PicklistValue[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<PicklistValue[]>([]);

  useEffect(() => {
    fetchPicklists();
    if (id) {
      fetchCase();
    }
  }, [id]);

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
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchCase = async () => {
    try {
      if (!id) return;

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
      setCaseData(caseData);
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
        .eq('organization_id', caseData.organization_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFeeds(data || []);
    } catch (err) {
      console.error('Error fetching feeds:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!id || !caseData) return;

      const { error } = await supabase
        .from('cases')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
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
          organization_id: caseData.organization_id,
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
        .eq('organization_id', caseData.organization_id);

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

  if (error || !caseData) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error || 'Case not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/cases')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Cases
        </button>
        <Link
          to={`/admin/cases/${id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Case
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">{caseData.title}</h1>
              <div className="flex items-center gap-4">
                <span
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={getTypeStyle(caseData.type)}
                >
                  {caseTypes.find(t => t.value === caseData.type)?.label || caseData.type}
                  {caseData.sub_type && (
                    <span className="ml-1 text-xs">
                      / {caseData.sub_type.replace(/_/g, ' ')}
                    </span>
                  )}
                </span>
                <select
                  value={caseData.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-sm font-medium rounded-full px-3 py-1"
                  style={getStatusStyle(caseData.status)}
                >
                  {caseStatuses.map(status => (
                    <option key={status.id} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {caseData.contact ? (
                <>
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-400 mr-3" />
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
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {caseData.contact.email}
                    </a>
                  </div>
                  {caseData.contact.phone && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-400 mr-3" />
                      <a
                        href={`tel:${caseData.contact.phone}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {caseData.contact.phone}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-400">No contact information available</div>
              )}
            </div>

            {/* Assignment */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Assignment</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <UserSearch
                  organizationId={caseData.organization_id}
                  selectedUserId={caseData.owner_id}
                  onSelect={handleAssign}
                />
              </div>
            </div>

            {/* Case Details */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Case Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
                  <p className="text-gray-700 whitespace-pre-wrap">{caseData.description}</p>
                </div>
                {/* Files Section */}
                <div className="flex flex-wrap gap-4">
                  {caseData.resume_url && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Resume</div>
                      <a
                        href={caseData.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Resume
                        <Download className="w-4 h-4 ml-2" />
                      </a>
                    </div>
                  )}
                  {caseData.attachment_url && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Attachment</div>
                      <a
                        href={caseData.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Attachment
                        <Download className="w-4 h-4 ml-2" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Custom Fields section */}
            <div className="md:col-span-2">
              <CustomFieldsSection
                entityType="case"
                entityId={id}
                organizationId={caseData.organization_id}
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