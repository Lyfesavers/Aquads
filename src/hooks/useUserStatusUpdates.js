import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const useUserStatusUpdates = () => {
  const [userStatuses, setUserStatuses] = useState(new Map());
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection for listening to status updates
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    const socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5
    });

    setSocket(socketInstance);

    // Listen for user status changes
    socketInstance.on('userStatusChanged', (statusUpdate) => {
      const { userId, username, isOnline, lastSeen } = statusUpdate;
      
      setUserStatuses(prevStatuses => {
        const newStatuses = new Map(prevStatuses);
        newStatuses.set(userId, {
          userId,
          username,
          isOnline,
          lastSeen: lastSeen || new Date(),
          lastActivity: isOnline ? new Date() : (lastSeen || new Date())
        });
        return newStatuses;
      });
    });

    // Handle socket connection events
    socketInstance.on('connect', () => {
      // Silent connection
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Status listener connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Function to get user status by ID
  const getUserStatus = (userId) => {
    return userStatuses.get(userId);
  };

  // Function to check if user is online
  const isUserOnline = (userId) => {
    const status = userStatuses.get(userId);
    return status?.isOnline || false;
  };

  // Function to get user's last seen time
  const getUserLastSeen = (userId) => {
    const status = userStatuses.get(userId);
    return status?.lastSeen;
  };

  // Function to manually update user status (for initial data)
  const updateUserStatus = (userId, statusData) => {
    setUserStatuses(prevStatuses => {
      const newStatuses = new Map(prevStatuses);
      newStatuses.set(userId, {
        userId,
        ...statusData
      });
      return newStatuses;
    });
  };

  // Function to bulk update user statuses (for initial load)
  const bulkUpdateUserStatuses = (users) => {
    setUserStatuses(prevStatuses => {
      const newStatuses = new Map(prevStatuses);
      users.forEach(user => {
        if (user._id) {
          newStatuses.set(user._id, {
            userId: user._id,
            username: user.username,
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen || new Date(),
            lastActivity: user.lastActivity || new Date()
          });
        }
      });
      return newStatuses;
    });
  };

  return {
    userStatuses,
    getUserStatus,
    isUserOnline,
    getUserLastSeen,
    updateUserStatus,
    bulkUpdateUserStatuses,
    socket
  };
};

export default useUserStatusUpdates; 