const mongoose = require('mongoose');
const User = require('../models/User');
const { EVM_CHAINS, MANUAL_CHAINS } = require('./paymentVerification');

const WALLET_FIELD_BY_CHAIN = {
  solana: 'solana',
  ethereum: 'ethereum',
  base: 'ethereum',
  polygon: 'ethereum',
  arbitrum: 'ethereum',
  bnb: 'ethereum',
  bitcoin: 'bitcoin',
  tron: 'tron'
};

function getRecipientWalletForChain(aquaPay, chain) {
  if (!aquaPay?.wallets) return null;
  const field = WALLET_FIELD_BY_CHAIN[chain];
  return field ? aquaPay.wallets[field] : null;
}

/**
 * @param {string} txHash
 */
async function findExistingPaymentByTxHash(txHash) {
  const user = await User.findOne({ 'aquaPay.paymentHistory.txHash': txHash })
    .select('username email aquaPay')
    .lean();
  if (user) {
    const payment = (user.aquaPay?.paymentHistory || []).find((p) => p.txHash === txHash);
    return { user, payment, duplicate: true };
  }

  const BannerAd = require('../models/BannerAd');
  const TokenPurchase = require('../models/TokenPurchase');
  const HyperSpaceOrder = require('../models/HyperSpaceOrder');
  const LinkInBioBannerAd = require('../models/LinkInBioBannerAd');
  const VoteBoost = require('../models/VoteBoost');
  const ProjectAgentTopup = require('../models/ProjectAgentTopup');
  const AddonOrder = require('../models/AddonOrder');
  const Ad = require('../models/Ad');

  const checks = [
    BannerAd.findOne({ txSignature: txHash }).lean(),
    TokenPurchase.findOne({ txSignature: txHash }).lean(),
    HyperSpaceOrder.findOne({ txSignature: txHash }).lean(),
    LinkInBioBannerAd.findOne({ txSignature: txHash }).lean(),
    VoteBoost.findOne({ txSignature: txHash }).lean(),
    ProjectAgentTopup.findOne({ txHash, status: 'paid' }).lean(),
    AddonOrder.findOne({ txSignature: txHash }).lean(),
    Ad.findOne({ txSignature: txHash }).lean()
  ];

  const results = await Promise.all(checks);
  if (results.some(Boolean)) {
    return { duplicate: true, alreadyUsed: true };
  }

  return null;
}

/**
 * Resolve expected payment for checkout URLs (amount + recipient on chain).
 * @param {object} body - request body
 * @param {object} recipientUser - User doc with aquaPay
 */
