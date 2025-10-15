const express = require('express');
const router = express.Router();
const User = require('../models/User');
const HorseRaceResult = require('../models/HorseRaceResult');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const { getIO } = require('../socket');

// Horse data with base odds and speeds (balanced for fair gameplay)
const HORSE_DATA = [
  { name: "Thunder Bolt", color: "#8B4513", baseOdds: 2.3, baseSpeed: 0.8 },
  { name: "Lightning Flash", color: "#000000", baseOdds: 2.6, baseSpeed: 0.75 },
  { name: "Midnight Runner", color: "#483D8B", baseOdds: 3.0, baseSpeed: 0.7 },
  { name: "Golden Arrow", color: "#FFD700", baseOdds: 1.8, baseSpeed: 0.85 },
  { name: "Fire Storm", color: "#DC143C", baseOdds: 3.2, baseSpeed: 0.65 },
  { name: "Silver Wind", color: "#C0C0C0", baseOdds: 2.8, baseSpeed: 0.72 },
  { name: "Emerald Star", color: "#50C878", baseOdds: 3.1, baseSpeed: 0.68 },
  { name: "Royal Blue", color: "#4169E1", baseOdds: 2.5, baseSpeed: 0.78 }
];

// Constants for game balance
const MIN_BET = 10;
const MAX_BET = 1000;

// Advanced Casino Psychology System - Backend Implementation
const calculateCasinoPsychology = (userPoints) => {
  // Dynamic ceiling detection with randomization to prevent exploitation
  const getCeilingThreshold = (basePoints, variance = 0.06) => {
    return basePoints + (Math.random() - 0.5) * basePoints * variance;
  };
  
  // Phase identification with sophisticated psychological targeting
  let phase = 'unknown';
  let winRate = 0.5; // Base 50% win rate
  let psychologyBonus = 0;
  
  // CRITICAL: 1K SAFETY NET - Never let them stay below 1000 points
  if (userPoints < 1000) {
    phase = 'safety_net';
    winRate = 0.55; // 55% win rate - Help them recover but not exploitable
    psychologyBonus = 0.05; // Small 5% boost
  } else if (userPoints <= 500) {
    // HONEYMOON PHASE - Hook new players (this won't trigger due to 1k safety net, but keep for logic)
    phase = 'honeymoon';
    winRate = 0.70; // 70% win rate - Very generous
    psychologyBonus = 0.08; // Extra 8% boost for confidence
  } else if (userPoints <= 1500) {
    // BUILDING CONFIDENCE - Just above safety net
    phase = 'building';
    winRate = 0.62; // 62% win rate - Still very positive
    psychologyBonus = 0.05; // 5% confidence boost
  } else if (userPoints <= 2500) {
    // EARLY HOOK - Keep them engaged
    phase = 'early_hook';
    winRate = 0.58; // 58% win rate - Positive bias
    
    // Dynamic ceiling check around 2200-2400
    if (userPoints > getCeilingThreshold(2300, 0.08)) {
      winRate = 0.45; // Pullback mode
      phase = 'ceiling_pullback';
    }
  } else if (userPoints <= 4000) {
    // MAIN ADDICTION ZONE - Balanced to keep them cycling
    phase = 'addiction_zone';
    winRate = 0.52; // 52% win rate - Slight positive bias
    
    // Dynamic ceiling check around 3600-3800
    if (userPoints > getCeilingThreshold(3700, 0.08)) {
      winRate = 0.43; // Pullback mode
      phase = 'ceiling_pullback';
    }
  } else if (userPoints <= 5000) {
    // CRITICAL 5K CEILING ZONE - Major resistance to prevent 5k breakthrough
    phase = 'five_k_ceiling';
    winRate = 0.35; // 35% win rate - Much harder to progress
    
    // Strong ceiling check around 4800-4900
    if (userPoints > getCeilingThreshold(4850, 0.04)) {
      winRate = 0.25; // Very strong pullback - start draining them
      phase = 'drain_mode';
    }
  } else if (userPoints <= 6000) {
    // DRAIN ZONE - Actively bring them back down
    phase = 'drain_zone';
    winRate = 0.30; // 30% win rate - Aggressive draining
    
    // Very strong ceiling check around 5500-5700
    if (userPoints > getCeilingThreshold(5600, 0.03)) {
      winRate = 0.20; // Brutal pullback
      phase = 'brutal_drain';
    }
  } else if (userPoints <= 7500) {
    // EMERGENCY DRAIN ZONE - Maximum resistance
    phase = 'emergency_drain';
    winRate = 0.25; // 25% win rate - Maximum house edge
    
    // Emergency pullback if they somehow get this high
    if (userPoints > getCeilingThreshold(7000, 0.02)) {
      winRate = 0.15; // EMERGENCY pullback
      phase = 'emergency_pullback';
    }
  } else if (userPoints <= 8500) {
    // ELITE TERRITORY - Significant challenge
    phase = 'elite_zone';
    winRate = 0.35; // 35% win rate - Much more aggressive house edge
    
    // Tighter ceiling control around 8000-8300
    if (userPoints > getCeilingThreshold(8150, 0.05)) {
      winRate = 0.25; // Very strong pullback
      phase = 'ceiling_pullback';
    }
  } else if (userPoints <= 9200) {
    // GATEKEEPER LEVEL - Heavy resistance
    phase = 'gatekeeper';
    winRate = 0.30; // 30% win rate - Much more aggressive house edge
    
    // Very tight ceiling control around 8800-9000
    if (userPoints > getCeilingThreshold(8900, 0.04)) {
      winRate = 0.20; // Brutal pullback
      phase = 'ceiling_pullback';
    }
  } else {
    // FINAL GUARDIAN - Maximum resistance before 10k
    phase = 'final_guardian';
    winRate = 0.25; // 25% win rate - Much more aggressive house edge
    
    // Emergency pullback if approaching 10k
    if (userPoints > 9500) {
      winRate = 0.15; // EMERGENCY pullback - Much more aggressive
      phase = 'emergency_pullback';
    }
  }
  
  return {
    phase,
    winRate,
    psychologyBonus,
    safetyNetActive: phase === 'safety_net',
    pullbackActive: phase.includes('pullback') || phase.includes('emergency')
  };
};

