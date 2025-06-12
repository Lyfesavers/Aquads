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
    enum: ['active', 'pending', 'approved', 'rejected'],
    default: 'active'
  },
  pairAddress: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Only check if string exists and is not empty after trimming
        return v && v.trim().length > 0;
      },
      message: 'Pair address is required'
    }
  },
  blockchain: {
    type: String,
    default: 'ethereum',
    trim: true
  },
  // Payment fields for listing fee
  txSignature: {
    type: String,
    default: null
  },
  paymentChain: {
    type: String,
    default: null
  },
  chainSymbol: {
    type: String,
    default: null
  },
  chainAddress: {
    type: String,
    default: null
  },
  listingFee: {
    type: Number,
    default: 199 // $199 USDC
  },
  rejectionReason: {
    type: String,
    default: null
  },
  // Updated voting structure to track what each user voted
  bullishVotes: {
    type: Number,
    default: 0
  },
  bearishVotes: {
    type: Number,
    default: 0
  },
  // Replace simple voterIds with more detailed structure
  voterData: {
    type: [{
      userId: String,
      voteType: {
        type: String,
        enum: ['bullish', 'bearish']
      }
    }],
    default: []
  }
});

// Remove the pre-save middleware as it's causing issues
// We'll handle validation in the route instead

// Fix the double export
module.exports = mongoose.model('Ad', adSchema); 