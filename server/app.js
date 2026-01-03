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
// const sitemapRoutes = require('./routes/sitemap'); // Disabled - using static sitemap
const Service = require('./models/Service');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const adsRoutes = require('./routes/ads');
const bumpRoutes = require('./routes/bumps');
const tokensRoutes = require('./routes/tokens');
const reviewsRoutes = require('./routes/reviews');
const blogsRoutes = require('./routes/blogs');
const notificationsRoutes = require('./routes/notifications');
const gamesRoutes = require('./routes/games');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');


// Middleware
const app = express();
// Behind Render/nginx, trust proxy to honor X-Forwarded-* headers
app.set('trust proxy', 1);

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Enhanced static file serving for uploads
// Make uploads directory accessible with proper headers
app.use('/uploads', (req, res, next) => {
  // Log request for debugging
  
  // Set appropriate CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  
  // Continue to static file middleware
  next();
});

// Serve static files from uploads with higher priority
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    // Set appropriate content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
    
    // Allow cross-origin access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// DISABLED: Static file serving for bookings - now handled by watermarking logic in routes
// app.use('/uploads/bookings', express.static(path.join(__dirname, 'uploads/bookings'), {
//   maxAge: '1h',
//   setHeaders: (res, filePath) => {
//     // Set same headers as above for consistency
//     if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
//       res.setHeader('Content-Type', 'image/jpeg');
//     } else if (filePath.endsWith('.png')) {
//       res.setHeader('Content-Type', 'image/png');
//     } else if (filePath.endsWith('.gif')) {
//       res.setHeader('Content-Type', 'image/gif');
//     } else if (filePath.endsWith('.pdf')) {
//       res.setHeader('Content-Type', 'application/pdf');
//     }
//     
//     // Allow cross-origin access
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
//     res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
//   }
// }));

// DISABLED: API endpoint for file access - now handled by watermarking logic in routes
// app.get('/api/uploads/bookings/:filename', (req, res) => {
//   try {
//     const filePath = path.join(__dirname, 'uploads/bookings', req.params.filename);
//     
//     // Check if file exists
//     if (!fs.existsSync(filePath)) {
//       console.error('File not found (API endpoint):', filePath);
//       return res.status(404).send('File not found');
//     }
//     
//     // Set appropriate content type based on file extension
//     const ext = path.extname(req.params.filename).toLowerCase();
//     if (ext === '.jpg' || ext === '.jpeg') {
//       res.setHeader('Content-Type', 'image/jpeg');
//     } else if (ext === '.png') {
//       res.setHeader('Content-Type', 'image/png');
//     } else if (ext === '.gif') {
//       res.setHeader('Content-Type', 'image/gif');
//     } else if (ext === '.pdf') {
//       res.setHeader('Content-Type', 'application/pdf');
//     }
//     
//     // Allow cross-origin access and caching
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
//     res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
//     
//     // Send the file
//     res.sendFile(filePath);
//   } catch (error) {
//     console.error('Error serving file (API endpoint):', error);
//     res.status(500).send('Error serving file');
//   }
// });

// Log all requests to uploads for debugging
app.use('/uploads', (req, res, next) => {
  next();
});

// Dynamic meta tags middleware for service pages
app.get('/marketplace', async (req, res, next) => {
  try {
    const serviceId = req.query.service;
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service) {
        // Read the index.html file
        let indexHtml = await fsPromises.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
        
        // Completely replace the head section with a new one containing all meta tags
        const headStartIndex = indexHtml.indexOf('<head>') + 6;
        const headEndIndex = indexHtml.indexOf('</head>');
        
        // Keep the existing head content
        const existingHead = indexHtml.substring(headStartIndex, headEndIndex);
        
        // Create clean URL without referral parameters for meta tags
        const cleanUrl = `${req.protocol}://${req.get('host')}/marketplace?service=${serviceId}`;
        
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
          <meta property="og:url" content="${cleanUrl}">
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
        
        return res.send(modifiedHtml);
      }
    }
  } catch (error) {
    console.error('Error handling dynamic meta tags:', error);
  }
  next();
});

