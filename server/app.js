const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bannerAdsRoutes = require('./routes/bannerAds');

// Middleware
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-reviews', serviceReviewRoutes);
app.use('/api/bannerAds', bannerAdsRoutes);

app.use('/api/bannerAds', bannerAdsRoutes); 