const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username image');
    res.json(blogs);
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

    const blog = new Blog({
      title,
      content,
      bannerImage,
      author: req.user.userId,
      authorUsername: req.user.username,
      authorImage: req.user.image
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
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.user.userId
    });

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Validate content length if it's being updated
    if (req.body.content) {
      const wordCount = req.body.content.trim().split(/\s+/).length;
      if (wordCount > 5000) {
        return res.status(400).json({ error: 'Content exceeds 5000 words limit' });
      }
    }

    Object.assign(blog, req.body);
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
    const blog = await Blog.findOneAndDelete({
      _id: req.params.id,
      author: req.user.userId
    });

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

module.exports = router; 