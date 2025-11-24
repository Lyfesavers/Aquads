const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');
const axios = require('axios');

// Debug route
router.get('/test', (req, res) => {

  res.json({ message: 'Jobs API is working' });
});

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const query = {};
    
    // Add owner filter if provided
    if (req.query.owner) {
      query.owner = req.query.owner;
    }
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Update status of expired user jobs (not external jobs)
    await Job.updateMany(
      { 
        source: 'user',
        createdAt: { $lt: thirtyDaysAgo },
        status: 'active'
      },
      { 
        $set: { status: 'expired' }
      }
    );
    
    // Only return active jobs
    if (!req.query.includeExpired) {
      query.status = 'active';
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 jobs per page
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalJobs = await Job.countDocuments(query);
    
    // Fetch jobs with pagination
    // Sort by source first (user jobs first), then by createdAt (newest first)
    const jobs = await Job.find(query)
      .populate('owner', 'username image')
      .sort({ source: 1, createdAt: -1 }) // User jobs first, then by date
      .skip(skip)
      .limit(limit);
    
    res.json({
      jobs,
      pagination: {
        total: totalJobs,
        page,
        limit,
        totalPages: Math.ceil(totalJobs / limit),
        hasMore: skip + jobs.length < totalJobs
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Refresh expired job
router.post('/:id/refresh', auth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      owner: req.user.userId,
      status: 'expired'
    });

    if (!job) {
      return res.status(404).json({ error: 'Expired job not found' });
    }

    // Update createdAt to now and set status back to active
    job.createdAt = new Date();
    job.status = 'active';
    await job.save();

    res.json(job);
  } catch (error) {
    console.error('Error refreshing job:', error);
    res.status(500).json({ error: 'Failed to refresh job' });
  }
});

// Create job
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const job = new Job({
      ...req.body,
      owner: req.user.userId,
      ownerUsername: req.user.username,
      ownerImage: user.image,
      status: 'active'
    });
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.patch('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      owner: req.user.userId 
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    Object.assign(job, req.body);
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // Build query - admins can delete any job, regular users only their own
    const query = { _id: req.params.id };
    if (!user.isAdmin) {
      query.owner = req.user.userId;
    }

    const job = await Job.findOneAndDelete(query);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * Check if website has a careers/jobs page
 * GET /api/jobs/check-careers?domain=github.com
 */
router.get('/check-careers', async (req, res) => {
  try {
    const domain = req.query.domain?.trim();
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const baseUrl = `https://${cleanDomain}`;

    // Common career page paths
    const careersPaths = [
      '/careers',
      '/jobs',
      '/work-with-us',
      '/join-us',
      '/careers/jobs',
      '/open-positions',
      '/hiring',
      '/we-are-hiring',
      '/careers/opportunities'
    ];

    // Check each path
    for (const path of careersPaths) {
      try {
        const url = `${baseUrl}${path}`;
        const response = await axios.head(url, {
          timeout: 5000,
          validateStatus: (status) => status < 500,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (response.status === 200) {
          return res.json({
            found: true,
            url: url,
            domain: cleanDomain
          });
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }

    // No careers page found
    return res.json({
      found: false,
      domain: cleanDomain
    });

  } catch (error) {
    console.error('Error checking careers page:', error);
    res.status(500).json({ error: 'Failed to check for careers page' });
  }
});

module.exports = router;