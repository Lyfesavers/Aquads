const mongoose = require('mongoose');

// A single hunter submission to a bounty. Embedded on the bounty for simple listing.
const bountySubmissionSchema = new mongoose.Schema({
  hunterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hunterUsername: {
    type: String,
    default: null
  },
  // Link to the deliverable (PR, design file, tweet, doc, etc.)
  submissionUrl: {
    type: String,
    required: true,
    maxlength: 2048
  },
  description: {
    type: String,
    default: '',
    maxlength: 3000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

// A discussion/Q&A entry on a bounty. One level of replies via parentId.
const bountyCommentSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorUsername: {
    type: String,
    default: null
  },
  authorImage: {
    type: String,
    default: null
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  // null = top-level comment/question; otherwise the _id of the parent comment
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

const bountySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140
  },
  description: {
    type: String,
    required: true,
    maxlength: 8000
  },
  // What the hunter must deliver to win the bounty
  deliverables: {
    type: String,
    default: '',
    maxlength: 4000
  },
  // Rules / eligibility / judging criteria participants must follow
  rules: {
    type: String,
    default: '',
    maxlength: 4000
  },
  // Hunter reference links (repo, brand kit, platform site, etc.) — HTTPS only
  resources: {
    type: [{
      label: { type: String, required: true, trim: true, maxlength: 80 },
      url: { type: String, required: true, trim: true, maxlength: 2048 }
    }],
    default: []
  },
  category: {
    type: String,
    enum: ['development', 'design', 'content', 'marketing', 'community', 'research', 'other'],
    default: 'other'
  },

  // Reward held in escrow
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'USDC'
  },

  // Poster is a project owner (they own at least one Ad listing)
  posterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  posterUsername: {
    type: String,
    default: null
  },
  // Poster's account profile image — shown when no project is selected
  posterImage: {
    type: String,
    default: null
  },
  // Optional link to the project listing (Ad.id string) the bounty is posted for
  projectAdId: {
    type: String,
    default: null
  },
  projectName: {
    type: String,
    default: null
  },
  projectLogo: {
    type: String,
    default: null
  },

  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BountyEscrow',
    default: null
  },

  // Lifecycle:
  // unfunded  -> created, escrow awaiting deposit (not shown publicly)
  // open      -> funded, accepting submissions
  // completed -> a winner was approved and paid out
  // cancelled -> cancelled/refunded before completion
  status: {
    type: String,
    enum: ['unfunded', 'open', 'completed', 'cancelled'],
    default: 'unfunded'
  },

  deadline: {
    type: Date,
    default: null
  },

  submissions: {
    type: [bountySubmissionSchema],
    default: []
  },

  comments: {
    type: [bountyCommentSchema],
    default: []
  },

  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  winningSubmissionId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // Admin moderation
  hidden: {
    type: Boolean,
    default: false
  },

  // Editing transparency: flagged if scope text changed after submissions existed.
  editedAfterSubmissions: {
    type: Boolean,
    default: false
  },
  lastEditedAt: {
    type: Date,
    default: null
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  fundedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
});

bountySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

bountySchema.index({ status: 1, createdAt: -1 });
bountySchema.index({ posterId: 1, status: 1 });
bountySchema.index({ projectAdId: 1 });
bountySchema.index({ 'submissions.hunterId': 1 });

module.exports = mongoose.model('Bounty', bountySchema);
