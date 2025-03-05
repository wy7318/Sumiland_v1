import { supabase } from './supabase';

export async function signUp(email: string, password: string, name: string) {
  try {
    // Only create the user, don't sign them in
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from signup');

    // Profile is now created automatically via database trigger
    return { data: { user: authData.user }, error: null };
  } catch (err) {
    console.error('Error during signup:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('An unknown error occurred') 
    };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const { data: organizations } = await supabase
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
        .eq('user_id', data.user.id);

      return {
        data: {
          ...data,
          profile,
          organizations: organizations?.map(o => ({
            ...o.organizations,
            role: o.role
          })) || []
        },
        error: null
      };
    }

    return { data, error };
  } catch (err) {
    console.error('Sign in error:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to sign in')
    };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Sign out error:', err);
    return {
      error: err instanceof Error ? err : new Error('Failed to sign out')
    };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: organizations } = await supabase
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
      .eq('user_id', user.id);

    return { 
      user, 
      profile,
      organizations: organizations?.map(o => ({
        ...o.organizations,
        role: o.role
      })) || []
    };
  } catch (err) {
    console.error('Get current user error:', err);
    return null;
  }
}

export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Reset password error:', err);
    return {
      error: err instanceof Error ? err : new Error('Failed to send reset password email')
    };
  }
}