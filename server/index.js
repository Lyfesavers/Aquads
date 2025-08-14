require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const Ad = require('./models/Ad');
const User = require('./models/User');
const BumpRequest = require('./models/BumpRequest');
const bumpRoutes = require('./routes/bumps');
const bannerAdsRoutes = require('./routes/bannerAds');
const affiliateRoutes = require('./routes/affiliates');
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
const usersRouter = require('./routes/users');
const jobsRoutes = require('./routes/jobs');
const blogsRoutes = require('./routes/blogs');
// const sitemapRoutes = require('./routes/sitemap'); // Disabled - using static sitemap
const socketModule = require('./socket');
const ipLimiter = require('./middleware/ipLimiter');
const deviceLimiter = require('./middleware/deviceLimiter');
const telegramService = require('./utils/telegramService');

const app = express();
const server = http.createServer(app);
const io = socketModule.init(server);

// Trust proxy when running behind Render/NGINX so rate limit and IP work correctly
app.set('trust proxy', 1);

// Periodic cleanup task for offline users
setInterval(async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Set users as offline if they haven't been active in the last 5 minutes
    const result = await User.updateMany(
      {
        isOnline: true,
        lastActivity: { $lt: fiveMinutesAgo }
      },
      {
        isOnline: false,
        lastSeen: new Date()
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Set ${result.modifiedCount} inactive users as offline`);
    }
  } catch (error) {
    console.error('Error in user cleanup task:', error);
  }
}, 2 * 60 * 1000); // Run every 2 minutes

// Middleware
const corsOptions = {
  origin: ['https://www.aquads.xyz', 'https://aquads.xyz', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With', 'Cache-Control']
};

app.use(cors(corsOptions));

// Add CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://www.aquads.xyz');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
// Ensure both the uploads and uploads/bookings directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const bookingsDir = path.join(__dirname, 'uploads/bookings');

try {
  // Create parent uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created main uploads directory:', uploadsDir);
  }
  
  // Create bookings subdirectory if it doesn't exist
  if (!fs.existsSync(bookingsDir)) {
    fs.mkdirSync(bookingsDir, { recursive: true });
    console.log('Created bookings uploads directory:', bookingsDir);
  }
  
  // Make sure permissions are set correctly (for Linux/Unix systems)
  try {
    fs.chmodSync(uploadsDir, 0o755);
    fs.chmodSync(bookingsDir, 0o755);
    console.log('Set directory permissions');
  } catch (permError) {
    console.log('Note: Could not set directory permissions. This is normal on Windows.');
  }
} catch (error) {
  console.error('Error creating upload directories:', error);
}

// Serve static files from uploads directory - move this before other middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve logo and other public files
app.use(express.static(path.join(__dirname, '../public')));

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
  serverSelectionTimeoutMS: 10000, // Increased to 10s for better mobile connectivity
  socketTimeoutMS: 45000, // Close sockets after 45s
}).then(() => {
  console.log('Connected to MongoDB');
  // Initialize skill tests if they don't exist
  initializeSkillTests();
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

// Routes
app.use('/api/bumps', bumpRoutes);
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/service-reviews', require('./routes/serviceReviews'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/user-tokens', require('./routes/user-tokens'));
app.use('/api/services', require('./routes/services'));
app.use('/api/users', usersRouter);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', require('./routes/points'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/blogs', blogsRoutes);
// app.use('/api/sitemap', sitemapRoutes); // Disabled - using static sitemap
app.use('/api/games', require('./routes/games'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/twitter-raids', require('./routes/twitter-raids'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/discount-codes', require('./routes/discountCodes'));
app.use('/api/skill-tests', require('./routes/skillTests'));

// Special route for blog sharing metadata (outside the API namespace)
app.get('/share-blog/:id', async (req, res) => {
  try {
    const Blog = require('./models/Blog');
    const blog = await Blog.findById(req.params.id);
      
    if (!blog) {
      return res.status(404).send('Blog not found');
    }
    
    // Create a clean description without HTML tags
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';
      
    // Get the URL with all query params
    let redirectUrl = `${process.env.NODE_ENV === 'production' ? 'https://www.aquads.xyz' : 'http://localhost:3000'}/how-to?blogId=${blog._id}`;
    
    // Create clean URL for meta tags without referral parameters
    const cleanMetaUrl = `${process.env.NODE_ENV === 'production' ? 'https://www.aquads.xyz' : 'http://localhost:3000'}/how-to?blogId=${blog._id}`;
    
    // Add any query parameters from the original request (excluding referral parameters)
    const originalParams = new URLSearchParams(req.originalUrl.split('?')[1] || '');
    // Remove referral parameter to prevent it from being baked into shared content
    originalParams.delete('ref');
    if (originalParams.toString()) {
      redirectUrl += `&${originalParams.toString()}`;
    }
      
    // Build HTML with proper metadata
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blog.title} - Aquads Blog</title>
  <meta name="description" content="${description}">
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${blog.title} - Aquads Blog">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
  
  <!-- Open Graph meta tags -->
  <meta property="og:title" content="${blog.title} - Aquads Blog">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
  <meta property="og:url" content="${cleanMetaUrl}">
  <meta property="og:type" content="article">
  
  <!-- Redirect to the actual blog page -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      text-align: center;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    h1 {
      color: #1a73e8;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${blog.title}</h1>
    <p>${description}</p>
    <p>Redirecting to blog post... <a href="${redirectUrl}">Click here</a> if you're not redirected automatically.</p>
  </div>
</body>
</html>`;
    
    // Send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating blog share page:', error);
    res.status(500).send('Error generating share page');
  }
});

