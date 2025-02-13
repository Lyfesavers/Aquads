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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  }
});

module.exports = mongoose.model('Ad', adSchema); 