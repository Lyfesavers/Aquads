const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  size: {
    type: Number,
    required: true,
    min: 50,
    max: 200
  },
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isBumped: {
    type: Boolean,
    default: false
  },
  owner: {
    type: String,
    required: true
  },
  lastBumpTx: {
    type: String,
    default: null
  },
  bumpedAt: {
    type: Date,
    default: null
  },
  bumpDuration: {
    type: Number,
    default: null
  },
  bumpExpiresAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'approved'],
    default: 'active'
  },
  contractAddress: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Only check if string exists and is not empty after trimming
        return v && v.trim().length > 0;
      },
      message: 'Contract address is required'
    }
  },
  blockchain: {
    type: String,
    default: 'ethereum',
    trim: true
  }
});

// Remove the pre-save middleware as it's causing issues
// We'll handle validation in the route instead

// Fix the double export
module.exports = mongoose.model('Ad', adSchema); 