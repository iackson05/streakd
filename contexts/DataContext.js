import React, { createContext, useState, useContext, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const DataContext = createContext({});

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Cached data
  const [profileData, setProfileData] = useState({
    goals: [],
    posts: [],
    stats: { totalGoals: 0, currentStreak: 0, totalDays: 0 },
    lastFetch: null,
    loading: false,
  });

  const [friendsData, setFriendsData] = useState({
    friends: [],
    pendingRequests: [],
    lastFetch: null,
    loading: false,
  });

  const [feedData, setFeedData] = useState({
    posts: [],
    lastFetch: null,
    loading: false,
  });

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const isStale = (lastFetch) => {
    if (!lastFetch) return true;
    return Date.now() - lastFetch > CACHE_DURATION;
  };

  // Profile data fetcher
  const fetchProfileData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && !isStale(profileData.lastFetch)) {
      console.log('Using cached profile data');
      return profileData;
    }

    console.log('Fetching fresh profile data');
    setProfileData(prev => ({ ...prev, loading: true }));

    try {
      const [goalsResult, postsResult] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('posts')
          .select('*, goals(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (postsResult.error) throw postsResult.error;

      const goals = goalsResult.data || [];
      const posts = postsResult.data || [];

      // Calculate stats
      const stats = calculateStats(goals, posts);

      const newData = {
        goals,
        posts,
        stats,
        lastFetch: Date.now(),
        loading: false,
      };

      setProfileData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setProfileData(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [user, profileData.lastFetch]);

  // Friends data fetcher
  const fetchFriendsData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && !isStale(friendsData.lastFetch)) {
      console.log('Using cached friends data');
      return friendsData;
    }

    console.log('Fetching fresh friends data');
    setFriendsData(prev => ({ ...prev, loading: true }));

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          status,
          created_at,
          users!friendships_user_id_fkey (
            id,
            username,
            email,
            profile_picture_url
          ),
          friend:users!friendships_friend_id_fkey (
            id,
            username,
            email,
            profile_picture_url
          )
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const friends = [];
      const pendingRequests = [];

      data?.forEach(friendship => {
        const isRequestSentByMe = friendship.user_id === user.id;
        const otherUser = isRequestSentByMe ? friendship.friend : friendship.users;

        if (friendship.status === 'accepted') {
          friends.push(otherUser);
        } else if (friendship.status === 'pending' && !isRequestSentByMe) {
          pendingRequests.push({
            ...otherUser,
            senderId: friendship.user_id,
          });
        }
      });

      const newData = {
        friends,
        pendingRequests,
        lastFetch: Date.now(),
        loading: false,
      };

      setFriendsData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching friends data:', error);
      setFriendsData(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [user, friendsData.lastFetch]);

  // Feed data fetcher
  const fetchFeedData = useCallback(async (force = false) => {
    if (!user) return;
    if (!force && !isStale(feedData.lastFetch)) {
      console.log('Using cached feed data');
      return feedData;
    }

    console.log('Fetching fresh feed data');
    setFeedData(prev => ({ ...prev, loading: true }));

    try {
      // Get user's friends
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendError) throw friendError;

      const friendIds = friendships?.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      ) || [];

      const userIds = [user.id, ...friendIds];

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users!posts_user_id_fkey (
            id,
            username,
            profile_picture_url
          ),
          goals!posts_goal_id_fkey (
            id,
            title,
            privacy
          )
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredPosts = data?.filter(post => {
        if (post.user_id === user.id) return true;
        return post.goals?.privacy !== 'private';
      }) || [];

      const newData = {
        posts: filteredPosts,
        lastFetch: Date.now(),
        loading: false,
      };

      setFeedData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching feed data:', error);
      setFeedData(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [user, feedData.lastFetch]);

  // Immediate cache updates (optimistic updates)
  const addGoal = (goal) => {
    setProfileData(prev => ({
      ...prev,
      goals: [goal, ...prev.goals],
      stats: { ...prev.stats, totalGoals: prev.stats.totalGoals + 1 },
    }));
  };

  const removeGoal = (goalId) => {
    setProfileData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId),
      stats: { ...prev.stats, totalGoals: Math.max(0, prev.stats.totalGoals - 1) },
    }));
  };

  const addPost = (post) => {
    // Add to profile
    setProfileData(prev => ({
      ...prev,
      posts: [post, ...prev.posts],
      stats: { ...prev.stats, totalDays: prev.stats.totalDays + 1 },
    }));
    
    // Add to feed
    setFeedData(prev => ({
      ...prev,
      posts: [post, ...prev.posts],
    }));
  };

  const removePost = (postId) => {
    setProfileData(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p.id !== postId),
    }));
    
    setFeedData(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p.id !== postId),
    }));
  };

  const addFriend = (friend) => {
    setFriendsData(prev => ({
      ...prev,
      friends: [...prev.friends, friend],
    }));
  };

  const removeFriend = (friendId) => {
    setFriendsData(prev => ({
      ...prev,
      friends: prev.friends.filter(f => f.id !== friendId),
    }));
  };

  const addPendingRequest = (request) => {
    setFriendsData(prev => ({
      ...prev,
      pendingRequests: [...prev.pendingRequests, request],
    }));
  };

  const removePendingRequest = (senderId) => {
    setFriendsData(prev => ({
      ...prev,
      pendingRequests: prev.pendingRequests.filter(r => r.senderId !== senderId),
    }));
  };

  const acceptFriendRequest = (friend, senderId) => {
    setFriendsData(prev => ({
      ...prev,
      friends: [...prev.friends, friend],
      pendingRequests: prev.pendingRequests.filter(r => r.senderId !== senderId),
    }));
  };

  // Invalidate cache (force refresh on next fetch)
  const invalidateProfile = () => setProfileData(prev => ({ ...prev, lastFetch: null }));
  const invalidateFriends = () => setFriendsData(prev => ({ ...prev, lastFetch: null }));
  const invalidateFeed = () => setFeedData(prev => ({ ...prev, lastFetch: null }));

  const value = {
    // Profile
    profileData,
    fetchProfileData,
    invalidateProfile,
    addGoal,
    removeGoal,
    addPost,
    removePost,
    
    // Friends
    friendsData,
    fetchFriendsData,
    invalidateFriends,
    addFriend,
    removeFriend,
    addPendingRequest,
    removePendingRequest,
    acceptFriendRequest,
    
    // Feed
    feedData,
    fetchFeedData,
    invalidateFeed,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

// Helper function
function calculateStats(goals, posts) {
  const activeGoals = goals?.filter(g => !g.completed).length || 0;
  const uniqueDays = new Set(
    posts?.map(p => new Date(p.created_at).toDateString())
  ).size;
  
  return {
    totalGoals: activeGoals,
    currentStreak: 0, // Implement streak calculation
    totalDays: uniqueDays,
  };
}