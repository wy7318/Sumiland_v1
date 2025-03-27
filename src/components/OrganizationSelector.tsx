import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';

export function OrganizationSelector() {
  const navigate = useNavigate();
  const { organizations, setSelectedOrganization, selectedOrganization, loading: orgLoading } = useOrganization();
  const { user, loading: authLoading } = useAuth();
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    // If fully loaded (not loading) and no user, redirect to login
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
      return;
    }

    // If fully loaded, has user and selected org already, go to admin
    if (!authLoading && !orgLoading && user && selectedOrganization) {
      console.log('[OrgSelector] Already have org selected, redirecting to admin');
      navigate('/admin', { replace: true });
    }
  }, [user, selectedOrganization, navigate, authLoading, orgLoading]);

  const handleSelect = async (org: any) => {
    try {
      setIsSelecting(true);
      console.log('[OrgSelector] Selecting organization:', org.name);

      // Use the context method which handles sessionStorage and headers
      await setSelectedOrganization(org);

      // Use React Router for navigation instead of window.location
      // This preserves React context state
      navigate('/admin', { replace: true });
    } catch (error) {
      console.error('[OrgSelector] Error selecting organization:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  // Show loading state
  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

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
          {organizations.length === 0 ? (
            <div className="text-center text-gray-500">
              You don't have any organizations. Please contact an administrator.
            </div>
          ) : (
            organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                disabled={isSelecting}
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
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}