import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase admin environment variables');
}

// Create a Supabase client with the service role key
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Function to get all users with auth data
export async function getAllUsers() {
  try {
    // Get all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profileError) throw profileError;

    // Get auth data for all users
    const { data: authUsers, error: authError } = await supabaseAdmin
      .auth.admin.listUsers();

    if (authError) throw authError;

    // Combine the data
    return profiles?.map(profile => {
      const authUser = authUsers.users.find(user => user.id === profile.id);
      
      return {
        id: profile.id,
        email: authUser?.email || profile.id,
        last_sign_in_at: authUser?.last_sign_in_at,
        created_at: profile.created_at,
        profile: {
          name: profile.name,
          role: profile.role,
          type: profile.type,
          is_super_admin: profile.is_super_admin,
          phone: profile.phone,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      };
    });
  } catch (error) {
    throw error;
  }
}

// Function to update user profile
export async function updateUserProfile(userId: string, data: {
  name?: string;
  phone?: string | null;
  role?: string;
  type?: string;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    throw error;
  }
}

// Function to update user type
export async function updateUserType(userId: string, newType: 'admin' | 'user') {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        type: newType,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    throw error;
  }
}

// Function to delete user
export async function deleteUser(userId: string) {
  try {
    // Delete user from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Profile will be deleted automatically via cascade

    return { error: null };
  } catch (error) {
    throw error;
  }
}