// Generate race data with slight randomization
const generateRaceData = () => {
  return HORSE_DATA.map((horse, index) => ({
    id: index,
    ...horse,
    // Add slight randomness to odds for each race (±0.3)
    odds: Math.max(1.5, horse.baseOdds + (Math.random() - 0.5) * 0.6)
  }));
};

// Smart race simulation with psychology system
const simulateRace = (horses, playerBetHorseId, userPoints, betAmount) => {
  // Get psychology data for this player
  const psychology = calculateCasinoPsychology(userPoints);
  
  // BET SIZE PENALTY: Large bets are much riskier at high levels
  let adjustedWinRate = psychology.winRate;
  const betPercentage = betAmount / userPoints;
  
  // SUBTLE DRAIN CYCLE: Gently bring players back down when above 5k
  if (userPoints > 5000) {
    adjustedWinRate *= 0.7; // 30% penalty for being above 5k
  } else if (userPoints > 4000) {
    adjustedWinRate *= 0.85; // 15% penalty for being above 4k
  }
  
  if (userPoints > 5000 && betPercentage > 0.1) { // Bet > 10% of points
    if (betPercentage > 0.3) { // Bet > 30% of points
      adjustedWinRate *= 0.6; // 40% penalty for very large bets
    } else if (betPercentage > 0.2) { // Bet > 20% of points
      adjustedWinRate *= 0.75; // 25% penalty for large bets
    } else { // Bet > 10% of points
      adjustedWinRate *= 0.85; // 15% penalty for medium-large bets
    }
  }
  
  // Determine if player should win based on adjusted psychology
  const shouldPlayerWin = Math.random() < adjustedWinRate;
  
  // Enhanced logging for bet size penalties
  if (userPoints > 5000 && betPercentage > 0.1) {
    console.log(`🎰 BET SIZE PENALTY: Points: ${userPoints}, Bet: ${betAmount} (${(betPercentage * 100).toFixed(1)}%), Base Win Rate: ${(psychology.winRate * 100).toFixed(1)}%, Adjusted: ${(adjustedWinRate * 100).toFixed(1)}%`);
  }
  
  // Psychology system active: [phase: ${psychology.phase}, winRate: ${(psychology.winRate * 100).toFixed(1)}%, adjustedWinRate: ${(adjustedWinRate * 100).toFixed(1)}%, result: ${shouldPlayerWin ? 'WIN' : 'LOSS'}]
  
  let raceResults;
  
  if (shouldPlayerWin) {
    // Player wins - arrange results so their horse comes first
    const playerHorse = horses.find(h => h.id === playerBetHorseId);
    const otherHorses = horses.filter(h => h.id !== playerBetHorseId);
    
    // Shuffle other horses randomly for 2nd, 3rd, etc.
    for (let i = otherHorses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherHorses[i], otherHorses[j]] = [otherHorses[j], otherHorses[i]];
    }
    
    // Create race results with player horse winning
    raceResults = [
      { ...playerHorse, finalSpeed: 1.0, finishTime: 1000 + Math.random() * 50 },
      ...otherHorses.map((horse, index) => ({
        ...horse,
        finalSpeed: 0.95 - (index * 0.05),
        finishTime: 1050 + (index * 100) + Math.random() * 80
      }))
    ];
  } else {
    // Player loses - pick a random winner from other horses
    const playerHorse = horses.find(h => h.id === playerBetHorseId);
    const otherHorses = horses.filter(h => h.id !== playerBetHorseId);
    
    // Pick random winner from other horses
    const winnerIndex = Math.floor(Math.random() * otherHorses.length);
    const winner = otherHorses[winnerIndex];
    const remainingHorses = otherHorses.filter((_, index) => index !== winnerIndex);
    
    // Shuffle remaining horses
    for (let i = remainingHorses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingHorses[i], remainingHorses[j]] = [remainingHorses[j], remainingHorses[i]];
    }
    
    // Insert player horse at random position (not first)
    const playerPosition = Math.floor(Math.random() * remainingHorses.length) + 1;
    const allHorses = [winner, ...remainingHorses];
    allHorses.splice(playerPosition, 0, playerHorse);
    
    // Create race results with times
    raceResults = allHorses.map((horse, index) => ({
      ...horse,
      finalSpeed: 1.0 - (index * 0.08),
      finishTime: 1000 + (index * 120) + Math.random() * 80
    }));
  }
  
  return raceResults;
};

