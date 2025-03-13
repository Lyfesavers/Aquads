import React, { useState, useEffect, useRef } from 'react';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { API_URL } from '../services/api';

const NotificationBell = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true); // Track if API is available
  const dropdownRef = useRef(null);
  const hasAttemptedFetch = useRef(false); // Prevent multiple failed fetch attempts

  // Fetch notifications
  useEffect(() => {
    // Only fetch if user is logged in and API is available
    if (!currentUser || !currentUser.token || !apiAvailable) return;
    
    // If we've already determined the API is not available, don't keep trying
    if (hasAttemptedFetch.current && !apiAvailable) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_URL}/notifications`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        
        // If endpoint doesn't exist (404) or server error, don't try to fetch again
        if (response.status === 404 || response.status >= 500) {
          console.log('Notifications API not available');
          setApiAvailable(false);
          hasAttemptedFetch.current = true;
          return;
        }
        
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const data = await response.json();
        setNotifications(data);
        
        // Count unread notifications
        const unread = data.filter(note => !note.isRead).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // If fetch fails due to network or server issues, don't try again
        if (error.message.includes('Failed to fetch')) {
          setApiAvailable(false);
          hasAttemptedFetch.current = true;
        }
      }
    };

    fetchNotifications();

    // Only set up polling if API is available
    if (apiAvailable) {
      const intervalId = setInterval(fetchNotifications, 30000);
      return () => clearInterval(intervalId);
    }
  }, [currentUser, apiAvailable]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!currentUser || !currentUser.token || !apiAvailable) return;

    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');

      // Update local state
      setNotifications(prev => prev.map(note => 
        note._id === notificationId ? { ...note, isRead: true } : note
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Clear all notifications
  const markAllAsRead = async () => {
    if (!currentUser || !currentUser.token || !apiAvailable) return;

    try {
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark all notifications as read');

      // Update local state
      setNotifications(prev => prev.map(note => ({ ...note, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Don't render if user is not logged in or if API is not available
  if (!currentUser || !currentUser.token || !apiAvailable) {
    return null;
  }

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'booking':
        return '📅';
      case 'status':
        return '🔔';
      default:
        return '📌';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon with notification count */}
      <button
        className="relative p-2 text-gray-300 hover:text-white focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <FaBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-700 max-h-96 overflow-y-auto">
          <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400">
              No notifications
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-gray-700 bg-opacity-50' : ''
                  }`}
                >
                  <Link
                    to={notification.link || '#'}
                    onClick={() => markAsRead(notification._id)}
                    className="block"
                  >
                    <div className="flex items-start">
                      <div className="mr-3 text-xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 