import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, Package, Calendar, DollarSign, Building2, AlertCircle,
  FileDown, Send, User, Mail, Phone, LayoutGrid, LayoutList,
  UserCheck, Users, Check, X, Zap, Flag, MapPin, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn, formatCurrency } from '../../lib/utils';
import { KanbanBoard, KanbanCard } from './KanbanBoard';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
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
};

type KanbanOpportunity = Omit<Opportunity, 'stage'> & {
  status: string;
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

type SortConfig = {
  key: keyof Opportunity | 'owner.name';
  direction: 'asc' | 'desc';
};

function OpportunityCard({ opportunity, onStatusChange, statuses, handleDelete }: {
  opportunity: KanbanOpportunity;
  onStatusChange: (id: string, status: string) => void;
  statuses: PicklistValue[];
  handleDelete: (id: string) => void;
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
    <KanbanCard id={opportunity.id}>
      <div className="space-y-3 relative p-1">
        <div
          className="absolute top-0 right-0 p-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowActions(!showActions)}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold">
              {opportunity.name.charAt(0)}{opportunity.name.charAt(1)}
            </span>
          </div>
          <h4 className="font-medium text-gray-900">
            {opportunity.name}
          </h4>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <DollarSign className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{formatCurrency(opportunity.amount)}</span>
          <span className="ml-2">({opportunity.probability}%)</span>
        </div>

        {opportunity.contact && (
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {opportunity.contact.first_name} {opportunity.contact.last_name}
            </span>
          </div>
        )}

        {opportunity.account && (
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{opportunity.account.name}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-gray-600 mt-1">
          <UserCheck className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          {opportunity.owner ? (
            <span className="font-medium">{opportunity.owner.name}</span>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>

        {opportunity.expected_close_date && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
            <span>{new Date(opportunity.expected_close_date).toLocaleDateString()}</span>
          </div>
        )}

        {showActions && (
          <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
              <select
                value={opportunity.status}
                onChange={(e) => onStatusChange(opportunity.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                style={getStatusStyle(opportunity.status)}
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              <Link
                to={`/admin/opportunities/${opportunity.id}`}
                className="p-1.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                title="View details"
                onClick={e => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
              </Link>
              <Link
                to={`/admin/opportunities/${opportunity.id}/edit`}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                title="Edit opportunity"
                onClick={e => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(opportunity.id);
                }}
                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete opportunity"
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

export function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizations, user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'created_at',
    direction: 'desc'
  });
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);
  const [opportunityStages, setOpportunityStages] = useState<PicklistValue[]>([]);
  const [opportunityTypes, setOpportunityTypes] = useState<PicklistValue[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [orgTimezone, setOrgTimezone] = useState('UTC');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Add this effect to fetch the organization timezone
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
    fetchOpportunities();
  }, [selectedOrganization]);

  // Add this utility function for formatting dates
  const formatDate = (dateStr, format = DateTime.DATE_MED) => {
    if (!dateStr) return '';

    try {
      // Parse the date in the organization timezone
      const dt = DateTime.fromISO(dateStr, { zone: orgTimezone });

      if (!dt.isValid) {
        console.error('Invalid date:', dateStr);
        return 'Invalid date';
      }

      // Format as localized date string
      return dt.toLocaleString(format);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  // Add this utility function for formatting date-times
  const formatDateTime = (dateStr) => {
    return formatDate(dateStr, DateTime.DATETIME_MED);
  };

  const fetchPicklists = async () => {
    try {
      const { data: stageData, error: stageError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_stage')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (stageError) throw stageError;
      setOpportunityStages(stageData || []);

      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'opportunity_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization?.id)
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setOpportunityTypes(typeData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          account:vendors(*),
          contact:customers(*),
          owner:profiles!opportunities_owner_id_fkey(name)
        `)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (opportunityId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          stage: newStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', opportunityId);

      if (error) throw error;
      await fetchOpportunities();
    } catch (err) {
      console.error('Error updating opportunity stage:', err);
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const handleDelete = async (opportunityId: string) => {
    if (!window.confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId);

      if (error) throw error;
      await fetchOpportunities();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting opportunity:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete opportunity');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedOpportunities.length) return;

    try {
      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedOpportunities.length} opportunities?`)) {
          return;
        }

        const { error } = await supabase
          .from('opportunities')
          .delete()
          .in('id', selectedOpportunities);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('opportunities')
          .update({
            stage: action,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedOpportunities);

        if (error) throw error;
      }

      await fetchOpportunities();
      setSelectedOpportunities([]);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch =
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.account?.name.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      `${opp.contact?.first_name || ''} ${opp.contact?.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      // Add owner name to search
      (opp.owner?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesStage = stageFilter === 'all' || opp.stage === stageFilter;
    const matchesType = typeFilter === 'all' || opp.type === typeFilter;

    return matchesSearch && matchesStage && matchesType;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (sortConfig.key === 'owner.name') {
      const aValue = a.owner?.name || '';
      const bValue = b.owner?.name || '';
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * multiplier;
    } else {
      const aValue = a[sortConfig.key as keyof Opportunity];
      const bValue = b[sortConfig.key as keyof Opportunity];
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      return (aValue < bValue ? -1 : 1) * multiplier;
    }
  });

  const kanbanOpportunities: KanbanOpportunity[] = sortedOpportunities.map(opp => ({
    ...opp,
    status: opp.stage
  }));

  const getStageStyle = (stage: string) => {
    const stageValue = opportunityStages.find(s => s.value === stage);
    if (!stageValue?.color) return {};
    return {
      backgroundColor: stageValue.color,
      color: stageValue.text_color || '#FFFFFF'
    };
  };

  const getTypeStyle = (type: string | null) => {
    if (!type) return {};
    const typeValue = opportunityTypes.find(t => t.value === type);
    if (!typeValue?.color) return {};
    return {
      backgroundColor: typeValue.color,
      color: typeValue.text_color || '#FFFFFF'
    };
  };

  if (loading || !opportunityStages.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-indigo-500 bg-clip-text text-transparent">
            Opportunity Management
          </h1>
          <p className="text-gray-500 mt-1">Track and convert sales opportunities</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300"
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
            to="/admin/opportunities/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Opportunity</span>
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
              <Filter className="w-5 h-5 text-purple-500" />
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
                  placeholder="Search opportunities by name, account, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Stage Filter</label>
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Stages</option>
                    {opportunityStages.map(stage => (
                      <option key={stage.id} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Type Filter</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Types</option>
                    {opportunityTypes.map(type => (
                      <option key={type.id} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOpportunities.length > 0 && viewMode === 'list' && (
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
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select Action</option>
                        <optgroup label="Change Stage">
                          {opportunityStages.map(stage => (
                            <option key={stage.id} value={stage.value}>
                              Move to {stage.label}
                            </option>
                          ))}
                        </optgroup>
                        <option value="delete">Delete Selected</option>
                      </select>
                      <span className="rounded-full bg-purple-100 text-purple-800 px-3 py-1 text-sm font-medium">
                        {selectedOpportunities.length} selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opportunities Data */}
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
                        checked={selectedOpportunities.length === filteredOpportunities.length && filteredOpportunities.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOpportunities(filteredOpportunities.map(o => o.id));
                          } else {
                            setSelectedOpportunities([]);
                          }
                        }}
                        className="rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        if (sortConfig.key === 'owner.name') {
                          setSortConfig({
                            key: 'owner.name',
                            direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                          });
                        } else {
                          setSortConfig({
                            key: 'owner.name',
                            direction: 'asc'
                          });
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <span>Owner</span>
                        {sortConfig.key === 'owner.name' && (
                          sortConfig.direction === 'asc' ?
                            <ChevronUp className="w-4 h-4 ml-1 text-purple-500" /> :
                            <ChevronDown className="w-4 h-4 ml-1 text-purple-500" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Probability
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expected Close
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <DollarSign className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-lg font-medium">No opportunities found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedOpportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOpportunities.includes(opp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOpportunities(prev => [...prev, opp.id]);
                              } else {
                                setSelectedOpportunities(prev => prev.filter(id => id !== opp.id));
                              }
                            }}
                            className="rounded-md border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="font-semibold">{opp.name.charAt(0)}{opp.name.charAt(1)}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {opp.name}
                              </div>
                              {opp.type && (
                                <span
                                  className="mt-1 inline-flex text-xs leading-5 font-semibold rounded-full px-2.5 py-0.5"
                                  style={getTypeStyle(opp.type)}
                                >
                                  {opportunityTypes.find(t => t.value === opp.type)?.label || opp.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {opp.account ? (
                            <div className="flex items-center">
                              <Building2 className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {opp.account.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {opp.account.type}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">No account</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {opp.contact ? (
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <User className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                                <span className="font-medium">
                                  {opp.contact.first_name} {opp.contact.last_name}
                                </span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Mail className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                                <a
                                  href={`mailto:${opp.contact.email}`}
                                  className="text-purple-600 hover:text-purple-800 transition-colors"
                                >
                                  {opp.contact.email}
                                </a>
                              </div>
                              {opp.contact.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                                  <a
                                    href={`tel:${opp.contact.phone}`}
                                    className="text-purple-600 hover:text-purple-800 transition-colors"
                                  >
                                    {opp.contact.phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">No contact</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {opp.owner ? (
                            <div className="flex items-center text-sm">
                              <UserCheck className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                              <span className="font-medium">{opp.owner.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={opp.stage}
                            onChange={(e) => handleStageChange(opp.id, e.target.value)}
                            className="text-sm font-medium rounded-full px-3 py-1.5 border-2 appearance-none cursor-pointer"
                            style={{
                              ...getStageStyle(opp.stage),
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.5em 1.5em',
                              paddingRight: '2.5rem'
                            }}
                          >
                            {opportunityStages.map(stage => (
                              <option key={stage.id} value={stage.value}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(opp.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 inline-flex text-sm font-medium rounded-full bg-green-100 text-green-800">
                            {opp.probability}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
                            {opp.expected_close_date ? (
                              formatDate(opp.expected_close_date)
                            ) : (
                              <span className="text-gray-400 italic">Not set</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link
                              to={`/admin/opportunities/${opp.id}`}
                              className="p-1.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/opportunities/${opp.id}/edit`}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                              title="Edit opportunity"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {showDeleteConfirm === opp.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(opp.id)}
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
                                onClick={() => setShowDeleteConfirm(opp.id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete opportunity"
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

            {sortedOpportunities.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{sortedOpportunities.length}</span> of <span className="font-medium text-gray-700">{opportunities.length}</span> opportunities
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-500" />
                  <span className="text-gray-700 font-medium">{formatCurrency(sortedOpportunities.reduce((sum, opp) => sum + opp.amount, 0))} total value</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-6">
            <KanbanBoard
              items={kanbanOpportunities}
              statuses={opportunityStages}
              onStatusChange={handleStageChange}
              renderCard={(opportunity) => (
                <OpportunityCard
                  opportunity={opportunity as KanbanOpportunity}
                  onStatusChange={handleStageChange}
                  statuses={opportunityStages}
                  handleDelete={handleDelete}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}