// Dynamic meta tags middleware for AquaSwap token pages
app.get('/aquaswap', async (req, res, next) => {
  try {
    const tokenAddress = req.query.token;
    const blockchain = req.query.blockchain;
    
    if (tokenAddress && blockchain) {
      // Fetch token data from DexScreener API (using native fetch in Node 18+)
      
      // Try pairs endpoint first (for pair addresses)
      let dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${blockchain}/${tokenAddress}`);
      let dexData = await dexResponse.json();
      
      // If no pair found, try tokens endpoint (for token addresses)
      if (!dexData.pair && !dexData.pairs?.length) {
        dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        dexData = await dexResponse.json();
      }
      
      // Get the pair data (either from pair or pairs array)
      const pair = dexData.pair || (dexData.pairs && dexData.pairs.length > 0 ? dexData.pairs[0] : null);
      
      if (pair) {
        // Read the index.html file
        let indexHtml = await fsPromises.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
        
        // Extract token data
        const baseToken = pair.baseToken || {};
        const symbol = baseToken.symbol || 'TOKEN';
        const name = baseToken.name || symbol;
        const priceUsd = pair.priceUsd ? parseFloat(pair.priceUsd) : 0;
        const priceChange24h = pair.priceChange?.h24 || 0;
        const marketCap = pair.marketCap || pair.fdv || 0;
        const volume24h = pair.volume?.h24 || 0;
        const liquidity = pair.liquidity?.usd || 0;
        const chainId = pair.chainId || blockchain;
        
        // Get token image from DexScreener or fallback
        const tokenImage = pair.info?.imageUrl || 'https://www.aquads.xyz/logo712.png';
        
        // Format numbers for display
        const formatNumber = (num) => {
          if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
          if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
          if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
          return `$${num.toFixed(2)}`;
        };
        
        const formatPrice = (price) => {
          if (price < 0.00001) return `$${price.toExponential(2)}`;
          if (price < 0.01) return `$${price.toFixed(6)}`;
          if (price < 1) return `$${price.toFixed(4)}`;
          return `$${price.toFixed(2)}`;
        };
        
        // Create formatted title and description
        const priceChangeSign = priceChange24h >= 0 ? '+' : '';
        const priceChangeFormatted = `${priceChangeSign}${priceChange24h.toFixed(1)}%`;
        
        const ogTitle = `$${symbol} │ ${formatPrice(priceUsd)} │ ${priceChangeFormatted} 24h`;
        const ogDescription = `MCAP: ${formatNumber(marketCap)} • 24h Vol: ${formatNumber(volume24h)} • Liq: ${formatNumber(liquidity)} • Trade ${symbol} on Aquads DEX`;
        
        // Escape function for HTML safety
        const escapeHtml = (string) => {
          if (!string) return '';
          return String(string)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };
        
        // Create clean URL
        const cleanUrl = `${req.protocol}://${req.get('host')}/aquaswap?token=${tokenAddress}&blockchain=${blockchain}`;
        
        // Create injected meta tags
        const injectedMeta = `
<!-- START: Dynamic Meta Tags for AquaSwap Token: ${symbol} -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@_Aquads">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDescription)}">
<meta name="twitter:image" content="${escapeHtml(tokenImage)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Aquads DEX">
<meta property="og:url" content="${escapeHtml(cleanUrl)}">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta property="og:image" content="${escapeHtml(tokenImage)}">

<meta name="description" content="${escapeHtml(ogDescription)}">
<!-- END: Dynamic Meta Tags -->
`;
        
        // Insert the new meta tags at the beginning of the head
        indexHtml = indexHtml.replace('<head>', '<head>' + injectedMeta);
        
        // Update the title
        indexHtml = indexHtml.replace(/<title>.*?<\/title>/, `<title>$${escapeHtml(symbol)} - ${escapeHtml(name)} │ Aquads DEX</title>`);
        
        return res.send(indexHtml);
      }
    }
  } catch (error) {
    console.error('Error handling AquaSwap dynamic meta tags:', error);
  }
  next();
});

