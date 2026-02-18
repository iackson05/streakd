import { apiGet, apiPost, apiPut, apiDelete } from './api';

/**
 * Get all goals for current user
 */
export const getUserGoals = async (userId) => {
  try {
    const goals = await apiGet('/goals/');
    return { goals: goals || [], error: null };
  } catch (error) {
    console.error('Error getting user goals:', error);
    return { goals: null, error };
  }
};

/**
 * Get only active (non-completed) goals
 */
export const getUserActiveGoals = async (userId) => {
  try {
    const goals = await apiGet('/goals/active');
    return { goals: goals || [], error: null };
  } catch (error) {
    console.error('Error getting active goals:', error);
    return { goals: null, error };
  }
};

/**
 * Create a new goal
 */
export const createGoal = async (userId, { title, description, privacy = 'friends', streakInterval = 1 }) => {
  try {
    const goal = await apiPost('/goals/', {
      title: title.trim(),
      description: description?.trim() || null,
      privacy,
      streak_interval: streakInterval,
    });

    return { goal, error: null };
  } catch (error) {
    console.error('Error creating goal:', error);
    return { goal: null, error };
  }
};

/**
 * Increment a goal's streak count and update last_posted_at
 */
export const incrementGoalStreak = async (goalId) => {
  try {
    const goal = await apiPut(`/goals/${goalId}/streak`);
    return { goal, error: null };
  } catch (error) {
    console.error('Error incrementing goal streak:', error);
    return { goal: null, error };
  }
};

/**
 * Delete a goal and all its associated posts
 */
export const deleteGoal = async (goalId, userId) => {
  try {
    await apiDelete(`/goals/${goalId}`);
    return { error: null };
  } catch (error) {
    console.error('Error deleting goal:', error);
    return { error };
  }
};

/**
 * Mark a goal as completed
 */
export const completeGoal = async (goalId, userId) => {
  try {
    const goal = await apiPut(`/goals/${goalId}/complete`);
    return { goal, deletedPostCount: 0, error: null };
  } catch (error) {
    console.error('Error completing goal:', error);
    return { goal: null, deletedPostCount: 0, error };
  }
};
