import { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, RefreshCw, CheckCircle as CheckCircleIcon } from 'lucide-react';
import { updateUserProfile } from '../../lib/admin';

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

type UserModalProps = {
  user: User;
  mode: 'view' | 'edit';
  onClose: () => void;
  onModeChange: (mode: 'view' | 'edit') => void;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function UserDetailsModal({ 
  user: initialUser, 
  mode, 
  onClose, 
  onModeChange,
  onSuccess,
  onError
}: UserModalProps) {
  const [user, setUser] = useState(initialUser);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

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

  const handleSave = async () => {
    try {
      setProcessingAction('save');
      
      await updateUserProfile(user.id, {
        name: user.profile.name,
        phone: user.profile.phone,
        role: user.profile.role,
        type: user.profile.type
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating user:', err);
      onError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {mode === 'view' ? 'User Details' : 'Edit User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={user.profile.name}
                  readOnly={mode === 'view'}
                  onChange={(e) => {
                    if (mode === 'edit') {
                      setUser({
                        ...user,
                        profile: {
                          ...user.profile,
                          name: e.target.value
                        }
                      });
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={user.profile.phone || ''}
                  readOnly={mode === 'view'}
                  onChange={(e) => {
                    if (mode === 'edit') {
                      setUser({
                        ...user,
                        profile: {
                          ...user.profile,
                          phone: e.target.value
                        }
                      });
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={user.profile.role}
                  disabled={mode === 'view'}
                  onChange={(e) => {
                    if (mode === 'edit') {
                      setUser({
                        ...user,
                        profile: {
                          ...user.profile,
                          role: e.target.value
                        }
                      });
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="user">User</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Account Status</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-gray-700">Last Login</span>
                  <p className="text-sm text-gray-500">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Created</span>
                  <p className="text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Profile Status</span>
                  <p className="text-sm text-gray-500">
                    {calculateCompletionPercentage(user)}% Complete
                  </p>
                </div>
              </div>
            </div>
          </div>

          {mode === 'view' ? (
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => onModeChange('edit')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Edit User
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleSave}
                disabled={processingAction === 'save'}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
              >
                {processingAction === 'save' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={() => onModeChange('view')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}