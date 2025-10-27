// Utility functions for name display

/**
 * Gets the display name for a user (first name if available, otherwise username)
 * @param {Object} user - User object with cv.fullName and username
 * @returns {string} - First name or username
 */
export const getDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  // Try to get first name from cv.fullName
  if (user.cv?.fullName && user.cv.fullName.trim()) {
    const firstName = user.cv.fullName.trim().split(' ')[0];
    return firstName;
  }
  
  // Fall back to username
  return user.username || 'Unknown User';
};

/**
 * Gets the full name if available, otherwise username
 * @param {Object} user - User object with cv.fullName and username
 * @returns {string} - Full name or username
 */
export const getFullDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  // Try to get full name from cv.fullName
  if (user.cv?.fullName && user.cv.fullName.trim()) {
    return user.cv.fullName.trim();
  }
  
  // Fall back to username
  return user.username || 'Unknown User';
};

/**
 * Gets initials from full name or username
 * @param {Object} user - User object with cv.fullName and username
 * @returns {string} - Initials (e.g., "JS" for "John Smith")
 */
export const getInitials = (user) => {
  if (!user) return 'U';
  
  // Try to get initials from cv.fullName
  if (user.cv?.fullName && user.cv.fullName.trim()) {
    const nameParts = user.cv.fullName.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    }
    return nameParts[0][0].toUpperCase();
  }
  
  // Fall back to username initial
  return (user.username || 'U')[0].toUpperCase();
};

