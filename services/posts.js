import { supabase } from './supabase';

/**
 * Get feed posts (friends + self, last 24 hours, privacy filtered)
 * @param {string} userId - The current user's ID
 * @returns {Promise<{posts: Array|null, error: Error|null}>}
 */
export const getFeedPosts = async (userId) => {
  try {
    // Get user's friends (accepted only)
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (friendError) throw friendError;

    // Build list of friend IDs
    const friendIds = friendships?.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    ) || [];

    // Include current user in the list
    const userIds = [userId, ...friendIds];

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get posts from friends + self
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
          privacy,
          streak_count
        )
      `)
      .in('user_id', userIds)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out private posts from other users
    const filteredPosts = data?.filter(post => {
      // Always show own posts
      if (post.user_id === userId) return true;

      // Only show friends' posts if goal is not private
      return post.goals?.privacy !== 'private';
    }) || [];

    return { posts: filteredPosts, error: null };
  } catch (error) {
    console.error('Error loading feed posts:', error);
    return { posts: null, error };
  }
};

/**
 * Get all posts for a specific goal
 * @param {string} goalId - The goal's ID
 * @returns {Promise<{posts: Array|null, error: Error|null}>}
 */
export const getGoalPosts = async (goalId) => {
  try {
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
          streak_count
        )
      `)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { posts: data || [], error: null };
  } catch (error) {
    console.error('Error loading goal posts:', error);
    return { posts: null, error };
  }
};

/**
 * Upload a post image to Supabase storage
 * @param {string} userId - The user's ID
 * @param {string} photoUri - The local URI of the photo
 * @returns {Promise<{publicUrl: string|null, error: Error|null}>}
 */
export const uploadPostImage = async (userId, photoUri) => {
  try {
    const fileName = userId + '/' + Date.now() + '.jpg';
    const formData = new FormData();
    formData.append('file', {
      uri: photoUri,
      name: fileName,
      type: 'image/jpeg',
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, formData, {
        contentType: 'image/jpeg',
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return { publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading post image:', error);
    return { publicUrl: null, error };
  }
};

/**
 * Create a new post record
 * @param {string} userId - The user's ID
 * @param {string} goalId - The goal's ID
 * @param {string} imageUrl - The public URL of the uploaded image
 * @returns {Promise<{post: Object|null, error: Error|null}>}
 */
export const createPost = async (userId, goalId, imageUrl) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        goal_id: goalId,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { post: data, error: null };
  } catch (error) {
    console.error('Error creating post:', error);
    return { post: null, error };
  }
};

/**
 * Batch fetch user reactions for multiple posts
 * @param {string} userId - The current user's ID
 * @param {string[]} postIds - Array of post IDs
 * @returns {Promise<{reactions: Object, error: Error|null}>} - Object mapping postId to emoji
 */
export const getUserReactionsForPosts = async (userId, postIds) => {
  if (!postIds || postIds.length === 0) {
    return { reactions: {}, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('reactions')
      .select('post_id, react_emoji')
      .eq('user_id_who_reacted', userId)
      .in('post_id', postIds);

    if (error) throw error;

    // Convert to a map: { postId: emoji }
    const reactions = {};
    data?.forEach(r => {
      reactions[r.post_id] = r.react_emoji;
    });

    return { reactions, error: null };
  } catch (error) {
    console.error('Error fetching user reactions:', error);
    return { reactions: {}, error };
  }
};

/**
 * Extract storage path from a public URL
 * @param {string} publicUrl - The full public URL of the image
 * @returns {string|null} - The storage path (e.g., "userId/timestamp.jpg")
 */
const extractStoragePath = (publicUrl) => {
  if (!publicUrl) return null;

  // URL format: https://xxx.supabase.co/storage/v1/object/public/post-images/userId/timestamp.jpg
  const match = publicUrl.match(/\/post-images\/(.+)$/);
  return match ? match[1] : null;
};

/**
 * Delete an image from storage
 * @param {string} imageUrl - The public URL of the image
 * @returns {Promise<{error: Error|null}>}
 */
export const deletePostImage = async (imageUrl) => {
  try {
    const storagePath = extractStoragePath(imageUrl);
    if (!storagePath) {
      console.warn('Could not extract storage path from URL:', imageUrl);
      return { error: null }; // Not a critical error
    }

    const { error } = await supabase.storage
      .from('post-images')
      .remove([storagePath]);

    if (error) {
      console.error('Error deleting image from storage:', error);
      // Don't throw - image deletion failure shouldn't block post deletion
    }

    return { error: null };
  } catch (error) {
    console.error('Error in deletePostImage:', error);
    return { error };
  }
};

/**
 * Delete a post and its associated image
 * @param {string} postId - The post's ID
 * @param {string} userId - The user's ID (for verification)
 * @returns {Promise<{error: Error|null}>}
 */
export const deletePost = async (postId, userId) => {
  try {
    // First, get the post to retrieve the image URL
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('image_url')
      .eq('id', postId)
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Delete the image from storage (if post exists)
    if (post?.image_url) {
      await deletePostImage(post.image_url);
    }

    // Delete the post record
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { error };
  }
};

/**
 * Delete all posts for a goal and their images
 * @param {string} goalId - The goal's ID
 * @param {string} userId - The user's ID (for verification)
 * @returns {Promise<{deletedCount: number, error: Error|null}>}
 */
export const deletePostsForGoal = async (goalId, userId) => {
  try {
    // Get all posts for this goal
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, image_url')
      .eq('goal_id', goalId)
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    const deletedCount = posts?.length || 0;

    // Delete all images from storage
    if (posts && posts.length > 0) {
      const imagePaths = posts
        .map(p => extractStoragePath(p.image_url))
        .filter(Boolean);

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('post-images')
          .remove(imagePaths);

        if (storageError) {
          console.error('Error deleting images from storage:', storageError);
          // Continue anyway - don't block post deletion
        }
      }
    }

    // Delete all post records
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('goal_id', goalId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return { deletedCount, error: null };
  } catch (error) {
    console.error('Error deleting posts for goal:', error);
    return { deletedCount: 0, error };
  }
};
