import { supabase } from './supabase';
import { deletePostsForGoal } from './posts';

/**
 * Get all goals for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{goals: Array|null, error: Error|null}>}
 */
export const getUserGoals = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { goals: data || [], error: null };
  } catch (error) {
    console.error('Error getting user goals:', error);
    return { goals: null, error };
  }
};

/**
 * Get only active (non-completed) goals for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<{goals: Array|null, error: Error|null}>}
 */
export const getUserActiveGoals = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { goals: data || [], error: null };
  } catch (error) {
    console.error('Error getting active goals:', error);
    return { goals: null, error };
  }
};

/**
 * Create a new goal
 * @param {string} userId - The user's ID
 * @param {Object} goalData - Goal details
 * @param {string} goalData.title - Goal title
 * @param {string} [goalData.description] - Goal description
 * @param {string} [goalData.privacy] - Privacy setting ('public', 'friends', 'private')
 * @param {number} [goalData.streakInterval] - Days between required posts
 * @returns {Promise<{goal: Object|null, error: Error|null}>}
 */
export const createGoal = async (userId, { title, description, privacy = 'friends', streakInterval = 1 }) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        privacy,
        streak_interval: streakInterval,
        streak_count: 0,
        completed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { goal: data, error: null };
  } catch (error) {
    console.error('Error creating goal:', error);
    return { goal: null, error };
  }
};

/**
 * Update a goal's last_posted_at timestamp
 * @param {string} goalId - The goal's ID
 * @returns {Promise<{error: Error|null}>}
 */
export const updateGoalLastPostedAt = async (goalId) => {
  try {
    const { error } = await supabase
      .from('goals')
      .update({ last_posted_at: new Date().toISOString() })
      .eq('id', goalId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error updating goal last_posted_at:', error);
    return { error };
  }
};

/**
 * Increment a goal's streak count and update last_posted_at
 * Call this when a user creates a post for a goal
 * @param {string} goalId - The goal's ID
 * @returns {Promise<{goal: Object|null, error: Error|null}>}
 */
export const incrementGoalStreak = async (goalId) => {
  try {
    // First get current streak_count
    const { data: currentGoal, error: fetchError } = await supabase
      .from('goals')
      .select('streak_count')
      .eq('id', goalId)
      .single();

    if (fetchError) throw fetchError;

    const newStreakCount = (currentGoal?.streak_count || 0) + 1;

    // Update streak_count and last_posted_at
    const { data, error } = await supabase
      .from('goals')
      .update({
        streak_count: newStreakCount,
        last_posted_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;

    return { goal: data, error: null };
  } catch (error) {
    console.error('Error incrementing goal streak:', error);
    return { goal: null, error };
  }
};

/**
 * Delete a goal and all its associated posts (including images)
 * @param {string} goalId - The goal's ID
 * @param {string} userId - The user's ID (for verification)
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteGoal = async (goalId, userId) => {
  try {
    // Delete all posts and their images
    const { error: postsError } = await deletePostsForGoal(goalId, userId);

    if (postsError) {
      console.error('Error deleting posts for goal:', postsError);
      // Continue anyway - try to delete the goal
    }

    // Then delete the goal itself
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting goal:', error);
    return { error };
  }
};

/**
 * Mark a goal as completed
 * Deletes all associated posts and images, but keeps the goal record
 * @param {string} goalId - The goal's ID
 * @param {string} userId - The user's ID (for verification)
 * @returns {Promise<{goal: Object|null, deletedPostCount: number, error: Error|null}>}
 */
export const completeGoal = async (goalId, userId) => {
  try {
    // Delete all posts and their images
    const { deletedCount, error: postsError } = await deletePostsForGoal(goalId, userId);

    if (postsError) {
      console.error('Error deleting posts for goal:', postsError);
      // Continue anyway - still mark goal as completed
    }

    // Mark the goal as completed
    const { data: goal, error } = await supabase
      .from('goals')
      .update({ completed: true })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return { goal, deletedPostCount: deletedCount, error: null };
  } catch (error) {
    console.error('Error completing goal:', error);
    return { goal: null, deletedPostCount: 0, error };
  }
};
