// import { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuth } from './AuthContext';
// import { updateSupabaseHeaders } from '../lib/supabase';

// type Organization = {
//   id: string;
//   name: string;
//   status: string;
//   role: string;
// };

// interface OrganizationContextType {
//   selectedOrganization: Organization | null;
//   setSelectedOrganization: (org: Organization | null) => Promise<void>;
//   organizations: Organization[];
//   loading: boolean;
// }

// const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// // Storage key for consistent access
// const SELECTED_ORG_KEY = 'selectedOrganization';

// export function OrganizationProvider({ children }: { children: React.ReactNode }) {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { user, organizations: userOrgs, loading: authLoading } = useAuth();

//   // Get organization from sessionStorage with improved error handling
//   const getStoredOrg = useCallback((): Organization | null => {
//     try {
//       const stored = sessionStorage.getItem(SELECTED_ORG_KEY);
//       if (stored) {
//         console.log('[OrgProvider] Loading stored organization from sessionStorage');
//         return JSON.parse(stored);
//       }
//       return null;
//     } catch (error) {
//       console.error('[OrgProvider] Error loading from sessionStorage:', error);
//       return null;
//     }
//   }, []);

//   const [selectedOrganization, setSelectedOrgState] = useState<Organization | null>(getStoredOrg);
//   const [loading, setLoading] = useState(true);

//   // No longer need redirectAttempted as we'll use a different approach

//   // Clear on logout
//   useEffect(() => {
//     if (!user) {
//       setSelectedOrgState(null);
//       sessionStorage.removeItem(SELECTED_ORG_KEY);
//       updateSupabaseHeaders(null);
//     }
//   }, [user]);

//   // Sync from sessionStorage on mount and location changes
//   useEffect(() => {
//     const storedOrg = getStoredOrg();

//     // If we have a stored org but the state doesn't match, update state
//     if (storedOrg && (!selectedOrganization || storedOrg.id !== selectedOrganization.id)) {
//       console.log('[OrgProvider] Syncing from sessionStorage to state');
//       setSelectedOrgState(storedOrg);
//       updateSupabaseHeaders(storedOrg.id).catch(console.error);
//     }

//     // If we have a selected org in state but not in storage, update storage
//     if (selectedOrganization && !storedOrg) {
//       console.log('[OrgProvider] Syncing from state to sessionStorage');
//       sessionStorage.setItem(SELECTED_ORG_KEY, JSON.stringify(selectedOrganization));
//       updateSupabaseHeaders(selectedOrganization.id).catch(console.error);
//     }
//   }, [location.pathname, getStoredOrg, selectedOrganization]);

//   // Simplified organization redirect logic
//   useEffect(() => {
//     const handleOrgRedirection = async () => {
//       const storedOrg = getStoredOrg();

//       // Only handle redirects if auth is loaded and we have a user
//       if (!authLoading && user) {
//         // Update Supabase headers if we have an org
//         if (storedOrg) {
//           await updateSupabaseHeaders(storedOrg.id);
//         }

//         // Check if we need to redirect to org selector
//         const needsOrgSelection = userOrgs.length > 0 && !storedOrg;
//         const isSelectOrgPage = location.pathname === '/select-organization';
//         const isLoginPage = location.pathname === '/login';

//         if (needsOrgSelection && !isSelectOrgPage && !isLoginPage) {
//           console.log('[OrgProvider] Redirecting to org selector (no org selected)');
//           navigate('/select-organization', { replace: true });
//         } else if (!needsOrgSelection && isSelectOrgPage && storedOrg) {
//           console.log('[OrgProvider] Redirecting to admin (org already selected)');
//           navigate('/admin', { replace: true });
//         }
//       }

//       setLoading(false);
//     };

//     handleOrgRedirection();
//   }, [authLoading, user, userOrgs, location.pathname, navigate, getStoredOrg]);

//   // Improved setSelectedOrganization with better error handling and state updates
//   const handleSetSelectedOrganization = async (org: Organization | null) => {
//     try {
//       if (org) {
//         console.log(`[OrgProvider] Setting organization: ${org.name} (${org.id})`);
//         // Update sessionStorage first
//         sessionStorage.setItem(SELECTED_ORG_KEY, JSON.stringify(org));
//         // Update Supabase headers
//         await updateSupabaseHeaders(org.id);
//         // Finally update state
//         setSelectedOrgState(org);
//       } else {
//         console.log('[OrgProvider] Clearing selected organization');
//         sessionStorage.removeItem(SELECTED_ORG_KEY);
//         await updateSupabaseHeaders(null);
//         setSelectedOrgState(null);
//       }
//       return true;
//     } catch (error) {
//       console.error('[OrgProvider] Error setting organization:', error);
//       throw error;
//     }
//   };

//   return (
//     <OrganizationContext.Provider
//       value={{
//         selectedOrganization,
//         setSelectedOrganization: handleSetSelectedOrganization,
//         organizations: userOrgs,
//         loading
//       }}
//     >
//       {children}
//     </OrganizationContext.Provider>
//   );
// }

// export function useOrganization() {
//   const context = useContext(OrganizationContext);
//   if (context === undefined) {
//     throw new Error('useOrganization must be used within an OrganizationProvider');
//   }
//   return context;
// }





import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { updateSupabaseHeaders } from '../lib/supabase';

