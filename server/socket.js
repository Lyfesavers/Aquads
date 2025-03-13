// Socket.io singleton instance
let io;

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
    console.log('Client connected');
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${reason}`);
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
    console.warn('Socket.io not initialized, cannot emit ad update');
    return;
  }
  
  console.log(`Emitting adsUpdated event: ${type}`, ad.id);
  io.emit('adsUpdated', { type, ad });
}

module.exports = {
  init,
  getIO: () => getIO(),
  emitAdUpdate
}; 