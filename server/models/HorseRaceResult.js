const mongoose = require('mongoose');
const { Schema } = mongoose;

const horseRaceResultSchema = new Schema({
  // User information
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  
  // Bet details
  horseId: {
    type: Number,
    required: true,
    min: 0,
    max: 7
  },
  horseName: {
    type: String,
    required: true
  },
  betAmount: {
    type: Number,
    required: true,
    min: 1
  },
  odds: {
    type: Number,
    required: true,
    min: 1.0
  },
  
  // Race outcome
  won: {
    type: Boolean,
    required: true,
    index: true
  },
  payout: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Winner information
  winnerHorseId: {
    type: Number,
    required: true,
    min: 0,
    max: 7
  },
  winnerHorseName: {
    type: String,
    required: true
  },
  
  // Full race data for transparency/verification
  raceData: [{
    id: Number,
    name: String,
    color: String,
    baseOdds: Number,
    baseSpeed: Number,
    odds: Number,
    finalSpeed: Number,
    finishTime: Number
  }],
  
  // Psychology data for analytics (optional)
  psychologyPhase: {
    type: String,
    required: false
  },
  psychologyWinRate: {
    type: Number,
    required: false
  },
  userPointsAtBet: {
    type: Number,
    required: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Add automatic timestamps
  timestamps: true
});

// Indexes for efficient querying
horseRaceResultSchema.index({ userId: 1, createdAt: -1 }); // For user's race history
horseRaceResultSchema.index({ won: 1, createdAt: -1 }); // For wins by date
horseRaceResultSchema.index({ horseId: 1, won: 1 }); // For horse performance
horseRaceResultSchema.index({ betAmount: -1, createdAt: -1 }); // For bet size sorting
horseRaceResultSchema.index({ payout: -1, createdAt: -1 }); // For payout sorting
horseRaceResultSchema.index({ username: 1, createdAt: -1 }); // For username + date queries
horseRaceResultSchema.index({ winnerHorseId: 1, createdAt: -1 }); // For winning horses

// Virtual for calculating net profit for this race
horseRaceResultSchema.virtual('netProfit').get(function() {
  return this.payout - this.betAmount;
});

// Static method to get user statistics
horseRaceResultSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalWins: { $sum: { $cond: ['$won', 1, 0] } },
        totalBetAmount: { $sum: '$betAmount' },
        totalPayout: { $sum: '$payout' },
        biggestWin: { $max: '$payout' },
        avgBetAmount: { $avg: '$betAmount' },
        recentBets: { $push: { createdAt: '$createdAt', won: '$won', payout: '$payout' } }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalBets: 0,
      totalWins: 0,
      totalBetAmount: 0,
      totalPayout: 0,
      biggestWin: 0,
      avgBetAmount: 0,
      winRate: 0,
      netProfit: 0
    };
  }
  
  const userStats = stats[0];
  const winRate = userStats.totalBets > 0 ? (userStats.totalWins / userStats.totalBets) * 100 : 0;
  const netProfit = userStats.totalPayout - userStats.totalBetAmount;
  
  return {
    ...userStats,
    winRate: Math.round(winRate * 100) / 100,
    netProfit: netProfit
  };
};

// Static method to get global game statistics
horseRaceResultSchema.statics.getGlobalStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalPlayers: { $addToSet: '$userId' },
        totalWins: { $sum: { $cond: ['$won', 1, 0] } },
        totalVolume: { $sum: '$betAmount' },
        totalPayouts: { $sum: '$payout' },
        biggestWin: { $max: '$payout' },
        avgBetSize: { $avg: '$betAmount' }
      }
    },
    {
      $project: {
        totalBets: 1,
        totalPlayers: { $size: '$totalPlayers' },
        totalWins: 1,
        totalVolume: 1,
        totalPayouts: 1,
        biggestWin: 1,
        avgBetSize: 1,
        houseEdge: {
          $multiply: [
            { $divide: [
              { $subtract: ['$totalVolume', '$totalPayouts'] },
              '$totalVolume'
            ]},
            100
          ]
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalBets: 0,
    totalPlayers: 0,
    totalWins: 0,
    totalVolume: 0,
    totalPayouts: 0,
    biggestWin: 0,
    avgBetSize: 0,
    houseEdge: 0
  };
};

// Static method to get leaderboard
horseRaceResultSchema.statics.getLeaderboard = async function(timeframe = 'all', limit = 20) {
  let dateFilter = {};
  
  if (timeframe === 'daily') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateFilter = { createdAt: { $gte: today } };
  } else if (timeframe === 'weekly') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { createdAt: { $gte: weekAgo } };
  } else if (timeframe === 'monthly') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { createdAt: { $gte: monthAgo } };
  }
  
  return await this.find({
    won: true,
    ...dateFilter
  })
    .sort({ payout: -1 })
    .limit(Math.min(Number(limit), 100))
    .select('username horseName betAmount odds payout createdAt')
    .lean();
};

// Instance method to calculate multiplier
horseRaceResultSchema.methods.getMultiplier = function() {
  if (this.betAmount === 0) return 0;
  return Math.round((this.payout / this.betAmount) * 100) / 100;
};

// Pre-save middleware to validate race data
horseRaceResultSchema.pre('save', function(next) {
  // Ensure payout is consistent with bet outcome
  if (!this.won && this.payout > 0) {
    this.payout = 0;
  }
  
  // Ensure payout doesn't exceed reasonable limits (max 20x bet)
  if (this.won && this.payout > this.betAmount * 20) {
    return next(new Error('Payout exceeds maximum allowed multiplier'));
  }
  
  // Validate horse ID is within range
  if (this.horseId < 0 || this.horseId > 7) {
    return next(new Error('Invalid horse ID'));
  }
  
  if (this.winnerHorseId < 0 || this.winnerHorseId > 7) {
    return next(new Error('Invalid winner horse ID'));
  }
  
  next();
});

module.exports = mongoose.model('HorseRaceResult', horseRaceResultSchema);
