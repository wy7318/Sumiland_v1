import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronDown, ChevronUp, Edit, Trash2,
  Shield, ShieldOff, Mail, AlertCircle, CheckCircle,
  FileDown, UserCog, Clock, Calendar, UserPlus,
  RefreshCw, XCircle, X, Check, Users, User as UserIcon,
  Crown, Star
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getAllUsers, updateUserType, deleteUser } from '../../lib/admin';
import { UserDetailsModal } from './UserDetailsModal';
import { CreateUserModal } from './CreateUserModal';

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
  organizationRole?: string;
};

type SortField = 'name' | 'email' | 'role' | 'created_at' | 'last_sign_in_at' | 'organizationRole';
type SortDirection = 'asc' | 'desc';

type UserModalData = {
  user: User;
  mode: 'view' | 'edit';
} | null;

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'owner' | 'member'>('all');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'created_at',
    direction: 'desc'
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [modalData, setModalData] = useState<UserModalData>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [organizationLicense, setOrganizationLicense] = useState<number>(0);
  const [userCount, setUserCount] = useState<number>(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sendingPasswordReset, setSendingPasswordReset] = useState<string | null>(null);

  useEffect(() => {
    checkUserPermissions();
  }, [currentUser, selectedOrganization]);

  const checkUserPermissions = async () => {
    try {
      if (!currentUser || !selectedOrganization?.id) {
        navigate('/');
        return;
      }

      // Check if user has admin or owner role in the organization
      const { data: userOrg, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', currentUser.id)
        .eq('organization_id', selectedOrganization.id)
        .single();

      if (userOrgError || !userOrg || (userOrg.role !== 'admin' && userOrg.role !== 'owner')) {
        navigate('/admin');
        return;
      }

      // Fetch organization license limit
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('license_limit')
        .eq('id', selectedOrganization.id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setError(orgError.message);
        return;
      }

      setOrganizationLicense(org?.license_limit || 0);

      // Only fetch users if permission check passes
      await fetchUsers();
    } catch (err) {
      console.error('Error checking user permissions:', err);
      navigate('/admin');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedOrganization?.id) return;

      // Get all users through the admin helper function
      const allUsers = await getAllUsers();

      // Get all users in this organization
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('user_id, role')
        .eq('organization_id', selectedOrganization.id);

      if (userOrgsError) throw userOrgsError;

      setUserCount(userOrgs?.length || 0);

      if (!userOrgs?.length || !allUsers?.length) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Filter and combine the data
      const usersWithRoles = allUsers
        .filter(user => userOrgs.some(uo => uo.user_id === user.id))
        .map(user => {
          const orgUser = userOrgs.find(uo => uo.user_id === user.id);
          return {
            ...user,
            organizationRole: orgUser?.role || 'member'
          };
        });

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'owner' | 'member') => {
    try {
      setProcessingAction(userId);
      setError(null);

      const { error } = await supabase
        .from('user_organizations')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', selectedOrganization.id);

      if (error) throw error;

      setSuccessMessage(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Update local state
      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, organizationRole: newRole }
          : user
      ));
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      setProcessingAction(userId);
      setError(null);
      setConfirmDelete(null);

      // Delete user using the admin helper function
      await deleteUser(userId);

      // Also delete from user_organizations table (may not be handled by the deleteUser function)
      const { error: orgError } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', selectedOrganization.id);

      if (orgError) throw orgError;

      setSuccessMessage('User deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      setUserCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setProcessingAction(null);
    }
  };

  const handlePasswordReset = async (email: string, userId: string) => {
    try {
      setSendingPasswordReset(userId);
      setError(null);

      if (!email) {
        setError('Email address is required');
        return;
      }

      console.log(`Sending password reset to: ${email}`);
      console.log(`Redirect URL: ${window.location.origin}/reset-password`);

      // Use the exact same method as the ForgotPassword component
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        setError(`Failed to send password reset email: ${error.message}`);
        return;
      }

      console.log(`Password reset email sent successfully to ${email}`);
      setSuccessMessage(`Password reset link sent to ${email}. Please ask the user to check their email (including spam folder).`);
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err) {
      console.error('Error sending password reset:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setSendingPasswordReset(null);
    }
  };

  // Add this new helper function after handlePasswordReset:
  const handlePasswordResetWithConfirmation = async (email: string, userName: string, userId: string) => {
    // Add a confirmation dialog for admin-initiated password resets
    const confirmed = window.confirm(
      `Send password reset email to ${userName} (${email})?\n\n` +
      `This will allow them to set a new password without knowing their current password.`
    );

    if (confirmed) {
      await handlePasswordReset(email, userId);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!selectedUsers.length) return;

    try {
      setProcessingAction('bulk');
      setError(null);

      if (action === 'delete') {
        for (const userId of selectedUsers) {
          // Skip if user is being processed in another action
          if (processingAction === userId) continue;

          // Delete from user_organizations first
          await supabase
            .from('user_organizations')
            .delete()
            .eq('user_id', userId)
            .eq('organization_id', selectedOrganization.id);

          // Delete from profiles (will cascade to auth.users)
          await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        }

        // Update local state
        setUsers(users.filter(user => !selectedUsers.includes(user.id)));
        setUserCount(prev => Math.max(0, prev - selectedUsers.length));
      } else {
        // Update roles
        for (const userId of selectedUsers) {
          // Skip if user is being processed in another action
          if (processingAction === userId) continue;

          await supabase
            .from('user_organizations')
            .update({ role: action })
            .eq('user_id', userId)
            .eq('organization_id', selectedOrganization.id);
        }

        // Update local state
        setUsers(users.map(user =>
          selectedUsers.includes(user.id)
            ? { ...user, organizationRole: action }
            : user
        ));
      }

      setSuccessMessage(`Bulk action completed successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);

      setSelectedUsers([]);
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
    } finally {
      setProcessingAction(null);
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

      const matchesRole = roleFilter === 'all' || user.organizationRole === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

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
        case 'organizationRole':
          aValue = a.organizationRole;
          bValue = b.organizationRole;
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner':
        return "bg-amber-100 text-amber-800";
      case 'admin':
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-violet-500 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-gray-500 mt-1">Manage users and their roles in your organization</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex flex-col items-center mr-3 pr-3 border-r border-gray-200">
              <span className="text-xs text-gray-500">License</span>
              <span className="text-lg font-semibold text-primary-600">
                {userCount}/{organizationLicense || '∞'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500">Users</span>
              <span className="text-lg font-semibold text-gray-700">{userCount}</span>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            disabled={organizationLicense > 0 && userCount >= organizationLicense}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm font-medium transition-all",
              organizationLicense > 0 && userCount >= organizationLicense
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-primary-500 to-violet-500 text-white hover:shadow-md"
            )}
          >
            <UserPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center border border-red-100 shadow-sm">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center border border-green-100 shadow-sm"
        >
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                className="px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owners</option>
                <option value="admin">Admins</option>
                <option value="member">Members</option>
              </select>

              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        if (e.target.value === 'delete') {
                          if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
                            handleBulkAction(e.target.value);
                          }
                        } else {
                          handleBulkAction(e.target.value);
                        }
                        e.target.value = '';
                      }
                    }}
                    className="px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                    disabled={processingAction === 'bulk'}
                  >
                    <option value="">Bulk Actions</option>
                    <option value="admin">Make Admin</option>
                    <option value="member">Make Member</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                  <span className="text-sm font-medium px-3 py-1 bg-primary-50 text-primary-600 rounded-lg">
                    {selectedUsers.length} selected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(paginatedUsers.map(u => u.id));
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
                  onClick={() => handleSort('organizationRole')}
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>Org Role</span>
                    {sortConfig.field === 'organizationRole' && (
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
                  Profile Completion
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-600 mb-1">No users found</p>
                    <p className="text-sm text-gray-500">Try adjusting your filters or add a new user</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
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
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white">
                            <span className="font-medium">
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
                        "px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 w-fit",
                        getRoleBadgeClass(user.organizationRole || 'member')
                      )}>
                        {getRoleIcon(user.organizationRole || 'member')}
                        <span className="capitalize">{user.organizationRole || 'Member'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_sign_in_at ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {new Date(user.last_sign_in_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <XCircle className="w-4 h-4" />
                          Never
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              calculateCompletionPercentage(user) < 50
                                ? "bg-red-500"
                                : calculateCompletionPercentage(user) < 80
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            )}
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
                        {/* <button
                          onClick={() => handlePasswordResetWithConfirmation(user.email, user.profile.name, user.id)}
                          disabled={sendingPasswordReset === user.id}
                          className={cn(
                            "p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors",
                            sendingPasswordReset === user.id && "opacity-50 cursor-not-allowed"
                          )}
                          title="Send Password Reset"
                        >
                          {sendingPasswordReset === user.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Mail className="w-5 h-5" />
                          )}
                        </button> */}
                        <button
                          onClick={() => setModalData({ user, mode: 'view' })}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="View Details"
                        >
                          <Edit className="w-5 h-5" />
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => {
                              const currentRole = user.organizationRole || 'member';
                              const newRole = getNextRole(currentRole);
                              handleRoleChange(user.id, newRole as 'admin' | 'owner' | 'member');
                            }}
                            disabled={processingAction === user.id}
                            className={cn(
                              "p-2 rounded-full transition-colors",
                              getRoleButtonClass(user.organizationRole || 'member'),
                              processingAction === user.id && "opacity-50 cursor-not-allowed"
                            )}
                            title={`Change role (currently ${user.organizationRole || 'member'})`}
                          >
                            {processingAction === user.id ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              getRoleIcon(user.organizationRole || 'member')
                            )}
                          </button>
                        </div>

                        <div className="relative">
                          {confirmDelete === user.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                title="Confirm delete"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
                                title="Cancel"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(user.id)}
                              disabled={processingAction === user.id}
                              className={cn(
                                "p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors",
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium text-gray-700">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-gray-700">
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-gray-700">{filteredUsers.length}</span>{' '}
              users
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
                    // Add ellipsis
                    const elements = [];
                    if (index > 0 && array[index - 1] !== page - 1) {
                      elements.push(
                        <span
                          key={`ellipsis-${page}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      );
                    }

                    elements.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors",
                          currentPage === page
                            ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        {page}
                      </button>
                    );

                    return elements;
                  })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Last
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalData && (
          <UserDetailsModal
            user={modalData.user}
            mode={modalData.mode}
            organizationRole={modalData.user.organizationRole || 'member'}
            onRoleChange={(newRole) => handleRoleChange(modalData.user.id, newRole as 'admin' | 'owner' | 'member')}
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

        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setSuccessMessage('User created successfully');
              setTimeout(() => setSuccessMessage(null), 3000);
              fetchUsers();
            }}
            onError={(error) => setError(error)}
            organizationId={selectedOrganization?.id || ''}
            remainingLicenses={organizationLicense > 0 ? organizationLicense - userCount : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper functions
function getNextRole(currentRole: string): string {
  switch (currentRole) {
    case 'member': return 'admin';
    case 'admin': return 'owner';
    case 'owner': return 'member';
    default: return 'member';
  }
}

function getRoleButtonClass(role: string): string {
  switch (role) {
    case 'owner':
      return "text-amber-600 hover:bg-amber-50";
    case 'admin':
      return "text-purple-600 hover:bg-purple-50";
    default:
      return "text-blue-600 hover:bg-blue-50";
  }
}