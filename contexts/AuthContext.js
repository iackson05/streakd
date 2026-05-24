import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, signOut as authSignOut } from '../services/supabase';
import { getTokens, clearTokens } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Check if we have stored tokens
      const { access } = await getTokens();
      if (!access) {
        setLoading(false);
        return;
      }

      // Try to fetch current user profile with the stored token
      const { user: userData, error } = await getCurrentUser();

      if (error || !userData) {
        // Token is invalid or expired (refresh also failed)
        await clearTokens();
        setLoading(false);
        return;
      }

      setUser(userData);
      setProfile(userData);
      setNeedsVerification(!userData.email_verified);
    } catch (error) {
      console.error('Error checking user:', error);
      await clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setProfile(null);
    setNeedsVerification(false);
    setIsNewUser(false);
  };

  const refreshProfile = async () => {
    try {
      const { user: userData, error } = await getCurrentUser();
      if (!error && userData) {
        setUser(userData);
        setProfile(userData);
        setNeedsVerification(!userData.email_verified);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const setAuthUser = (userData) => {
    setUser(userData);
    setProfile(userData);
    setNeedsVerification(!userData.email_verified);
  };

  const signUpUser = (userData) => {
    setIsNewUser(true);
    setNeedsVerification(!userData.email_verified);
    setUser(userData);
    setProfile(userData);
  };

  // Called when onboarding is complete
  const completeOnboarding = () => {
    setIsNewUser(false);
  };

  const value = {
    user,
    profile,
    loading,
    isNewUser,
    needsVerification,
    signOut,
    refreshProfile,
    setAuthUser,
    signUpUser,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
