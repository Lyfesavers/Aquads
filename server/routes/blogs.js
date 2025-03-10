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

module.exports = router; 