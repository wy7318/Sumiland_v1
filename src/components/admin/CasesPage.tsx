import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Eye, AlertCircle, CheckCircle, Clock, RefreshCw, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

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
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    company: string | null;
  };
  owner: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
    };
  } | null;
};

type SortConfig = {
  key: keyof Case;
  direction: 'asc' | 'desc';
};

type FilterState = {
  status: string[];
  type: string[];
};

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800',
  'Assigned': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800'
};

const STATUS_ICONS = {
  'New': Eye,
  'Assigned': UserCheck,
  'In Progress': RefreshCw,
  'Completed': CheckCircle
};

export function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    type: []
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'created_at',
    direction: 'desc'
  });
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    fetchCases();
    fetchStaff();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          contact:customers(
            first_name,
            last_name,
            email,
            company
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('type', ['admin', 'user']);

      if (error) throw error;
      setStaff(profiles || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleSort = (key: keyof Case) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedCases.length) return;

    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete the selected cases?')) return;
        
        const { error } = await supabase
          .from('cases')
          .delete()
          .in('id', selectedCases);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cases')
          .update({ status: action })
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

    const matchesStatus = filters.status.length === 0 || filters.status.includes(case_.status);
    const matchesType = filters.type.length === 0 || filters.type.includes(case_.type);

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedCases = [...filteredCases].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 space-y-4">
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

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </button>

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

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pt-4 border-t border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {['New', 'Assigned', 'In Progress', 'Completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleFilter('status', status)}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          filters.status.includes(status)
                            ? STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Design Inquiry', 'Career', 'Other'].map((type) => (
                      <button
                        key={type}
                        onClick={() => toggleFilter('type', type)}
                        className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          filters.type.includes(type)
                            ? "bg-primary-100 text-primary-800"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
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
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center">
                    <span>Title</span>
                    {sortConfig.key === 'title' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
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
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    <span>Created</span>
                    {sortConfig.key === 'created_at' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCases.map((case_) => {
                const StatusIcon = STATUS_ICONS[case_.status];
                return (
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
                      <span className={cn(
                        "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                        STATUS_COLORS[case_.status]
                      )}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {case_.status}
                      </span>
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
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this case?')) {
                              handleBulkAction('delete');
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}