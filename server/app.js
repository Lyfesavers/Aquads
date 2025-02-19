const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const serviceReviewRoutes = require('./routes/serviceReviews');
const bannerAdsRoutes = require('./routes/bannerAds');
const pointsRoutes = require('./routes/points');
const bookingsRoutes = require('./routes/bookings');
 const affiliateRoutes = require('./routes/affiliates');
const Service = require('./models/Service');
const path = require('path');
const fs = require('fs');

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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Dynamic meta tags middleware for service pages
app.get('/marketplace', async (req, res, next) => {
  try {
    const serviceId = req.query.service;
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service) {
        // Read the index.html file
        let indexHtml = await fs.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
        
        // Replace meta tags with service-specific content
        indexHtml = indexHtml
          .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${service.image}">`)
          .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${service.title} - Aquads Marketplace">`)
          .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${service.description.slice(0, 200)}...">`)
          .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${service.image}">`)
          .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${service.title} - Aquads Marketplace">`)
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${service.description.slice(0, 200)}...">`)
          .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="https://aquads.xyz/marketplace?service=${service._id}">`);
        
        // Mobile scroll fix
        indexHtml = indexHtml
          .replace('</head>', `
            <script>
              function scrollToService() {
                const params = new URLSearchParams(window.location.search);
                const serviceId = params.get('service');
                if (!serviceId) return;

                let scrollAttempts = 0;
                const maxAttempts = 5;

                function attemptScroll() {
                  const element = document.querySelector('[data-service-id="' + serviceId + '"]');
                  if (element && scrollAttempts < maxAttempts) {
                    scrollAttempts++;
                    
                    // First reset any existing scroll
                    window.scrollTo(0, 0);
                    
                    // Wait a bit then perform the actual scroll
                    setTimeout(() => {
                      const headerOffset = 100;
                      const elementPosition = element.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                      // Try both scroll methods
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'instant'  // Use instant instead of auto
                      });

                      // If not at correct position, try again
                      if (Math.abs(window.pageYOffset - offsetPosition) > 50) {
                        setTimeout(attemptScroll, 500);
                      }
                    }, 100);
                  } else if (scrollAttempts < maxAttempts) {
                    setTimeout(attemptScroll, 500);
                  }
                }

                // Start the scroll attempts
                setTimeout(attemptScroll, 1000);
              }

              // Attach to both load events
              document.addEventListener('DOMContentLoaded', scrollToService);
              window.addEventListener('load', scrollToService);
            </script>
            </head>
          `);
        
        return res.send(indexHtml);
      }
    }
  } catch (error) {
    console.error('Error handling dynamic meta tags:', error);
  }
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-reviews', serviceReviewRoutes);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/affiliates', affiliateRoutes);

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

module.exports = app; 