async function resolveCheckoutPaymentExpectation(body, recipientUser) {
  const {
    recipientSlug,
    amount,
    chain,
    bannerId,
    projectId,
    addonOrderId,
    tokenPurchaseId,
    hyperspaceOrderId,
    linkBioAdId,
    voteBoostId,
    projectAgentTopupId
  } = body;

  const slug = (recipientSlug || '').toLowerCase();
  const paymentAmount = parseFloat(amount);

  if (linkBioAdId) {
    const LinkInBioBannerAd = require('../models/LinkInBioBannerAd');
    const ad = await LinkInBioBannerAd.findById(linkBioAdId).lean();
    if (!ad || ad.status !== 'pending' || ad.txSignature !== 'aquapay-pending') {
      return { error: 'Invalid or expired link-in-bio ad checkout' };
    }
    const targetUser = await User.findById(ad.targetUser)
      .select('username aquaPay.paymentSlug aquaPay.wallets aquaPay.isEnabled linkInBioAdsEnabled')
      .lean();
    if (!targetUser?.linkInBioAdsEnabled || !targetUser?.aquaPay?.isEnabled) {
      return { error: 'Recipient cannot accept this payment' };
    }
    const targetSlug = (targetUser.aquaPay.paymentSlug || targetUser.username).toLowerCase();
    if (slug !== targetSlug) {
      return { error: 'Payment link does not match this ad' };
    }
    const recipientAddress = getRecipientWalletForChain(targetUser.aquaPay, chain);
    return {
      expectedAmount: parseFloat(ad.price),
      recipientAddress,
      recipientUser: targetUser,
      requireFee: true
    };
  }

  if (slug !== 'aquads') {
    return {
      expectedAmount: paymentAmount,
      recipientAddress: getRecipientWalletForChain(recipientUser.aquaPay, chain),
      requireFee: !MANUAL_CHAINS.has(chain)
    };
  }

  const aquadsUser = recipientUser;
  const aquadsWallet = getRecipientWalletForChain(aquadsUser.aquaPay, chain);

  if (bannerId) {
    const BannerAd = require('../models/BannerAd');
    const paymentAutoApproval = require('./paymentAutoApproval');
    const banner = await BannerAd.findById(bannerId).lean();
    if (!banner || banner.status !== 'pending' || banner.txSignature !== 'aquapay-pending') {
      return { error: 'Invalid or expired banner checkout' };
    }
    return {
      expectedAmount: paymentAutoApproval.calculateBannerAmount(banner.duration),
      recipientAddress: aquadsWallet,
      requireFee: true
    };
  }

  if (tokenPurchaseId) {
    const TokenPurchase = require('../models/TokenPurchase');
    const purchase = await TokenPurchase.findById(tokenPurchaseId).lean();
    if (!purchase || purchase.status !== 'pending' || purchase.txSignature !== 'aquapay-pending') {
      return { error: 'Invalid or expired token purchase checkout' };
    }
    return {
      expectedAmount: parseFloat(purchase.cost),
      recipientAddress: aquadsWallet,
      requireFee: true
    };
  }

  if (hyperspaceOrderId) {
    const HyperSpaceOrder = require('../models/HyperSpaceOrder');
    const order = await HyperSpaceOrder.findOne({ orderId: hyperspaceOrderId }).lean();
    if (!order || order.status !== 'awaiting_payment') {
      return { error: 'Invalid or expired HyperSpace checkout' };
    }
    return {
      expectedAmount: parseFloat(order.customerPrice),
      recipientAddress: aquadsWallet,
      requireFee: true
    };
  }

  if (voteBoostId) {
    const VoteBoost = require('../models/VoteBoost');
    const boost = await VoteBoost.findById(voteBoostId).lean();
    if (!boost || boost.status !== 'pending' || boost.txSignature !== 'aquapay-pending') {
      return { error: 'Invalid or expired vote boost checkout' };
    }
    return {
      expectedAmount: parseFloat(boost.price),
      recipientAddress: aquadsWallet,
      requireFee: true
    };
  }

  if (projectAgentTopupId) {
    const ProjectAgentTopup = require('../models/ProjectAgentTopup');
    const topup = await ProjectAgentTopup.findOne({ topupId: projectAgentTopupId }).lean();
    if (!topup || topup.status !== 'pending') {
      return { error: 'Invalid or expired top-up checkout' };
    }
    return {
      expectedAmount: parseFloat(topup.payUsd),
      recipientAddress: aquadsWallet,
      requireFee: true,
      amountTolerance: 0.06
    };
  }

  if (addonOrderId) {
    const AddonOrder = require('../models/AddonOrder');
    let order = await AddonOrder.findOne({ id: addonOrderId }).lean();
    if (!order && mongoose.isValidObjectId(addonOrderId)) {
      order = await AddonOrder.findById(addonOrderId).lean();
    }
    if (!order || order.status !== 'pending' || order.txSignature !== 'aquapay-pending') {
      return { error: 'Invalid or expired addon order checkout' };
    }
    return {
      expectedAmount: parseFloat(order.totalAmount),
      recipientAddress: aquadsWallet,
      requireFee: true
    };
  }

  if (projectId) {
    const Ad = require('../models/Ad');
    let ad = await Ad.findOne({ id: projectId }).lean();
    if (!ad && mongoose.isValidObjectId(projectId)) {
      ad = await Ad.findById(projectId).lean();
    }
    if (!ad || ad.status !== 'pending' || ad.txSignature !== 'aquapay-pending') {
      return { error: 'Invalid or expired project listing checkout' };
    }
    return {
      expectedAmount: parseFloat(ad.totalAmount),
      recipientAddress: aquadsWallet,
      requireFee: true
    };
  }

  return {
    expectedAmount: paymentAmount,
    recipientAddress: aquadsWallet,
    requireFee: !MANUAL_CHAINS.has(chain)
  };
}

module.exports = {
  getRecipientWalletForChain,
  findExistingPaymentByTxHash,
  resolveCheckoutPaymentExpectation,
  WALLET_FIELD_BY_CHAIN
};
