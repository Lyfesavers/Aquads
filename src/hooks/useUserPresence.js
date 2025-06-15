import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const useUserPresence = (currentUser) => {
  const socketRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  useEffect(() => {
    if (!currentUser) {
      // Disconnect socket if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Initialize socket connection
    const initializeSocket = () => {
      const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5
      });

      // Emit user online status when connected
      socketRef.current.on('connect', () => {
        socketRef.current.emit('userOnline', {
          userId: currentUser.userId,
          username: currentUser.username
        });
      });

      // Handle connection errors
      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      // Handle reconnection
      socketRef.current.on('reconnect', () => {
        socketRef.current.emit('userOnline', {
          userId: currentUser.userId,
          username: currentUser.username
        });
      });

      // Start heartbeat to keep user active
      startHeartbeat();
    };

    // Start heartbeat to send activity updates
    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('userActivity', {
            userId: currentUser.userId,
            username: currentUser.username
          });
        }
      }, 30000); // Send heartbeat every 30 seconds
    };

    // Initialize socket
    initializeSocket();

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socketRef.current) {
        // User came back to the page
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
        socketRef.current.emit('userActivity', {
          userId: currentUser.userId,
          username: currentUser.username
        });
      }
    };

    // Handle user activity (mouse movement, clicks, key presses)
    const handleUserActivity = () => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('userActivity', {
          userId: currentUser.userId,
          username: currentUser.username
        });
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
    };
  }, [currentUser]);

  // Return socket instance for use in other components
  return socketRef.current;
};

export default useUserPresence; 