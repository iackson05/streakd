import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import { apiGet } from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext({});

export const DataProvider = ({ children }) => {
  const { user } = useAuth();

  // Use refs for lastFetch to avoid dependency cycles in useCallback
  const profileLastFetch = useRef(null);
  const friendsLastFetch = useRef(null);
  const feedLastFetch = useRef(null);

  // In-flight guards to prevent duplicate concurrent requests
  const isFetchingProfile = useRef(false);
  const isFetchingFriends = useRef(false);
  const isFetchingFeed = useRef(false);

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

  // Short debounce: prevents hammering the API when navigating quickly between screens.
  // After this window, the fetch runs silently in the background (SWR pattern).
  const DEBOUNCE_MS = 30 * 1000;

  // Profile data fetcher
  const fetchProfileData = useCallback(async (force = false) => {
    if (!user) return;
    if (isFetchingProfile.current) return;
    if (!force && profileLastFetch.current && Date.now() - profileLastFetch.current < DEBOUNCE_MS) {
      return;
    }

    isFetchingProfile.current = true;
    setProfileData(prev => ({ ...prev, loading: true }));

    try {
      const [goals, profileInfo, friendsResult, allPosts] = await Promise.all([
        apiGet('/goals/'),
        apiGet(`/users/profile/${user.id}`),
        apiGet('/friends/accepted-ids'),
        apiGet('/posts/user').catch(() => []),
      ]);

      const friendCount = friendsResult?.friend_ids?.length || 0;

      // Calculate stats
      const stats = calculateStats(allPosts, profileInfo?.created_at, friendCount);

      const now = Date.now();
      profileLastFetch.current = now;

      const newData = {
        goals: goals || [],
        posts: allPosts,
        stats,
        lastFetch: now,
        loading: false,
      };

      setProfileData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setProfileData(prev => ({ ...prev, loading: false }));
      throw error;
    } finally {
      isFetchingProfile.current = false;
    }
  }, [user]);

  // Friends data fetcher
  const fetchFriendsData = useCallback(async (force = false) => {
    if (!user) return;
    if (isFetchingFriends.current) return;
    if (!force && friendsLastFetch.current && Date.now() - friendsLastFetch.current < DEBOUNCE_MS) {
      return;
    }

    isFetchingFriends.current = true;
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
          is_subscribed: friendship.friend_is_subscribed || false,
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

      const now = Date.now();
      friendsLastFetch.current = now;

      const newData = {
        friends,
        pendingRequests,
        lastFetch: now,
        loading: false,
      };

      setFriendsData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching friends data:', error);
      setFriendsData(prev => ({ ...prev, loading: false }));
      throw error;
    } finally {
      isFetchingFriends.current = false;
    }
  }, [user]);

  // Feed data fetcher
  const fetchFeedData = useCallback(async (force = false) => {
    if (!user) return;
    if (isFetchingFeed.current) return;
    if (!force && feedLastFetch.current && Date.now() - feedLastFetch.current < DEBOUNCE_MS) {
      return;
    }

    isFetchingFeed.current = true;
    setFeedData(prev => ({ ...prev, loading: true }));

    try {
      // Backend handles friend filtering, privacy, and 24h window
      const posts = await apiGet('/posts/feed');

      const now = Date.now();
      feedLastFetch.current = now;

      const newData = {
        posts: posts || [],
        lastFetch: now,
        loading: false,
      };

      setFeedData(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching feed data:', error);
      setFeedData(prev => ({ ...prev, loading: false }));
      throw error;
    } finally {
      isFetchingFeed.current = false;
    }
  }, [user]);

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

      // Remove all posts for this goal from the profile cache
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

  // Streakd+: archive keeps the goal + all its posts in the cache
  const markGoalArchived = (goalId) => {
    setProfileData(prev => ({
      ...prev,
      goals: prev.goals.map(g =>
        g.id === goalId ? { ...g, completed: true, archived: true } : g
      ),
    }));

    // Remove from friend feed (24h window) but keep on profile
    feedLastFetch.current = null;
    setFeedData(prev => ({
      ...prev,
      posts: prev.posts.filter(p => p.goal_id !== goalId),
      lastFetch: null,
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
  const invalidateProfile = () => {
    profileLastFetch.current = null;
    setProfileData(prev => ({ ...prev, lastFetch: null }));
  };
  const invalidateFriends = () => {
    friendsLastFetch.current = null;
    setFriendsData(prev => ({ ...prev, lastFetch: null }));
  };
  const invalidateFeed = () => {
    feedLastFetch.current = null;
    setFeedData(prev => ({ ...prev, lastFetch: null }));
  };

  const value = {
    // Profile
    profileData,
    fetchProfileData,
    invalidateProfile,
    addGoal,
    removeGoal,
    markGoalCompleted,
    markGoalArchived,
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
