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

const SESSION_CHECK_TIMEOUT = 500; // 0.5 seconds timeout

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setOrganizations([]);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      clearAuthState();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error during sign out:', err);
    }
  }, [navigate, clearAuthState]);

  const fetchUserProfile = async (userId: string) => {
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
  };

  const fetchUserOrganizations = async (userId: string) => {
    try {
      // Get user-organization mappings with organization details
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
        .eq('organizations.status', 'active'); // Only get active organizations

      if (error) {
        console.error('Organizations error:', error);
        return [];
      }

      // Transform the data into the expected format
      return data
        .filter(item => item.organizations) // Filter out any null organizations
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
  };

  const checkAuth = useCallback(async () => {
    let timeoutId: NodeJS.Timeout;

    try {
      setLoading(true);

      // Get session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Session check timeout'));
        }, SESSION_CHECK_TIMEOUT);
      });

      const { data: { session } } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as Awaited<typeof sessionPromise>;

      clearTimeout(timeoutId);

      // If no session, clear state and return
      if (!session?.user) {
        clearAuthState();
        return;
      }

      // Set user state
      setUser(session.user);

      // Get profile data
      const profileData = await fetchUserProfile(session.user.id);
      if (profileData) {
        setProfile(profileData);
      }

      // Get organizations
      const orgs = await fetchUserOrganizations(session.user.id);
      setOrganizations(orgs);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Session check timeout') {
          console.warn('Session check timed out, retrying...');
          // Optional: Implement retry logic here if needed
        } else if (error.message.includes('JWT')) {
          console.warn('JWT error, signing out:', error);
          await handleSignOut();
        } else {
          console.error('Auth check error:', error);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [clearAuthState, handleSignOut]);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const initialize = async () => {
      try {
        await checkAuth();
      } catch (error) {
        if (mounted) {
          console.error('Auth initialization error:', error);
          // Retry after 5 seconds
          retryTimeout = setTimeout(initialize, 5000);
        }
      }
    };

    initialize();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event);

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            setUser(session.user);
            await checkAuth();
          }
          break;

        case 'TOKEN_REFRESHED':
          if (session?.user) {
            setUser(session.user);
            await checkAuth();
          }
          break;

        case 'SIGNED_OUT':
          clearAuthState();
          navigate('/', { replace: true });
          break;

        case 'USER_DELETED':
          clearAuthState();
          navigate('/', { replace: true });
          break;
      }
    });

    return () => {
      mounted = false;
      clearTimeout(retryTimeout);
      subscription.unsubscribe();
    };
  }, [checkAuth, clearAuthState, navigate]);

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



// import { createContext, useContext, useEffect, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { supabase } from '../lib/supabase';
// import type { User } from '@supabase/supabase-js';

// type Organization = {
//   id: string;
//   name: string;
//   status: 'active' | 'inactive';
//   role: 'owner' | 'admin' | 'member';
// };

// interface AuthContextType {
//   user: User | null;
//   profile: any;
//   organizations: Organization[];
//   loading: boolean;
//   checkAuth: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// const SESSION_CHECK_TIMEOUT = 1000; // Increased to 1 second
// const MAX_RETRY_ATTEMPTS = 3;

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [profile, setProfile] = useState<any>(null);
//   const [organizations, setOrganizations] = useState<Organization[]>([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   const clearAuthState = useCallback(() => {
//     setUser(null);
//     setProfile(null);
//     setOrganizations([]);
//   }, []);

//   const handleSignOut = useCallback(async () => {
//     try {
//       await supabase.auth.signOut();
//       clearAuthState();
//       navigate('/', { replace: true });
//     } catch (err) {
//       console.error('Error during sign out:', err);
//     }
//   }, [navigate, clearAuthState]);

//   const fetchUserProfile = async (userId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from('profiles')
//         .select('*')
//         .eq('id', userId)
//         .maybeSingle();

//       if (error) {
//         console.error('Profile fetch error:', error);
//         return null;
//       }

//       return data;
//     } catch (error) {
//       console.error('Profile fetch error:', error);
//       return null;
//     }
//   };

//   const fetchUserOrganizations = async (userId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from('user_organizations')
//         .select(`
//           organization_id,
//           role,
//           organizations (
//             id,
//             name,
//             status
//           )
//         `)
//         .eq('user_id', userId)
//         .eq('organizations.status', 'active');

//       if (error) {
//         console.error('Organizations error:', error);
//         return [];
//       }

//       return data
//         .filter(item => item.organizations)
//         .map(item => ({
//           id: item.organizations.id,
//           name: item.organizations.name,
//           status: item.organizations.status,
//           role: item.role
//         }));
//     } catch (error) {
//       console.error('Organizations fetch error:', error);
//       return [];
//     }
//   };

//   const checkAuth = useCallback(async (retryCount = 0) => {
//     try {
//       setLoading(true);

//       // Use getSession without timeout to prevent interrupting the process
//       const { data: { session } } = await supabase.auth.getSession();

//       // If no session, clear state and return
//       if (!session?.user) {
//         clearAuthState();
//         return;
//       }

//       // Set user state
//       setUser(session.user);

//       // Parallel fetching of profile and organizations
//       const [profileData, orgs] = await Promise.all([
//         fetchUserProfile(session.user.id),
//         fetchUserOrganizations(session.user.id)
//       ]);

//       if (profileData) {
//         setProfile(profileData);
//       }

//       setOrganizations(orgs);

//     } catch (error) {
//       if (retryCount < MAX_RETRY_ATTEMPTS) {
//         console.warn(`Auth check failed, retrying (${retryCount + 1})...`);
//         await new Promise(resolve => setTimeout(resolve, 1000)); // Slight delay between retries
//         await checkAuth(retryCount + 1);
//       } else {
//         console.error('Auth check failed after multiple attempts:', error);
//         // Optional: sign out if persistent errors
//         await handleSignOut();
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [clearAuthState, handleSignOut]);

//   useEffect(() => {
//     let mounted = true;

//     const initialize = async () => {
//       if (mounted) {
//         await checkAuth();
//       }
//     };

//     initialize();

//     // Simplified auth state change listener
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
//       if (!mounted) return;

//       switch (event) {
//         case 'SIGNED_IN':
//         case 'TOKEN_REFRESHED':
//           if (session?.user) {
//             await checkAuth();
//           }
//           break;

//         case 'SIGNED_OUT':
//         case 'USER_DELETED':
//           clearAuthState();
//           navigate('/', { replace: true });
//           break;
//       }
//     });

//     return () => {
//       mounted = false;
//       subscription.unsubscribe();
//     };
//   }, [checkAuth, clearAuthState, navigate]);

//   return (
//     <AuthContext.Provider value={{
//       user,
//       profile,
//       organizations,
//       loading,
//       checkAuth
//     }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }
