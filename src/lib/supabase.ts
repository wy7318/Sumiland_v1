import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // Make sure this import exists

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    flowType: 'pkce',
    // Added from your working version to prevent console spam
    debug: false // This disables verbose logging
  },
  global: {
    headers: {
      'X-Client-Info': 'sumiland-studio@1.0.0',
    },
  },
});

// Simplified header update function
export const updateSupabaseHeaders = async (organizationId: string | null) => {
  try {
    if (organizationId) {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No active session when updating headers');
        return false;
      }

      // Set headers for all future requests
      supabase.headers = {
        ...supabase.headers,
        'x-organization-id': organizationId
      };
    } else {
      // Clear organization header while preserving others
      if (supabase.headers && 'x-organization-id' in supabase.headers) {
        const { 'x-organization-id': _, ...restHeaders } = supabase.headers;
        supabase.headers = restHeaders;
      }
    }
    return true;
  } catch (error) {
    console.error('Error updating headers:', error);
    return false;
  }
};

// Export types
export type { User, Session } from '@supabase/supabase-js';