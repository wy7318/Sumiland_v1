import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, ChevronDown, ChevronUp, Edit, Trash2, 
  Shield, ShieldOff, Mail, AlertCircle, CheckCircle, 
  FileDown, UserCog, Clock, Calendar, User as UserIcon,
  RefreshCw, XCircle, CheckCircleIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getAllUsers, updateUserType, deleteUser } from '../../lib/admin';
import { UserDetailsModal } from './UserDetailsModal';

type User = {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string;
  profile: {
    name: string;
    role: string;
    type: string;
    is_super_admin: boolean;
    phone: string | null;
    created_at: string;
    updated_at: string;
  };
};

type SortField = 'name' | 'email' | 'role' | 'created_at' | 'last_sign_in_at';
type SortDirection = 'asc' | 'desc';

type UserModalData = {
  user: User;
  mode: 'view' | 'edit';
} | null;

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'created_at',
    direction: 'desc'
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [modalData, setModalData] = useState<UserModalData>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      if (!currentUser) {
        navigate('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', currentUser.id)
        .single();

      if (!profile?.is_super_admin) {
        navigate('/admin');
        return;
      }

      // Only fetch users if super admin check passes
      await fetchUsers();
    } catch (err) {
      console.error('Error checking super admin status:', err);
      navigate('/admin');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const users = await getAllUsers();
      setUsers(users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (userId: string, newType: 'admin' | 'user') => {
    try {
      setProcessingAction(userId);
      setError(null);

      await updateUserType(userId, newType);

      setSuccessMessage(`User type updated to ${newType}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user type:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user type');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingAction(userId);
      setError(null);

      await deleteUser(userId);

      setSuccessMessage('User deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedUsers.length) return;

    try {
      setProcessingAction('bulk');
      setError(null);

      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
          return;
        }

        for (const userId of selectedUsers) {
          await deleteUser(userId);
        }
      } else {
        for (const userId of selectedUsers) {
          await updateUserType(userId, action as 'admin' | 'user');
        }
      }

      setSuccessMessage(`Bulk action completed successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setSelectedUsers([]);
      await fetchUsers();
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
    } finally {
      setProcessingAction(null);
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setSuccessMessage('Password reset email sent');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error sending password reset:', err);
      setError(err instanceof Error ? err.message : 'Failed to send password reset');
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchString = searchTerm.toLowerCase();
      const matchesSearch = 
        user.profile.name.toLowerCase().includes(searchString) ||
        user.email.toLowerCase().includes(searchString) ||
        user.profile.role.toLowerCase().includes(searchString);

      const matchesType = typeFilter === 'all' || user.profile.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [users, searchTerm, typeFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;

      switch (sortConfig.field) {
        case 'name':
          aValue = a.profile.name;
          bValue = b.profile.name;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'role':
          aValue = a.profile.role;
          bValue = b.profile.role;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'last_sign_in_at':
          aValue = a.last_sign_in_at ? new Date(a.last_sign_in_at) : new Date(0);
          bValue = b.last_sign_in_at ? new Date(b.last_sign_in_at) : new Date(0);
          break;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedUsers.slice(start, end);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const calculateCompletionPercentage = (user: User) => {
    const fields = [
      user.profile.name,
      user.profile.phone,
      user.profile.role,
      user.profile.type
    ];
    const filledFields = fields.filter(field => field !== null && field !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

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
        <h1 className="text-2xl font-bold">User Management</h1>
        <UserCog className="w-8 h-8 text-primary-500" />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {successMessage}
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            >
              <option value="all">All Types</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>

            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => handleBulkAction(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="">Bulk Actions</option>
                  <option value="admin">Make Admin</option>
                  <option value="user">Make User</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <span className="text-sm text-gray-500">
                  {selectedUsers.length} selected
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
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    <span>User</span>
                    {sortConfig.field === 'name' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-1" />
                    <span>Role</span>
                    {sortConfig.field === 'role' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_sign_in_at')}
                >
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Last Login</span>
                    {sortConfig.field === 'last_sign_in_at' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Created</span>
                    {sortConfig.field === 'created_at' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(prev => [...prev, user.id]);
                        } else {
                          setSelectedUsers(prev => prev.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {user.profile.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.profile.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      user.profile.type === 'admin'
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {user.profile.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_sign_in_at ? (
                      new Date(user.last_sign_in_at).toLocaleDateString()
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500"
                          style={{ width: `${calculateCompletionPercentage(user)}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {calculateCompletionPercentage(user)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handlePasswordReset(user.email)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Send Password Reset"
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setModalData({ user, mode: 'view' })}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleTypeChange(
                          user.id,
                          user.profile.type === 'admin' ? 'user' : 'admin'
                        )}
                        disabled={processingAction === user.id}
                        className={cn(
                          "p-2 rounded-full",
                          user.profile.type === 'admin'
                            ? "text-purple-600 hover:bg-purple-50"
                            : "text-gray-400 hover:bg-gray-50",
                          processingAction === user.id && "opacity-50 cursor-not-allowed"
                        )}
                        title={user.profile.type === 'admin' ? "Remove Admin" : "Make Admin"}
                      >
                        {processingAction === user.id ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : user.profile.type === 'admin' ? (
                          <ShieldOff className="w-5 h-5" />
                        ) : (
                          <Shield className="w-5 h-5" />
                        )}
                      </button>
                      {!user.profile.is_super_admin && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={processingAction === user.id}
                          className={cn(
                            "text-red-600 hover:text-red-900",
                            processingAction === user.id && "opacity-50 cursor-not-allowed"
                          )}
                          title="Delete User"
                        >
                          {processingAction === user.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredUsers.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === totalPages || 
                      Math.abs(page - currentPage) <= 1
                    )
                    .map((page, index, array) => {
                      if (index > 0 && array[index - 1] !== page - 1) {
                        return [
                          <span key={`ellipsis-${page}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>,
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                              currentPage === page
                                ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            )}
                          >
                            {page}
                          </button>
                        ];
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "relative inline-flex items-center px-4 py -4 py-2 border text-sm font-medium",
                            currentPage === page
                              ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Last
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalData && (
          <UserDetailsModal
            user={modalData.user}
            mode={modalData.mode}
            onClose={() => setModalData(null)}
            onModeChange={(mode) => setModalData({ ...modalData, mode })}
            onSuccess={() => {
              setSuccessMessage('User updated successfully');
              setTimeout(() => setSuccessMessage(null), 3000);
              fetchUsers();
            }}
            onError={(error) => setError(error)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}