type Organization = {
  id: string;
  name: string;
  logo_url: string;
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

// Storage key for consistent access
const SELECTED_ORG_KEY = 'selectedOrganization';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organizations: userOrgs, loading: authLoading } = useAuth();

  // Get organization from sessionStorage with improved error handling
  const getStoredOrg = useCallback((): Organization | null => {
    try {
      const stored = sessionStorage.getItem(SELECTED_ORG_KEY);
      if (stored) {
        console.log('[OrgProvider] Loading stored organization from sessionStorage');
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('[OrgProvider] Error loading from sessionStorage:', error);
      return null;
    }
  }, []);

  const [selectedOrganization, setSelectedOrgState] = useState<Organization | null>(getStoredOrg);
  const [loading, setLoading] = useState(true);

  // Clear on logout
  useEffect(() => {
    if (!user) {
      setSelectedOrgState(null);
      sessionStorage.removeItem(SELECTED_ORG_KEY);
      updateSupabaseHeaders(null);
    }
  }, [user]);

  // Sync from sessionStorage on mount and location changes
  useEffect(() => {
    const storedOrg = getStoredOrg();

    // If we have a stored org but the state doesn't match, update state
    if (storedOrg && (!selectedOrganization || storedOrg.id !== selectedOrganization.id)) {
      console.log('[OrgProvider] Syncing from sessionStorage to state');
      setSelectedOrgState(storedOrg);
      updateSupabaseHeaders(storedOrg.id).catch(console.error);
    }

    // If we have a selected org in state but not in storage, update storage
    if (selectedOrganization && !storedOrg) {
      console.log('[OrgProvider] Syncing from state to sessionStorage');
      sessionStorage.setItem(SELECTED_ORG_KEY, JSON.stringify(selectedOrganization));
      updateSupabaseHeaders(selectedOrganization.id).catch(console.error);
    }
  }, [location.pathname, getStoredOrg, selectedOrganization]);

  // Simplified organization redirect logic with admin path check
  useEffect(() => {
    const handleOrgRedirection = async () => {
      const storedOrg = getStoredOrg();
      const isAdminPath = location.pathname.startsWith('/admin');

      // Only handle redirects if auth is loaded and we have a user
      if (!authLoading && user) {
        // Update Supabase headers if we have an org
        if (storedOrg) {
          await updateSupabaseHeaders(storedOrg.id);
        }

        // Get active organizations
        const activeOrgs = userOrgs.filter(org => org.status === 'active');

        // Check if we need to redirect to org selector (but not if we're already in admin)
        const needsOrgSelection = activeOrgs.length > 0 && !storedOrg;
        const isSelectOrgPage = location.pathname === '/select-organization';
        const isLoginPage = location.pathname === '/login';

        if (needsOrgSelection && !isAdminPath && !isSelectOrgPage && !isLoginPage) {
          console.log('[OrgProvider] Redirecting to org selector (no org selected)');
          navigate('/select-organization', { replace: true });
        } else if (!needsOrgSelection && isSelectOrgPage && storedOrg) {
          console.log('[OrgProvider] Redirecting to admin (org already selected)');
          navigate('/admin', { replace: true });
        }
      }

      setLoading(false);
    };

    handleOrgRedirection();
  }, [authLoading, user, userOrgs, location.pathname, navigate, getStoredOrg]);

  // Handle organization status changes (periodic check)
  useEffect(() => {
    if (!selectedOrganization || !user) return;

    // Check if the selected org is still active in the userOrgs list
    const checkOrgStatus = () => {
      const activeOrgs = userOrgs.filter(org => org.status === 'active');
      const currentOrgInList = activeOrgs.find(org => org.id === selectedOrganization.id);

      // If org is no longer active and we're not in admin, redirect
      if (!currentOrgInList && !location.pathname.startsWith('/admin')) {
        console.log('[OrgProvider] Selected organization is no longer active, redirecting');
        sessionStorage.removeItem(SELECTED_ORG_KEY);
        updateSupabaseHeaders(null).catch(console.error);
        setSelectedOrgState(null);
        navigate('/select-organization', { replace: true });
      }
    };

    // Check immediately
    checkOrgStatus();

    // Set up interval for periodic checks (every minute)
    const intervalId = setInterval(checkOrgStatus, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [selectedOrganization, userOrgs, navigate, user, location.pathname]);

  // Improved setSelectedOrganization with better error handling and state updates
  const handleSetSelectedOrganization = async (org: Organization | null) => {
    try {
      if (org) {
        // Check if organization is active before allowing selection
        if (org.status !== 'active') {
          console.error(`[OrgProvider] Cannot select inactive organization: ${org.name} (${org.id})`);
          throw new Error('Cannot select an inactive organization');
        }

        console.log(`[OrgProvider] Setting organization: ${org.name} (${org.id})`);
        // Update sessionStorage first
        sessionStorage.setItem(SELECTED_ORG_KEY, JSON.stringify(org));
        // Update Supabase headers
        await updateSupabaseHeaders(org.id);
        // Finally update state
        setSelectedOrgState(org);
      } else {
        console.log('[OrgProvider] Clearing selected organization');
        sessionStorage.removeItem(SELECTED_ORG_KEY);
        await updateSupabaseHeaders(null);
        setSelectedOrgState(null);
      }
      return true;
    } catch (error) {
      console.error('[OrgProvider] Error setting organization:', error);
      throw error;
    }
  };

  // Filter to only return active organizations
  const activeOrganizations = userOrgs.filter(org => org.status === 'active');

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        setSelectedOrganization: handleSetSelectedOrganization,
        organizations: activeOrganizations,
        loading
      }}
    >
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