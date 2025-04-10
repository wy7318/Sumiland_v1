import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, UserCheck, Calendar, Mail, Building2, AlertCircle,
  FileDown, Send, Phone, Globe, User, LayoutGrid, LayoutList,
  Users, Check, X, MapPin, Flag, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { KanbanBoard, KanbanCard } from './KanbanBoard';
import { useOrganization } from '../../contexts/OrganizationContext';

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  website: string | null;
  phone: string | null;
  description: string | null;
  product_interest: string | null;
  email_opt_out: boolean;
  status: string;
  lead_source: string | null;
  owner_id: string | null;
  is_converted: boolean;
  converted_at: string | null;
  converted_by: string | null;
  created_at: string;
  organization_id: string;
  owner: {
    name: string;
  } | null;
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

type ViewMode = 'list' | 'kanban';

function LeadCard({ lead, onStatusChange, statuses, staff, handleDelete, handleAssign }: {
  lead: Lead;
  onStatusChange: (id: string, status: string) => void;
  statuses: PicklistValue[];
  staff: any[];
  handleDelete: (id: string) => void;
  handleAssign: (id: string, userId: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = statuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  return (
    <KanbanCard id={lead.id}>
      <div className="space-y-3 relative p-1">
        <div
          className="absolute top-0 right-0 p-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowActions(!showActions)}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold">{lead.first_name.charAt(0)}{lead.last_name.charAt(0)}</span>
          </div>
          <h4 className="font-medium text-gray-900">
            {lead.first_name} {lead.last_name}
          </h4>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="truncate">{lead.email}</span>
        </div>

        {lead.company && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        )}

        {lead.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600 mt-1">
          <UserCheck className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          {lead.owner ? (
            <span className="font-medium">{lead.owner.name}</span>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>

        {showActions && (
          <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(lead.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                style={getStatusStyle(lead.status)}
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Assign to</label>
              <select
                value={lead.owner_id || ''}
                onChange={(e) => handleAssign(lead.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <Link
                to={`/admin/leads/${lead.id}`}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                title="View details"
                onClick={e => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
              </Link>
              <Link
                to={`/admin/leads/${lead.id}/edit`}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                title="Edit lead"
                onClick={e => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(lead.id);
                }}
                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete lead"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </KanbanCard>
  );
}

export function LeadsPage() {
  const { organizations } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'company' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<PicklistValue[]>([]);
  const [leadSources, setLeadSources] = useState<PicklistValue[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPicklists();
    fetchLeads();
    fetchStaff();
  }, [selectedOrganization]);

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

  const fetchLeads = async () => {
    try {
      setLoading(true);
      // Get all leads with owner details
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          owner:profiles!leads_owner_id_fkey(name)
        `)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Get all users from the same organizations
      const { data: orgUsers, error: orgUsersError } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', selectedOrganization?.id);

      if (orgUsersError) throw orgUsersError;

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', orgUsers?.map(uo => uo.user_id) || []);

      if (profilesError) throw profilesError;
      setStaff(profiles || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      await fetchLeads();
    } catch (err) {
      console.error('Error updating lead status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      await fetchLeads();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedLeads.length || !action) return;

    try {
      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads?`)) {
          return;
        }

        const { error } = await supabase
          .from('leads')
          .delete()
          .in('id', selectedLeads);

        if (error) throw error;
      } else if (action.startsWith('assign_')) {
        const userId = action.replace('assign_', '');
        const { error } = await supabase
          .from('leads')
          .update({
            owner_id: userId,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedLeads);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leads')
          .update({
            status: action,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedLeads);

        if (error) throw error;
      }

      await fetchLeads();
      setSelectedLeads([]);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    }
  };

  const handleAssign = async (leadId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          owner_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      await fetchLeads();
    } catch (err) {
      console.error('Error assigning lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign lead');
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.owner?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: any = a;
    let bValue: any = b;

    if (sortBy === 'company') {
      aValue = a.company || '';
      bValue = b.company || '';
    } else {
      aValue = a[sortBy];
      bValue = b[sortBy];
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Get style for status badge
  const getStatusStyle = (status: string) => {
    const statusValue = leadStatuses.find(s => s.value === status);
    if (!statusValue?.color) return {};
    return {
      backgroundColor: statusValue.color,
      color: statusValue.text_color || '#FFFFFF'
    };
  };

  // Get label for status
  const getStatusLabel = (status: string) => {
    return leadStatuses.find(s => s.value === status)?.label || status;
  };

  if (loading || !leadStatuses.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-500 bg-clip-text text-transparent">
            Lead Management
          </h1>
          <p className="text-gray-500 mt-1">Manage and nurture your sales leads</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-indigo-300"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span>Kanban View</span>
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4" />
                <span>List View</span>
              </>
            )}
          </button>
          <Link
            to="/admin/leads/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center border border-red-100 shadow-sm mb-6">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-500" />
              Search & Filters
            </h2>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {filtersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {filtersExpanded && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search leads by name, email, company, owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Status</option>
                    {leadStatuses.map(status => (
                      <option key={status.id} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Source Filter</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Sources</option>
                    {leadSources.map(source => (
                      <option key={source.id} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLeads.length > 0 && viewMode === 'list' && (
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1.5 font-medium">Bulk Actions</label>
                    <div className="flex items-center gap-3">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkAction(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select Action</option>
                        <optgroup label="Change Status">
                          {leadStatuses.map(status => (
                            <option key={status.id} value={status.value}>
                              Set as {status.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Assign To">
                          {staff.map(member => (
                            <option key={member.id} value={`assign_${member.id}`}>
                              Assign to {member.name}
                            </option>
                          ))}
                        </optgroup>
                        <option value="delete">Delete Selected</option>
                      </select>
                      <span className="rounded-full bg-indigo-100 text-indigo-800 px-3 py-1 text-sm font-medium">
                        {selectedLeads.length} selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leads Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {viewMode === 'list' ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads(filteredLeads.map(l => l.id));
                          } else {
                            setSelectedLeads([]);
                          }
                        }}
                        className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortBy('created_at');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                    >
                      <div className="flex items-center">
                        <span>Name</span>
                        {sortBy === 'created_at' && (
                          sortOrder === 'asc' ?
                            <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                            <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortBy('status');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                    >
                      <div className="flex items-center">
                        <span>Status</span>
                        {sortBy === 'status' && (
                          sortOrder === 'asc' ?
                            <ChevronUp className="w-4 h-4 ml-1 text-indigo-500" /> :
                            <ChevronDown className="w-4 h-4 ml-1 text-indigo-500" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-lg font-medium">No leads found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeads(prev => [...prev, lead.id]);
                              } else {
                                setSelectedLeads(prev => prev.filter(id => id !== lead.id));
                              }
                            }}
                            className="rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="font-semibold">{lead.first_name.charAt(0)}{lead.last_name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {lead.first_name} {lead.last_name}
                              </div>
                              {lead.company && (
                                <div className="text-sm text-gray-600">
                                  {lead.company}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center text-sm">
                              <Mail className="w-4 h-4 text-gray-400 mr-1.5" />
                              <a
                                href={`mailto:${lead.email}`}
                                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                {lead.email}
                              </a>
                            </div>
                            {lead.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="w-4 h-4 text-gray-400 mr-1.5" />
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                  {lead.phone}
                                </a>
                              </div>
                            )}
                            {lead.website && (
                              <div className="flex items-center text-sm">
                                <Globe className="w-4 h-4 text-gray-400 mr-1.5" />
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                  {lead.website.replace(/(^\w+:|^)\/\//, '')}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="text-sm font-medium rounded-full px-3 py-1.5 border-2 appearance-none cursor-pointer"
                            style={{
                              ...getStatusStyle(lead.status),
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.5em 1.5em',
                              paddingRight: '2.5rem'
                            }}
                          >
                            {leadStatuses.map(status => (
                              <option key={status.id} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lead.lead_source ? (
                            <div className="flex items-center">
                              <Flag className="w-4 h-4 text-blue-500 mr-1.5" />
                              <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                                {leadSources.find(s => s.value === lead.lead_source)?.label || lead.lead_source}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Not specified</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.owner_id || ''}
                            onChange={(e) => handleAssign(lead.id, e.target.value)}
                            className="w-full text-sm rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-200 transition-all duration-200"
                          >
                            <option value="">Unassigned</option>
                            {staff.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1.5" />
                            {new Date(lead.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link
                              to={`/admin/leads/${lead.id}`}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/leads/${lead.id}/edit`}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                              title="Edit lead"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {showDeleteConfirm === lead.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(lead.id)}
                                  className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                                  title="Confirm delete"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="p-1.5 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(lead.id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {sortedLeads.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{sortedLeads.length}</span> of <span className="font-medium text-gray-700">{leads.length}</span> leads
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-500" />
                  <span className="text-gray-700 font-medium">{leads.length} total leads</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-6">
            <KanbanBoard
              items={sortedLeads}
              statuses={leadStatuses}
              onStatusChange={handleStatusChange}
              renderCard={(lead) => (
                <LeadCard
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  statuses={leadStatuses}
                  staff={staff}
                  handleDelete={handleDelete}
                  handleAssign={handleAssign}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}