const axios = require('axios');

const SERVER_URL = 'https://aquads.onrender.com';
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

const keepServerAlive = async () => {
  try {
    console.log(`[${new Date().toISOString()}] Pinging server...`);
    
    const startTime = Date.now();
    const response = await axios.get(`${SERVER_URL}/api/health`, {
      timeout: 30000 // 30 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200) {
      console.log(`[${new Date().toISOString()}] ✅ Server is alive! Response time: ${responseTime}ms`);
      
      if (responseTime > 5000) {
        console.log(`[${new Date().toISOString()}] ⚠️  Slow response detected (${responseTime}ms) - server was likely sleeping`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] ❌ Server responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to ping server:`, error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.log(`[${new Date().toISOString()}] ⏰ Request timed out - server might be sleeping`);
    }
  }
};

// Initial ping
keepServerAlive();

// Set up interval
setInterval(keepServerAlive, PING_INTERVAL);

console.log(`[${new Date().toISOString()}] 🚀 Keep-alive service started`);
console.log(`[${new Date().toISOString()}] 📡 Will ping ${SERVER_URL}/api/health every ${PING_INTERVAL / 60000} minutes`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] 🛑 Keep-alive service stopped`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] 🛑 Keep-alive service terminated`);
  process.exit(0);
}); 