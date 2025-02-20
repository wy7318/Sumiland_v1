import { useState, useRef, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, Plus, X, Check } from 'lucide-react';
import { signUp } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Organization = {
  id: string;
  name: string;
  status: string;
};

export function SignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [validatingOrg, setValidatingOrg] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<Organization[]>([]);
  const [orgError, setOrgError] = useState<string | null>(null);
  const orgInputRef = useRef<HTMLInputElement>(null);

  const validateOrgId = async (id: string) => {
    setValidatingOrg(true);
    setOrgError(null);

    try {
      // Check if organization already selected
      if (selectedOrgs.some(org => org.id === id)) {
        setOrgError('Organization already added');
        return false;
      }

      // Check if organization exists and is active
      const { data: org, error } = await supabase
        .from('organizations')
        .select('id, name, status')
        .eq('id', id)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      
      if (!org) {
        setOrgError('Invalid organization ID. Please contact admin.');
        return false;
      }

      // Add to selected organizations
      setSelectedOrgs(prev => [...prev, org]);
      setOrgId('');
      return true;
    } catch (err) {
      console.error('Error validating organization:', err);
      setOrgError('Invalid organization ID. Please contact admin.');
      return false;
    } finally {
      setValidatingOrg(false);
    }
  };

  const handleOrgKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (orgId.trim()) {
        await validateOrgId(orgId.trim());
      }
    }
  };

  const removeOrg = (id: string) => {
    setSelectedOrgs(prev => prev.filter(org => org.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign up user
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.name
      );

      if (signUpError) throw signUpError;

      // Navigate to login with success message
      navigate('/login', { 
        replace: true,
        state: { 
          message: 'Account created successfully! Please log in.' 
        } 
      });
    } catch (err) {
      console.error('Error during signup:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in
            </button>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error creating account
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Organizations (Optional)
            </label>
            
            {/* Organization Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Plus className={cn(
                  "h-5 w-5",
                  validatingOrg ? "text-primary-500 animate-spin" : "text-gray-400"
                )} />
              </div>
              <input
                ref={orgInputRef}
                type="text"
                value={orgId}
                onChange={(e) => {
                  setOrgId(e.target.value);
                  setOrgError(null);
                }}
                onKeyDown={handleOrgKeyDown}
                placeholder="Enter organization ID and press Enter"
                className={cn(
                  "block w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm",
                  orgError
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                )}
              />
            </div>

            {/* Organization Error */}
            {orgError && (
              <p className="mt-2 text-sm text-red-600">
                {orgError}
              </p>
            )}

            {/* Selected Organizations */}
            {selectedOrgs.length > 0 && (
              <div className="space-y-2">
                {selectedOrgs.map(org => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium">{org.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({org.id})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOrg(org.id)}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}