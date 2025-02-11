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
const corsOptions = {
  origin: ['https://www.aquads.xyz', 'https://aquads.xyz', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-reviews', serviceReviewRoutes);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/bookings', bookingsRoutes);

module.exports = app; 