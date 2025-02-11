const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const serviceReviewRoutes = require('./routes/serviceReviews');
const bannerAdsRoutes = require('./routes/bannerAds');
const pointsRoutes = require('./routes/points');
const bookingsRoutes = require('./routes/bookings');

// Middleware
const app = express();

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://www.aquads.xyz');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Apply CORS middleware
app.use(cors({
  origin: ['https://www.aquads.xyz', 'https://aquads.xyz', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-reviews', serviceReviewRoutes);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/bookings', bookingsRoutes);

module.exports = app; 