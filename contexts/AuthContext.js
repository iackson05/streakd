import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📱 Session on mount:', session ? 'Found' : 'None');
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
    
        if (error || !user) {
          setLoading(false);
          return;
        }

        await loadUserProfile(user);
    }   catch (error) {
        console.error('Error checking user:', error);
        setLoading(false);
    }
    };

    const loadUserProfile = async (authUser) => {
      try {
        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error) throw error;

        setUser(authUser);
        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    refreshProfile: () => user && loadUserProfile(user),
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