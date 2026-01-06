const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');
const { findMatchingJobs, canMatchJobs } = require('../utils/jobMatcher');

// Debug route
router.get('/test', (req, res) => {

  res.json({ message: 'Jobs API is working' });
});

// Get matched jobs for a freelancer based on their CV skills
router.get('/matched', auth, async (req, res) => {
  try {
    // Get the current user with CV data
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user can match jobs (has CV data)
    const matchStatus = canMatchJobs(user);
    if (!matchStatus.canMatch) {
      return res.json({ 
        matched: [],
        canMatch: false,
        reason: matchStatus.reason
      });
    }
    
    // Get all active jobs
    const jobs = await Job.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(500); // Process up to 500 jobs for matching
    
    // Find matching jobs (default 3)
    const limit = parseInt(req.query.limit) || 3;
    const matchedJobs = findMatchingJobs(user, jobs, limit);
    
    res.json({
      matched: matchedJobs,
      canMatch: true,
      keywordCount: matchStatus.keywordCount
    });
    
  } catch (error) {
    console.error('Error getting matched jobs:', error);
    res.status(500).json({ error: 'Failed to get matched jobs' });
  }
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

module.exports = router;