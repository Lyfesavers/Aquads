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
    
    // Calculate date 1 week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Get active jobs from the last week only
    const jobs = await Job.find({ 
      status: 'active',
      createdAt: { $gte: oneWeekAgo }
    })
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

// Throttle the expensive expiry sweep to run at most once per hour.
// Running it on every GET was causing 12-second response times.
let lastJobExpirySweep = 0;
const JOB_EXPIRY_INTERVAL = 60 * 60 * 1000; // 1 hour

// Cache for the PUBLIC jobs listing (no owner filter) — very expensive due to populate + count.
const jobsPublicCache = new Map();
const jobsRefreshing = new Set(); // cache keys currently being refreshed in background
const JOBS_PUBLIC_CACHE_TTL = 60 * 1000; // 1 minute

const invalidateJobsPublicCache = () => {
  jobsPublicCache.clear();
};

// Fetch public jobs for a given page/limit and update the cache.
const fetchAndCachePublicJobs = async (page, limit) => {
  const skip = (page - 1) * limit;
  const query = { status: 'active' };
  const totalJobs = await Job.countDocuments(query);
  const jobs = await Job.find(query)
    .populate('owner', 'username image')
    // Newest first across all sources (source:1 previously pinned cryptojobslist above remotive)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  jobs.forEach(j => { if (!j.source) j.source = 'user'; });
  const responseData = {
    jobs,
    pagination: {
      total: totalJobs, page, limit,
      totalPages: Math.ceil(totalJobs / limit),
      hasMore: skip + jobs.length < totalJobs
    }
  };
  jobsPublicCache.set(`jobs_p${page}_l${limit}`, { data: responseData, timestamp: Date.now() });
  return responseData;
};

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
    
    // Only expire jobs once per hour instead of on every request
    const now = Date.now();
    if (now - lastJobExpirySweep > JOB_EXPIRY_INTERVAL) {
      lastJobExpirySweep = now;
      Job.updateMany(
        { source: 'user', createdAt: { $lt: thirtyDaysAgo }, status: 'active' },
        { $set: { status: 'expired' } }
      ).catch(err => console.error('Job expiry sweep error:', err));
    }
    
    // Only return active jobs
    if (!req.query.includeExpired) {
      query.status = 'active';
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Serve public job listings from cache (owner queries are too specific to cache)
    const isPublicRequest = !req.query.owner && !req.query.includeExpired;
    if (isPublicRequest) {
      const cacheKey = `jobs_p${page}_l${limit}`;
      const cached = jobsPublicCache.get(cacheKey);
      if (cached) {
        res.set('X-Cache', now - cached.timestamp < JOBS_PUBLIC_CACHE_TTL ? 'HIT' : 'STALE');
        res.json(cached.data);
        if (!jobsRefreshing.has(cacheKey) && now - cached.timestamp >= JOBS_PUBLIC_CACHE_TTL) {
          jobsRefreshing.add(cacheKey);
          fetchAndCachePublicJobs(page, limit).catch(err =>
            console.error('[Jobs Cache] Background refresh failed:', err.message)
          ).finally(() => { jobsRefreshing.delete(cacheKey); });
        }
        return;
      }

      // No cache — must wait
      const responseData = await fetchAndCachePublicJobs(page, limit);
      res.set('X-Cache', 'MISS');
      return res.json(responseData);
    }

    // Owner-specific or includeExpired queries — always hit DB
    const totalJobs = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .populate('owner', 'username image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    jobs.forEach(j => { if (!j.source) j.source = 'user'; });

    const responseData = {
      jobs,
      pagination: {
        total: totalJobs, page, limit,
        totalPages: Math.ceil(totalJobs / limit),
        hasMore: skip + jobs.length < totalJobs
      }
    };

    res.set('X-Cache', 'MISS');
    res.json(responseData);
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
    invalidateJobsPublicCache();
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
    invalidateJobsPublicCache();
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

    invalidateJobsPublicCache();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Pre-warm the public jobs cache on startup so the first visit to the jobs page is fast.
const warmupJobsCache = async () => {
  try {
    const responseData = await fetchAndCachePublicJobs(1, 20);
    console.log(`[Jobs Cache] Warmed up ${responseData.jobs.length} jobs (${responseData.pagination.total} total)`);
  } catch (err) {
    console.error('[Jobs Cache] Warmup failed (non-critical):', err.message);
  }
};

module.exports = router;
module.exports.warmupJobsCache = warmupJobsCache;