import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

type Organization = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  role: 'owner' | 'admin' | 'member';
};

interface AuthContextType {
  user: User | null;
  profile: any;
  organizations: Organization[];
  loading: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Key for tracking last auth check to prevent too frequent checks
const LAST_AUTH_CHECK_KEY = 'last_auth_check_time';
// Key for tracking sign out state
const IS_SIGNED_OUT_KEY = 'is_signed_out';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const isCheckingAuthRef = useRef(false); // Use ref instead of state to prevent re-renders
  const isSignedOutRef = useRef(localStorage.getItem(IS_SIGNED_OUT_KEY) === 'true');
  const navigate = useNavigate();

  // Clear auth state and set signed out flag
  const clearAuthState = useCallback(() => {
    console.log('Clearing auth state and setting signed out flag');
    setUser(null);
    setProfile(null);
    setOrganizations([]);

    // Mark as signed out to prevent further checks
    localStorage.setItem(IS_SIGNED_OUT_KEY, 'true');
    isSignedOutRef.current = true;

    // Clear any session storage
    sessionStorage.removeItem('selectedOrganization');
  }, []);

  // Function to get user profile, with error handling
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }, []);

  // Function to get user organizations, with error handling
  const fetchUserOrganizations = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('organizations.status', 'active');

      if (error) {
        console.error('Organizations error:', error);
        return [];
      }

      return data
        .filter(item => item.organizations)
        .map(item => ({
          id: item.organizations.id,
          name: item.organizations.name,
          status: item.organizations.status,
          role: item.role
        }));
    } catch (error) {
      console.error('Organizations fetch error:', error);
      return [];
    }
  }, []);

  // Updated checkAuth function with better state management
  const checkAuth = useCallback(async () => {
    // Don't check auth if already signed out
    if (isSignedOutRef.current) {
      console.log('Skipping auth check because user is signed out');
      setLoading(false);
      return;
    }

    // Prevent concurrent auth checks
    if (isCheckingAuthRef.current) {
      console.log('Auth check already in progress, skipping');
      return;
    }

    try {
      isCheckingAuthRef.current = true;
      setLoading(true);

      // Update last check time
      localStorage.setItem(LAST_AUTH_CHECK_KEY, Date.now().toString());

      // Get the current session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        clearAuthState();
        return;
      }

      const session = data?.session;

      if (!session?.user) {
        console.log('No active session found');
        clearAuthState();
        return;
      }

      // Clear any signed out flag
      localStorage.removeItem(IS_SIGNED_OUT_KEY);
      isSignedOutRef.current = false;

      // Set user from session
      setUser(session.user);

      // Only fetch profile and orgs if we don't already have them
      if (!profile) {
        const profileData = await fetchUserProfile(session.user.id);
        if (profileData) setProfile(profileData);
      }

      if (organizations.length === 0) {
        const orgs = await fetchUserOrganizations(session.user.id);
        setOrganizations(orgs);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthState();
    } finally {
      setLoading(false);
      // Use a timeout to reset the checking flag to prevent immediate rechecks
      setTimeout(() => {
        isCheckingAuthRef.current = false;
      }, 500);
    }
  }, [clearAuthState, fetchUserProfile, fetchUserOrganizations, organizations.length, profile]);

  // Initial auth check on component mount
  useEffect(() => {
    let isMounted = true;
    let authChangeSubscription: { unsubscribe: () => void } | null = null;

    const initialize = async () => {
      if (!isMounted) return;

      // Check if user has explicitly signed out
      if (localStorage.getItem(IS_SIGNED_OUT_KEY) === 'true') {
        console.log('User is signed out, skipping initial auth check');
        isSignedOutRef.current = true;
        setLoading(false);
        return;
      }

      await checkAuth();
    };

    initialize();

    // Auth state change listener
    authChangeSubscription = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);

        if (!isMounted) return;

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              // Clear signed out flag
              localStorage.removeItem(IS_SIGNED_OUT_KEY);
              isSignedOutRef.current = false;
              setUser(session.user);

              // Only update last check time, delay full profile/org fetch
              localStorage.setItem(LAST_AUTH_CHECK_KEY, Date.now().toString());
              if (isMounted) checkAuth();
            }
            break;

          case 'SIGNED_OUT':
          case 'USER_DELETED':
            clearAuthState();
            navigate('/', { replace: true });
            break;
        }
      }
    ).data.subscription;

    return () => {
      isMounted = false;
      if (authChangeSubscription) {
        authChangeSubscription.unsubscribe();
      }
    };
  }, [checkAuth, clearAuthState, navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organizations,
        loading,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}