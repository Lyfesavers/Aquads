const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const mongoose = require('mongoose');
const router = express.Router();
const Blog = require('../models/Blog');
const BlogImage = require('../models/BlogImage');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');

const getApiBaseUrl = () => {
  if (process.env.PUBLIC_UPLOAD_BASE_URL) {
    return process.env.PUBLIC_UPLOAD_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return process.env.NODE_ENV === 'production'
    ? 'https://aquads-production.up.railway.app'
    : 'http://localhost:5000';
};

const buildBlogMediaUrl = (imageId) =>
  `${getApiBaseUrl()}/api/blogs/media/${imageId}`;

const blogImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  },
});

const optimizeBlogImageBuffer = async (inputBuffer, variant = 'inline') => {
  const maxWidth = variant === 'banner' ? 1280 : 960;
  try {
    return await sharp(inputBuffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    console.error('[Blog upload] sharp optimize failed:', err.message);
    return inputBuffer;
  }
};

// Cache for the blogs list — blogs change rarely (admin-only writes), 5-minute TTL is safe.
let blogsListCache = null;
let blogsListCacheTime = 0;
let blogsListRefreshing = false;
const BLOGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (admin-only writes; invalidation handles freshness)

const invalidateBlogsCache = () => {
  blogsListCache = null;
  blogsListCacheTime = 0;
};

const fetchAndCacheBlogs = async () => {
  const blogs = await Blog.find().sort({ createdAt: -1 }).populate('author', 'username image').lean();
  const updatedBlogs = blogs.map(blog => {
    if (blog.author && blog.author.image) blog.authorImage = blog.author.image;
    return blog;
  });
  blogsListCache = updatedBlogs;
  blogsListCacheTime = Date.now();
  return updatedBlogs;
};

// Get all blogs
router.get('/', async (req, res) => {
  try {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', 'application/json');

    const now = Date.now();

    if (blogsListCache) {
      res.set('X-Cache', now - blogsListCacheTime < BLOGS_CACHE_TTL ? 'HIT' : 'STALE');
      res.json(blogsListCache);
      if (!blogsListRefreshing && now - blogsListCacheTime >= BLOGS_CACHE_TTL) {
        blogsListRefreshing = true;
        fetchAndCacheBlogs().catch(err =>
          console.error('[Blogs Cache] Background refresh failed:', err.message)
        ).finally(() => { blogsListRefreshing = false; });
      }
      return;
    }

    // No cache — must wait
    const blogs = await fetchAndCacheBlogs();
    res.set('X-Cache', 'MISS');
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Upload blog image (banner or inline body) — admin only
router.post(
  '/upload-image',
  auth,
  requireEmailVerification,
  (req, res, next) => {
    blogImageUpload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Only administrators can upload blog images' });
      }

      if (!req.file?.buffer) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const variant = req.body?.variant === 'banner' ? 'banner' : 'inline';
      const optimized = await optimizeBlogImageBuffer(req.file.buffer, variant);
      const contentType = 'image/webp';

      const blogImage = await BlogImage.create({
        data: optimized,
        contentType,
        variant,
        size: optimized.length,
        uploadedBy: req.user.userId,
      });

      const url = buildBlogMediaUrl(blogImage._id);

      res.status(201).json({ url, id: blogImage._id });
    } catch (error) {
      console.error('[Blog upload] failed:', error);
      res.status(500).json({ error: 'Failed to upload blog image' });
    }
  }
);

// Serve blog image bytes from MongoDB (persists across Railway redeploys)
router.get('/media/:imageId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.imageId)) {
      return res.status(404).send('Image not found');
    }

    const blogImage = await BlogImage.findById(req.params.imageId).lean();
    if (!blogImage?.data?.length) {
      return res.status(404).send('Image not found');
    }

    res.set('Content-Type', blogImage.contentType || 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(blogImage.data);
  } catch (error) {
    console.error('[Blog media] serve failed:', error);
    res.status(500).send('Failed to load image');
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    // Add no-index headers to prevent search engines from indexing the API endpoint
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Content-Type', 'application/json');
    
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username image')
      .lean();
      
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    // Update authorImage field with the populated author image
    if (blog.author && blog.author.image) {
      blog.authorImage = blog.author.image;
    }
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Create blog (auth required)
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    // Check if user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only administrators can create blog posts' });
    }

    const { title, content, bannerImage } = req.body;
    
    // Validate content length (max 10000 words)
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > 10000) {
      return res.status(400).json({ error: 'Content exceeds 10000 words limit' });
    }

    // Get the full user information including image
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blog = new Blog({
      title,
      content,
      bannerImage,
      author: req.user.userId,
      authorUsername: req.user.username,
      authorImage: user.image // Use the image from the user model
    });

    await blog.save();
    invalidateBlogsCache();
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update blog (auth required)
router.patch('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    // First, try to find the blog regardless of author
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    // Check if user is either the author or an admin
    if (blog.author.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this blog' });
    }

    // Validate content length if it's being updated
    if (req.body.content) {
      const wordCount = req.body.content.trim().split(/\s+/).length;
      if (wordCount > 10000) {
        return res.status(400).json({ error: 'Content exceeds 10000 words limit' });
      }
    }

    // Get the user's current image
    const user = await User.findById(req.user.userId);
    if (user && user.image) {
      // Make sure the authorImage stays up to date with the user's current image
      blog.authorImage = user.image;
    }

    // Apply other updates
    const allowedUpdates = ['title', 'content', 'bannerImage'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field];
      }
    });

    await blog.save();
    invalidateBlogsCache();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete blog (auth required)
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    // First find the blog to check ownership
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    // Check if user is either the author or an admin
    if (blog.author.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this blog' });
    }
    
    // Now delete the blog
    await Blog.findByIdAndDelete(req.params.id);
    invalidateBlogsCache();
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

