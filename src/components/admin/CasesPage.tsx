import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, AlertCircle, CheckCircle, Clock, Calendar, User as UserIcon,
  RefreshCw, XCircle, CheckCircleIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

type Case = {
  id: string;
  title: string;
  type: string;
  sub_type: string | null;
  status: 'New' | 'Assigned' | 'In Progress' | 'Completed';
  contact_id: string;
  owner_id: string | null;
  description: string;
  resume_url: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
    phone: string | null;
  };
};

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Assigned': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800'
};

export function CasesPage() {
  const { organizations } = useAuth();
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

  useEffect(() => {
    fetchCases();
    fetchStaff();
  }, [organizations]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      
      // First get all cases for user's organizations
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .in('organization_id', organizations.map(org => org.id))
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      // Then get customer details for these cases
      const customerIds = casesData?.map(c => c.contact_id) || [];
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .in('customer_id', customerIds);

      if (customersError) throw customersError;

      // Combine the data
      const casesWithCustomers = casesData?.map(case_ => ({
        ...case_,
        contact: customersData?.find(c => c.customer_id === case_.contact_id)
      })) || [];

      setCases(casesWithCustomers);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Get user IDs from user_organizations for the current user's organizations
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('user_id')
        .in('organization_id', organizations.map(org => org.id));

      if (userOrgsError) throw userOrgsError;

      // Get profiles for these users
      const userIds = userOrgs?.map(uo => uo.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      setStaff(profiles || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleStatusChange = async (caseId: string, newStatus: Case['status']) => {
    try {
      const caseToUpdate = cases.find(c => c.id === caseId);
      if (!caseToUpdate) return;

      // Verify organization access
      if (!organizations.some(org => org.id === caseToUpdate.organization_id)) {
        throw new Error('You do not have permission to update this case');
      }

      const { error } = await supabase
        .from('cases')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('organization_id', caseToUpdate.organization_id);

      if (error) throw error;
      await fetchCases();
    } catch (err) {
      console.error('Error updating case status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update case status');
    }
  };

  const handleDelete = async (caseId: string) => {
    try {
      const caseToDelete = cases.find(c => c.id === caseId);
      if (!caseToDelete) return;

      // Verify organization access
      if (!organizations.some(org => org.id === caseToDelete.organization_id)) {
        throw new Error('You do not have permission to delete this case');
      }

      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId)
        .eq('organization_id', caseToDelete.organization_id);

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
      // Get cases to update
      const casesToUpdate = cases.filter(c => selectedCases.includes(c.id));
      
      // Verify organization access for all selected cases
      const hasAccess = casesToUpdate.every(c => 
        organizations.some(org => org.id === c.organization_id)
      );

      if (!hasAccess) {
        throw new Error('You do not have permission to update some of these cases');
      }

      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete the selected cases?')) return;
        
        const { error } = await supabase
          .from('cases')
          .delete()
          .in('id', selectedCases)
          .in('organization_id', organizations.map(org => org.id));

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cases')
          .update({ 
            status: action,
            updated_at: new Date().toISOString()
          })
          .in('id', selectedCases)
          .in('organization_id', organizations.map(org => org.id));

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
          status: 'Assigned',
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
      case_.contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${case_.contact.first_name} ${case_.contact.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());

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

  if (loading) {
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
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Types</option>
              <option value="Design Inquiry">Design Inquiry</option>
              <option value="Career">Career</option>
              <option value="Other">Other</option>
            </select>

            {selectedCases.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleBulkAction(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Bulk Actions</option>
                  <option value="Assigned">Mark as Assigned</option>
                  <option value="In Progress">Mark as In Progress</option>
                  <option value="Completed">Mark as Completed</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <span className="text-sm text-gray-500">
                  {selectedCases.length} selected
                </span>
              </div>
            )}
          </div>
        </div>

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
                    <div className="text-sm font-medium text-gray-900">
                      {case_.contact.first_name} {case_.contact.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {case_.contact.company}
                    </div>
                    <div className="text-sm text-gray-500">
                      {case_.contact.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 text-primary-800">
                      {case_.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={case_.status}
                      onChange={(e) => handleStatusChange(case_.id, e.target.value as Case['status'])}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        STATUS_COLORS[case_.status]
                      )}
                    >
                      <option value="New">New</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
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
      </div>
    </div>
  );
}