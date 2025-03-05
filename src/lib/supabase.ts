import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

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
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'sumiland-studio@1.0.0',
    },
  },
  // Add timeout and retries
  realtime: {
    timeout: 20000,
    retries: 3
  }
});

// Create a function to update headers with organization ID
export const updateSupabaseHeaders = async (organizationId: string | null) => {
  if (organizationId) {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    // Set headers for all future requests
    supabase.headers = {
      'x-organization-id': organizationId
    };

    // Update auth session with new headers
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  } else {
    supabase.headers = {};
  }
};