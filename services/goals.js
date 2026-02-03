import { supabase } from './supabase';

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
