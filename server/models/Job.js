const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: String, required: true },
  payAmount: { type: Number, required: true },
  payType: { type: String, required: true },
  jobType: { 
    type: String, 
    required: true,
    enum: ['hiring', 'for-hire'] 
  },
  contactEmail: { type: String, required: true },
  contactTelegram: String,
  contactDiscord: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerUsername: { type: String, required: true },
  ownerImage: String,
  createdAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'filled', 'expired'],
    default: 'active'
  }
});



module.exports = mongoose.model('Job', jobSchema);