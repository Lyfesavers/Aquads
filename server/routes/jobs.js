const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Create job
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received job creation request:', req.body);
    console.log('User:', req.user);

    const job = new Job({
      title: req.body.title,
      description: req.body.description,
      requirements: req.body.requirements,
      payAmount: req.body.payAmount,
      payType: req.body.payType,
      contactEmail: req.body.contactEmail,
      contactTelegram: req.body.contactTelegram,
      contactDiscord: req.body.contactDiscord,
      owner: req.user.userId,
      ownerUsername: req.user.username,
      ownerImage: req.user.image || ''
    });

    const savedJob = await job.save();
    console.log('Job saved successfully:', savedJob);
    res.status(201).json(savedJob);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
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