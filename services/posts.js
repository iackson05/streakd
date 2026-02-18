import { apiGet, apiPost, apiDelete, apiFetch } from './api';

/**
 * Get feed posts (friends + self, last 24 hours, privacy filtered)
 * Backend handles all filtering.
 */
export const getFeedPosts = async (userId) => {
  try {
    const posts = await apiGet('/posts/feed');
    return { posts: posts || [], error: null };
  } catch (error) {
    console.error('Error loading feed posts:', error);
    return { posts: null, error };
  }
};

/**
 * Get all posts for a specific goal
 */
export const getGoalPosts = async (goalId) => {
  try {
    const posts = await apiGet(`/posts/goal/${goalId}`);
    return { posts: posts || [], error: null };
  } catch (error) {
    console.error('Error loading goal posts:', error);
    return { posts: null, error };
  }
};

/**
 * Upload image and create a new post in one step.
 * Backend handles image upload to R2 via multipart form.
 */
export const uploadPostImage = async (userId, photoUri) => {
  // This is now handled as part of createPost, but we keep the function
  // for backwards compatibility. The createPost function sends the image.
  // Return a placeholder - the actual URL comes from createPost.
  return { publicUrl: photoUri, error: null };
};

/**
 * Create a new post with image upload
 */
export const createPost = async (userId, goalId, imageUri) => {
  try {
    const formData = new FormData();
    formData.append('goal_id', goalId);
    formData.append('image', {
      uri: imageUri,
      name: `post_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    const res = await apiFetch('/posts/', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Create post failed');
    }

    const post = await res.json();
    return { post, error: null };
  } catch (error) {
    console.error('Error creating post:', error);
    return { post: null, error };
  }
};

/**
 * Batch fetch user reactions for multiple posts
 */
export const getUserReactionsForPosts = async (userId, postIds) => {
  if (!postIds || postIds.length === 0) {
    return { reactions: {}, error: null };
  }

  try {
    const data = await apiGet(`/reactions/user?post_ids=${postIds.join(',')}`);

    // Convert array to map: { postId: emoji }
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
 * Delete a post (backend handles image cleanup)
 */
export const deletePost = async (postId, userId) => {
  try {
    await apiDelete(`/posts/${postId}`);
    return { error: null };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { error };
  }
};

/**
 * Delete all posts for a goal (handled by backend cascade on goal delete)
 */
export const deletePostsForGoal = async (goalId, userId) => {
  // Backend handles this via cascade when deleting a goal
  return { deletedCount: 0, error: null };
};
