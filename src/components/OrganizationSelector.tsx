import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ChevronRight } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';

export function OrganizationSelector() {
  const navigate = useNavigate();
  const { organizations, setSelectedOrganization, selectedOrganization } = useOrganization();
  const { user } = useAuth();

  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!user) {
      navigate('/login');
      return;
    }

    // If already has selected organization, redirect to admin
    if (selectedOrganization) {
      navigate('/admin');
    }
  }, [user, selectedOrganization, navigate]);

  const handleSelect = async (org: any) => {
    try {
      await setSelectedOrganization(org);
      // Wait for a brief moment to ensure state is updated
      setTimeout(() => {
        navigate('/admin');
      }, 100);
    } catch (error) {
      console.error('Error selecting organization:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Select Organization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose an organization to continue
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {organizations.map((org) => (
            <motion.button
              key={org.id}
              onClick={() => handleSelect(org)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div className="ml-4 text-left">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-sm text-gray-500 capitalize">{org.role}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}