// GET /api/horse-racing/race-data
// Get fresh race data for a new race
router.get('/race-data', auth, async (req, res) => {
  try {
    const raceHorses = generateRaceData();
    res.json({ horses: raceHorses });
  } catch (error) {
    console.error('Error generating race data:', error);
    res.status(500).json({ error: 'Failed to generate race data' });
  }
});

// POST /api/horse-racing/place-bet
// Place a bet on a horse
router.post('/place-bet', auth, requireEmailVerification, async (req, res) => {
  try {
    const { horseId, betAmount, horses } = req.body;
    
    // Validate input
    if (horseId == null || !betAmount || !horses || !Array.isArray(horses)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (betAmount < MIN_BET || betAmount > MAX_BET) {
      return res.status(400).json({ error: `Bet amount must be between ${MIN_BET} and ${MAX_BET} points` });
    }
    
    if (horseId < 0 || horseId >= horses.length) {
      return res.status(400).json({ error: 'Invalid horse selection' });
    }
    
    // Get user and check points
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.points < betAmount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    
    // Deduct bet amount from user points
    user.points -= betAmount;
    user.pointsHistory.push({
      amount: -betAmount,
      reason: `Horse racing bet on ${horses[horseId]?.name || `Horse #${horseId + 1}`}`,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Simulate the race with psychology system (use points BEFORE deduction for psychology calculation)
    const userPointsBeforeBet = user.points + betAmount;
    const psychology = calculateCasinoPsychology(userPointsBeforeBet);
    const raceResults = simulateRace(horses, horseId, userPointsBeforeBet, betAmount);
    const winner = raceResults[0];
    const playerHorse = raceResults.find(h => h.id === horseId);
    const won = winner.id === horseId;
    
    let payout = 0;
    if (won) {
      payout = Math.round(betAmount * playerHorse.odds);
      
      // Award payout
      user.points += payout;
      user.pointsHistory.push({
        amount: payout,
        reason: `Horse racing win - ${playerHorse.name} (${playerHorse.odds.toFixed(1)}:1)`,
        createdAt: new Date()
      });
      
      await user.save();
    }
    
    // Save race result to database with psychology data
    const raceResult = new HorseRaceResult({
      userId: req.user.userId,
      username: req.user.username,
      horseId: horseId,
      horseName: playerHorse.name,
      betAmount: betAmount,
      odds: playerHorse.odds,
      won: won,
      payout: payout,
      winnerHorseId: winner.id,
      winnerHorseName: winner.name,
      raceData: raceResults,
      // Psychology analytics data
      psychologyPhase: psychology.phase,
      psychologyWinRate: psychology.winRate,
      userPointsAtBet: userPointsBeforeBet
    });
    
    await raceResult.save();
    
    // Broadcast big wins to all clients (wins over 500 points)
    if (won && payout > 500) {
      try {
        const io = getIO();
        io.emit('bigWin', {
          game: 'horse-racing',
          username: req.user.username,
          amount: payout,
          horseName: playerHorse.name,
          odds: playerHorse.odds.toFixed(1)
        });
      } catch (socketError) {
        console.error('Socket emit error:', socketError);
      }
    }
    
    res.json({
      success: true,
      won: won,
      raceResults: raceResults,
      winner: winner,
      playerHorse: playerHorse,
      betAmount: betAmount,
      payout: payout,
      newBalance: user.points
    });
    
  } catch (error) {
    console.error('Error processing horse racing bet:', error);
    res.status(500).json({ error: 'Failed to process bet' });
  }
});

// GET /api/horse-racing/history
// Get user's betting history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    const history = await HorseRaceResult.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 50))
      .skip(skip);
    
    const totalCount = await HorseRaceResult.countDocuments({ userId: req.user.userId });
    
    res.json({
      history: history,
      totalCount: totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / limit)
    });
    
  } catch (error) {
    console.error('Error fetching horse racing history:', error);
    res.status(500).json({ error: 'Failed to fetch betting history' });
  }
});

