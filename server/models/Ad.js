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
    validate: {
      validator: function(v) {
        // Base58 format (for Solana)
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        
        // Hex format with 0x prefix (for ETH, BSC, SUI etc)
        const hexRegex = /^0x[0-9a-fA-F]{40,64}$/;
        
        // General alphanumeric format for other chains
        const generalRegex = /^[0-9a-zA-Z]{15,70}$/;

        return base58Regex.test(v) || 
               hexRegex.test(v) || 
               generalRegex.test(v);
      },
      message: props => `${props.value} is not a valid contract address!`
    }
  }
});

module.exports = mongoose.model('Ad', adSchema); 