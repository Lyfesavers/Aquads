const BannerAd = require('../models/BannerAd');
const BumpRequest = require('../models/BumpRequest');
const Ad = require('../models/Ad');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const TokenPurchase = require('../models/TokenPurchase');
const Notification = require('../models/Notification');
const { emitBumpRequestUpdate, emitTokenPurchaseApproved } = require('../socket');

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
    const { bannerId, bumpId, projectId, tokenPurchaseId, recipientSlug, amount, txHash, chain, token, senderAddress, senderUsername } = paymentData;

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
        const adOwner = await User.findOne({ username: ad.owner });
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

      // Create notification for user
      try {
        const notification = new Notification({
          userId: tokenPurchase.userId,
          type: 'tokens',
          message: `Your token purchase has been approved! ${tokenPurchase.amount} tokens added to your account`,
          link: '/dashboard?tab=tokens',
          relatedId: tokenPurchase._id,
          relatedModel: 'TokenPurchase'
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

