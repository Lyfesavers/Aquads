require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const Ad = require('./models/Ad');
const User = require('./models/User');
const BumpRequest = require('./models/BumpRequest');
const bumpRoutes = require('./routes/bumps');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/error');
const path = require('path');
const fs = require('fs');
const upload = require('./middleware/upload');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Middleware
const corsOptions = {
  origin: true, // Allow all origins temporarily for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
  }
  // Ensure directory has proper permissions
  fs.chmodSync(uploadsDir, 0o755);
  console.log('Uploads directory ready:', uploadsDir);
} catch (error) {
  console.error('Error setting up uploads directory:', error);
}

// Serve static files from uploads directory - move this before other middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "*"],
      connectSrc: ["'self'", "wss:", "https:", "*"],
      frameSrc: ["'self'", "*"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Add rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 5000, // Increased limit
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting only to specific routes
app.use('/api/login', limiter);
app.use('/api/register', limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  // Don't exit the process, let it retry
});

// Add error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Add reconnect handler
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
});

// Add connection monitoring
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('error', (error) => {
    logger.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${reason}`);
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

// Routes
app.use('/api/bumps', bumpRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/services', require('./routes/services'));

// Create new ad
app.post('/api/ads', auth, async (req, res) => {
  try {
    const ad = new Ad(req.body);
    const savedAd = await ad.save();
    io.emit('adsUpdated', { type: 'create', ad: savedAd });
    res.status(201).json(savedAd);
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

// Update ad
app.put('/api/ads/:id', auth, async (req, res) => {
  try {
    const updatedAd = await Ad.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    io.emit('adsUpdated', { type: 'update', ad: updatedAd });
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

// Delete ad
app.delete('/api/ads/:id', auth, async (req, res) => {
  try {
    const deletedAd = await Ad.findOneAndDelete({ id: req.params.id });
    io.emit('adsUpdated', { type: 'delete', ad: deletedAd });
    res.json(deletedAd);
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

// Login
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);
    
    // Find user case-insensitive
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Handle different password formats
    let isMatch = false;
    
    // For admin or test account with plain text password
    if ((user.isAdmin || user.username === 'test') && password === user.password) {
      isMatch = true;
    } 
    // For hashed passwords
    else if (user.password.startsWith('$2b$')) {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (error) {
        console.error('Password comparison error:', error);
      }
    }
    // For any other plain text passwords
    else {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    // Send response
    res.json({
      token,
      username: user.username,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Add verify token endpoint
app.get('/api/verify-token', auth, (req, res) => {
  try {
    res.json({ valid: true, user: req.user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Register
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password, image } = req.body;
    console.log('Registration attempt with username:', username);
    console.log('Registration data:', { username, image });
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists (case-insensitive)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const user = new User({
      username,
      password,
      image: image || 'https://placehold.co/400x400?text=User',
      isAdmin: username === 'admin'
    });

    await user.save();
    console.log('User saved successfully:', { username: user.username, image: user.image });

    // Generate token for auto-login
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      username: user.username,
      isAdmin: user.isAdmin,
      image: user.image,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1 });
});

// Add test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip HTTPS redirect for uploads directory
    if (req.path.startsWith('/uploads/')) {
      return next();
    }
    
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('Host')}${req.url}`);
    }
    next();
  });
}

// Apply a more lenient rate limit to other API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000,
  message: 'Too many API requests from this IP, please try again later'
});

app.use('/api', apiLimiter); 