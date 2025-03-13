const socket = require('../socket');

/**
 * Middleware to emit socket events after ad operations
 * @param {string} type - The type of operation ('create', 'update', 'delete')
 * @returns {Function} Express middleware function
 */
const emitAdEvent = (type) => {
  return (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    
    // Override the send function
    res.send = function(data) {
      // Call the original send function
      originalSend.call(this, data);
      
      try {
        // Parse the data if it's a string
        const adData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Emit the socket event
        if (adData && (adData.id || adData._id)) {
          console.log(`Emitting adsUpdated event: ${type}`, adData.id || adData._id);
          socket.emitAdUpdate(type, adData);
        }
      } catch (error) {
        console.error('Error emitting socket event:', error);
      }
    };
    
    next();
  };
};

module.exports = {
  emitAdEvent
}; 