// Legacy social-share HTML route. The public sharing path is now the Netlify
// Edge Function at /share/blog/:id (see netlify/edge-functions/share-blog.js),
// which serves OG tags from the CDN edge. Nothing in the current frontend
// references this Express route, but it stays here so any external traffic
// that ever hits /api/blogs/share/:id (old links, scrapers, etc.) ends up at
// the canonical blog URL instead of 404-ing.
//
// Two behaviors aligned with the rest of the SEO setup:
//   1. The redirect now targets the canonical /learn/{slug}-{id} URL (not the
//      legacy /learn?blogId= pattern) so authority flows to the indexable URL.
//   2. `<meta name="robots" content="noindex, follow">` + `<link rel=canonical>`
//      tell Google not to index this thin wrapper and to consolidate ranking
//      signals on the canonical page. Social crawlers ignore robots noindex
//      and still read the OG tags above.
router.get('/share/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username image')
      .lean();

    if (!blog) {
      return res.status(404).send('Blog not found');
    }

    // Create a clean description without HTML tags
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';

    // Build canonical /learn/{slug}-{id} URL (mirrors BlogPage / sitemap rules)
    const buildSlug = (title) => {
      const slug = (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const maxLength = 50;
      if (slug.length > maxLength) {
        const truncated = slug.substring(0, maxLength);
        const lastDash = truncated.lastIndexOf('-');
        return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
      }
      return slug;
    };
    const canonicalUrl = `https://www.aquads.xyz/learn/${buildSlug(blog.title) || 'post'}-${blog._id}`;

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
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">

  <!-- SEO: thin wrapper, real article lives at the canonical URL below -->
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="noindex, follow">

  <!-- Redirect human visitors to the actual blog page -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
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
    <p>Redirecting to blog post... <a href="${canonicalUrl}">Click here</a> if you're not redirected automatically.</p>
  </div>
</body>
</html>`;

    // Send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error generating share page');
  }
});

// Pre-warm the blogs cache on startup so the first visit is instant.
const warmupBlogsCache = async () => {
  try {
    const blogs = await fetchAndCacheBlogs();
    console.log(`[Blogs Cache] Warmed up ${blogs.length} blogs`);
  } catch (err) {
    console.error('[Blogs Cache] Warmup failed (non-critical):', err.message);
  }
};

module.exports = router;
module.exports.warmupBlogsCache = warmupBlogsCache;