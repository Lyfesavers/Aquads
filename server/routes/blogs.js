const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username image');
      
    // Update authorImage field with the populated author image
    const updatedBlogs = blogs.map(blog => {
      // If blog has author populated with image, use it
      if (blog.author && blog.author.image) {
        blog.authorImage = blog.author.image;
      }
      return blog;
    });
    
    res.json(updatedBlogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username image');
      
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    // Update authorImage field with the populated author image
    if (blog.author && blog.author.image) {
      blog.authorImage = blog.author.image;
    }
    
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Create blog (auth required)
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, bannerImage } = req.body;
    
    // Validate content length (max 5000 words)
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > 5000) {
      return res.status(400).json({ error: 'Content exceeds 5000 words limit' });
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
    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update blog (auth required)
router.patch('/:id', auth, async (req, res) => {
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
      if (wordCount > 5000) {
        return res.status(400).json({ error: 'Content exceeds 5000 words limit' });
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
    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete blog (auth required)
router.delete('/:id', auth, async (req, res) => {
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

    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

// New route - HTML metadata for social sharing
router.get('/share/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username image');
      
    if (!blog) {
      return res.status(404).send('Blog not found');
    }
    
    // Create a clean description without HTML tags
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';
      
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
  <meta property="og:url" content="https://www.aquads.xyz/how-to?blogId=${blog._id}">
  <meta property="og:type" content="article">
  
  <!-- Redirect to the actual blog page -->
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/how-to?blogId=${blog._id}">
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
    <p>Redirecting to blog post... <a href="https://www.aquads.xyz/how-to?blogId=${blog._id}">Click here</a> if you're not redirected automatically.</p>
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

module.exports = router; 