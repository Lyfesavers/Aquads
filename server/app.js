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
        
        // Replace meta tags with service-specific content
        indexHtml = indexHtml
          .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${service.image}">`)
          .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${service.title} - Aquads Marketplace">`)
          .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${service.description.slice(0, 200)}...">`)
          .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${service.image}">`)
          .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${service.title} - Aquads Marketplace">`)
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${service.description.slice(0, 200)}...">`)
          .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">`)
          .replace(/<title>.*?<\/title>/, `<title>${service.title} - Aquads Marketplace</title>`);
        
        // Mobile scroll fix
        indexHtml = indexHtml
          .replace('</head>', `
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
          
          // Read the index.html file (this is the key part)
          const indexHtml = await fs.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
          
          // Strip HTML from content for meta description
          const stripHtml = (html) => {
            return html ? html.replace(/<\/?[^>]+(>|$)/g, "") : "";
          };
          
          // Get short description from blog content
          const blogContent = stripHtml(blog.content);
          const shortDescription = blogContent.length > 160 ? blogContent.substring(0, 160) + '...' : blogContent;
          
          // Create a modified version of the HTML
          let modifiedHtml = indexHtml;
          
          // Basic find and replace approach (similar to marketplace)
          const metaReplacements = [
            // Simplify by using basic string replacements
            ['<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:card" content="summary_large_image">'],
            ['<meta name="twitter:image" content="https://i.imgur.com/3kCQx6G.png">', `<meta name="twitter:image" content="${blog.bannerImage}">`],
            ['<meta name="twitter:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">', `<meta name="twitter:title" content="${blog.title} - Aquads Blog">`],
            ['<meta name="twitter:description" content="Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">', `<meta name="twitter:description" content="${shortDescription}">`],
            ['<meta property="og:image" content="https://i.imgur.com/3kCQx6G.png">', `<meta property="og:image" content="${blog.bannerImage}">`],
            ['<meta property="og:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">', `<meta property="og:title" content="${blog.title} - Aquads Blog">`],
            ['<meta property="og:description" content="Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">', `<meta property="og:description" content="${shortDescription}">`],
            ['<meta property="og:url" content="https://aquads.xyz">', `<meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">`],
            ['<meta property="og:type" content="website">', '<meta property="og:type" content="article">'],
            ['<title>Aquads - All in one Web3 crypto Hub and Freelancer marketplace!</title>', `<title>${blog.title} - Aquads Blog</title>`],
            ['<meta name="description" content="Aquads - All in one Web3 crypto Hub and Freelancer marketplace!">', `<meta name="description" content="${shortDescription}">`]
          ];
          
          // Perform all the replacements
          for (const [find, replace] of metaReplacements) {
            modifiedHtml = modifiedHtml.replace(find, replace);
          }
          
          // Add mobile scroll fix
          modifiedHtml = modifiedHtml.replace('</head>', `
            <script>
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
          
          console.log('Sending HTML with blog meta tags');
          return res.send(modifiedHtml);
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