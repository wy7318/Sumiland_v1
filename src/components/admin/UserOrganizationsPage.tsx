import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Edit, Trash2, FileDown, Users, Building2,
  AlertCircle, X, Save, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type UserOrg = {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  user: {
    email: string;
    name: string;
  };
  organization: {
    name: string;
    type: string | null;
    status: string;
  };
};

type User = {
  id: string;
  email: string;
  name: string;
};

type Organization = {
  id: string;
  name: string;
  type: string | null;
  status: string;
};

export function UserOrganizationsPage() {
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    organization_id: '',
    role: 'member' as UserOrg['role']
  });
  const [userSearch, setUserSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof UserOrg | 'user.name' | 'organization.name';
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc'
  });

  const userSearchRef = useRef<HTMLDivElement>(null);
  const orgSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserOrgs();
    fetchUsers();
    fetchOrganizations();

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (orgSearchRef.current && !orgSearchRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (userSearch) {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.name.toLowerCase().includes(userSearch.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [userSearch, users]);

  useEffect(() => {
    if (orgSearch) {
      const filtered = organizations.filter(org => 
        org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
        org.type?.toLowerCase().includes(orgSearch.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs([]);
    }
  }, [orgSearch, organizations]);

  const fetchUserOrgs = async () => {
    try {
      setLoading(true);

      // Get user organization mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('user_organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (mappingsError) throw mappingsError;

      // Get profiles for these users
      const userIds = mappings?.map(m => m.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get organizations
      const orgIds = mappings?.map(m => m.organization_id) || [];
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, type, status')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      // Transform and combine data
      const transformedData = mappings?.map(mapping => {
        const profile = profiles?.find(p => p.id === mapping.user_id);
        const org = orgs?.find(o => o.id === mapping.organization_id);

        return {
          ...mapping,
          user: {
            email: profile?.id || '', // Using ID as email since we can't access auth.users
            name: profile?.name || 'Unknown User'
          },
          organization: org || {
            name: 'Unknown Organization',
            type: null,
            status: 'inactive'
          }
        };
      }) || [];

      setUserOrgs(transformedData);
    } catch (err) {
      console.error('Error fetching user organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) throw profilesError;

      const transformedUsers = profiles?.map(profile => ({
        id: profile.id,
        email: profile.id, // Using ID as email since we can't access auth.users
        name: profile.name
      })) || [];

      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, type, status')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.organization_id) {
      setError('Please select both a user and an organization');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (editingId) {
        const { error } = await supabase
          .from('user_organizations')
          .update({
            role: formData.role,
            updated_at: new Date().toISOString(),
            updated_by: userData.user.id
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_organizations')
          .insert([{
            user_id: formData.user_id,
            organization_id: formData.organization_id,
            role: formData.role,
            created_by: userData.user.id,
            updated_by: userData.user.id
          }]);

        if (error) throw error;
      }

      await fetchUserOrgs();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        user_id: '',
        organization_id: '',
        role: 'member'
      });
      setSelectedUser(null);
      setSelectedOrg(null);
    } catch (err) {
      console.error('Error saving user organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to save user organization');
    }
  };

  const handleEdit = (userOrg: UserOrg) => {
    setFormData({
      user_id: userOrg.user_id,
      organization_id: userOrg.organization_id,
      role: userOrg.role
    });
    setSelectedUser({
      id: userOrg.user_id,
      email: userOrg.user.email,
      name: userOrg.user.name
    });
    setSelectedOrg({
      id: userOrg.organization_id,
      name: userOrg.organization.name,
      type: userOrg.organization.type,
      status: userOrg.organization.status
    });
    setEditingId(userOrg.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this association?')) return;

    try {
      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchUserOrgs();
    } catch (err) {
      console.error('Error deleting user organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user organization');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'User Name',
      'User Email',
      'Organization',
      'Organization Type',
      'Role',
      'Created At',
      'Updated At'
    ].join(',');

    const csvData = userOrgs.map(userOrg => [
      userOrg.user.name,
      userOrg.user.email,
      userOrg.organization.name,
      userOrg.organization.type || '',
      userOrg.role,
      new Date(userOrg.created_at).toLocaleDateString(),
      new Date(userOrg.updated_at).toLocaleDateString()
    ].join(',')).join('\n');

    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-organizations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredUserOrgs = userOrgs.filter(userOrg => {
    const searchString = searchQuery.toLowerCase();
    return (
      userOrg.user.name.toLowerCase().includes(searchString) ||
      userOrg.user.email.toLowerCase().includes(searchString) ||
      userOrg.organization.name.toLowerCase().includes(searchString) ||
      userOrg.organization.type?.toLowerCase().includes(searchString) ||
      userOrg.role.toLowerCase().includes(searchString)
    );
  });

  const sortedUserOrgs = [...filteredUserOrgs].sort((a, b) => {
    let aValue: any = a;
    let bValue: any = b;

    // Handle nested properties
    if (sortConfig.key === 'user.name') {
      aValue = a.user.name;
      bValue = b.user.name;
    } else if (sortConfig.key === 'organization.name') {
      aValue = a.organization.name;
      bValue = b.organization.name;
    } else {
      aValue = a[sortConfig.key];
      bValue = b[sortConfig.key];
    }

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
        <h1 className="text-2xl font-bold">User & Organization Management</h1>
        <div className="flex gap-4">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                user_id: '',
                organization_id: '',
                role: 'member'
              });
              setSelectedUser(null);
              setSelectedOrg(null);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Association
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit Association' : 'New Association'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div ref={userSearchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User
                  </label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium">{selectedUser.name}</p>
                        <p className="text-sm text-gray-500">{selectedUser.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(null);
                          setFormData(prev => ({ ...prev, user_id: '' }));
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          setShowUserDropdown(true);
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {showUserDropdown && userSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                      >
                        {filteredUsers.length > 0 ? (
                          <ul className="py-1 max-h-60 overflow-auto">
                            {filteredUsers.map(user => (
                              <li
                                key={user.id}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setFormData(prev => ({ ...prev, user_id: user.id }));
                                  setShowUserDropdown(false);
                                  setUserSearch('');
                                }}
                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-gray-500">
                            No users found
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div ref={orgSearchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  {selectedOrg ? (
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium">{selectedOrg.name}</p>
                        {selectedOrg.type && (
                          <p className="text-sm text-gray-500">{selectedOrg.type}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrg(null);
                          setFormData(prev => ({ ...prev, organization_id: '' }));
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={orgSearch}
                        onChange={(e) => {
                          setOrgSearch(e.target.value);
                          setShowOrgDropdown(true);
                        }}
                        onFocus={() => setShowOrgDropdown(true)}
                        placeholder="Search organizations..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      />
                    </div>
                  )}

                  <AnimatePresence>
                    {showOrgDropdown && orgSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
                      >
                        {filteredOrgs.length > 0 ? (
                          <ul className="py-1 max-h-60 overflow-auto">
                            {filteredOrgs.map(org => (
                              <li
                                key={org.id}
                                onClick={() => {
                                  setSelectedOrg(org);
                                  setFormData(prev => ({ ...prev, organization_id: org.id }));
                                  setShowOrgDropdown(false);
                                  setOrgSearch('');
                                }}
                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="font-medium">{org.name}</div>
                                {org.type && (
                                  <div className="text-sm text-gray-500">{org.type}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="p-4 text-gray-500">
                            No organizations found
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      role: e.target.value as UserOrg['role']
                    }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search associations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => setSortConfig({
                    key: 'user.name',
                    direction: sortConfig.key === 'user.name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>User</span>
                    {sortConfig.key === 'user.name' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => setSortConfig({
                    key: 'organization.name',
                    direction: sortConfig.key === 'organization.name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1" />
                    <span>Organization</span>
                    {sortConfig.key === 'organization.name' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => setSortConfig({
                    key: 'updated_at',
                    direction: sortConfig.key === 'updated_at' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                  })}
                >
                  <div className="flex items-center">
                    <span>Last Modified</span>
                    {sortConfig.key === 'updated_at' && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUp className="w-4 h-4 ml-1" /> : 
                        <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUserOrgs.map((userOrg) => (
                <tr key={userOrg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {userOrg.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userOrg.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {userOrg.organization.name}
                        </div>
                        {userOrg.organization.type && (
                          <div className="text-sm text-gray-500">
                            {userOrg.organization.type}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      userOrg.role === 'owner' && "bg-purple-100 text-purple-800",
                      userOrg.role === 'admin' && "bg-blue-100 text-blue-800",
                      userOrg.role === 'member' && "bg-green-100 text-green-800"
                    )}>
                      {userOrg.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(userOrg.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(userOrg)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(userOrg.id)}
                        className="text-red-600 hover: text-red-900"
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