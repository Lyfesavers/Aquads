import { API_URL } from './api';

// Get auth header with token
const getAuthHeader = () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  return currentUser.token ? { 'Authorization': `Bearer ${currentUser.token}` } : {};
};

// Complete a workshop section
export const completeWorkshopSection = async (moduleId, sectionIndex, sectionTitle) => {
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

// Fallback when API is unavailable
export const getWorkshopProgressFallback = () => ({
  completedSections: [],
  sectionCompletions: []
});
