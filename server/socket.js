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
          
          // Calculate affiliate earnings summary (matching the original API format)
          const earnings = await AffiliateEarning.find({ affiliateId: new mongoose.Types.ObjectId(userId) }).lean();
          const currentRate = await AffiliateEarning.calculateCommissionRate(userId) || 0.10;
          
          // Calculate totals
          const totalAdRevenue = earnings.reduce((sum, e) => sum + (e.adAmount || 0), 0);
          const totalEarned = earnings.reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
          const pendingAmount = earnings
            .filter(e => e?.status === 'pending')
            .reduce((sum, e) => sum + (e.commissionEarned || 0), 0);
          
          const earningsSummary = {
            totalEarned: totalEarned || 0,
            pendingAmount: pendingAmount || 0,
            totalAdRevenue: totalAdRevenue || 0,
            currentRate: currentRate || 0.10,
            isVipAffiliate: user.isVipAffiliate || false,
            nextTier: currentRate < 0.20 ? {
              rate: currentRate === 0.10 ? 0.15 : 0.20,
              amountNeeded: currentRate === 0.10 ? 5000 : 25000,
              progress: totalAdRevenue || 0
            } : null
          };
          
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
            earningsSummary: earningsSummary,
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

    // Handle admin requesting pending bump requests
    socket.on('requestPendingBumpRequests', async (userData) => {
      if (userData && userData.isAdmin) {
        try {
          const BumpRequest = require('./models/BumpRequest');
          
          // Get all pending bump requests
          const bumpRequests = await BumpRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
          
          // Send all pending bump requests to this admin
          socket.emit('pendingBumpRequestsLoaded', {
            bumpRequests,
            total: bumpRequests.length
          });
          
        } catch (error) {
          console.error('Error fetching pending bump requests for admin:', error);
          socket.emit('pendingBumpRequestsError', { error: 'Failed to fetch pending bump requests' });
        }
      }
    });

    // Handle user requesting their bookings data
    socket.on('requestUserBookings', async (userData) => {
      if (userData && userData.userId) {
        try {
          const Booking = require('./models/Booking');
          
          // Get bookings for the user (both as buyer and seller)
          const bookings = await Booking.find({
            $or: [
              { buyerId: userData.userId },
              { sellerId: userData.userId }
            ]
          })
          .populate('serviceId')
          .populate('sellerId', 'username email')
          .populate('buyerId', 'username email')
          .sort({ createdAt: -1 });

          // Send bookings data to the user
          socket.emit('userBookingsLoaded', {
            bookings,
            total: bookings.length
          });
          
        } catch (error) {
          console.error('Error fetching user bookings:', error);
          socket.emit('userBookingsError', { error: 'Failed to fetch bookings' });
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

    // Handle admin requesting pending services
    socket.on('requestPendingServices', async (userData) => {
      if (!userData || !userData.userId || !userData.isAdmin) {
        socket.emit('pendingServicesError', { error: 'Admin access required' });
        return;
      }

      try {
        const Service = require('./models/Service');
        
        // Fetch all pending services
        const pendingServices = await Service.find({ status: 'pending' })
          .populate('seller', 'username image rating reviews country isOnline lastSeen lastActivity skillBadges cv userType')
          .sort({ createdAt: -1 })
          .lean();

        // Send all pending services to this admin
        socket.emit('pendingServicesLoaded', {
          pendingServices,
          total: pendingServices.length
        });
        
      } catch (error) {
        console.error('Error fetching pending services for admin:', error);
        socket.emit('pendingServicesError', { error: 'Failed to fetch pending services' });
      }
    });

    // Handle admin requesting pending token purchases
    socket.on('requestPendingTokenPurchases', async (userData) => {
      if (!userData || !userData.userId || !userData.isAdmin) {
        socket.emit('pendingTokenPurchasesError', { error: 'Admin access required' });
        return;
      }

      try {
        const TokenPurchase = require('./models/TokenPurchase');
        
        // Fetch all pending token purchases
        const pendingTokenPurchases = await TokenPurchase.find({ status: 'pending' })
          .populate('userId', 'username email')
          .sort({ createdAt: -1 })
          .lean();

        // Send all pending token purchases to this admin
        socket.emit('pendingTokenPurchasesLoaded', {
          pendingTokenPurchases,
          total: pendingTokenPurchases.length
        });
        
      } catch (error) {
        console.error('Error fetching pending token purchases for admin:', error);
        socket.emit('pendingTokenPurchasesError', { error: 'Failed to fetch pending token purchases' });
      }
    });

    // Handle user requesting their notifications
    socket.on('requestUserNotifications', async (userData) => {
      if (!userData || !userData.userId) {
        socket.emit('userNotificationsError', { error: 'User authentication required' });
        return;
      }

      try {
        const Notification = require('./models/Notification');
        
        // Fetch user's notifications
        const notifications = await Notification.find({ userId: userData.userId })
          .sort({ createdAt: -1 })
          .limit(50) // Limit to recent 50 notifications
          .lean();

        const unreadCount = notifications.filter(n => !n.isRead).length;

        // Send notifications to this user
        socket.emit('userNotificationsLoaded', {
          notifications,
          unreadCount,
          total: notifications.length
        });
        
      } catch (error) {
        socket.emit('userNotificationsError', { error: 'Failed to fetch notifications' });
      }
    });

    // Handle user requesting membership info
    socket.on('requestMembershipInfo', async (userData) => {
      if (!userData || !userData.userId) {
        socket.emit('membershipInfoError', { error: 'User authentication required' });
        return;
      }

      try {
        const User = require('./models/User');
        
        // Fetch user's membership info
        const user = await User.findById(userData.userId).select('membership points');
        
        if (!user) {
          socket.emit('membershipInfoError', { error: 'User not found' });
          return;
        }

        // Send membership info to this user
        socket.emit('membershipInfoLoaded', {
          membership: user.membership || null
        });
        
      } catch (error) {
        console.error('Error fetching membership info:', error);
        socket.emit('membershipInfoError', { error: 'Failed to fetch membership info' });
      }
    });

    // Handle user subscribing to membership
    socket.on('subscribeToMembership', async (userData) => {
      if (!userData || !userData.userId) {
        socket.emit('membershipActionError', { error: 'User authentication required', userId: userData?.userId });
        return;
      }

      try {
        const User = require('./models/User');
        
        // Fetch user
        const user = await User.findById(userData.userId);
        
        if (!user) {
          socket.emit('membershipActionError', { error: 'User not found', userId: userData.userId });
          return;
        }

        // Check if user has enough points (1000 points required)
        if (user.points < 1000) {
          socket.emit('membershipActionError', { 
            error: `Insufficient points. You need 1000 points but only have ${user.points}`, 
            userId: userData.userId 
          });
          return;
        }

        // Check if user already has active membership
        if (user.membership && user.membership.isActive) {
          socket.emit('membershipActionError', { 
            error: 'You already have an active membership', 
            userId: userData.userId 
          });
          return;
        }

        // Deduct points and create membership
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        const membership = {
          isActive: true,
          memberId: `MEM-${Date.now()}-${userData.userId.slice(-6)}`,
          nextBillingDate: nextBillingDate,
          subscribedAt: new Date(),
          pointsUsed: 1000
        };

        // Update user
        await User.findByIdAndUpdate(userData.userId, {
          membership: membership,
          points: user.points - 1000,
          $push: {
            pointsHistory: {
              amount: -1000,
              type: 'membership_subscription',
              description: 'Monthly membership subscription',
              timestamp: new Date()
            }
          }
        });

        // Send success response
        socket.emit('membershipActionResponse', {
          membership: membership,
          pointsRemaining: user.points - 1000,
          message: 'Membership activated successfully!',
          userId: userData.userId
        });

        // Also emit membership update for real-time sync
        socket.emit('membershipUpdated', {
          membership: membership,
          pointsRemaining: user.points - 1000,
          userId: userData.userId
        });
        
      } catch (error) {
        console.error('Error subscribing to membership:', error);
        socket.emit('membershipActionError', { 
          error: 'Failed to subscribe to membership', 
          userId: userData.userId 
        });
      }
    });

    // Handle user cancelling membership
    socket.on('cancelMembership', async (userData) => {
      if (!userData || !userData.userId) {
        socket.emit('membershipActionError', { error: 'User authentication required', userId: userData?.userId });
        return;
      }

      try {
        const User = require('./models/User');
        
        // Fetch user
        const user = await User.findById(userData.userId);
        
        if (!user) {
          socket.emit('membershipActionError', { error: 'User not found', userId: userData.userId });
          return;
        }

        // Check if user has active membership
        if (!user.membership || !user.membership.isActive) {
          socket.emit('membershipActionError', { 
            error: 'You do not have an active membership to cancel', 
            userId: userData.userId 
          });
          return;
        }

        // Cancel membership
        const cancelledMembership = {
          ...user.membership,
          isActive: false,
          cancelledAt: new Date()
        };

        // Update user
        await User.findByIdAndUpdate(userData.userId, {
          membership: cancelledMembership
        });

        // Send success response
        socket.emit('membershipActionResponse', {
          membership: cancelledMembership,
          message: 'Membership cancelled successfully',
          userId: userData.userId
        });

        // Also emit membership update for real-time sync
        socket.emit('membershipUpdated', {
          membership: cancelledMembership,
          userId: userData.userId
        });
        
      } catch (error) {
        console.error('Error cancelling membership:', error);
        socket.emit('membershipActionError', { 
          error: 'Failed to cancel membership', 
          userId: userData.userId 
        });
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

// Utility function to emit bump request updates
function emitBumpRequestUpdate(type, bumpRequest) {
  if (!io) {
    return;
  }
  
  io.emit('bumpRequestUpdated', { type, bumpRequest });
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

// Service approval socket emission functions
function emitServiceApproved(serviceData) {
  if (io) {
    io.emit('serviceApproved', serviceData);
  }
}

function emitServiceRejected(serviceData) {
  if (io) {
    io.emit('serviceRejected', serviceData);
  }
}

function emitNewServicePending(serviceData) {
  if (io) {
    io.emit('newServicePending', serviceData);
  }
}

// Token purchase socket emission functions
function emitTokenPurchaseApproved(tokenPurchaseData) {
  if (io) {
    io.emit('tokenPurchaseApproved', tokenPurchaseData);
  }
}

function emitTokenPurchaseRejected(tokenPurchaseData) {
  if (io) {
    io.emit('tokenPurchaseRejected', tokenPurchaseData);
  }
}

function emitNewTokenPurchasePending(tokenPurchaseData) {
  if (io) {
    io.emit('newTokenPurchasePending', tokenPurchaseData);
  }
}

// Notification socket emission functions
function emitNewNotification(notificationData) {
  if (io) {
    io.emit('newNotification', notificationData);
  }
}

function emitNotificationRead(notificationData) {
  if (io) {
    io.emit('notificationRead', notificationData);
  }
}

function emitAllNotificationsRead(userData) {
  if (io) {
    io.emit('allNotificationsRead', userData);
  }
}

// Membership socket emission functions
function emitMembershipUpdated(membershipData) {
  if (io) {
    io.emit('membershipUpdated', membershipData);
  }
}

function emitMembershipActionResponse(actionData) {
  if (io) {
    io.emit('membershipActionResponse', actionData);
  }
}

function emitMembershipActionError(errorData) {
  if (io) {
    io.emit('membershipActionError', errorData);
  }
}

module.exports = {
  init,
  getIO: () => getIO(),
  emitAdUpdate,
  emitTokenUpdate,
  emitBumpRequestUpdate,
  getOnlineUsersCount,
  isUserOnline,
  getConnectedUsers,
  connectedUsers,
  emitTwitterRaidApproved,
  emitTwitterRaidRejected,
  emitNewTwitterRaidCompletion,
  emitAffiliateEarningUpdate,
  emitServiceApproved,
  emitServiceRejected,
  emitNewServicePending,
  emitTokenPurchaseApproved,
  emitTokenPurchaseRejected,
  emitNewTokenPurchasePending,
  emitNewNotification,
  emitNotificationRead,
  emitAllNotificationsRead,
  emitMembershipUpdated,
  emitMembershipActionResponse,
  emitMembershipActionError
}; 