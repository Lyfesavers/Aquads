const mongoose = require('mongoose');
const { Schema } = mongoose;

const bubbleDuelSchema = new Schema({
  // Battle Identification
  battleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Fighting Projects
  project1: {
    adId: {
      type: String,
      required: true,
      ref: 'Ad'
    },
    title: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      required: true
    },
    votes: {
      type: Number,
      default: 0
    }
  },
  
  project2: {
    adId: {
      type: String,
      required: true,
      ref: 'Ad'
    },
    title: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      required: true
    },
    votes: {
      type: Number,
      default: 0
    }
  },
  
  // Battle Settings
  duration: {
    type: Number,
    default: 3600, // 1 hour in seconds
    required: true
  },
  targetVotes: {
    type: Number,
    default: 100,
    required: true
  },
  entryFee: {
    type: Number,
    default: 200, // $200 USD
    required: true
  },
  
  // Battle State
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'cancelled'],
    default: 'waiting',
    index: true
  },
  
  // Time Tracking
  startTime: {
    type: Date,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  },
  
  // Results
  winner: {
    type: String, // 'project1' or 'project2' or 'tie'
    default: null
  },
  finalScores: {
    project1Votes: {
      type: Number,
      default: 0
    },
    project2Votes: {
      type: Number,
      default: 0
    }
  },
  
  // Voters tracking
  voters: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    votedFor: {
      type: String,
      enum: ['project1', 'project2'],
      required: true
    },
    voteTime: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics
  totalVotes: {
    type: Number,
    default: 0
  },
  peakConcurrentVoters: {
    type: Number,
    default: 0
  },
  socialShares: {
    twitter: {
      type: Number,
      default: 0
    },
    telegram: {
      type: Number,
      default: 0
    }
  },
  
  // Creator Info
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
bubbleDuelSchema.index({ status: 1, createdAt: -1 });
bubbleDuelSchema.index({ 'project1.adId': 1 });
bubbleDuelSchema.index({ 'project2.adId': 1 });
bubbleDuelSchema.index({ startTime: 1, endTime: 1 });

// Methods
bubbleDuelSchema.methods.addVote = function(userId, username, projectSide) {
  // Check if user already voted
  const existingVote = this.voters.find(voter => voter.userId.toString() === userId);
  
  if (existingVote) {
    // User already voted - in Bubble Duels, once you vote, you can't change
    return { success: false, message: 'You have already voted in this battle!' };
  }
  
  // Add vote
  this.voters.push({
    userId,
    username,
    votedFor: projectSide,
    voteTime: new Date()
  });
  
  // Update vote counts
  if (projectSide === 'project1') {
    this.project1.votes += 1;
  } else {
    this.project2.votes += 1;
  }
  
  this.totalVotes += 1;
  
  // Check if battle should end (reached target votes)
  if (this.project1.votes >= this.targetVotes || this.project2.votes >= this.targetVotes) {
    this.endBattle();
  }
  
  return { success: true, message: 'Vote counted!' };
};

bubbleDuelSchema.methods.endBattle = function() {
  this.status = 'completed';
  this.endTime = new Date();
  
  // Determine winner
  if (this.project1.votes > this.project2.votes) {
    this.winner = 'project1';
  } else if (this.project2.votes > this.project1.votes) {
    this.winner = 'project2';
  } else {
    this.winner = 'tie';
  }
  
  this.finalScores = {
    project1Votes: this.project1.votes,
    project2Votes: this.project2.votes
  };
};

bubbleDuelSchema.methods.getRemainingTime = function() {
  if (this.status !== 'active' || !this.startTime) return 0;
  
  const elapsed = (new Date() - this.startTime) / 1000; // seconds
  const remaining = Math.max(0, this.duration - elapsed);
  
  // Auto-end if time is up
  if (remaining === 0 && this.status === 'active') {
    this.endBattle();
  }
  
  return Math.floor(remaining);
};

module.exports = mongoose.model('BubbleDuel', bubbleDuelSchema);