// GET /api/horse-racing/leaderboard
// Get leaderboard of biggest wins
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 20, timeframe = 'all' } = req.query;
    
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
    
    const leaderboard = await HorseRaceResult.find({
      won: true,
      ...dateFilter
    })
      .sort({ payout: -1 })
      .limit(Math.min(Number(limit), 50))
      .select('username horseName betAmount odds payout createdAt');
    
    res.json({ leaderboard });
    
  } catch (error) {
    console.error('Error fetching horse racing leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/horse-racing/stats
// Get game statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's stats
    const userStats = await HorseRaceResult.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          totalWins: { $sum: { $cond: ['$won', 1, 0] } },
          totalBetAmount: { $sum: '$betAmount' },
          totalPayout: { $sum: '$payout' },
          biggestWin: { $max: '$payout' },
          avgBetAmount: { $avg: '$betAmount' }
        }
      }
    ]);
    
    // Get global stats
    const globalStats = await HorseRaceResult.aggregate([
      {
        $group: {
          _id: null,
          totalBets: { $sum: 1 },
          totalPlayers: { $addToSet: '$userId' },
          biggestGlobalWin: { $max: '$payout' },
          totalVolume: { $sum: '$betAmount' }
        }
      },
      {
        $project: {
          totalBets: 1,
          totalPlayers: { $size: '$totalPlayers' },
          biggestGlobalWin: 1,
          totalVolume: 1
        }
      }
    ]);
    
    const userStatsData = userStats[0] || {
      totalBets: 0,
      totalWins: 0,
      totalBetAmount: 0,
      totalPayout: 0,
      biggestWin: 0,
      avgBetAmount: 0
    };
    
    const globalStatsData = globalStats[0] || {
      totalBets: 0,
      totalPlayers: 0,
      biggestGlobalWin: 0,
      totalVolume: 0
    };
    
    // Calculate win rate and profit/loss
    const winRate = userStatsData.totalBets > 0 ? (userStatsData.totalWins / userStatsData.totalBets) * 100 : 0;
    const netProfit = userStatsData.totalPayout - userStatsData.totalBetAmount;
    
    res.json({
      userStats: {
        ...userStatsData,
        winRate: Math.round(winRate * 100) / 100,
        netProfit: netProfit
      },
      globalStats: globalStatsData
    });
    
  } catch (error) {
    console.error('Error fetching horse racing stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