// Create new ad - REMOVED: Using /routes/ads.js instead for proper affiliate validation
// app.post('/api/ads', auth, async (req, res) => {
//   try {
//     const ad = new Ad(req.body);
//     const savedAd = await ad.save();
//     io.emit('adsUpdated', { type: 'create', ad: savedAd });
//     res.status(201).json(savedAd);
//   } catch (error) {
//     console.error('Error creating ad:', error);
//     res.status(500).json({ error: 'Failed to create ad' });
//   }
// });

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

// Update ad position (no auth required)
app.put('/api/ads/:id/position', async (req, res) => {
  try {
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Position update requires x and y coordinates' });
    }
    
    const updatedAd = await Ad.findOneAndUpdate(
      { id: req.params.id },
      { $set: { x, y } },
      { new: true }
    );
    
    if (!updatedAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    io.emit('adsUpdated', { type: 'update', ad: updatedAd });
    res.json(updatedAd);
  } catch (error) {
    console.error('Error updating ad position:', error);
    res.status(500).json({ error: 'Failed to update ad position' });
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
app.post('/api/users/register', ipLimiter(3), deviceLimiter(3), async (req, res) => {
  try {
    const { username, password, image, deviceFingerprint } = req.body;
    
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
      isAdmin: username === 'admin',
      userType: req.body.userType || 'freelancer',
      ipAddress: req.clientIp, // Store client IP address
      deviceFingerprint: req.deviceFingerprint || deviceFingerprint || null // Store device fingerprint 
    });

    await user.save();

    // Generate token for auto-login
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      username: user.username,
      isAdmin: user.isAdmin,
      image: user.image,
      userType: user.userType,
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

// Update user profile
app.put('/api/users/profile', auth, async (req, res) => {
  try {
    const { username, image, currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If username is being changed, check if new username is available
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    // Update image if provided
    if (image) {
      user.image = image;
    }

    // Handle password change if both current and new passwords are provided
    if (currentPassword && newPassword) {
      // Verify current password
      let isMatch = false;
      if (user.password.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(currentPassword, user.password);
      } else {
        isMatch = currentPassword === user.password;
      }

      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash and set new password
      user.password = newPassword;
    }

    await user.save();

    // Generate new token with updated username if changed
    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: user.isAdmin, userType: user.userType, referredBy: user.referredBy },
      process.env.JWT_SECRET || 'bubble-ads-jwt-secret-key-2024',
      { expiresIn: '24h' }
    );

    res.json({
      username: user.username,
      image: user.image,
      isAdmin: user.isAdmin,
      userType: user.userType,
      token
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      message: error.message 
    });
  }
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add this to see if server is starting
console.log('Starting server...');

// Apply rate limiter BEFORE starting server
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000,
  message: 'Too many API requests from this IP, please try again later'
});

app.use('/api', apiLimiter);

// THEN start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Start Telegram bot (fire-and-forget)
  telegramService.startBot();
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

// Sitemap.xml route disabled - using static sitemap file instead
// app.get('/sitemap.xml', async (req, res) => {
//   try {
//     // Forward the request to our sitemap route handler
//     res.redirect('/api/sitemap');
//   } catch (error) {
//     console.error('Error serving sitemap:', error);
//     res.status(500).send('Error generating sitemap');
//   }
// }); 

// Function to initialize skill tests
async function initializeSkillTests() {
  try {
    const SkillTest = require('./models/SkillTest');
    const existingTests = await SkillTest.countDocuments();
    
    if (existingTests === 0) {
      console.log('No skill tests found. Initializing default tests...');
      
      const skillTests = [
        {
          title: "English Proficiency Test",
          description: "Test your English grammar, vocabulary, and business communication skills. This test covers essential language skills needed for professional communication with clients.",
          category: "english",
          difficulty: "intermediate",
          timeLimit: 25,
          passingScore: 80,
          badge: {
            name: "English Proficient",
            description: "Demonstrates strong English communication skills",
            icon: "📚",
            color: "#3B82F6"
          },
          questions: [
            {
              question: "Which sentence demonstrates correct business email etiquette?",
              options: [
                "Hey, I need this done ASAP!",
                "Dear Mr. Johnson, I hope this email finds you well. I am writing to follow up on our previous discussion regarding the project timeline.",
                "Hi there, just checking in about the thing we talked about.",
                "Yo, what's up with that project?"
              ],
              correctAnswer: 1,
              explanation: "Professional business emails should use formal greetings, proper grammar, and clear, respectful language."
            },
            {
              question: "Choose the correct form: 'The team _____ working on the project for three weeks.'",
              options: ["has been", "have been", "is been", "are been"],
              correctAnswer: 0,
              explanation: "Use 'has been' with singular subjects like 'team' when referring to a group as a single unit."
            },
            {
              question: "What is the best way to handle a client complaint?",
              options: [
                "Ignore it and hope it goes away",
                "Respond defensively to protect your reputation",
                "Listen actively, acknowledge the issue, and propose a solution",
                "Blame someone else for the problem"
              ],
              correctAnswer: 2,
              explanation: "Active listening, acknowledgment, and problem-solving are key to effective complaint resolution."
            },
            {
              question: "Which word is a synonym for 'efficient'?",
              options: ["slow", "productive", "expensive", "difficult"],
              correctAnswer: 1,
              explanation: "Productive means achieving results effectively, similar to efficient."
            },
            {
              question: "In professional writing, which is preferred?",
              options: [
                "I'm gonna finish this project soon.",
                "I will complete this project by the deadline.",
                "I'll get it done when I can.",
                "This project is almost done."
              ],
              correctAnswer: 1,
              explanation: "Professional writing should use complete sentences and formal language."
            }
          ]
        },
        {
          title: "Customer Service Best Practices",
          description: "Master the fundamentals of excellent customer service including complaint handling, communication skills, and problem-solving techniques.",
          category: "customer-service",
          difficulty: "beginner",
          timeLimit: 20,
          passingScore: 80,
          badge: {
            name: "Customer Service Expert",
            description: "Demonstrates excellent customer service skills",
            icon: "🎧",
            color: "#10B981"
          },
          questions: [
            {
              question: "What is the first step when handling a customer complaint?",
              options: [
                "Immediately offer a refund",
                "Listen actively and acknowledge the customer's feelings",
                "Defend your company's position",
                "Transfer the call to someone else"
              ],
              correctAnswer: 1,
              explanation: "Active listening and acknowledgment show the customer you care about their concerns."
            },
            {
              question: "Which response demonstrates empathy?",
              options: [
                "I understand how frustrating this must be for you.",
                "That's not our policy.",
                "You should have read the terms first.",
                "I can't help you with that."
              ],
              correctAnswer: 0,
              explanation: "Empathy involves understanding and acknowledging the customer's emotional state."
            },
            {
              question: "What should you do if you don't know the answer to a customer's question?",
              options: [
                "Make up an answer",
                "Tell them to figure it out themselves",
                "Find someone who knows the answer or research it",
                "Ignore the question"
              ],
              correctAnswer: 2,
              explanation: "It's better to find the correct answer than to provide incorrect information."
            },
            {
              question: "How should you handle an angry customer?",
              options: [
                "Match their anger level",
                "Stay calm, listen, and work toward a solution",
                "Hang up on them",
                "Tell them to calm down"
              ],
              correctAnswer: 1,
              explanation: "Staying calm helps de-escalate the situation and find a resolution."
            },
            {
              question: "What is the 'golden rule' of customer service?",
              options: [
                "The customer is always right",
                "Treat others as you would like to be treated",
                "Always make the sale",
                "Never admit mistakes"
              ],
              correctAnswer: 1,
              explanation: "The golden rule applies to customer service - treat customers with the same respect you'd want."
            }
          ]
        },
        {
          title: "Communication Skills Assessment",
          description: "Test your professional communication skills including writing, active listening, and conflict resolution abilities.",
          category: "communication",
          difficulty: "intermediate",
          timeLimit: 30,
          passingScore: 80,
          badge: {
            name: "Communication Pro",
            description: "Demonstrates strong professional communication skills",
            icon: "💬",
            color: "#8B5CF6"
          },
          questions: [
            {
              question: "What is the most important element of effective communication?",
              options: [
                "Speaking quickly",
                "Using complex vocabulary",
                "Ensuring the message is understood",
                "Being brief"
              ],
              correctAnswer: 2,
              explanation: "Effective communication is measured by whether the message is understood by the recipient."
            },
            {
              question: "How should you handle a conflict with a client?",
              options: [
                "Avoid them completely",
                "Address it directly, listen to their perspective, and find common ground",
                "Blame them for the problem",
                "Ignore the conflict"
              ],
              correctAnswer: 1,
              explanation: "Direct, respectful conflict resolution leads to better relationships and solutions."
            },
            {
              question: "What is the purpose of a project brief?",
              options: [
                "To waste time",
                "To clearly define project goals, scope, and expectations",
                "To make the client happy",
                "To avoid doing work"
              ],
              correctAnswer: 1,
              explanation: "A project brief ensures all parties understand the project requirements and expectations."
            },
            {
              question: "When writing a professional email, what should you include in the subject line?",
              options: [
                "Your name only",
                "A clear, specific description of the email's purpose",
                "The word 'urgent'",
                "Nothing"
              ],
              correctAnswer: 1,
              explanation: "A clear subject line helps recipients understand the email's purpose and priority."
            },
            {
              question: "What is the best way to give constructive feedback?",
              options: [
                "Be harsh and direct",
                "Use the sandwich method: positive, improvement, positive",
                "Only point out problems",
                "Avoid giving feedback"
              ],
              correctAnswer: 1,
              explanation: "The sandwich method helps maintain relationships while providing helpful feedback."
            }
          ]
        },
        {
          title: "Project Management Basics",
          description: "Test your understanding of fundamental project management concepts including planning, organization, and time management.",
          category: "project-management",
          difficulty: "beginner",
          timeLimit: 25,
          passingScore: 80,
          badge: {
            name: "Project Manager",
            description: "Demonstrates basic project management skills",
            icon: "📋",
            color: "#F59E0B"
          },
          questions: [
            {
              question: "What is the first step in project management?",
              options: [
                "Start working immediately",
                "Define the project scope and objectives",
                "Set a deadline",
                "Hire team members"
              ],
              correctAnswer: 1,
              explanation: "Clear scope and objectives provide direction for the entire project."
            },
            {
              question: "What is a project milestone?",
              options: [
                "A problem in the project",
                "A significant point or event in the project timeline",
                "The end of the project",
                "A team meeting"
              ],
              correctAnswer: 1,
              explanation: "Milestones help track progress and keep projects on schedule."
            },
            {
              question: "Why is time management important in projects?",
              options: [
                "To avoid working",
                "To meet deadlines and stay within budget",
                "To impress clients",
                "To make the project longer"
              ],
              correctAnswer: 1,
              explanation: "Effective time management ensures projects are completed on time and within budget."
            },
            {
              question: "What should you do if a project is behind schedule?",
              options: [
                "Ignore it",
                "Communicate with stakeholders and adjust the plan",
                "Blame the client",
                "Give up"
              ],
              correctAnswer: 1,
              explanation: "Proactive communication and plan adjustment help manage delays effectively."
            },
            {
              question: "What is the purpose of a project timeline?",
              options: [
                "To waste time",
                "To visualize project phases and deadlines",
                "To make the project longer",
                "To confuse team members"
              ],
              correctAnswer: 1,
              explanation: "Timelines help everyone understand project phases and deadlines."
            }
          ]
        },
        {
          title: "Technical Skills Assessment",
          description: "Test your knowledge of web development, design principles, and technical concepts commonly used in freelancing.",
          category: "technical",
          difficulty: "intermediate",
          timeLimit: 30,
          passingScore: 80,
          badge: {
            name: "Technical Expert",
            description: "Demonstrates strong technical skills and knowledge",
            icon: "💻",
            color: "#EF4444"
          },
          questions: [
            {
              question: "What is responsive design?",
              options: [
                "A design that responds to user clicks",
                "A design that adapts to different screen sizes and devices",
                "A design that changes colors",
                "A design that moves around"
              ],
              correctAnswer: 1,
              explanation: "Responsive design ensures websites work well on all devices and screen sizes."
            },
            {
              question: "What is the purpose of version control?",
              options: [
                "To make code longer",
                "To track changes and collaborate on code",
                "To delete code",
                "To slow down development"
              ],
              correctAnswer: 1,
              explanation: "Version control helps track changes and enables team collaboration."
            },
            {
              question: "What is the difference between frontend and backend development?",
              options: [
                "There is no difference",
                "Frontend is what users see, backend is server-side logic",
                "Frontend is harder than backend",
                "Backend is more important"
              ],
              correctAnswer: 1,
              explanation: "Frontend handles user interface, backend handles server-side processing and data."
            },
            {
              question: "What is the purpose of testing in software development?",
              options: [
                "To waste time",
                "To ensure code works correctly and catch bugs early",
                "To make the project longer",
                "To impress clients"
              ],
              correctAnswer: 1,
              explanation: "Testing helps ensure quality and catch issues before they reach users."
            },
            {
              question: "What is the importance of documentation in technical projects?",
              options: [
                "It's not important",
                "It helps others understand and maintain the code",
                "It makes the code longer",
                "It's required by law"
              ],
              correctAnswer: 1,
              explanation: "Good documentation makes code maintainable and helps team collaboration."
            }
          ]
        }
      ];
      
      await SkillTest.insertMany(skillTests);
      console.log(`✅ Successfully initialized ${skillTests.length} skill tests`);
    } else {
      console.log(`✅ Found ${existingTests} existing skill tests`);
    }
  } catch (error) {
    console.error('Error initializing skill tests:', error);
  }
} 