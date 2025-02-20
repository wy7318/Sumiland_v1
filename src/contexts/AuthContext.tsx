import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return;
      }

      // If no session, clear state
      if (!session) {
        setUser(null);
        setProfile(null);
        setOrganizations([]);
        return;
      }

      // Get user data
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User error:', userError);
        return;
      }

      if (currentUser) {
        setUser(currentUser);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile error:', profileError);
        } else if (profileData) {
          setProfile(profileData);
        }

        // Get user organizations
        const { data: orgMappings, error: orgsError } = await supabase
          .from('user_organizations')
          .select('organization_id, role')
          .eq('user_id', currentUser.id);

        if (orgsError) {
          console.error('Organizations error:', orgsError);
        } else if (orgMappings) {
          // Get organization details
          const orgIds = orgMappings.map(m => m.organization_id);
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id, name, status')
            .in('id', orgIds);

          const transformedOrgs = orgMappings.map(mapping => {
            const org = orgs?.find(o => o.id === mapping.organization_id);
            return {
              id: mapping.organization_id,
              name: org?.name || 'Unknown Organization',
              status: org?.status || 'inactive',
              role: mapping.role
            };
          });

          setOrganizations(transformedOrgs);
        }
      }
    } catch (error) {
      console.error('Error in checkAuth:', error);
      // Only clear auth state if it's a fatal error
      if (error instanceof Error && error.message !== 'Session check timeout') {
        setUser(null);
        setProfile(null);
        setOrganizations([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial auth check
    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          await checkAuth();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setOrganizations([]);
        navigate('/', { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, checkAuth]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      organizations,
      loading, 
      checkAuth 
    }}>
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