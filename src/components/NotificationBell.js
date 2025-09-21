import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { API_URL, socket } from '../services/api';
import logger from '../utils/logger';

// Debounce utility function - placed outside component to avoid recreation
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const NotificationBell = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true); // Track if API is available
  const [showReadNotifications, setShowReadNotifications] = useState(false); // New state for toggle
  const dropdownRef = useRef(null);
  const hasAttemptedFetch = useRef(false); // Prevent multiple failed fetch attempts
  const isMarkingAllRead = useRef(false); // Prevent duplicate mark-all-read calls
  const refreshTimeoutRef = useRef(null); // Track refresh timeout

  // Socket listener for real-time notification updates (same pattern as Dashboard lines 186-230)
  useEffect(() => {
    if (socket && currentUser) {
      // Join user's room for direct updates (same as Dashboard line 189)
      socket.emit('userOnline', {
        userId: currentUser.userId,
        username: currentUser.username
      });

      // Request initial notifications via socket (same pattern as Dashboard line 179)
      socket.emit('requestUserNotifications', {
        userId: currentUser.userId
      });

      // Socket handlers for real-time updates
      const handleNotificationsLoaded = (data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setApiAvailable(true);
      };

      const handleNotificationsError = (error) => {
        console.error('Error loading notifications via socket:', error);
        setApiAvailable(false);
      };

      const handleNewNotification = (data) => {
        if (data.userId === (currentUser.userId || currentUser.id)) {
          setNotifications(prev => [data.notification, ...prev]);
          setUnreadCount(data.unreadCount);
        }
      };

      const handleNotificationRead = (data) => {
        if (data.userId === (currentUser.userId || currentUser.id)) {
          setNotifications(prev => 
            prev.map(n => n._id === data.notificationId ? { ...n, isRead: true } : n)
          );
          setUnreadCount(data.unreadCount);
        }
      };

      const handleAllNotificationsRead = (data) => {
        if (data.userId === (currentUser.userId || currentUser.id)) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
        }
      };

      // Add socket listeners (same pattern as Dashboard lines 220-222)
      socket.on('userNotificationsLoaded', handleNotificationsLoaded);
      socket.on('userNotificationsError', handleNotificationsError);
      socket.on('newNotification', handleNewNotification);
      socket.on('notificationRead', handleNotificationRead);
      socket.on('allNotificationsRead', handleAllNotificationsRead);

      return () => {
        // Cleanup socket listeners (same pattern as Dashboard lines 224-228)
        socket.off('userNotificationsLoaded', handleNotificationsLoaded);
        socket.off('userNotificationsError', handleNotificationsError);
        socket.off('newNotification', handleNewNotification);
        socket.off('notificationRead', handleNotificationRead);
        socket.off('allNotificationsRead', handleAllNotificationsRead);
      };
    }
  }, [socket, currentUser]);



  // Pure socket approach - no API fallbacks to prevent query overrides

  // Handle click outside with useCallback to prevent recreation on each render
  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  }, []);

  // Optimize this effect with proper dependencies
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);
  
  // Mark notification as read - API call triggers socket emission
  const markAsRead = async (notificationId) => {
    if (!currentUser || !currentUser.token) return;

    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');
      
      // Socket will handle the real-time UI update via 'notificationRead' event
      // No local state updates needed - socket handles everything
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  };

  // Update the markAllAsRead function to use multiple possible endpoints
  const markAllAsRead = async () => {
    if (!currentUser || !currentUser.token) return;
    
    // Prevent duplicate calls
    if (isMarkingAllRead.current) {
      return;
    }
    
    isMarkingAllRead.current = true;
    
    // Try different possible paths for marking all as read
    const possibleMarkAllReadPaths = [
      `${API_URL}/notifications/mark-all-read`,
      `${API_URL}/bookings/user-notifications/mark-all-read`, // Add this new path
      `/api/notifications/mark-all-read`
    ];
    
    let success = false;
    
    for (const path of possibleMarkAllReadPaths) {
      try {
        const response = await fetch(path, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          success = true;
          
          // Socket will handle the real-time UI update via 'allNotificationsRead' event
          // No local state updates needed - socket handles everything
          
          // Remember the working path for future requests
          window.WORKING_MARK_ALL_READ_PATH = path;
          
          break;
        } else {
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    // Reset the flag after a delay to allow for any pending operations
    setTimeout(() => {
      isMarkingAllRead.current = false;
    }, 2000);
  };
  
  // Add a function to handle notification clicks
  const handleNotificationClick = async (notification) => {
    try {
      // Try to mark the notification as read
      if (!notification.isRead) {
        // Try both mark-as-read endpoints (same pattern as fetching)
        const markReadPaths = [
          `${API_URL}/notifications/${notification._id}/read`,           // Main endpoint
          `${API_URL}/bookings/user-notifications/${notification._id}`,  // Booking endpoint
          `${API_URL}/api/notifications/${notification._id}/read`,
          `${API_URL}/api/bookings/user-notifications/${notification._id}`,
          `/api/notifications/${notification._id}/read`,
          `/api/bookings/user-notifications/${notification._id}`
        ];
        
        let markReadSuccess = false;
        for (const markReadPath of markReadPaths) {
          try {
            const response = await fetch(markReadPath, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ isRead: true })
            });
            
            if (response.ok) {
              const responseData = await response.json();
              markReadSuccess = true;
              break;
            } else {
              const errorData = await response.text();
            }
          } catch (error) {
          }
        }
        
        if (!markReadSuccess) {
          return; // Don't navigate if backend update failed
        }
        
        // Socket will handle the real-time UI update via 'notificationRead' event
        // No local state updates needed - socket handles everything
        
      }
      
      // Extract the booking ID from the notification data if available
      let bookingId = null;
      
      // Check if this is a booking-related notification
      if (notification.relatedModel === 'Booking' && notification.relatedId) {
        bookingId = notification.relatedId;
      }
      
      // Check if the link contains a booking ID
      if (notification.link && notification.link.includes('booking=')) {
        const urlParams = new URLSearchParams(notification.link.split('?')[1]);
        bookingId = urlParams.get('booking');
      }
      
      // Close the notification dropdown
      setIsOpen(false);
      
      // Instead of navigating to a new page, use custom events to show the dashboard
      if (bookingId) {
        // Dispatch a custom event to open the dashboard with this booking
        const openDashboardEvent = new CustomEvent('openDashboardWithBooking', { 
          detail: { bookingId: bookingId } 
        });
        window.dispatchEvent(openDashboardEvent);
        
        // Also set a flag in localStorage as a fallback communication method
        localStorage.setItem('aquads_open_booking', bookingId);
        localStorage.setItem('aquads_open_dashboard', 'true');
        localStorage.setItem('aquads_notification_timestamp', Date.now().toString());
        
        // If there's a global function to show the dashboard, use it
        if (typeof window.showDashboard === 'function') {
          window.showDashboard('bookings', bookingId);
        }
      } else if (notification.link) {
        // For non-booking links, we'll still use navigation
        // But first check if it's an internal link we can handle
        if (notification.link.startsWith('/dashboard')) {
          // It's a dashboard link, show dashboard instead of navigating
          const openDashboardEvent = new CustomEvent('openDashboard', { 
            detail: { tab: 'ads' } 
          });
          window.dispatchEvent(openDashboardEvent);
          
          // Set dashboard flag
          localStorage.setItem('aquads_open_dashboard', 'true');
          localStorage.setItem('aquads_notification_timestamp', Date.now().toString());
          
          // If there's a global function to show the dashboard, use it
          if (typeof window.showDashboard === 'function') {
            window.showDashboard('ads');
          }
        } else {
          // External link, use navigation
          window.location.href = notification.link;
        }
      } else {
        // No booking ID or link, just show the dashboard
        const openDashboardEvent = new CustomEvent('openDashboard', { 
          detail: { tab: 'ads' } 
        });
        window.dispatchEvent(openDashboardEvent);
        
        // Set dashboard flag
        localStorage.setItem('aquads_open_dashboard', 'true');
        localStorage.setItem('aquads_notification_timestamp', Date.now().toString());
        
        // If there's a global function to show the dashboard, use it
        if (typeof window.showDashboard === 'function') {
          window.showDashboard('ads');
        }
      }
    } catch (error) {
      // Fallback to simple dashboard open
      if (typeof window.showDashboard === 'function') {
        window.showDashboard('ads');
      }
    }
  };

  // Removed test function - using pure socket approach
  
  // Pure socket approach - removed all API polling to prevent query overrides

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any pending operations
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if user is not logged in
  if (!currentUser || !currentUser.token) {
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
      case 'affiliate':
        return '🎉';
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
        <div className="fixed sm:absolute left-1/2 sm:left-auto sm:right-0 top-16 sm:top-auto mt-0 sm:mt-2 w-80 sm:w-80 bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-700 max-h-96 overflow-y-auto transform -translate-x-1/2 sm:translate-x-0">
          <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setShowReadNotifications(!showReadNotifications)}
                className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
              >
                {showReadNotifications ? 'Hide read' : 'Show all'}
              </button>
            </div>
          </div>

          {notifications.filter(notification => showReadNotifications || !notification.isRead).length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400">
              {showReadNotifications ? 'No notifications' : 'No unread notifications'}
            </div>
          ) : (
            <div>
              {notifications
                .filter(notification => showReadNotifications || !notification.isRead) // Only show unread notifications or all if toggled
                .map((notification) => {
                  const notificationClass = `px-4 py-3 border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-gray-700 bg-opacity-50' : 'opacity-60'
                  }`;
                  
                  return (
                    <div 
                      key={notification._id} 
                      className={notificationClass}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start">
                        <div className="mr-3 text-xl">
                          {notification.type === 'message' ? '💬' : 
                           notification.type === 'booking' ? '📅' : 
                           notification.type === 'review' ? '⭐' : 
                           notification.type === 'affiliate' ? '🎉' : 
                           notification.type === 'service_approved' ? '✅' : 
                           notification.type === 'service_rejected' ? '❌' : '📣'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export as memoized component to prevent unnecessary re-renders
export default memo(NotificationBell); 