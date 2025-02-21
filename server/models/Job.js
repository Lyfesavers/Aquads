const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    required: true
  },
  payAmount: {
    type: Number,
    required: true
  },
  payType: {
    type: String,
    enum: ['hourly', 'weekly', 'monthly'],
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactTelegram: String,
  contactDiscord: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerUsername: {
    type: String,
    required: true
  },
  ownerImage: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'filled', 'expired'],
    default: 'active'
  }
});

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;