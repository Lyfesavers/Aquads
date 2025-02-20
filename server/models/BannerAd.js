const mongoose = require('mongoose');

const bannerAdSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  gif: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v.endsWith('.gif');
      },
      message: props => `${props.value} is not a GIF file!`
    }
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
  owner: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired'],
    default: 'pending'
  },
  transactionSignature: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: String
  },
  paymentChain: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('BannerAd', bannerAdSchema); 