// Dynamic meta tags middleware for blog posts - make it work with the existing API routes
app.get('/learn', async (req, res, next) => {
  try {
    const blogId = req.query.blogId;
    
    if (blogId) {
      // Import Blog model here to avoid circular dependencies
      const Blog = require('./models/Blog');
      
      try {
        const blog = await Blog.findById(blogId);
        
        if (blog) {
          
          // Read the index.html file
          let indexHtml = await fsPromises.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
          
          // Strip HTML from content for meta description
          const stripHtml = (html) => {
            return html ? html.replace(/<\/?[^>]+(>|$)/g, "") : "";
          };
          
          // Escape function for HTML safety
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
          
          // Create clean URL without referral parameters for meta tags
          const cleanUrl = `${req.protocol}://${req.get('host')}/learn?blogId=${blogId}`;
          
          // Create injected content with meta tags
          const injectedMeta = `
<!-- START: Dynamic Meta Tags for Blog ID: ${blogId} -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Aquads">
<meta name="twitter:title" content="${escapeHtml(blog.title)} - Aquads Blog">
<meta name="twitter:description" content="${escapeHtml(shortDescription)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Aquads Blog">
<meta property="og:url" content="${escapeHtml(cleanUrl)}">
<meta property="og:title" content="${escapeHtml(blog.title)} - Aquads Blog">
<meta property="og:description" content="${escapeHtml(shortDescription)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">

<meta name="description" content="${escapeHtml(shortDescription)}">
<!-- END: Dynamic Meta Tags -->
`;
          
          // Insert the new meta tags at the beginning of the head
          indexHtml = indexHtml.replace('<head>', '<head>' + injectedMeta);
          
          // Update the title
          indexHtml = indexHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(blog.title)} - Aquads Blog</title>`);
          
          // Add mobile scroll fix
          indexHtml = indexHtml.replace('</head>', `
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
          
          return res.send(indexHtml);
        } else {
        }
      } catch (err) {
      }
    }
  } catch (error) {
  }
  next();
});

// Make sure this comes BEFORE any catch-all routes

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-reviews', serviceReviewRoutes);
app.use('/api/bannerAds', bannerAdsRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/bumps', bumpRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/reviews', reviewsRoutes);
// app.use('/api/sitemap', sitemapRoutes); // Disabled - using static sitemap
app.use('/api/notifications', notificationsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Test route to verify API is working
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    routes: {
      notifications: !!notificationsRoutes,
      bookings: !!bookingsRoutes,
      users: !!userRoutes
    },
    timestamp: new Date().toISOString()
  });
});

