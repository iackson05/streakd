import { createClient } from '@supabase/supabase-js';

// Your Supabase project credentials
const SUPABASE_URL = 'https://qmfipdfosjgcvudqbbho.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_H1hHx0FHvyZHUEZOilw51A_2XwzpnG1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Sign up a new user with email/password
 * Creates auth user AND profile in users table
 */
export const signUp = async (email, password, username) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id, // Match auth.users id
        username,
        email,
        created_at: new Date().toISOString(),
      });

    if (profileError) throw profileError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { user: null, error };
  }
};

/**
 * Sign in existing user
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { user: null, session: null, error };
  }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get current user session
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error };
  }
};

/**
 * Get current user's profile from users table
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { profile: data, error: null };
  } catch (error) {
    console.error('Get profile error:', error);
    return { profile: null, error };
  }
};

/**
 * Check if username is available
 */
export const checkUsernameAvailable = async (username) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    // If no data found, username is available
    return { available: !data, error: null };
  } catch (error) {
    // Error usually means username doesn't exist (available)
    return { available: true, error: null };
  }
};

/**
 * Listen to auth state changes
 * Usage: supabase.auth.onAuthStateChange((event, session) => {...})
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};