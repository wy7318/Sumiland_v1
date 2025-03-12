import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, AlertCircle, FileDown, LayoutGrid, LayoutList, User,
  Mail, Building2
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
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    company: string | null;
  } | null; // Make contact optional
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

function CaseCard({ case_ }: { case_: Case }) {
  return (
    <KanbanCard id={case_.id}>
      <div className="space-y-2">
        <h4 className="font-medium">{case_.title}</h4>
        
        {case_.contact ? (
          <>
            <div className="flex items-center text-sm text-gray-500">
              <User className="w-4 h-4 mr-1" />
              {case_.contact.first_name} {case_.contact.last_name}
            </div>

            <div className="flex items-center text-sm text-gray-500">
              <Mail className="w-4 h-4 mr-1" />
              {case_.contact.email}
            </div>

            {case_.contact.company && (
              <div className="flex items-center text-sm text-gray-500">
                <Building2 className="w-4 h-4 mr-1" />
                {case_.contact.company}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400">No contact information</div>
        )}

        {case_.owner ? (
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            {case_.owner.name}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Unassigned</div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Link
            to={`/admin/cases/${case_.id}`}
            className="text-primary-600 hover:text-primary-900"
            onClick={e => e.stopPropagation()}
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/cases/${case_.id}/edit`}
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

export function CasesPage() {
  const { organizations } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const { selectedOrganization } = useOrganization();
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
  
      console.log('customerIds:', customerIds);
  
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
    console.log('organizations: ' + organizations);
    console.log('selectedOrganization : ' + selectedOrganization.id);
    try {
      // if (!organizations.length) return;

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
      const { error } = await supabase
        .from('cases')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
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
        const { error } = await supabase
          .from('cases')
          .update({ 
            status: action,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedCases);

        if (error) throw error;
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
      (case_.contact?.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || // Handle null contact
      `${case_.contact?.first_name || ''} ${case_.contact?.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()); // Handle null contact
  
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Case Management</h1>
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
            to="/admin/cases/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Case
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
                  placeholder="Search cases..."
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
              {caseStatuses.map(status => (
                <option key={status.id} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Types</option>
              {caseTypes.map(type => (
                <option key={type.id} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {selectedCases.length > 0 && viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleBulkAction(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Bulk Actions</option>
                  {caseStatuses.map(status => (
                    <option key={status.id} value={status.value}>
                      Mark as {status.label}
                    </option>
                  ))}
                  <option value="delete">Delete Selected</option>
                </select>
                <span className="text-sm text-gray-500">
                  {selectedCases.length} selected
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
                      checked={selectedCases.length === filteredCases.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCases(filteredCases.map(c => c.id));
                        } else {
                          setSelectedCases([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
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
                {sortedCases.map((case_) => (
                  <tr key={case_.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {case_.title}
                      </div>
                      {case_.sub_type && (
                        <div className="text-sm text-gray-500">
                          {case_.sub_type}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {case_.contact ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {case_.contact.first_name} {case_.contact.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {case_.contact.email}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">No contact information</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        style={getTypeStyle(case_.type)}
                      >
                        {getTypeLabel(case_.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={case_.status}
                        onChange={(e) => handleStatusChange(case_.id, e.target.value)}
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={getStatusStyle(case_.status)}
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
                      {new Date(case_.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/admin/cases/${case_.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          to={`/admin/cases/${case_.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(case_.id)}
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
            items={sortedCases}
            statuses={caseStatuses}
            onStatusChange={handleStatusChange}
            renderCard={(case_) => <CaseCard case_={case_} />}
          />
        )}
      </div>
    </div>
  );
}