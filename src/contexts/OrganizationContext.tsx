import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { updateSupabaseHeaders } from '../lib/supabase';

type Organization = {
  id: string;
  name: string;
  status: string;
  role: string;
};

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  setSelectedOrganization: (org: Organization | null) => Promise<void>;
  organizations: Organization[];
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organizations: userOrgs } = useAuth();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(() => {
    const stored = sessionStorage.getItem('selectedOrganization');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear selected organization on logout
    if (!user) {
      setSelectedOrganization(null);
      sessionStorage.removeItem('selectedOrganization');
      updateSupabaseHeaders(null);
    }
  }, [user]);

  useEffect(() => {
    // If user has organizations but none selected, redirect to selector
    // Only redirect if not already on the selector page
    if (userOrgs.length > 0 && !selectedOrganization && user && location.pathname !== '/select-organization') {
      navigate('/select-organization');
    }
    setLoading(false);
  }, [userOrgs, selectedOrganization, user, navigate, location]);

  const handleSetSelectedOrganization = async (org: Organization | null) => {
    try {
      if (org) {
        sessionStorage.setItem('selectedOrganization', JSON.stringify(org));
        await updateSupabaseHeaders(org.id);
      } else {
        sessionStorage.removeItem('selectedOrganization');
        await updateSupabaseHeaders(null);
      }
      setSelectedOrganization(org);
    } catch (error) {
      console.error('Error setting organization:', error);
      throw error;
    }
  };

  // Set organization header on initial load
  useEffect(() => {
    if (selectedOrganization) {
      updateSupabaseHeaders(selectedOrganization.id);
    }
  }, []);

  return (
    <OrganizationContext.Provider value={{
      selectedOrganization,
      setSelectedOrganization: handleSetSelectedOrganization,
      organizations: userOrgs,
      loading
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}