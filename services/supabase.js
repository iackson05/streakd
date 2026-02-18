/**
 * Auth + user profile functions.
 * Migrated from Supabase to FastAPI backend.
 */
import { apiFetch, apiGet, saveTokens, clearTokens } from './api';

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Sign up a new user with email/password
 */
export const signUp = async (email, password, username) => {
  try {
    const res = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Sign up failed');
    }

    const data = await res.json();
    await saveTokens(data.access_token, data.refresh_token);

    // Fetch the created user profile
    const profile = await apiGet('/auth/me');

    return { user: profile, error: null };
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
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid login credentials');
    }

    const data = await res.json();
    await saveTokens(data.access_token, data.refresh_token);

    // Fetch user profile
    const profile = await apiGet('/auth/me');

    return { user: profile, session: data, error: null };
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
    await clearTokens();
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get current user from stored token
 */
export const getCurrentUser = async () => {
  try {
    const user = await apiGet('/auth/me');
    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

/**
 * Get current user's profile from users table
 */
export const getUserProfile = async (userId) => {
  try {
    const profile = await apiGet(`/users/profile/${userId}`);
    return { profile, error: null };
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
    const data = await apiGet(`/users/check-username/${encodeURIComponent(username)}`);
    return { available: data.available, error: null };
  } catch (error) {
    return { available: true, error: null };
  }
};
