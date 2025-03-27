import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'xelytic_auth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Function to update headers with organization ID
export const updateSupabaseHeaders = async (organizationId: string | null) => {
  try {
    if (organizationId) {
      console.log('[Supabase] Updating headers with org:', organizationId);
      supabase.functions.setAuth(organizationId);
      // Also set organization ID as a custom header for database requests
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        supabase.headers = {
          ...supabase.headers,
          'x-organization-id': organizationId
        };
        console.log('[Supabase] Headers updated successfully');
      } else {
        console.error('[Supabase] No active session found when updating headers');
        // Check if user is signed out and update flag if needed
        if (localStorage.getItem('is_signed_out') !== 'true') {
          localStorage.setItem('is_signed_out', 'true');
        }
      }
    } else {
      console.log('[Supabase] Clearing organization headers');
      if (supabase.headers && 'x-organization-id' in supabase.headers) {
        const { 'x-organization-id': _, ...restHeaders } = supabase.headers;
        supabase.headers = restHeaders;
      }
    }
    return true;
  } catch (error) {
    console.error('[Supabase] Error updating headers:', error);
    return false;
  }
};

// Export types
export type { User, Session } from '@supabase/supabase-js';