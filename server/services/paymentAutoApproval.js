const mongoose = require('mongoose');
const BannerAd = require('../models/BannerAd');
const Ad = require('../models/Ad');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');
const TokenPurchase = require('../models/TokenPurchase');
const Notification = require('../models/Notification');
const { emitTokenPurchaseApproved, emitUserTokenBalanceUpdate, emitAffiliateEarningUpdate } = require('../socket');
const {
  verifyTransactionSucceeded,
  amountsClose
} = require('./paymentVerification');

/**
 * Auto-approval handler for different payment types
 * This service handles auto-approval logic without cluttering the main aquapay route
 */
const paymentAutoApproval = {
  /**
   * Process auto-approval based on payment metadata
   * @param {Object} paymentData - Payment information
   * @returns {Object|null} - Approved item or null
   */
  async processPayment(paymentData) {
    const {
      bannerId,
      projectId,
      tokenPurchaseId,
      hyperspaceOrderId,
      linkBioAdId,
      voteBoostId,
      projectAgentTopupId,
      addonOrderId,
      recipientSlug,
      amount,
      txHash,
      chain,
      token,
      senderAddress,
      senderUsername,
      skipOnChainVerify = false
    } = paymentData;

    // Link in Bio ads pay the influencer directly (not 'aquads'), so handle before the slug check
    if (linkBioAdId) {
      return await this.handleLinkBioAdPayment({
        linkBioAdId,
        recipientSlug,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    // Only process platform payments to 'aquads' slug
    if (recipientSlug.toLowerCase() !== 'aquads') {
      return null;
    }

    // Handle banner ad payments
    if (bannerId) {
      return await this.handleBannerPayment({
        bannerId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    // Handle token purchase payments
    if (tokenPurchaseId) {
      return await this.handleTokenPurchasePayment({
        tokenPurchaseId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    // Handle HyperSpace (Twitter Space Listeners) payments
    if (hyperspaceOrderId) {
      return await this.handleHyperSpacePayment({
        hyperspaceOrderId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    // Vote boost (Telegram/Discord bot flow): attach real tx after AquaPay checkout
    if (voteBoostId) {
      return await this.handleVoteBoostPayment({
        voteBoostId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    if (projectAgentTopupId) {
      return await this.handleProjectAgentTopupPayment({
        projectAgentTopupId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    if (addonOrderId) {
      return await this.handleAddonOrderPayment({
        addonOrderId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    if (projectId) {
      return await this.handleProjectPayment({
        projectId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername,
        skipOnChainVerify
      });
    }

    return null;
  },

  /**
   * Handle banner ad payment auto-approval
   */
  async handleBannerPayment({
    bannerId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const banner = await BannerAd.findById(bannerId).populate('owner', 'username');

      if (!banner || banner.status !== 'pending' || banner.txSignature !== 'aquapay-pending') {
        return null;
      }

      // Verify ownership if senderUsername provided
      if (senderUsername && banner.owner) {
        const bannerOwnerUsername = banner.owner.username || banner.owner.toString();
        if (senderUsername.toLowerCase() !== bannerOwnerUsername.toLowerCase()) {
          console.log(`Banner ad ${banner._id} ownership mismatch: banner owner is ${bannerOwnerUsername}, payment sender is ${senderUsername}`);
          return null;
        }
      }

      // Calculate expected amount
      const expectedAmount = this.calculateBannerAmount(banner.duration);
      const paymentAmount = parseFloat(amount);

      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`Banner ad ${banner._id} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const transactionVerified = await this.verifyTransaction(txHash, chain);
        if (!transactionVerified) {
          console.log(`Banner ad ${banner._id} transaction verification failed for ${txHash} on ${chain}`);
          return null;
        }
      }

      // Auto-approve the banner
      banner.status = 'active';
      banner.expiresAt = new Date(Date.now() + banner.duration);
      banner.txSignature = txHash;
      banner.paymentChain = chain;
      banner.chainSymbol = token || 'USDC';
      banner.chainAddress = senderAddress || '';
      await banner.save();

      console.log(`Banner ad ${banner._id} auto-approved after verified AquaPay payment of ${paymentAmount} USDC on ${chain} by ${senderUsername || 'anonymous'}`);
      return { type: 'banner', id: banner._id, status: banner.status };
    } catch (error) {
      console.error('Error auto-approving banner ad:', error);
      return null;
    }
  },

  /**
   * Calculate expected banner amount from duration
   */
  calculateBannerAmount(duration) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const threeDaysMs = 3 * oneDayMs;
    const sevenDaysMs = 7 * oneDayMs;

    if (duration <= oneDayMs) return 40;
    if (duration <= threeDaysMs) return 80;
    if (duration <= sevenDaysMs) return 160;
    return 160;
  },

  /**
   * Handle token purchase payment auto-approval
   */
  async handleTokenPurchasePayment({
    tokenPurchaseId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const tokenPurchase = await TokenPurchase.findById(tokenPurchaseId).populate('userId', 'username');

      if (!tokenPurchase || tokenPurchase.status !== 'pending' || tokenPurchase.txSignature !== 'aquapay-pending') {
        return null;
      }

      // Verify ownership if senderUsername provided
      if (senderUsername && tokenPurchase.userId) {
        const purchaseOwnerUsername = tokenPurchase.userId.username || tokenPurchase.userId.toString();
        if (senderUsername.toLowerCase() !== purchaseOwnerUsername.toLowerCase()) {
          console.log(`Token purchase ${tokenPurchase._id} ownership mismatch: purchase owner is ${purchaseOwnerUsername}, payment sender is ${senderUsername}`);
          return null;
        }
      }

      // Verify exact amount match (cost in USDC)
      const expectedAmount = parseFloat(tokenPurchase.cost);
      const paymentAmount = parseFloat(amount);

      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`Token purchase ${tokenPurchase._id} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const transactionVerified = await this.verifyTransaction(txHash, chain);
        if (!transactionVerified) {
          console.log(`Token purchase ${tokenPurchase._id} transaction verification failed for ${txHash} on ${chain}`);
          return null;
        }
      }

      // Auto-approve the token purchase
      tokenPurchase.status = 'approved';
      tokenPurchase.approvedAt = new Date();
      tokenPurchase.completedAt = new Date();
      tokenPurchase.txSignature = txHash;
      tokenPurchase.paymentChain = chain;
      tokenPurchase.chainSymbol = token || 'USDC';
      tokenPurchase.chainAddress = senderAddress || '';
      await tokenPurchase.save();

      // Add tokens to user account
      const user = await User.findById(tokenPurchase.userId);
      if (!user) {
        console.log(`Token purchase ${tokenPurchase._id} approved but user ${tokenPurchase.userId} not found`);
        return { type: 'tokenPurchase', id: tokenPurchase._id, status: tokenPurchase.status };
      }

      const balanceBefore = user.tokens || 0;
      user.tokens = (user.tokens || 0) + tokenPurchase.amount;
      user.lastActivity = new Date();

      // Add to token history
      user.tokenHistory.push({
        type: 'purchase',
        amount: tokenPurchase.amount,
        reason: `Token purchase approved (${tokenPurchase.amount} tokens)`,
        relatedId: tokenPurchase._id.toString(),
        balanceBefore,
        balanceAfter: user.tokens
      });

      await user.save();

      // Get pending purchases count for socket update
      const pendingPurchasesCount = await TokenPurchase.countDocuments({ 
        userId: user._id, 
        status: 'pending' 
      });

      // Get the last history entry (the one we just added)
      const lastHistoryEntry = user.tokenHistory[user.tokenHistory.length - 1];

      // Emit user-specific token balance update with all necessary data
      try {
        emitUserTokenBalanceUpdate(user._id.toString(), {
          tokens: user.tokens,
          amount: tokenPurchase.amount,
          balanceBefore,
          balanceAfter: user.tokens,
          historyEntry: lastHistoryEntry,
          pendingPurchases: pendingPurchasesCount
        });
      } catch (balanceUpdateError) {
        console.error('Error emitting token balance update:', balanceUpdateError);
        // Don't fail the approval if balance update emission fails
      }

      // Create notification for user
      try {
        const notification = new Notification({
          userId: tokenPurchase.userId,
          type: 'system',
          message: `Your token purchase has been approved! ${tokenPurchase.amount} tokens added to your account`,
          link: '/dashboard?tab=tokens',
          relatedId: tokenPurchase._id,
          relatedModel: null
        });
        await notification.save();
      } catch (notificationError) {
        console.error('Error creating notification for token purchase:', notificationError);
        // Don't fail the approval if notification fails
      }

      // Emit real-time socket update for token purchase approval
      try {
        emitTokenPurchaseApproved({
          purchaseId: tokenPurchase._id,
          amount: tokenPurchase.amount,
          cost: tokenPurchase.cost,
          userId: tokenPurchase.userId,
          username: tokenPurchase.userId?.username,
          approvedAt: tokenPurchase.approvedAt
        });
      } catch (socketError) {
        console.error('Error emitting token purchase approval:', socketError);
        // Don't fail the approval if socket emission fails
      }

      console.log(`Token purchase ${tokenPurchase._id} auto-approved after verified AquaPay payment of ${paymentAmount} USDC on ${chain} by ${senderUsername || 'anonymous'}`);
      return { type: 'tokenPurchase', id: tokenPurchase._id, status: tokenPurchase.status };
    } catch (error) {
      console.error('Error auto-approving token purchase:', error);
      return null;
    }
  },

  /**
   * Handle HyperSpace (Twitter Space Listeners) payment (crypto/AquaPay only).
   * Verifies payment on-chain, then auto-places order with Socialplug so it goes to delivering.
   * PayPal orders are not auto-placed; they stay pending_approval for admin.
   */
  async handleHyperSpacePayment({
    hyperspaceOrderId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const HyperSpaceOrder = require('../models/HyperSpaceOrder');
      const socialplugService = require('./socialplugService');
      const socket = require('../socket');

      const order = await HyperSpaceOrder.findOne({ orderId: hyperspaceOrderId });

      if (!order || order.status !== 'awaiting_payment') {
        console.log(`HyperSpace order ${hyperspaceOrderId} not found or not awaiting payment`);
        return null;
      }

      // Verify ownership if senderUsername provided
      if (senderUsername && order.username) {
        if (senderUsername.toLowerCase() !== order.username.toLowerCase()) {
          console.log(`HyperSpace order ${hyperspaceOrderId} ownership mismatch: order owner is ${order.username}, payment sender is ${senderUsername}`);
          return null;
        }
      }

      // Verify exact amount match
      const expectedAmount = parseFloat(order.customerPrice);
      const paymentAmount = parseFloat(amount);

      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`HyperSpace order ${hyperspaceOrderId} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const transactionVerified = await this.verifyTransaction(txHash, chain);
        if (!transactionVerified) {
          console.log(`HyperSpace order ${hyperspaceOrderId} transaction verification failed for ${txHash} on ${chain}`);
          return null;
        }
      }

      // Update payment info
      order.txSignature = txHash;
      order.paymentChain = chain;
      order.chainSymbol = token || 'USDC';
      order.paymentStatus = 'completed';
      order.paymentReceivedAt = new Date();

      // Auto-place order with Socialplug (crypto payment verified)
      const placeResult = await socialplugService.placeOrder(order.spaceUrl, order.listenerCount, order.duration);

      if (placeResult.success) {
        order.socialplugOrderId = placeResult.orderId;
        order.socialplugOrderedAt = new Date();
        order.status = 'delivering';
        order.errorMessage = null;
        
        // Calculate delivery end time based on duration
        const deliveryEndsAt = new Date();
        deliveryEndsAt.setMinutes(deliveryEndsAt.getMinutes() + order.duration);
        order.deliveryEndsAt = deliveryEndsAt;
        
        await order.save();

        console.log(`HyperSpace order ${hyperspaceOrderId} payment received and order placed with Socialplug: ${placeResult.orderId}`);

        // Record affiliate commission if the ordering user was referred
        try {
          const orderingUser = await User.findById(order.userId);
          if (orderingUser && orderingUser.referredBy) {
            // Check if commission already recorded for this order
            const existingCommission = await HyperSpaceAffiliateEarning.findOne({ 
              hyperspaceOrderId: order._id 
            }).lean();
            
            if (!existingCommission) {
              // Calculate commission based on PROFIT, not gross amount
              const profitAmount = order.profit || (order.customerPrice - order.socialplugCost - (order.discountAmount || 0));
              
              if (profitAmount > 0) {
                const commissionRate = await AffiliateEarning.calculateCommissionRate(orderingUser.referredBy);
                const commissionEarned = HyperSpaceAffiliateEarning.calculateCommission(profitAmount, commissionRate);
                
                const affiliateEarning = new HyperSpaceAffiliateEarning({
                  affiliateId: orderingUser.referredBy,
                  referredUserId: orderingUser._id,
                  hyperspaceOrderId: order._id,
                  orderId: order.orderId,
                  orderAmount: order.customerPrice,
                  profitAmount: profitAmount,
                  commissionRate,
                  commissionEarned
                });
                
                await affiliateEarning.save();
                console.log(`HyperSpace affiliate commission recorded: $${commissionEarned} for order ${order.orderId}`);
                
                // Emit real-time update for affiliate
                try {
                  emitAffiliateEarningUpdate({
                    affiliateId: orderingUser.referredBy.toString(),
                    earningId: affiliateEarning._id,
                    commissionEarned: affiliateEarning.commissionEarned,
                    sourceType: 'hyperspace',
                    sourceLabel: `HyperSpace: ${order.listenerCount} listeners`,
                    profitAmount: profitAmount,
                    commissionRate: commissionRate,
                    createdAt: affiliateEarning.createdAt
                  });
                } catch (emitError) {
                  console.error('Error emitting affiliate earning update:', emitError);
                }
              }
            }
          }
        } catch (commissionError) {
          console.error('Error recording HyperSpace affiliate commission:', commissionError);
          // Don't fail the order if commission recording fails
        }

        try {
          socket.emitNewHyperSpaceOrder({
            orderId: order.orderId,
            username: order.username,
            listenerCount: order.listenerCount,
            duration: order.duration,
            spaceUrl: order.spaceUrl,
            customerPrice: order.customerPrice,
            socialplugCost: order.socialplugCost,
            createdAt: order.createdAt,
            status: order.status,
            socialplugOrderId: order.socialplugOrderId
          });
          socket.emitHyperSpaceOrderStatusChange(order.orderId, 'delivering', {
            message: 'Your listeners are being delivered!',
            deliveryEndsAt: order.deliveryEndsAt,
            duration: order.duration,
            listenerCount: order.listenerCount
          });
          socket.emitHyperSpaceOrderUpdate({ 
            orderId: order.orderId, 
            status: 'delivering',
            deliveryEndsAt: order.deliveryEndsAt 
          });
        } catch (socketError) {
          console.error('Socket emit error:', socketError);
        }

        return { type: 'hyperspace', id: order.orderId, status: order.status };
      }

      // Socialplug place order failed – keep pending_approval so admin can see and retry
      order.status = 'pending_approval';
      order.errorMessage = placeResult.error || 'Failed to place order with provider';
      await order.save();

      console.log(`HyperSpace order ${hyperspaceOrderId} payment received but Socialplug place order failed: ${order.errorMessage}`);

      try {
        socket.emitNewHyperSpaceOrder({
          orderId: order.orderId,
          username: order.username,
          listenerCount: order.listenerCount,
          duration: order.duration,
          spaceUrl: order.spaceUrl,
          customerPrice: order.customerPrice,
          socialplugCost: order.socialplugCost,
          createdAt: order.createdAt,
          status: order.status,
          errorMessage: order.errorMessage
        });
        socket.emitHyperSpaceOrderStatusChange(order.orderId, 'pending_approval', {
          message: 'Payment received! Your order is being processed (manual step may be needed).'
        });
      } catch (socketError) {
        console.error('Socket emit error:', socketError);
      }

      return { type: 'hyperspace', id: order.orderId, status: order.status };
    } catch (error) {
      console.error('Error processing HyperSpace payment:', error);
      return null;
    }
  },

  /**
   * Handle Link in Bio banner ad payment auto-approval.
   * Unlike other payments, these go to the influencer's wallet (not 'aquads').
   */
  async handleLinkBioAdPayment({
    linkBioAdId,
    recipientSlug,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const LinkInBioBannerAd = require('../models/LinkInBioBannerAd');

      const ad = await LinkInBioBannerAd.findById(linkBioAdId);
      if (!ad || ad.status !== 'pending' || ad.txSignature !== 'aquapay-pending') {
        return null;
      }

      // Look up the target user to verify the payment went to the right person
      const targetUser = await User.findById(ad.targetUser)
        .select('username linkInBioAdsEnabled aquaPay.paymentSlug aquaPay.isEnabled')
        .lean();

      if (!targetUser) {
        console.log(`Link bio ad ${ad._id}: target user not found`);
        return null;
      }

      if (!targetUser.linkInBioAdsEnabled) {
        console.log(`Link bio ad ${ad._id}: target user has disabled ads`);
        return null;
      }

      // Verify the payment recipient matches the target user's AquaPay slug or username
      const targetSlug = (targetUser.aquaPay?.paymentSlug || targetUser.username).toLowerCase();
      if (recipientSlug.toLowerCase() !== targetSlug) {
        console.log(`Link bio ad ${ad._id}: recipient slug mismatch - expected ${targetSlug}, got ${recipientSlug}`);
        return null;
      }

      // Verify exact payment amount
      const expectedAmount = parseFloat(ad.price);
      const paymentAmount = parseFloat(amount);
      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`Link bio ad ${ad._id}: amount mismatch - expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const transactionVerified = await this.verifyTransaction(txHash, chain);
        if (!transactionVerified) {
          console.log(`Link bio ad ${ad._id}: transaction verification failed for ${txHash} on ${chain}`);
          return null;
        }
      }

      // Auto-approve the ad
      ad.status = 'active';
      ad.expiresAt = new Date(Date.now() + ad.duration);
      ad.txSignature = txHash;
      ad.paymentChain = chain;
      ad.chainSymbol = token || 'USDC';
      ad.chainAddress = senderAddress || '';
      await ad.save();

      // Invalidate the active ads cache for this user
      try {
        const { invalidateAdsCache } = require('../routes/linkBioAds');
        invalidateAdsCache(ad.targetUsername);
      } catch (_) {}

      console.log(`Link bio ad ${ad._id} auto-approved after verified payment of ${paymentAmount} on ${chain} to ${targetSlug} by ${senderUsername || 'anonymous'}`);
      return { type: 'linkBioAd', id: ad._id, status: ad.status };
    } catch (error) {
      console.error('Error auto-approving link bio ad:', error);
      return null;
    }
  },

  /**
   * Record vote boost payment from AquaPay (pending request was created in bot with placeholder tx).
   */
  async handleVoteBoostPayment({
    voteBoostId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const VoteBoost = require('../models/VoteBoost');
      const { emitVoteBoostUpdate } = require('../socket');

      const boost = await VoteBoost.findById(voteBoostId);
      if (!boost || boost.status !== 'pending' || boost.txSignature !== 'aquapay-pending') {
        return null;
      }

      if (senderUsername && boost.owner && senderUsername.toLowerCase() !== boost.owner.toLowerCase()) {
        console.log(`Vote boost ${voteBoostId} ownership mismatch: boost owner ${boost.owner}, payer ${senderUsername}`);
        return null;
      }

      const expectedAmount = parseFloat(boost.price);
      const paymentAmount = parseFloat(amount);
      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`Vote boost ${voteBoostId} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const transactionVerified = await this.verifyTransaction(txHash, chain);
        if (!transactionVerified) {
          console.log(`Vote boost ${voteBoostId} transaction verification failed for ${txHash} on ${chain}`);
          return null;
        }
      }

      boost.txSignature = txHash;
      boost.paymentChain = chain;
      boost.chainSymbol = token || 'USDC';
      boost.chainAddress = senderAddress || null;
      boost.status = 'active';
      boost.approvedAt = new Date();
      boost.processedBy = 'aquapay';
      boost.lastVoteAt = new Date();
      await boost.save();

      const ad = await Ad.findOne({ id: boost.adId }).lean();
      try {
        emitVoteBoostUpdate('update', boost, ad);
      } catch (socketErr) {
        console.error('emitVoteBoostUpdate failed for vote boost payment:', socketErr.message);
      }

      console.log(`Vote boost ${voteBoostId} AquaPay payment recorded (${paymentAmount} USDC on ${chain})`);
      return { type: 'voteBoost', id: boost._id, status: boost.status };
    } catch (error) {
      console.error('Error recording vote boost AquaPay payment:', error);
      return null;
    }
  },

  /**
   * Project Agent wallet top-up (AquaPay → aquads).
   * User pays credit + 5% fee; full credit is added to balance.
   */
  async handleProjectAgentTopupPayment({
    projectAgentTopupId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const ProjectAgentTopup = require('../models/ProjectAgentTopup');
      const { creditTopupFromPayment } = require('./projectAgentWallet');

      const topup = await ProjectAgentTopup.findOne({ topupId: projectAgentTopupId });
      if (!topup) {
        console.log(`Project Agent topup ${projectAgentTopupId} not found`);
        return null;
      }

      if (topup.status === 'paid') {
        return {
          type: 'projectAgentTopup',
          id: topup.topupId,
          status: 'paid',
          creditUsd: topup.creditUsd,
          alreadyProcessed: true
        };
      }

      if (topup.status !== 'pending') {
        console.log(`Project Agent topup ${projectAgentTopupId} status is ${topup.status}`);
        return null;
      }

      const existingTx = await ProjectAgentTopup.findOne({ txHash, status: 'paid' });
      if (existingTx) {
        console.log(`Project Agent topup tx ${txHash} already used for ${existingTx.topupId}`);
        return null;
      }

      if (senderUsername && topup.username) {
        if (senderUsername.toLowerCase() !== topup.username.toLowerCase()) {
          console.log(
            `Project Agent topup ${projectAgentTopupId} payer mismatch: expected ${topup.username}, got ${senderUsername}`
          );
          return null;
        }
      }

      const paymentAmount = parseFloat(amount);
      const expectedPay = parseFloat(topup.payUsd);
      if (!Number.isFinite(paymentAmount) || Math.abs(paymentAmount - expectedPay) > 0.06) {
        console.log(
          `Project Agent topup ${projectAgentTopupId} amount mismatch: expected ${expectedPay}, got ${paymentAmount}`
        );
        return null;
      }

      if (!skipOnChainVerify) {
        const transactionVerified = await this.verifyTransaction(txHash, chain);
        if (!transactionVerified) {
          console.log(
            `Project Agent topup ${projectAgentTopupId} transaction verification failed for ${txHash} on ${chain}`
          );
          return null;
        }
      }

      topup.txHash = txHash;
      topup.paymentChain = chain;
      topup.paymentToken = token || null;

      const result = await creditTopupFromPayment(topup, {
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername
      });

      if (!result) {
        return null;
      }

      console.log(
        `Project Agent topup ${projectAgentTopupId} paid: $${topup.creditUsd} credited (fee $${topup.feeUsd})`
      );

      return {
        type: 'projectAgentTopup',
        id: topup.topupId,
        status: 'paid',
        creditUsd: topup.creditUsd,
        balanceUsd: (result.wallet.balanceCents / 100).toFixed(2),
        alreadyProcessed: result.alreadyPaid
      };
    } catch (error) {
      console.error('Error processing Project Agent topup payment:', error);
      return null;
    }
  },

  /**
   * Attach verified payment to a pending project listing (admin still approves listing).
   */
  async handleProjectPayment({
    projectId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      let ad = await Ad.findOne({ id: projectId });
      if (!ad && mongoose.isValidObjectId(projectId)) {
        ad = await Ad.findById(projectId);
      }

      if (!ad || ad.status !== 'pending' || ad.txSignature !== 'aquapay-pending') {
        return null;
      }

      if (senderUsername && ad.owner && senderUsername.toLowerCase() !== ad.owner.toLowerCase()) {
        console.log(`Project ${ad.id} payer mismatch: expected ${ad.owner}, got ${senderUsername}`);
        return null;
      }

      const expectedAmount = parseFloat(ad.totalAmount);
      const paymentAmount = parseFloat(amount);
      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`Project ${ad.id} amount mismatch: expected ${expectedAmount}, got ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const ok = await this.verifyTransaction(txHash, chain);
        if (!ok) return null;
      }

      ad.txSignature = txHash;
      ad.paymentChain = chain;
      ad.chainSymbol = token || 'USDC';
      ad.chainAddress = senderAddress || '';
      await ad.save();

      try {
        const socket = require('../socket');
        socket.getIO().emit('newPendingAd', {
          ad,
          paymentReceived: true,
          createdAt: new Date()
        });
      } catch (socketErr) {
        console.error('handleProjectPayment socket emit:', socketErr.message);
      }

      console.log(`Project listing ${ad.id} payment recorded on ${chain} (${paymentAmount})`);
      return { type: 'project', id: ad.id, status: ad.status, paymentRecorded: true };
    } catch (error) {
      console.error('Error recording project payment:', error);
      return null;
    }
  },

  /**
   * Attach verified payment to a pending addon order (admin still approves order).
   */
  async handleAddonOrderPayment({
    addonOrderId,
    amount,
    txHash,
    chain,
    token,
    senderAddress,
    senderUsername,
    skipOnChainVerify = false
  }) {
    try {
      const AddonOrder = require('../models/AddonOrder');
      let order = await AddonOrder.findOne({ id: addonOrderId });
      if (!order && mongoose.isValidObjectId(addonOrderId)) {
        order = await AddonOrder.findById(addonOrderId);
      }

      if (!order || order.status !== 'pending' || order.txSignature !== 'aquapay-pending') {
        return null;
      }

      if (senderUsername && order.owner && senderUsername.toLowerCase() !== order.owner.toLowerCase()) {
        console.log(`Addon order ${order.id} payer mismatch: expected ${order.owner}, got ${senderUsername}`);
        return null;
      }

      const expectedAmount = parseFloat(order.totalAmount);
      const paymentAmount = parseFloat(amount);
      if (!amountsClose(paymentAmount, expectedAmount, 0.05)) {
        console.log(`Addon order ${order.id} amount mismatch: expected ${expectedAmount}, got ${paymentAmount}`);
        return null;
      }

      if (!skipOnChainVerify) {
        const ok = await this.verifyTransaction(txHash, chain);
        if (!ok) return null;
      }

      order.txSignature = txHash;
      order.paymentChain = chain;
      order.chainSymbol = token || 'USDC';
      order.chainAddress = senderAddress || '';
      await order.save();

      try {
        const socket = require('../socket');
        socket.getIO().emit('newPendingAddonOrder', {
          order,
          paymentReceived: true,
          createdAt: new Date()
        });
      } catch (socketErr) {
        console.error('handleAddonOrderPayment socket emit:', socketErr.message);
      }

      console.log(`Addon order ${order.id} payment recorded on ${chain} (${paymentAmount})`);
      return { type: 'addonOrder', id: order.id, status: order.status, paymentRecorded: true };
    } catch (error) {
      console.error('Error recording addon order payment:', error);
      return null;
    }
  },

  /**
   * Verify transaction confirmed on-chain (status only; full payment checks run in paymentVerification).
   */
  async verifyTransaction(txHash, chain) {
    try {
      return await verifyTransactionSucceeded(txHash, chain);
    } catch (error) {
      console.error(`Error verifying transaction ${txHash} on ${chain}:`, error.message);
      return false;
    }
  }
};

module.exports = paymentAutoApproval;

