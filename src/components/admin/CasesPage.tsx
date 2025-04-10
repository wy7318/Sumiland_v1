import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Eye, AlertCircle, FileDown, LayoutGrid, LayoutList, User,
  Mail, Building2, Calendar, UserCheck, Check, X, Zap, Flag,
  MapPin, Globe, Phone, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { KanbanBoard, KanbanCard } from './KanbanBoard';
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
  // Additional fields
  escalated_at: string | null;
  closed_at: string | null;
  origin: string | null;
  closed_by: string | null;
  escalated_by: string | null;
  priority: string | null;
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

function CaseCard({ case_, onStatusChange, statuses, staff, handleDelete, handleAssign }: {
  case_: Case;
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
    <KanbanCard id={case_.id}>
      <div className="space-y-3 relative p-1">
        <div
          className="absolute top-0 right-0 p-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowActions(!showActions)}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold">
              {case_.contact ? `${case_.contact.first_name.charAt(0)}${case_.contact.last_name.charAt(0)}` : 'CA'}
            </span>
          </div>
          <h4 className="font-medium text-gray-900">
            {case_.title}
          </h4>
        </div>

        {case_.contact && (
          <>
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {case_.contact.first_name} {case_.contact.last_name}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{case_.contact.email}</span>
            </div>

            {case_.contact.company && (
              <div className="flex items-center text-sm text-gray-600">
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{case_.contact.company}</span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center text-sm text-gray-600 mt-1">
          <UserCheck className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
          {case_.owner ? (
            <span className="font-medium">{case_.owner.name}</span>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>

        {showActions && (
          <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={case_.status}
                onChange={(e) => onStatusChange(case_.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                style={getStatusStyle(case_.status)}
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
                value={case_.owner_id || ''}
                onChange={(e) => handleAssign(case_.id, e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                to={`/admin/cases/${case_.id}`}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                title="View details"
                onClick={e => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
              </Link>
              <Link
                to={`/admin/cases/${case_.id}/edit`}
                className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                title="Edit case"
                onClick={e => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(case_.id);
                }}
                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete case"
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

export function CasesPage() {
  const { organizations } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [caseTypes, setCaseTypes] = useState<PicklistValue[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<PicklistValue[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPicklists();
    fetchCases();
    fetchStaff();
  }, [selectedOrganization]);

  const fetchPicklists = async () => {
    try {
      // Fetch case types
      const { data: typeData, error: typeError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_type')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization.id)
        .order('display_order', { ascending: true });

      if (typeError) throw typeError;
      setCaseTypes(typeData || []);

      // Fetch case statuses
      const { data: statusData, error: statusError } = await supabase
        .from('picklist_values')
        .select('id, value, label, is_default, is_active, color, text_color')
        .eq('type', 'case_status')
        .eq('is_active', true)
        .eq('organization_id', selectedOrganization.id)
        .order('display_order', { ascending: true });

      if (statusError) throw statusError;
      setCaseStatuses(statusData || []);
    } catch (err) {
      console.error('Error fetching picklists:', err);
      setError('Failed to load picklist values');
    }
  };

  const fetchCases = async () => {
    try {
      setLoading(true);

      // First get all cases for user's organizations
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      // Then get customer details for these cases
      const customerIds = casesData
        ?.map(c => c.contact_id)
        .filter(id => id !== null) || []; // Filter out null values

      // Only query customers if there are valid customer IDs
      let customersData = [];
      if (customerIds.length > 0) {
        const { data, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .in('customer_id', customerIds);

        if (customersError) throw customersError;
        customersData = data || [];
      }

      // Get owner details
      const ownerIds = casesData
        ?.map(c => c.owner_id)
        .filter(id => id !== null) || []; // Filter out null values

      let ownersData = [];
      if (ownerIds.length > 0) {
        const { data, error: ownersError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', ownerIds);

        if (ownersError) throw ownersError;
        ownersData = data || [];
      }

      // Combine the data
      const casesWithDetails = casesData?.map(case_ => ({
        ...case_,
        contact: customersData?.find(c => c.customer_id === case_.contact_id) || null, // Handle null contact
        owner: ownersData?.find(o => o.id === case_.owner_id) || null, // Handle null owner
      })) || [];

      setCases(casesWithDetails);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cases');
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
        .eq('organization_id', selectedOrganization.id);

      if (orgUsersError) throw orgUsersError;

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', orgUsers?.map(ou => ou.user_id) || []);

      if (profilesError) throw profilesError;
      setStaff(profiles || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      // First, get the current case to check if it's already been escalated or closed
      const { data: currentCase, error: caseError } = await supabase
        .from('cases')
        .select('status, escalated_by, closed_by')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      // Get current user information
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Initialize updates object
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If changing to Escalated status and it hasn't been escalated before
      if (newStatus === 'Escalated' && !currentCase.escalated_by) {
        updates.escalated_at = new Date().toISOString();
        updates.escalated_by = userData.user.id;
      }

      // If changing to Closed status and it hasn't been closed before
      if (newStatus === 'Closed' && !currentCase.closed_by) {
        updates.closed_at = new Date().toISOString();
        updates.closed_by = userData.user.id;
      }

      const { error } = await supabase
        .from('cases')
        .update(updates)
        .eq('id', caseId);

      if (error) throw error;
      await fetchCases();
    } catch (err) {
      console.error('Error updating case status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update case status');
    }
  };

  const handleDelete = async (caseId: string) => {
    if (!window.confirm('Are you sure you want to delete this case?')) return;

    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;
      await fetchCases();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting case:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete case');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedCases.length) return;

    try {
      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedCases.length} cases?`)) {
          return;
        }

        const { error } = await supabase
          .from('cases')
          .delete()
          .in('id', selectedCases);

        if (error) throw error;
      } else {
        // Get current user information
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        // First, we need to get the current cases to check which ones have already been escalated/closed
        const { data: currentCases, error: casesError } = await supabase
          .from('cases')
          .select('id, status, escalated_by, closed_by')
          .in('id', selectedCases);

        if (casesError) throw casesError;

        // For escalated cases
        if (action === 'Escalated') {
          // Filter cases that haven't been escalated yet
          const casesToEscalate = currentCases
            .filter(c => !c.escalated_by)
            .map(c => c.id);

          if (casesToEscalate.length > 0) {
            // Update these cases with escalation info
            const { error } = await supabase
              .from('cases')
              .update({
                status: action,
                escalated_at: new Date().toISOString(),
                escalated_by: userData.user.id,
                updated_at: new Date().toISOString()
              })
              .in('id', casesToEscalate);

            if (error) throw error;
          }

          // Update remaining cases with just the status
          const remainingCases = currentCases
            .filter(c => c.escalated_by)
            .map(c => c.id);

          if (remainingCases.length > 0) {
            const { error } = await supabase
              .from('cases')
              .update({
                status: action,
                updated_at: new Date().toISOString()
              })
              .in('id', remainingCases);

            if (error) throw error;
          }
        }
        // For closed cases
        else if (action === 'Closed') {
          // Filter cases that haven't been closed yet
          const casesToClose = currentCases
            .filter(c => !c.closed_by)
            .map(c => c.id);

          if (casesToClose.length > 0) {
            // Update these cases with closure info
            const { error } = await supabase
              .from('cases')
              .update({
                status: action,
                closed_at: new Date().toISOString(),
                closed_by: userData.user.id,
                updated_at: new Date().toISOString()
              })
              .in('id', casesToClose);

            if (error) throw error;
          }

          // Update remaining cases with just the status
          const remainingCases = currentCases
            .filter(c => c.closed_by)
            .map(c => c.id);

          if (remainingCases.length > 0) {
            const { error } = await supabase
              .from('cases')
              .update({
                status: action,
                updated_at: new Date().toISOString()
              })
              .in('id', remainingCases);

            if (error) throw error;
          }
        }
        // For other status changes
        else {
          const { error } = await supabase
            .from('cases')
            .update({
              status: action,
              updated_at: new Date().toISOString()
            })
            .in('id', selectedCases);

          if (error) throw error;
        }
      }

      await fetchCases();
      setSelectedCases([]);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform action');
    }
  };

  const handleAssign = async (caseId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          owner_id: userId,
          status: caseStatuses.find(s => s.value === 'Assigned')?.value || 'Assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (error) throw error;
      await fetchCases();
    } catch (err) {
      console.error('Error assigning case:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign case');
    }
  };

  const filteredCases = cases.filter(case_ => {
    const matchesSearch =
      case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (case_.contact?.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      `${case_.contact?.first_name || ''} ${case_.contact?.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || case_.status === statusFilter;
    const matchesType = typeFilter === 'all' || case_.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

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

  // Get label for type and status
  const getTypeLabel = (typeValue: string) => {
    const type = caseTypes.find(t => t.value === typeValue);
    return type?.label || typeValue;
  };

  const getStatusLabel = (statusValue: string) => {
    const status = caseStatuses.find(s => s.value === statusValue);
    return status?.label || statusValue;
  };

  if (loading || !caseStatuses.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-teal-500 bg-clip-text text-transparent">
            Case Management
          </h1>
          <p className="text-gray-500 mt-1">Handle and monitor customer support cases</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300"
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
            to="/admin/cases/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-teal-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Case</span>
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
              <Filter className="w-5 h-5 text-blue-500" />
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
                  placeholder="Search cases by title, contact name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Status</option>
                    {caseStatuses.map(status => (
                      <option key={status.id} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm text-gray-600 mb-1.5 font-medium">Type Filter</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 bg-white"
                  >
                    <option value="all">All Types</option>
                    {caseTypes.map(type => (
                      <option key={type.id} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCases.length > 0 && viewMode === 'list' && (
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
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all duration-200 bg-white"
                      >
                        <option value="">Select Action</option>
                        <optgroup label="Change Status">
                          {caseStatuses.map(status => (
                            <option key={status.id} value={status.value}>
                              Set as {status.label}
                            </option>
                          ))}
                        </optgroup>
                        <option value="delete">Delete Selected</option>
                      </select>
                      <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-sm font-medium">
                        {selectedCases.length} selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cases Data */}
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
                        checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCases(filteredCases.map(c => c.id));
                          } else {
                            setSelectedCases([]);
                          }
                        }}
                        className="rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => {
                        setSortBy('title');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                    >
                      <div className="flex items-center">
                        <span>Title</span>
                        {sortBy === 'title' && (
                          sortOrder === 'asc' ?
                            <ChevronUp className="w-4 h-4 ml-1 text-blue-500" /> :
                            <ChevronDown className="w-4 h-4 ml-1 text-blue-500" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
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
                            <ChevronUp className="w-4 h-4 ml-1 text-blue-500" /> :
                            <ChevronDown className="w-4 h-4 ml-1 text-blue-500" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
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
                  {sortedCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-lg font-medium">No cases found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedCases.map((case_) => (
                      <tr key={case_.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCases.includes(case_.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCases(prev => [...prev, case_.id]);
                              } else {
                                setSelectedCases(prev => prev.filter(id => id !== case_.id));
                              }
                            }}
                            className="rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {case_.title}
                          </div>
                          {case_.sub_type && (
                            <div className="text-sm text-gray-600">
                              {case_.sub_type}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {case_.contact ? (
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="font-semibold">{case_.contact.first_name.charAt(0)}{case_.contact.last_name.charAt(0)}</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {case_.contact.first_name} {case_.contact.last_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {case_.contact.email}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">No contact information</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className="text-sm font-medium rounded-full px-3 py-1.5"
                            style={getTypeStyle(case_.type)}
                          >
                            {getTypeLabel(case_.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={case_.status}
                            onChange={(e) => handleStatusChange(case_.id, e.target.value)}
                            className="text-sm font-medium rounded-full px-3 py-1.5 border-2 appearance-none cursor-pointer"
                            style={{
                              ...getStatusStyle(case_.status),
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.5em 1.5em',
                              paddingRight: '2.5rem'
                            }}
                          >
                            {caseStatuses.map(status => (
                              <option key={status.id} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={case_.owner_id || ''}
                            onChange={(e) => handleAssign(case_.id, e.target.value)}
                            className="w-full text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
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
                            {new Date(case_.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link
                              to={`/admin/cases/${case_.id}`}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/admin/cases/${case_.id}/edit`}
                              className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                              title="Edit case"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {showDeleteConfirm === case_.id ? (
                              <>
                                <button
                                  onClick={() => handleDelete(case_.id)}
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
                                onClick={() => setShowDeleteConfirm(case_.id)}
                                className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                title="Delete case"
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

            {sortedCases.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{sortedCases.length}</span> of <span className="font-medium text-gray-700">{cases.length}</span> cases
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-700 font-medium">{cases.length} total cases</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-6">
            <KanbanBoard
              items={sortedCases}
              statuses={caseStatuses}
              onStatusChange={handleStatusChange}
              renderCard={(case_) => (
                <CaseCard
                  case_={case_}
                  onStatusChange={handleStatusChange}
                  statuses={caseStatuses}
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