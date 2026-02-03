import { supabase } from './supabase';

/**
 * Test connection to Supabase
 */
export const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');

    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    console.log('Success! Users:', data);
    return data;
  } catch (error) {
    console.error('Connection failed:', error);
    return null;
  }
};

/**
 * Search users by username
 * @param {string} query - Search query
 * @param {string} currentUserId - Current user's ID (to exclude from results)
 * @returns {Promise<{users: Array|null, error: Error|null}>}
 */
export const searchUsers = async (query, currentUserId) => {
  try {
    if (!query.trim()) {
      return { users: [], error: null };
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, profile_picture_url')
      .neq('id', currentUserId)
      .or(`username.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    return { users: data || [], error: null };
  } catch (error) {
    console.error('Error searching users:', error);
    return { users: null, error };
  }
};

/**
 * Get all friendships for a user (returns a Map for easy lookup)
 * @param {string} userId - The user's ID
 * @returns {Promise<{friendships: Map|null, error: Error|null}>}
 */
export const getUserFriendships = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) throw error;

    const friendshipMap = new Map();
    data?.forEach(friendship => {
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
 * @param {string} userId - The user's ID
 * @returns {Promise<{friendIds: Array|null, error: Error|null}>}
 */
export const getAcceptedFriendIds = async (userId) => {
  try {
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    const friendIds = friendships?.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    ) || [];

    return { friendIds, error: null };
  } catch (error) {
    console.error('Error getting accepted friend IDs:', error);
    return { friendIds: null, error };
  }
};

/**
 * Send a friend request
 * @param {string} userId - The sender's ID
 * @param {string} friendId - The recipient's ID
 * @returns {Promise<{error: Error|null}>}
 */
export const sendFriendRequest = async (userId, friendId) => {
  try {
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { error };
  }
};

/**
 * Accept a pending friend request
 * @param {string} senderId - The original sender's ID
 * @param {string} receiverId - The receiver's ID (current user)
 * @returns {Promise<{error: Error|null}>}
 */
export const acceptFriendRequest = async (senderId, receiverId) => {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', senderId)
      .eq('friend_id', receiverId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { error };
  }
};

/**
 * Reject/delete a pending friend request
 * @param {string} senderId - The original sender's ID
 * @param {string} receiverId - The receiver's ID (current user)
 * @returns {Promise<{error: Error|null}>}
 */
export const rejectFriendRequest = async (senderId, receiverId) => {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', senderId)
      .eq('friend_id', receiverId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return { error };
  }
};

/**
 * Remove an accepted friendship (works for either direction)
 * @param {string} userId - One user's ID
 * @param {string} friendId - The other user's ID
 * @returns {Promise<{error: Error|null}>}
 */
export const removeFriend = async (userId, friendId) => {
  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
      );

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { error };
  }
};
