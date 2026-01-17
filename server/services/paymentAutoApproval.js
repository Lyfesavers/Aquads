const BannerAd = require('../models/BannerAd');

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
    const { bannerId, bumpId, projectId, recipientSlug, amount, txHash, chain, token, senderAddress, senderUsername } = paymentData;

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

    // TODO: Handle bump payments
    // if (bumpId) {
    //   return await this.handleBumpPayment({ bumpId, ... });
    // }

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

