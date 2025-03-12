import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, UserCheck, Calendar, Mail, Building2, AlertCircle,
  FileDown, Send, Phone, Globe, User, LayoutGrid, LayoutList
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

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <KanbanCard id={lead.id}>
      <div className="space-y-2">
        <h4 className="font-medium">
          {lead.first_name} {lead.last_name}
        </h4>

        <div className="flex items-center text-sm text-gray-500">
          <Mail className="w-4 h-4 mr-1" />
          {lead.email}
        </div>

        {lead.company && (
          <div className="flex items-center text-sm text-gray-500">
            <Building2 className="w-4 h-4 mr-1" />
            {lead.company}
          </div>
        )}

        {lead.owner ? (
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            {lead.owner.name}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Unassigned</div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Link
            to={`/admin/leads/${lead.id}`}
            className="text-primary-600 hover:text-primary-900"
            onClick={e => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/leads/${lead.id}/edit`}
            className="text-blue-600 hover:text-blue-900"
            onClick={e => e.stopPropagation()}
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
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

  useEffect(() => {
    fetchPicklists();
    fetchLeads();
    fetchStaff();
  }, [organizations]);

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
      console.log(selectedOrganization?.id);
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
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedLeads.length) return;

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
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {viewMode === 'list' ? (
              <>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban View
              </>
            ) : (
              <>
                <LayoutList className="w-4 h-4 mr-2" />
                List View
              </>
            )}
          </button>
          <Link
            to="/admin/leads/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Status</option>
              {leadStatuses.map(status => (
                <option key={status.id} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Sources</option>
              {leadSources.map(source => (
                <option key={source.id} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>

            {selectedLeads.length > 0 && viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleBulkAction(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Bulk Actions</option>
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
                <span className="text-sm text-gray-500">
                  {selectedLeads.length} selected
                </span>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads(filteredLeads.map(l => l.id));
                        } else {
                          setSelectedLeads([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </div>
                      {lead.company && (
                        <div className="text-sm text-gray-500">
                          {lead.company}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 text-gray-400 mr-1" />
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {lead.email}
                          </a>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 text-gray-400 mr-1" />
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              {lead.phone}
                            </a>
                          </div>
                        )}
                        {lead.website && (
                          <div className="flex items-center text-sm">
                            <Globe className="w-4 h-4 text-gray-400 mr-1" />
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="text-sm font-medium rounded-full px-3 py-1"
                        style={getStatusStyle(lead.status)}
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
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {leadSources.find(s => s.value === lead.lead_source)?.label || lead.lead_source}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.owner_id || ''}
                        onChange={(e) => handleAssign(lead.id, e.target.value)}
                        className="text-sm rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/leads/${lead.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          to={`/admin/leads/${lead.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <KanbanBoard
            items={sortedLeads}
            statuses={leadStatuses}
            onStatusChange={handleStatusChange}
            renderCard={(lead) => <LeadCard lead={lead} />}
          />
        )}
      </div>
    </div>
  );
}