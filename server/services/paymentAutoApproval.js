const BannerAd = require('../models/BannerAd');
const BumpRequest = require('../models/BumpRequest');
const Ad = require('../models/Ad');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');
const TokenPurchase = require('../models/TokenPurchase');
const Notification = require('../models/Notification');
const { emitBumpRequestUpdate, emitTokenPurchaseApproved, emitUserTokenBalanceUpdate, emitAffiliateEarningUpdate } = require('../socket');

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
    const { bannerId, bumpId, projectId, tokenPurchaseId, hyperspaceOrderId, recipientSlug, amount, txHash, chain, token, senderAddress, senderUsername } = paymentData;

    // Only process payments to 'aquads' slug
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
        senderUsername
      });
    }

    // Handle bump payments
    if (bumpId) {
      return await this.handleBumpPayment({
        bumpId,
        amount,
        txHash,
        chain,
        token,
        senderAddress,
        senderUsername
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
        senderUsername
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
        senderUsername
      });
    }

    // TODO: Handle project listing payments
    // if (projectId) {
    //   return await this.handleProjectPayment({ projectId, ... });
    // }

    return null;
  },

  /**
   * Handle banner ad payment auto-approval
   */
  async handleBannerPayment({ bannerId, amount, txHash, chain, token, senderAddress, senderUsername }) {
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

      if (paymentAmount !== expectedAmount) {
        console.log(`Banner ad ${banner._id} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      // Verify transaction on-chain
      const transactionVerified = await this.verifyTransaction(txHash, chain);
      if (!transactionVerified) {
        console.log(`Banner ad ${banner._id} transaction verification failed for ${txHash} on ${chain}`);
        return null;
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
   * Handle bump payment auto-approval
   */
  async handleBumpPayment({ bumpId, amount, txHash, chain, token, senderAddress, senderUsername }) {
    try {
      const bumpRequest = await BumpRequest.findById(bumpId);

      if (!bumpRequest || bumpRequest.status !== 'pending' || bumpRequest.txSignature !== 'aquapay-pending') {
        return null;
      }

      // Verify ownership if senderUsername provided (owner is a String in BumpRequest model)
      if (senderUsername && bumpRequest.owner) {
        const bumpOwnerUsername = bumpRequest.owner.toString();
        if (senderUsername.toLowerCase() !== bumpOwnerUsername.toLowerCase()) {
          console.log(`Bump request ${bumpRequest._id} ownership mismatch: bump owner is ${bumpOwnerUsername}, payment sender is ${senderUsername}`);
          return null;
        }
      }

      // Calculate expected amount (99 USDC for lifetime, minus discount if any)
      const expectedAmount = this.calculateBumpAmount(bumpRequest.duration, bumpRequest.discountAmount || 0);
      const paymentAmount = parseFloat(amount);

      if (paymentAmount !== expectedAmount) {
        console.log(`Bump request ${bumpRequest._id} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      // Verify transaction on-chain
      const transactionVerified = await this.verifyTransaction(txHash, chain);
      if (!transactionVerified) {
        console.log(`Bump request ${bumpRequest._id} transaction verification failed for ${txHash} on ${chain}`);
        return null;
      }

      // Auto-approve the bump
      bumpRequest.status = 'approved';
      bumpRequest.processedAt = new Date();
      bumpRequest.txSignature = txHash;
      await bumpRequest.save();

      // Update the ad
      const now = new Date();
      const expiresAt = bumpRequest.duration === -1 ? null : new Date(now.getTime() + bumpRequest.duration);
      
      const ad = await Ad.findOneAndUpdate(
        { id: bumpRequest.adId },
        { 
          size: 100, // MAX_SIZE
          isBumped: true,
          status: 'approved',
          bumpedAt: now,
          bumpDuration: bumpRequest.duration,
          bumpExpiresAt: expiresAt,
          lastBumpTx: txHash
        },
        { new: true }
      );

      if (!ad) {
        console.log(`Bump request ${bumpRequest._id} approved but ad ${bumpRequest.adId} not found`);
        return { type: 'bump', id: bumpRequest._id, status: bumpRequest.status };
      }

      // Record affiliate commission if applicable (same logic as manual approve endpoint)
      try {
        const adOwner = await User.findOne({ username: ad.owner }).lean();
        if (adOwner && adOwner.referredBy) {
          // Calculate USDC amount based on bump duration
          let adAmount;
          if (bumpRequest.duration === 90 * 24 * 60 * 60 * 1000) { // 3 months
            adAmount = 99; // 99 USDC
          } else if (bumpRequest.duration === 180 * 24 * 60 * 60 * 1000) { // 6 months
            adAmount = 150; // 150 USDC
          } else if (bumpRequest.duration === 365 * 24 * 60 * 60 * 1000) { // 1 year (legacy)
            adAmount = 300; // 300 USDC
          } else if (bumpRequest.duration === -1) { // Lifetime
            adAmount = 300; // 300 USDC
          }

          if (adAmount) {
            const commissionRate = await AffiliateEarning.calculateCommissionRate(adOwner.referredBy);
            const commissionEarned = AffiliateEarning.calculateCommission(adAmount, commissionRate);
            
            const earning = new AffiliateEarning({
              affiliateId: adOwner.referredBy,
              referredUserId: adOwner._id,
              adId: ad._id,
              adAmount,           // This will now be in USDC
              currency: 'USDC',   // Specify USDC currency
              commissionRate,
              commissionEarned
            });
            
            await earning.save();
          }
        }
      } catch (commissionError) {
        console.error('Error recording affiliate commission:', commissionError);
        // Don't fail the approval if commission recording fails
      }

      // Emit socket events
      emitBumpRequestUpdate('approve', bumpRequest);
      const socket = require('../socket');
      socket.emitAdUpdate('update', ad);

      console.log(`Bump request ${bumpRequest._id} auto-approved after verified AquaPay payment of ${paymentAmount} USDC on ${chain} by ${senderUsername || 'anonymous'}`);
      return { type: 'bump', id: bumpRequest._id, status: bumpRequest.status };
    } catch (error) {
      console.error('Error auto-approving bump request:', error);
      return null;
    }
  },

  /**
   * Calculate expected bump amount from duration and discount
   */
  calculateBumpAmount(duration, discountAmount = 0) {
    // Lifetime bump is 99 USDC
    if (duration === -1) {
      return 99 - discountAmount;
    }
    // For other durations, use the same logic as in bumps.js route
    // Currently only lifetime is supported, so default to 99
    return 99 - discountAmount;
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
  async handleTokenPurchasePayment({ tokenPurchaseId, amount, txHash, chain, token, senderAddress, senderUsername }) {
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

      if (paymentAmount !== expectedAmount) {
        console.log(`Token purchase ${tokenPurchase._id} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      // Verify transaction on-chain
      const transactionVerified = await this.verifyTransaction(txHash, chain);
      if (!transactionVerified) {
        console.log(`Token purchase ${tokenPurchase._id} transaction verification failed for ${txHash} on ${chain}`);
        return null;
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
  async handleHyperSpacePayment({ hyperspaceOrderId, amount, txHash, chain, token, senderAddress, senderUsername }) {
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

      if (paymentAmount !== expectedAmount) {
        console.log(`HyperSpace order ${hyperspaceOrderId} payment amount mismatch: expected ${expectedAmount}, received ${paymentAmount}`);
        return null;
      }

      // Verify transaction on-chain
      const transactionVerified = await this.verifyTransaction(txHash, chain);
      if (!transactionVerified) {
        console.log(`HyperSpace order ${hyperspaceOrderId} transaction verification failed for ${txHash} on ${chain}`);
        return null;
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
   * Verify transaction on-chain
   */
  async verifyTransaction(txHash, chain) {
    try {
      if (chain === 'solana') {
        const axios = require('axios');
        const SOLANA_RPC = 'https://solana-rpc.publicnode.com';

        const statusResponse = await axios.post(SOLANA_RPC, {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getSignatureStatuses',
          params: [[txHash]]
        }, { timeout: 10000 });

        const status = statusResponse.data?.result?.value?.[0];
        return status && !status.err && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized');
      } else if (['ethereum', 'base', 'polygon', 'arbitrum', 'bnb'].includes(chain)) {
        const { ethers } = require('ethers');
        const rpcUrls = {
          ethereum: 'https://ethereum.publicnode.com',
          base: 'https://mainnet.base.org',
          polygon: 'https://polygon-rpc.com',
          arbitrum: 'https://arb1.arbitrum.io/rpc',
          bnb: 'https://bsc-dataseed.binance.org'
        };

        const provider = new ethers.JsonRpcProvider(rpcUrls[chain] || rpcUrls.ethereum);
        const receipt = await provider.getTransactionReceipt(txHash);
        return receipt && receipt.status === 1;
      } else {
        // For other chains, trust frontend verification
        return true;
      }
    } catch (error) {
      console.error(`Error verifying transaction ${txHash} on ${chain}:`, error.message);
      return false;
    }
  }
};

module.exports = paymentAutoApproval;

