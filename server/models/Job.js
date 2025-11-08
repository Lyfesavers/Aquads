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
  workArrangement: {
    type: String,
    required: true,
    enum: ['remote', 'hybrid', 'onsite'],
    default: 'remote'
  },
  location: {
    country: {
      type: String,
      required: function() {
        return this.workArrangement === 'onsite' || this.workArrangement === 'hybrid';
      }
    },
    city: {
      type: String,
      required: function() {
        return this.workArrangement === 'onsite' || this.workArrangement === 'hybrid';
      }
    }
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

// Performance indexes for common queries
jobSchema.index({ title: 'text', description: 'text', requirements: 'text' }); // For text search
jobSchema.index({ status: 1, createdAt: -1 }); // For active jobs by date
jobSchema.index({ owner: 1 }); // For user's jobs
jobSchema.index({ jobType: 1, status: 1 }); // For job type filtering
jobSchema.index({ payAmount: -1, status: 1 }); // For salary-based sorting
jobSchema.index({ status: 1, jobType: 1 }); // For status + job type queries
jobSchema.index({ workArrangement: 1, status: 1 }); // For filtering by work arrangement


module.exports = mongoose.model('Job', jobSchema);