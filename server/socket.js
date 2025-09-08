// Socket.io singleton instance
let io;

// Store connected users
const connectedUsers = new Map();

// Initialize the socket.io instance
function init(server) {
  io = require('socket.io')(server, {
    cors: {
      origin: ["https://www.aquads.xyz", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  
  // Add socket event handlers
  io.on('connection', (socket) => {

    // Handle user requesting affiliate info
    socket.on('requestAffiliateInfo', async (userData) => {
      if (userData && userData.userId) {
        try {
          const User = require('./models/User');
          const AffiliateEarning = require('./models/AffiliateEarning');
          const mongoose = require('mongoose');
          
          const userId = userData.userId;
          
          // Fetch affiliate info
          const user = await User.findById(userId).select('affiliateCode referredBy referredUsers affiliateCount commissionRate isVipAffiliate freeRaidProjectEligibility points pointsHistory giftCardRedemptions powerUps');
          
          if (!user) {
            socket.emit('affiliateInfoError', { error: 'User not found' });
            return;
          }
          
          // Calculate affiliate earnings summary
          const earningsSummary = await AffiliateEarning.aggregate([
            { $match: { affiliateId: new mongoose.Types.ObjectId(userId) } },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: '$commissionEarned' },
                totalAds: { $sum: 1 },
                totalAmount: { $sum: '$adAmount' }
              }
            }
          ]);
          
          // Calculate detailed earnings
          const detailedEarnings = await AffiliateEarning.find({ affiliateId: userId })
            .populate('referredUserId', 'username email')
            .populate('adId', 'title')
            .sort({ createdAt: -1 })
            .limit(50);
          
          // Calculate free raid eligibility
          const freeRaidEligibility = user.checkFreeRaidEligibility ? user.checkFreeRaidEligibility() : { eligible: false, reason: 'Not available' };
          
          const affiliateData = {
            affiliateInfo: {
              affiliateCode: user.affiliateCode,
              referredBy: user.referredBy,
              referredUsers: user.referredUsers || [],
              affiliateCount: user.affiliateCount || 0,
              commissionRate: user.commissionRate || 0,
              isVipAffiliate: user.isVipAffiliate || false,
              freeRaidProjectEligibility: user.freeRaidProjectEligibility || false
            },
            pointsInfo: {
              points: user.points || 0,
              pointsHistory: user.pointsHistory || [],
              giftCardRedemptions: user.giftCardRedemptions || [],
              powerUps: user.powerUps || {}
            },
            earningsSummary: earningsSummary[0] || { totalEarnings: 0, totalAds: 0, totalAmount: 0 },
            detailedEarnings: detailedEarnings,
            freeRaidEligibility: freeRaidEligibility
          };
          
          socket.emit('affiliateInfoLoaded', affiliateData);
          
        } catch (error) {
          console.error('Error fetching affiliate info:', error);
          socket.emit('affiliateInfoError', { error: 'Failed to fetch affiliate info' });
        }
      }
    });

    // Handle admin requesting pending completions
    socket.on('requestPendingCompletions', async (userData) => {
      if (userData && userData.isAdmin) {
        try {
          const TwitterRaid = require('./models/TwitterRaid');
          const mongoose = require('mongoose');
          
          // Get raids with pending completions
          const raids = await TwitterRaid.find({
            completions: {
              $elemMatch: {
                approvalStatus: 'pending'
              }
            }
          })
          .populate('completions.userId', 'username email')
          .populate('createdBy', 'username')
          .lean();

          // Extract pending completions with raid info
          const pendingCompletions = [];
          
          // Get all user IDs for trust score calculation
          const userIds = new Set();
          raids.forEach(raid => {
            raid.completions.forEach(completion => {
              if (completion.approvalStatus === 'pending' && completion.userId) {
                userIds.add(completion.userId._id.toString());
              }
            });
          });

          // Calculate trust scores using optimized database query
          const userTrustScores = {};
          if (userIds.size > 0) {
            try {
              const allRaidsWithCompletions = await TwitterRaid.find({
                'completions.userId': { $in: Array.from(userIds).map(id => new mongoose.Types.ObjectId(id)) }
              })
              .select('completions')
              .lean();

              userIds.forEach(userId => {
                let totalCompletions = 0;
                let approvedCompletions = 0;

                allRaidsWithCompletions.forEach(raid => {
                  raid.completions.forEach(completion => {
                    if (completion.userId && completion.userId.toString() === userId && 
                        completion.approvalStatus !== 'pending') {
                      totalCompletions++;
                      if (completion.approvalStatus === 'approved') {
                        approvedCompletions++;
                      }
                    }
                  });
                });

                userTrustScores[userId] = {
                  totalCompletions,
                  approvedCompletions,
                  approvalRate: totalCompletions > 0 ? (approvedCompletions / totalCompletions) * 100 : 0,
                  trustLevel: totalCompletions === 0 ? 'new' : 
                             (approvedCompletions / totalCompletions) >= 0.85 ? 'high' :
                             (approvedCompletions / totalCompletions) >= 0.65 ? 'medium' : 'low'
                };
              });
            } catch (error) {
              console.error('Error calculating trust scores:', error);
              // Fallback to empty trust scores if query fails
              userIds.forEach(userId => {
                userTrustScores[userId] = {
                  totalCompletions: 0,
                  approvedCompletions: 0,
                  approvalRate: 0,
                  trustLevel: 'new'
                };
              });
            }
          }
          
          raids.forEach(raid => {
            raid.completions.forEach(completion => {
              if (completion.approvalStatus === 'pending') {
                const userId = completion.userId ? completion.userId._id.toString() : null;
                const trustScore = userId ? userTrustScores[userId] : null;
                
                pendingCompletions.push({
                  completionId: completion._id,
                  raidId: raid._id,
                  raidTitle: raid.title,
                  raidTweetUrl: raid.tweetUrl,
                  pointsAmount: raid.points || 50,
                  user: completion.userId,
                  twitterUsername: completion.twitterUsername,
                  verificationMethod: completion.verificationMethod,
                  verificationNote: completion.verificationNote,
                  iframeVerified: completion.iframeVerified,
                  completedAt: completion.completedAt,
                  ipAddress: completion.ipAddress,
                  trustScore: trustScore || {
                    totalCompletions: 0,
                    approvedCompletions: 0,
                    approvalRate: 0,
                    trustLevel: 'new'
                  }
                });
              }
            });
          });

          // Sort by trust level priority: high -> medium -> new -> low
          const trustLevelPriority = { 'high': 0, 'medium': 1, 'new': 2, 'low': 3 };
          pendingCompletions.sort((a, b) => {
            const aPriority = trustLevelPriority[a.trustScore.trustLevel];
            const bPriority = trustLevelPriority[b.trustScore.trustLevel];
            return aPriority - bPriority;
          });

          // Send all pending completions to this admin
          socket.emit('pendingCompletionsLoaded', {
            pendingCompletions,
            total: pendingCompletions.length
          });
          
        } catch (error) {
          console.error('Error fetching pending completions for admin:', error);
          socket.emit('pendingCompletionsError', { error: 'Failed to fetch pending completions' });
        }
      }
    });

    // Handle user authentication and online status
    socket.on('userOnline', async (userData) => {
      if (userData && userData.userId) {
        try {
          const User = require('./models/User');
          
          // First check if user exists
          const existingUser = await User.findById(userData.userId);
          if (!existingUser) {
            return;
          }
          
          // Update user online status in database
          const result = await User.findByIdAndUpdate(userData.userId, {
            isOnline: true,
            lastActivity: new Date()
          }, { new: true });

          // Store user in connected users map
          connectedUsers.set(socket.id, {
            userId: userData.userId,
            username: userData.username,
            joinedAt: new Date()
          });

          // Join user to their own room for direct messages
          socket.join(`user_${userData.userId}`);

          // Broadcast user online status to all clients
          socket.broadcast.emit('userStatusChanged', {
            userId: userData.userId,
            username: userData.username,
            isOnline: true
          });

        } catch (error) {
          // Silent error handling
        }
      }
    });

    // Handle user activity heartbeat
    socket.on('userActivity', async (userData) => {
      if (userData && userData.userId) {
        try {
          const User = require('./models/User');
          await User.findByIdAndUpdate(userData.userId, {
            lastActivity: new Date()
          });
        } catch (error) {
          // Silent error handling
        }
      }
    });

    socket.on('error', (error) => {
      // Silent error handling
    });

    socket.on('disconnect', async (reason) => {
      // Handle user going offline
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        try {
          const User = require('./models/User');
          
          // Update user offline status in database
          await User.findByIdAndUpdate(userInfo.userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          // Remove from connected users
          connectedUsers.delete(socket.id);

          // Broadcast user offline status to all clients
          socket.broadcast.emit('userStatusChanged', {
            userId: userInfo.userId,
            username: userInfo.username,
            isOnline: false,
            lastSeen: new Date()
          });

        } catch (error) {
          // Silent error handling
        }
      }
    });

    // Add back real-time ad updates
    socket.on('adUpdate', (data) => {
      socket.broadcast.emit('adUpdated', data);
    });

    socket.on('adCreate', (data) => {
      socket.broadcast.emit('adCreated', data);
    });

    socket.on('adDelete', (data) => {
      socket.broadcast.emit('adDeleted', data);
    });

    // Simple leaderboard update broadcast
    socket.on('leaderboardUpdate', (data) => {
      socket.broadcast.emit('leaderboardUpdated', data);
    });
  });
  
  return io;
}

// Get the socket.io instance
function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

// Utility function to emit ad updates
function emitAdUpdate(type, ad) {
  if (!io) {
    return;
  }
  
  io.emit('adsUpdated', { type, ad });
}

// Utility function to emit token updates
function emitTokenUpdate(type, tokens) {
  if (!io) {
    return;
  }
  
  io.emit('tokensUpdated', { type, tokens });
}

// Utility function to get online users count
function getOnlineUsersCount() {
  return connectedUsers.size;
}

// Utility function to check if user is online
function isUserOnline(userId) {
  for (const [socketId, userInfo] of connectedUsers.entries()) {
    if (userInfo.userId === userId) {
      return true;
    }
  }
  return false;
}

// Utility function to get connected users
function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

// Utility functions to emit Twitter raid events
function emitTwitterRaidApproved(completionData) {
  if (io) {
    io.emit('twitterRaidCompletionApproved', completionData);
    // Also emit raid update for main page
    io.emit('raidCompletionCountUpdated', {
      raidId: completionData.raidId,
      type: 'approved',
      completionId: completionData.completionId
    });
  }
}

function emitTwitterRaidRejected(completionData) {
  if (io) {
    io.emit('twitterRaidCompletionRejected', completionData);
    // Also emit raid update for main page
    io.emit('raidCompletionCountUpdated', {
      raidId: completionData.raidId,
      type: 'rejected',
      completionId: completionData.completionId
    });
  }
}

function emitNewTwitterRaidCompletion(completionData) {
  if (io) {
    io.emit('newTwitterRaidCompletion', completionData);
    // Also emit raid update for main page
    io.emit('raidCompletionCountUpdated', {
      raidId: completionData.raidId,
      type: 'submitted',
      completionId: completionData.completionId,
      userId: completionData.user._id
    });
  }
}

function emitAffiliateEarningUpdate(affiliateData) {
  if (io) {
    io.emit('affiliateEarningUpdate', affiliateData);
  }
}

module.exports = {
  init,
  getIO: () => getIO(),
  emitAdUpdate,
  emitTokenUpdate,
  getOnlineUsersCount,
  isUserOnline,
  getConnectedUsers,
  connectedUsers,
  emitTwitterRaidApproved,
  emitTwitterRaidRejected,
  emitNewTwitterRaidCompletion,
  emitAffiliateEarningUpdate
}; 