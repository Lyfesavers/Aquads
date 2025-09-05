import React from 'react';
import NotificationBell from './NotificationBell';

/**
 * Helper utility to integrate the notification bell into your existing navigation
 * 
 * Usage example:
 * import { addNotificationBell } from './NavUtils';
 * 
 * // In your NavBar component:
 * <div className="flex items-center">
 *   {addNotificationBell(currentUser)}
 *   <UserProfileDropdown />
 * </div>
 */

export const addNotificationBell = (currentUser) => {
  if (!currentUser || !currentUser.token) {
    return null;
  }
  
  return <NotificationBell currentUser={currentUser} />;
};

/**
 * Example of how to modify your existing navigation bar
 * This is just an example - you'll need to adjust it based on your actual NavBar implementation
 */
export const ExampleNavBarWithNotifications = ({ currentUser, ...props }) => {
  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* Your logo and main nav links */}
          <div className="text-xl font-bold">Aquads</div>
          {/* Other nav links */}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Add the notification bell before user profile/buttons */}
          {addNotificationBell(currentUser)}
          
          {/* User profile or login/register buttons */}
          {currentUser ? (
            <div className="flex items-center">
              <img 
                src={currentUser.image || '/default-avatar.png'} 
                alt="Profile" 
                className="w-8 h-8 rounded-full mr-2" 
              />
              <span>{currentUser.username}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-gray-700/90 hover:bg-gray-600/90 rounded text-yellow-400">Login</button>
              <button className="px-4 py-2 bg-gray-700/90 hover:bg-gray-600/90 rounded text-yellow-400">Register</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}; 