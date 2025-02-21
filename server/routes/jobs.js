const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');

// Get all active jobs
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.owner) {
      query.owner = req.query.owner;
    }
    
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Create new job
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating job with data:', req.body); // Debug log

    // Check if user has reached job limit
    const userJobCount = await Job.countDocuments({ 
      owner: req.user.userId,
      status: 'active'
    });

    if (userJobCount >= 5) {
      return res.status(400).json({ 
        error: 'Maximum job posting limit (5) reached' 
      });
    }

    const job = new Job({
      ...req.body,
      owner: req.user.userId,
      ownerUsername: req.user.username,
      ownerImage: req.user.image || ''
    });

    await job.save();
    console.log('Job created successfully:', job); // Debug log
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: error.message || 'Failed to create job posting' });
  }
});

// Update job
router.patch('/:id', auth, async (req, res) => {
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
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router; 