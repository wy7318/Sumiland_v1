import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Profile = {
  id: string;
  name: string;
  role: string;
  type: string;
};

interface Props {
  organizationId: string;
  selectedUserId?: string | null;
  onSelect: (userId: string | null) => void;
  className?: string;
}

export function UserSearch({ organizationId, selectedUserId, onSelect, className }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch users when component mounts or organizationId changes
  useEffect(() => {
    if (organizationId) {
      fetchUsers();
    }
  }, [organizationId]);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchSelectedUser(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim()) {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users); // Show all users when no search query
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // First get all user-organization mappings for this organization
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          role
        `)
        .eq('organization_id', organizationId);

      if (userOrgsError) throw userOrgsError;

      if (!userOrgs?.length) {
        setUsers([]);
        return;
      }

      // Then get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, role, type')
        .in('id', userOrgs.map(uo => uo.user_id));

      if (profilesError) throw profilesError;

      // Combine profile data with organization role
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: userOrgs.find(uo => uo.user_id === profile.id)?.role || profile.role
      })) || [];

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedUser = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, role, type')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (profile) {
        setSelectedUser(profile);
      }
    } catch (err) {
      console.error('Error fetching selected user:', err);
    }
  };

  const handleUserSelect = (user: Profile) => {
    setSelectedUser(user);
    onSelect(user.id);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Assigned To
      </label>
      {selectedUser ? (
        <div className="flex items-center justify-between p-2 border rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-700 font-medium">
                {selectedUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="font-medium">{selectedUser.name}</p>
              <p className="text-sm text-gray-500">{selectedUser.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              onSelect(null);
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
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>
      )}

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200"
          >
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading...
              </div>
            ) : filteredUsers.length > 0 ? (
              <ul className="py-1 max-h-60 overflow-auto">
                {filteredUsers.map(user => (
                  <li
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.role}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No users found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}