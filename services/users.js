import { apiGet, apiPut, apiPost, apiDelete, apiFetch } from './api';

/**
 * Search users by username
 */
export const searchUsers = async (query, currentUserId) => {
  try {
    if (!query.trim()) {
      return { users: [], error: null };
    }

    const users = await apiGet(`/users/search?query=${encodeURIComponent(query)}`);
    return { users: users || [], error: null };
  } catch (error) {
    console.error('Error searching users:', error);
    return { users: null, error };
  }
};

/**
 * Get all friendships for a user (returns a Map for easy lookup)
 */
export const getUserFriendships = async (userId) => {
  try {
    const friendships = await apiGet('/friends/');

    const friendshipMap = new Map();
    friendships?.forEach(friendship => {
      const otherUserId = friendship.user_id === userId
        ? friendship.friend_id
        : friendship.user_id;

      const sentByMe = friendship.user_id === userId;

      friendshipMap.set(otherUserId, {
        status: friendship.status,
        sentByMe,
      });
    });

    return { friendships: friendshipMap, error: null };
  } catch (error) {
    console.error('Error loading friendships:', error);
    return { friendships: null, error };
  }
};

/**
 * Get list of accepted friend IDs
 */
export const getAcceptedFriendIds = async (userId) => {
  try {
    const data = await apiGet('/friends/accepted-ids');
    return { friendIds: data.friend_ids || [], error: null };
  } catch (error) {
    console.error('Error getting accepted friend IDs:', error);
    return { friendIds: null, error };
  }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (userId, friendId) => {
  try {
    await apiPost('/friends/request', { friend_id: friendId });
    return { error: null };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { error };
  }
};

/**
 * Accept a pending friend request
 */
export const acceptFriendRequest = async (senderId, receiverId) => {
  try {
    // We need to find the friendship ID - get all friendships and find the right one
    const friendships = await apiGet('/friends/');
    const friendship = friendships.find(
      f => f.user_id === senderId && f.friend_id === receiverId && f.status === 'pending'
    );

    if (!friendship) throw new Error('Friend request not found');

    await apiPut('/friends/accept', { friendship_id: friendship.id });
    return { error: null };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { error };
  }
};

/**
 * Reject/delete a pending friend request
 */
export const rejectFriendRequest = async (senderId, receiverId) => {
  try {
    const friendships = await apiGet('/friends/');
    const friendship = friendships.find(
      f => f.user_id === senderId && f.friend_id === receiverId && f.status === 'pending'
    );

    if (!friendship) throw new Error('Friend request not found');

    await apiDelete('/friends/reject', { friendship_id: friendship.id });
    return { error: null };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { error };
  }
};

/**
 * Remove an accepted friendship
 */
export const removeFriend = async (userId, friendId) => {
  try {
    await apiDelete(`/friends/${friendId}`);
    return { error: null };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { error };
  }
};

/**
 * Update a user's username
 */
export const updateUsername = async (userId, newUsername) => {
  try {
    await apiPut('/users/username', { username: newUsername.trim() });
    return { error: null };
  } catch (error) {
    console.error('Error updating username:', error);
    return { error };
  }
};

/**
 * Check if a username is available
 */
export const checkUsernameAvailable = async (username, currentUserId) => {
  try {
    const data = await apiGet(`/users/check-username/${encodeURIComponent(username.trim())}`);
    return { available: data.available, error: null };
  } catch (error) {
    console.error('Error checking username:', error);
    return { available: false, error };
  }
};

/**
 * Upload a profile picture
 */
export const uploadProfilePicture = async (userId, imageUri) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: `profile_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    const res = await apiFetch('/users/profile-picture', {
      method: 'PUT',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }

    const data = await res.json();
    return { publicUrl: data.profile_picture_url, error: null };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return { publicUrl: null, error };
  }
};

/**
 * Update push notification settings individually
 * @param {{ streak_reminders: boolean, reactions: boolean, friend_requests: boolean }} settings
 */
export const updateNotificationSettings = async (settings) => {
  try {
    await apiPut('/users/notification-settings', {
      friend_requests: settings.friend_requests,
      reactions: settings.reactions,
      streak_reminders: settings.streak_reminders,
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return { error };
  }
};

/**
 * Get user's notification settings — returns all three fields
 */
export const getNotificationSettings = async () => {
  try {
    const data = await apiGet('/users/notification-settings');
    return {
      streak_reminders: data?.streak_reminders ?? false,
      reactions: data?.reactions ?? false,
      friend_requests: data?.friend_requests ?? false,
      error: null,
    };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return { streak_reminders: false, reactions: false, friend_requests: false, error };
  }
};
