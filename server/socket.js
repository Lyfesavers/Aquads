// Socket.io singleton instance
let io;

// Store connected users
const connectedUsers = new Map();

// Initialize the socket.io instance
function init(server) {
  io = require('socket.io')(server, {
    cors: {
      origin: ["https://www.aquads.xyz", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  // Add socket event handlers
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication and online status
    socket.on('userOnline', async (userData) => {
      console.log('Received userOnline event:', userData);
      if (userData && userData.userId) {
        try {
          const User = require('./models/User');
          
          console.log(`Setting user ${userData.username} (${userData.userId}) as online`);
          
          // Update user online status in database
          const result = await User.findByIdAndUpdate(userData.userId, {
            isOnline: true,
            lastActivity: new Date()
          }, { new: true });

          console.log(`Database update result for ${userData.username}:`, {
            isOnline: result?.isOnline,
            lastActivity: result?.lastActivity
          });

          // Store user in connected users map
          connectedUsers.set(socket.id, {
            userId: userData.userId,
            username: userData.username,
            joinedAt: new Date()
          });

          // Join user to their own room for direct messages
          socket.join(`user_${userData.userId}`);

          // Broadcast user online status to all clients
          socket.broadcast.emit('userStatusChanged', {
            userId: userData.userId,
            username: userData.username,
            isOnline: true
          });

          console.log(`User ${userData.username} is now online. Connected users: ${connectedUsers.size}`);
        } catch (error) {
          console.error('Error updating user online status:', error);
        }
      } else {
        console.log('Invalid userData received:', userData);
      }
    });

    // Handle user activity heartbeat
    socket.on('userActivity', async (userData) => {
      if (userData && userData.userId) {
        try {
          const User = require('./models/User');
          await User.findByIdAndUpdate(userData.userId, {
            lastActivity: new Date()
          });
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', async (reason) => {
      console.log('User disconnected:', socket.id, reason);
      
      // Handle user going offline
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        try {
          const User = require('./models/User');
          
          // Update user offline status in database
          await User.findByIdAndUpdate(userInfo.userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          // Remove from connected users
          connectedUsers.delete(socket.id);

          // Broadcast user offline status to all clients
          socket.broadcast.emit('userStatusChanged', {
            userId: userInfo.userId,
            username: userInfo.username,
            isOnline: false,
            lastSeen: new Date()
          });

          console.log(`User ${userInfo.username} is now offline`);
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    });

    // Add back real-time ad updates
    socket.on('adUpdate', (data) => {
      socket.broadcast.emit('adUpdated', data);
    });

    socket.on('adCreate', (data) => {
      socket.broadcast.emit('adCreated', data);
    });

    socket.on('adDelete', (data) => {
      socket.broadcast.emit('adDeleted', data);
    });
  });
  
  return io;
}

// Get the socket.io instance
function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

// Utility function to emit ad updates
function emitAdUpdate(type, ad) {
  if (!io) {
    return;
  }
  
  io.emit('adsUpdated', { type, ad });
}

// Utility function to get online users count
function getOnlineUsersCount() {
  return connectedUsers.size;
}

// Utility function to check if user is online
function isUserOnline(userId) {
  for (const [socketId, userInfo] of connectedUsers.entries()) {
    if (userInfo.userId === userId) {
      return true;
    }
  }
  return false;
}

// Utility function to get connected users
function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

module.exports = {
  init,
  getIO: () => getIO(),
  emitAdUpdate,
  getOnlineUsersCount,
  isUserOnline,
  getConnectedUsers,
  connectedUsers
}; 