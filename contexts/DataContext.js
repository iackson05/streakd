import React, { createContext, useState, useContext, useCallback } from 'react';
import { apiGet } from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext({});

export const DataProvider = ({ children }) => {
  const { user } = useAuth();

  // Cached data
  const [profileData, setProfileData] = useState({
    goals: [],
    posts: [],
    stats: { totalPosts: 0, daysOnStreakd: 0, friendCount: 0 },
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
      const [goals, profileInfo, friendsResult] = await Promise.all([
        apiGet('/goals/'),
        apiGet(`/users/profile/${user.id}`),
        apiGet('/friends/accepted-ids'),
      ]);

      // Get all posts for the user across all goals
      let allPosts = [];
      if (goals && goals.length > 0) {
        const postPromises = goals.map(g => apiGet(`/posts/goal/${g.id}`).catch(() => []));
        const postArrays = await Promise.all(postPromises);
        allPosts = postArrays.flat();
        // Sort by created_at descending
        allPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      const friendCount = friendsResult?.friend_ids?.length || 0;

      // Calculate stats
      const stats = calculateStats(allPosts, profileInfo?.created_at, friendCount);

      const newData = {
        goals: goals || [],
        posts: allPosts,
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
      const data = await apiGet('/friends/');

      const friends = [];
      const pendingRequests = [];

      data?.forEach(friendship => {
        const isRequestSentByMe = friendship.user_id === user.id;
        // The other user's info is in friend_username and friend_profile_picture_url
        const otherUserId = isRequestSentByMe ? friendship.friend_id : friendship.user_id;
        const otherUser = {
          id: otherUserId,
          username: friendship.friend_username,
          profile_picture_url: friendship.friend_profile_picture_url,
        };

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
      // Backend handles friend filtering, privacy, and 24h window
      const posts = await apiGet('/posts/feed');

      const newData = {
        posts: posts || [],
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
    }));
  };

  const removeGoal = (goalId) => {
    setProfileData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId),
    }));
  };

  const markGoalCompleted = (goalId) => {
    setProfileData(prev => {
      // Mark goal as completed
      const updatedGoals = prev.goals.map(g =>
        g.id === goalId ? { ...g, completed: true } : g
      );

      // Remove all posts for this goal
      const updatedPosts = prev.posts.filter(p => p.goal_id !== goalId);
      const removedPostCount = prev.posts.length - updatedPosts.length;

      return {
        ...prev,
        goals: updatedGoals,
        posts: updatedPosts,
        stats: {
          ...prev.stats,
          totalPosts: Math.max(0, prev.stats.totalPosts - removedPostCount),
        },
      };
    });

    // Also remove from feed
    setFeedData(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p.goal_id !== goalId),
    }));
  };

  const addPost = (post) => {
    // Add to profile
    setProfileData(prev => ({
      ...prev,
      posts: [post, ...prev.posts],
      stats: { ...prev.stats, totalPosts: prev.stats.totalPosts + 1 },
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
      stats: { ...prev.stats, totalPosts: Math.max(0, prev.stats.totalPosts - 1) },
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
    markGoalCompleted,
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
function calculateStats(posts, userCreatedAt, friendCount) {
  const totalPosts = posts?.length || 0;

  // Calculate days since signup
  let daysOnStreakd = 0;
  if (userCreatedAt) {
    const signupDate = new Date(userCreatedAt);
    const today = new Date();
    const diffTime = Math.abs(today - signupDate);
    daysOnStreakd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    totalPosts,
    daysOnStreakd,
    friendCount,
  };
}
