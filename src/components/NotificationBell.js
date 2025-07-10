import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { API_URL } from '../services/api';
import logger from '../utils/logger';
import emailService from '../services/emailService';

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

  // Check if we have a user and token before trying to fetch
  useEffect(() => {
    if (currentUser && currentUser.token) {
      tryFetchNotifications();
    }
  }, [currentUser]);

  // Process email triggers from notifications
  const processEmailTriggers = useCallback(async (notifications) => {
    for (const notification of notifications) {
      // Only process unread notifications with email triggers
      if (!notification.isRead && notification.emailTrigger) {
        const { type, buyerEmail, bookingDetails } = notification.emailTrigger;
        
        if (type === 'buyer_acceptance' && buyerEmail && bookingDetails) {
          try {
            await emailService.sendBuyerAcceptanceEmail(buyerEmail, bookingDetails);
            
            // Mark the notification as processed by removing the email trigger
            // This prevents sending the same email multiple times
            try {
              const basePath = window.WORKING_NOTIFICATION_PATH || `${API_URL}/bookings/user-notifications`;
              await fetch(`${basePath}/${notification._id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${currentUser.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailTrigger: null })
              });
            } catch (error) {
              // Continue even if this fails
            }
          } catch (error) {
            console.error('Error sending buyer acceptance email:', error);
          }
        }
      }
    }
  }, [currentUser]);

  // Use callback for tryFetchNotifications to prevent recreation
  const tryFetchNotifications = useCallback(async () => {
    if (!currentUser || !currentUser.token) return;
    
    hasAttemptedFetch.current = true;
    
    // Add the new alternate path
    const possiblePaths = [
      `${API_URL}/notifications`,
      `${API_URL}/api/notifications`,
      `/api/notifications`,
      `${API_URL}/bookings/user-notifications`, // Add this new path
      `${window.location.origin}/api/notifications`
    ];
    
    for (const path of possiblePaths) {
      try {
        const response = await fetch(path, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
          const unread = data.filter(note => !note.isRead).length;
          setUnreadCount(unread);
          setApiAvailable(true);
          
          // Process email triggers for new unread notifications
          await processEmailTriggers(data);
          
          // Store the working path for future use
          window.WORKING_NOTIFICATION_PATH = path;
          return;
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    setApiAvailable(false);
  }, [currentUser, processEmailTriggers]);
  
  // Use memoized debounced version of fetch
  const debouncedFetchNotifications = useCallback(
    debounce(() => {
      if (currentUser && currentUser.token) {
        tryFetchNotifications();
      }
    }, 300),
    [tryFetchNotifications]
  );

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
  
  // Use effect to try alternate paths on initial load with dependency
  useEffect(() => {
    if (currentUser && currentUser.token) {
      debouncedFetchNotifications();
    }
  }, [currentUser, debouncedFetchNotifications]);

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
      logger.error('Error marking notification as read:', error);
    }
  };

  // Update the markAllAsRead function to use multiple possible endpoints
  const markAllAsRead = async () => {
    if (!currentUser || !currentUser.token) return;
    
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
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
          success = true;
          
          // Remember the working path for future requests
          window.WORKING_MARK_ALL_READ_PATH = path;
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }
  };
  
  // Add a function to handle notification clicks
  const handleNotificationClick = async (notification) => {
    try {
      // Try to mark the notification as read
      if (!notification.isRead) {
        // Use the working notification path if available
        const basePath = window.WORKING_NOTIFICATION_PATH || `${API_URL}/bookings/user-notifications`;
        const markReadPath = `${basePath}/${notification._id}`;
        
        try {
          await fetch(markReadPath, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${currentUser.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isRead: true })
          });
        } catch (error) {
          // Continue even if this fails
        }
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
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

  // Try the test notification endpoint
  const tryTestNotification = async () => {
    if (!currentUser || !currentUser.token) return;
    
    try {
      const response = await fetch(`${API_URL}/bookings/test-notification`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // If test works but main notification path failed, we can use the test path to check
        if (!apiAvailable) {
          setApiAvailable(true);
        }
        
        return true;
      }
    } catch (error) {
      // Continue silently
    }
    
    return false;
  };
  
  // Use effect to try the test route if normal routes fail
  useEffect(() => {
    if (currentUser && currentUser.token && !apiAvailable && hasAttemptedFetch.current) {
      tryTestNotification();
    }
  }, [currentUser, apiAvailable]);
  
  // Set up polling if API is available
  useEffect(() => {
    if (!currentUser || !currentUser.token || !apiAvailable) return;
    
    const pollingInterval = setInterval(() => {
      // Use the working path if we found one
      if (window.WORKING_NOTIFICATION_PATH) {
        fetch(window.WORKING_NOTIFICATION_PATH, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` }
        })
        .then(response => {
          if (response.ok) return response.json();
          throw new Error('Polling failed');
        })
        .then(data => {
          setNotifications(data);
          const unread = data.filter(note => !note.isRead).length;
          setUnreadCount(unread);
          
          // Process email triggers for new notifications
          processEmailTriggers(data);
        })
        .catch(error => {});
      } else {
        // Otherwise try all paths again
        tryFetchNotifications();
      }
    }, 30000);
    
    return () => clearInterval(pollingInterval);
  }, [currentUser, apiAvailable, processEmailTriggers, tryFetchNotifications]);



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
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-700 max-h-96 overflow-y-auto">
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
                           notification.type === 'affiliate' ? '🎉' : '📣'}
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