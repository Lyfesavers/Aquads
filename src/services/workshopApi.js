import { API_URL } from './api';

// Get auth header with token
const getAuthHeader = () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return currentUser.token ? { 'Authorization': `Bearer ${currentUser.token}` } : {};
};

// Complete a workshop section and earn points
export const completeWorkshopSection = async (moduleId, sectionIndex, points, sectionTitle) => {
  try {
    const response = await fetch(`${API_URL}/workshop/complete-section`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        moduleId,
        sectionIndex,
        points,
        sectionTitle
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete section');
    }

    return await response.json();
  } catch (error) {
    console.error('Error completing workshop section:', error);
    throw error;
  }
};

// Get user's workshop progress
export const getWorkshopProgress = async () => {
  try {
    const response = await fetch(`${API_URL}/workshop/progress`, {
      headers: {
        ...getAuthHeader()
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch progress');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching workshop progress:', error);
    throw error;
  }
};

// Award achievement points
export const awardAchievement = async (achievementId, points, description) => {
  try {
    const response = await fetch(`${API_URL}/workshop/achievement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        achievementId,
        points,
        description
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to award achievement');
    }

    return await response.json();
  } catch (error) {
    console.error('Error awarding achievement:', error);
    throw error;
  }
};

// Get workshop leaderboard
export const getWorkshopLeaderboard = async () => {
  try {
    const response = await fetch(`${API_URL}/workshop/leaderboard`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch leaderboard');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching workshop leaderboard:', error);
    throw error;
  }
};

// Fallback function for when API is not available
export const getWorkshopProgressFallback = () => {
  return {
    totalPoints: 0,
    totalWorkshopPoints: 0,
    completedSections: [],
    workshopHistory: []
  };
};
