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

    // Handle user authentication and online status
    socket.on('userOnline', async (userData) => {
      if (userData && userData.userId) {
        try {
          const User = require('./models/User');
          
          // First check if user exists
          const existingUser = await User.findById(userData.userId);
          if (!existingUser) {
            return;
          }
          
          // Update user online status in database
          const result = await User.findByIdAndUpdate(userData.userId, {
            isOnline: true,
            lastActivity: new Date()
          }, { new: true });

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

        } catch (error) {
          // Silent error handling
        }
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
          // Silent error handling
        }
      }
    });

    socket.on('error', (error) => {
      // Silent error handling
    });

    socket.on('disconnect', async (reason) => {
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

        } catch (error) {
          // Silent error handling
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

    // Simple leaderboard update broadcast
    socket.on('leaderboardUpdate', (data) => {
      socket.broadcast.emit('leaderboardUpdated', data);
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

// Utility function to emit token updates
function emitTokenUpdate(type, tokens) {
  if (!io) {
    return;
  }
  
  io.emit('tokensUpdated', { type, tokens });
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
  emitTokenUpdate,
  getOnlineUsersCount,
  isUserOnline,
  getConnectedUsers,
  connectedUsers
}; 