// Add this before the 404 handler (after the test route)
// Configuration endpoint to help debug the API
app.get('/api/config', (req, res) => {
  
  // Build a list of registered routes
  const routes = [];
  
  // Get all registered routes
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Route directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Mounted router
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          const path = handler.route.path;
          const basePath = middleware.regexp.toString()
            .replace('\\^', '')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/');
          
          let fullPath = basePath + path;
          // Clean up the path
          fullPath = fullPath.replace(/\\/g, '');
          
          routes.push({
            path: fullPath,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  // Filter for API routes
  const apiRoutes = routes.filter(route => route.path.includes('/api/') || route.path.includes('/bookings/'));
  
  // Check if notification routes are accessible
  const hasNotificationRoutes = apiRoutes.some(route => route.path.includes('notifications'));
  const hasBookingRoutes = apiRoutes.some(route => route.path.includes('bookings'));
  const hasUserRoutes = apiRoutes.some(route => route.path.includes('users'));
  
  res.json({
    message: 'API Configuration',
    environment: process.env.NODE_ENV || 'development',
    routes: {
      total: routes.length,
      api: apiRoutes.length,
      details: apiRoutes
    },
    // Check if certain routes are registered
    modules: {
      notifications: hasNotificationRoutes,
      bookings: hasBookingRoutes,  
      users: hasUserRoutes
    },
    serverInfo: {
      nodeVersion: process.version,
      startTime: new Date().toISOString()
    }
  });
});

// SEO-friendly URL handler for blog posts - with meta tag support
// This needs to be before the React catch-all route
app.get('/learn/:slug', async (req, res, next) => {
  try {
    // Extract the ID from the slug (format: title-id)
    const slugParts = req.params.slug.split('-');
    const blogId = slugParts[slugParts.length - 1];
    
    
    if (blogId) {
      // Import Blog model here to avoid circular dependencies
      const Blog = require('./models/Blog');
      
      try {
        const blog = await Blog.findById(blogId);
        
        if (blog) {
          
          // Read the index.html file
          let indexHtml = await fsPromises.readFile(path.join(__dirname, '../build/index.html'), 'utf8');
          
          // Strip HTML from content for meta description
          const stripHtml = (html) => {
            return html ? html.replace(/<\/?[^>]+(>|$)/g, "") : "";
          };
          
          // Escape function for HTML safety
          const escapeHtml = (string) => {
            return string
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };
          
          // Create slug helper function
          const createSlug = (title) => {
            const slug = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            
            // Limit slug length to prevent extremely long URLs (keep first 50 characters)
            // This helps prevent 5xx errors due to URL length limits
            const maxLength = 50;
            if (slug.length > maxLength) {
              // Find the last complete word within the limit to avoid cutting words in half
              const truncated = slug.substring(0, maxLength);
              const lastDash = truncated.lastIndexOf('-');
              return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
            }
            
            return slug;
          };
          
          // Get short description from blog content
          const blogContent = stripHtml(blog.content);
          const shortDescription = blogContent.length > 160 ? blogContent.substring(0, 160) + '...' : blogContent;
          
          // Use the blog banner image or fall back to the default image
          const imageUrl = blog.bannerImage || `${req.protocol}://${req.get('host')}/logo712.png`;
          
          // Create the canonical SEO-friendly URL
          const slug = createSlug(blog.title);
          const canonicalUrl = `${req.protocol}://${req.get('host')}/learn/${slug}-${blogId}`;
          
          // Create injected content with meta tags for SEO-friendly URLs
          const injectedMeta = `
<!-- START: Dynamic Meta Tags for Blog SEO URL: ${canonicalUrl} -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@Aquads">
<meta name="twitter:title" content="${escapeHtml(blog.title)} - Aquads Blog">
<meta name="twitter:description" content="${escapeHtml(shortDescription)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Aquads Blog">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<meta property="og:title" content="${escapeHtml(blog.title)} - Aquads Blog">
<meta property="og:description" content="${escapeHtml(shortDescription)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="article:published_time" content="${blog.createdAt}">
<meta property="article:modified_time" content="${blog.updatedAt || blog.createdAt}">
<meta property="article:author" content="${escapeHtml(blog.authorUsername || 'Aquads')}">

<meta name="description" content="${escapeHtml(shortDescription)}">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${escapeHtml(blog.title)}",
  "image": "${escapeHtml(imageUrl)}",
  "datePublished": "${blog.createdAt}",
  "dateModified": "${blog.updatedAt || blog.createdAt}",
  "author": {
    "@type": "Person",
    "name": "${escapeHtml(blog.authorUsername || 'Aquads')}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Aquads",
    "logo": {
      "@type": "ImageObject",
      "url": "${req.protocol}://${req.get('host')}/logo192.png"
    }
  },
  "description": "${escapeHtml(shortDescription)}",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "${escapeHtml(canonicalUrl)}"
  },
  "url": "${escapeHtml(canonicalUrl)}"
}
</script>
<!-- END: Dynamic Meta Tags -->
`;
          
          // Insert the new meta tags at the beginning of the head
          indexHtml = indexHtml.replace('<head>', '<head>' + injectedMeta);
          
          // Update the title
          indexHtml = indexHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(blog.title)} - Aquads Blog</title>`);
          
          return res.send(indexHtml);
        } else {
        }
      } catch (err) {
        // Error finding blog from SEO URL
      }
    }
  } catch (error) {
    // Error handling SEO blog URL
  }
  
  // If we couldn't find the blog or there was an error, continue to next middleware
  next();
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// DISABLED: Direct file access endpoint - now handled by watermarking logic in routes
// app.get('/uploads/bookings/:filename', (req, res) => {
//   try {
//     // Construct the absolute path to the file
//     const filePath = path.join(__dirname, 'uploads/bookings', req.params.filename);
//     
//     // Check if file exists
//     if (!fs.existsSync(filePath)) {
//       return res.status(404).send('File not found');
//     }
//     
//     // Set appropriate content type based on file extension
//     const ext = path.extname(req.params.filename).toLowerCase();
//     if (ext === '.jpg' || ext === '.jpeg') {
//       res.setHeader('Content-Type', 'image/jpeg');
//     } else if (ext === '.png') {
//       res.setHeader('Content-Type', 'image/png');
//     } else if (ext === '.gif') {
//       res.setHeader('Content-Type', 'image/gif');
//     } else if (ext === '.pdf') {
//       res.setHeader('Content-Type', 'application/pdf');
//     }
//     
//     // Allow cross-origin access
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
//     res.setHeader('Cache-Control', 'public, max-age=3600'); // Add caching
//     
//     // Send the file
//     res.sendFile(filePath);
//   } catch (error) {
//     res.status(500).send('Error serving file');
//   }
// });

// 404 handler
app.use((req, res, next) => {
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app; 