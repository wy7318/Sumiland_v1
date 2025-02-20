import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, UserCog, Shield, ShieldOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type Profile = {
  id: string;
  email: string;
  name: string;
  role: string;
  type: string;
  is_super_admin: boolean;
  created_at: string;
};

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkSuperAdmin();
    fetchUsers();
  }, []);

  const checkSuperAdmin = async () => {
    if (!currentUser) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', currentUser.id)
      .single();

    if (!profile?.is_super_admin) {
      navigate('/admin');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch emails from auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Combine profile and auth data
      const usersWithEmail = profiles?.map(profile => {
        const authUser = authUsers.users.find(u => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || 'N/A'
        };
      }) || [];

      setUsers(usersWithEmail);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentType: string) => {
    try {
      const newType = currentType === 'admin' ? 'user' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ type: newType })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <UserCog className="w-8 h-8 text-primary-500" />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.type === 'admin' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {!user.is_super_admin && (
                    <>
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.type)}
                        className={`p-2 rounded-full ${
                          user.type === 'admin'
                            ? 'text-purple-600 hover:bg-purple-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {user.type === 'admin' ? (
                          <ShieldOff className="w-5 h-5" />
                        ) : (
                          <Shield className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}