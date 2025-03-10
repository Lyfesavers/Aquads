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
const jobsRoutes = require('./routes/jobs');
const sitemapRoutes = require('./routes/sitemap');
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
  origin: ['https://www.aquads.xyz', 'https://aquads.xyz', 'http://localhost:3000', 'https://aquads.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add this before your routes to handle JSON parsing
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
        
        // Completely replace the head section with a new one containing all meta tags
        const headStartIndex = indexHtml.indexOf('<head>') + 6;
        const headEndIndex = indexHtml.indexOf('</head>');
        
        // Keep the existing head content
        const existingHead = indexHtml.substring(headStartIndex, headEndIndex);
        
        // Create a new head with the service-specific meta tags
        const newHead = `
          <meta charset="utf-8" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="theme-color" content="#000000" />
          <meta name="google-site-verification" content="UMC2vp6y4mZgNAXQYgv9nqe83JsEKOIg7Tv8tDT7_TA" />
          
          <!-- Primary Meta Tags -->
          <title>${service.title} - Aquads Marketplace</title>
          <meta name="description" content="${service.description.slice(0, 160)}...">
          
          <!-- Twitter Card meta tags -->
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:site" content="@Aquads">
          <meta name="twitter:title" content="${service.title} - Aquads Marketplace">
          <meta name="twitter:description" content="${service.description.slice(0, 160)}...">
          <meta name="twitter:image" content="${service.image}">
          
          <!-- Open Graph meta tags -->
          <meta property="og:type" content="product">
          <meta property="og:site_name" content="Aquads Marketplace">
          <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
          <meta property="og:title" content="${service.title} - Aquads Marketplace">
          <meta property="og:description" content="${service.description.slice(0, 160)}...">
          <meta property="og:image" content="${service.image}">
          
          <!-- Service ID for scrolling -->
          <meta name="service-id" content="${serviceId}">
          
          <!-- Keep existing head content except meta tags -->
          ${existingHead.replace(/<meta[^>]*>/g, '').replace(/<title>.*?<\/title>/g, '')}
          
          <!-- Mobile scroll fix -->
          <script>
            function scrollToService() {
              const params = new URLSearchParams(window.location.search);
              const serviceId = params.get('service');
              if (!serviceId) return;

              function doScroll() {
                const element = document.querySelector('[data-service-id="' + serviceId + '"]');
                if (element) {
                  // Get element position
                  const elementTop = element.offsetTop - 100;
                  
                  // Force multiple scroll attempts with increasing delays
                  [0, 100, 500, 1000, 2000].forEach(delay => {
                    setTimeout(() => {
                      window.scrollTo(0, elementTop);
                    }, delay);
                  });
                }
              }

              // Initial delay to ensure content is loaded
              setTimeout(doScroll, 1500);
            }

            // Run on both events
            window.addEventListener('load', scrollToService);
            document.addEventListener('DOMContentLoaded', scrollToService);
          </script>
        `;
        
        // Replace the old head with the new one
        const modifiedHtml = indexHtml.substring(0, headStartIndex) + newHead + indexHtml.substring(headEndIndex);
        
        console.log('Sending HTML with service meta tags for:', service.title);
        return res.send(modifiedHtml);
      }
    }
  } catch (error) {
    console.error('Error handling dynamic meta tags:', error);
  }
  next();
});

// Dynamic meta tags middleware for blog posts
app.get('/how-to', async (req, res, next) => {
  try {
    const blogId = req.query.blogId;
    console.log('Blog request received, blogId:', blogId);
    
    if (blogId) {
      // Import Blog model here to avoid circular dependencies
      const Blog = require('./models/Blog');
      
      try {
        const blog = await Blog.findById(blogId);
        
        if (blog) {
          console.log('Found blog:', blog.title, 'with banner:', blog.bannerImage);
          
          // Read the index.html file
          let indexHtml = await fs.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
          
          // Strip HTML from content for meta description
          const stripHtml = (html) => {
            return html ? html.replace(/<\/?[^>]+(>|$)/g, "") : "";
          };
          
          // Escape function for content that will be inserted into regex replacements
          const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          };
          
          // Escape function for content that will be inserted into HTML
          const escapeHtml = (string) => {
            return string
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };
          
          // Get short description from blog content
          const blogContent = stripHtml(blog.content);
          const shortDescription = blogContent.length > 160 ? blogContent.substring(0, 160) + '...' : blogContent;
          
          // Use the blog banner image or fall back to the new optimized image
          const imageUrl = blog.bannerImage || `${req.protocol}://${req.get('host')}/logo712.png`;
          const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          
          console.log('Using image URL:', imageUrl);
          
          // Prepare safe values for insertion into HTML
          const safeTitle = escapeHtml(blog.title);
          const safeDescription = escapeHtml(shortDescription);
          const safeImageUrl = escapeHtml(imageUrl);
          const safeFullUrl = escapeHtml(fullUrl);
          
          // Create injected content with debug comments to help identify issues
          const injectedMeta = `
<!-- START: Dynamic Meta Tags for Blog ID: ${blogId} -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Aquads">
<meta name="twitter:title" content="${safeTitle} - Aquads Blog">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImageUrl}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Aquads Blog">
<meta property="og:url" content="${safeFullUrl}">
<meta property="og:title" content="${safeTitle} - Aquads Blog">
<meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImageUrl}">

<meta name="description" content="${safeDescription}">
<!-- END: Dynamic Meta Tags -->
`;
          
          // Insert the new meta tags at the beginning of the head
          indexHtml = indexHtml.replace('<head>', '<head>' + injectedMeta);
          
          // Update the title
          indexHtml = indexHtml.replace(/<title>.*?<\/title>/, `<title>${safeTitle} - Aquads Blog</title>`);
          
          // Add debug comments to identify the version
          indexHtml = indexHtml.replace('</head>', `
<!-- Debug Info: Dynamic meta tags added by server for blog ID: ${blogId} at ${new Date().toISOString()} -->
<script>
  console.log('Dynamic meta tags injected for blog:', '${blogId}');
  
  // Mobile scroll fix script
  function scrollToBlog() {
    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('blogId');
    if (!blogId) return;

    function doScroll() {
      const element = document.getElementById('blog-' + blogId);
      if (element) {
        // Get element position
        const elementTop = element.offsetTop - 100;
        
        // Add highlight effect
        element.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500');
        }, 2000);
        
        // Force multiple scroll attempts with increasing delays
        [0, 100, 500, 1000, 2000].forEach(delay => {
          setTimeout(() => {
            window.scrollTo(0, elementTop);
          }, delay);
        });
      } else {
        console.log('Blog element not found:', 'blog-' + blogId);
      }
    }

    // Initial delay to ensure content is loaded
    setTimeout(doScroll, 1500);
  }

  // Run on both events
  window.addEventListener('load', scrollToBlog);
  document.addEventListener('DOMContentLoaded', scrollToBlog);
</script>
</head>
`);
          
          console.log('Sending HTML with blog meta tags for:', blog.title);
          return res.send(indexHtml);
        } else {
          console.log('Blog not found with ID:', blogId);
        }
      } catch (err) {
        console.error('Error finding blog:', err.message);
      }
    }
  } catch (error) {
    console.error('Error handling blog meta tags:', error);
  }
  next();
});

// Make sure this comes BEFORE any catch-all routes
console.log('Registering routes...');

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-reviews', serviceReviewRoutes);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/sitemap', sitemapRoutes);

console.log('Routes registered');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

module.exports = app; 