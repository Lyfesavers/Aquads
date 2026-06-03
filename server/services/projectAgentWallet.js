const ProjectAgentWallet = require('../models/ProjectAgentWallet');
const ProjectAgentLedger = require('../models/ProjectAgentLedger');
const { usdToCents, centsToUsd } = require('../utils/kimiCost');

const ProjectAgentTopup = require('../models/ProjectAgentTopup');

const {
  getStarterGrantCentsForAd,
  resolveAgentScopeLabel
} = require('../utils/projectAgentScope');

const STARTER_GRANT_CENTS = Number(process.env.PROJECT_AGENT_STARTER_CENTS) || 500;
const LOAD_FEE_RATE = Number(process.env.PROJECT_AGENT_LOAD_FEE_RATE) || 0.05;

/** Fee on top: pay creditUsd + 5% → full creditUsd lands in wallet */
function computeTopupPricing(creditUsd) {
  const credit = Math.round(Number(creditUsd) * 100) / 100;
  const fee = Math.round(credit * LOAD_FEE_RATE * 100) / 100;
  const pay = Math.round((credit + fee) * 100) / 100;
  return {
    creditUsd: credit,
    feeUsd: fee,
    payUsd: pay,
    creditCents: usdToCents(credit),
    feeCents: usdToCents(fee),
    payCents: usdToCents(pay),
    loadFeeRate: LOAD_FEE_RATE
  };
}

async function getOrCreateWallet(userId, adId) {
  let wallet = await ProjectAgentWallet.findOne({ userId, adId });
  if (!wallet) {
    wallet = await ProjectAgentWallet.create({
      userId,
      adId,
      balanceCents: 0,
      starterGranted: false
    });
  }
  return wallet;
}

function starterGrantNote(ad) {
  if (ad?.isFreelancerScope) return 'Freelancer Skipper Agent trial credit';
  if (ad?.isAccountScope) return 'Skipper Agent trial credit';
  if (resolveAgentScopeLabel(ad) === 'premium') {
    return 'Premium listing Skipper Agent starter credit';
  }
  return 'Skipper Agent trial credit';
}

async function sumStarterGrantCents(userId, adId) {
  const rows = await ProjectAgentLedger.find({ userId, adId, type: 'starter_grant' })
    .select('amountCents')
    .lean();
  return rows.reduce((sum, row) => sum + Math.max(0, Number(row.amountCents) || 0), 0);
}

/**
 * Grant starter credit up to the tier cap (trial $1 or Premium $5). Top-ups on upgrade
 * when a Starter wallet already received the $1 trial.
 * @param {string} userId
 * @param {object|string} ad — listing/ad scope object, or legacy ad id string
 */
async function grantStarterIfNeeded(userId, ad) {
  const adId = typeof ad === 'string' ? ad : ad.id;
  const grantTarget = getStarterGrantCentsForAd(ad);
  const wallet = await getOrCreateWallet(userId, adId);

  if (grantTarget <= 0) {
    return { wallet, granted: false, grantCents: 0 };
  }

  const alreadyGranted = await sumStarterGrantCents(userId, adId);
  const toGrant = Math.max(0, grantTarget - alreadyGranted);
  if (toGrant <= 0) {
    return { wallet, granted: false, grantCents: 0 };
  }

  wallet.balanceCents += toGrant;
  if (!wallet.starterGranted) {
    wallet.starterGranted = true;
    wallet.starterGrantedAt = new Date();
  }
  await wallet.save();

  await ProjectAgentLedger.create({
    userId,
    adId,
    type: 'starter_grant',
    amountCents: toGrant,
    balanceAfterCents: wallet.balanceCents,
    meta: {
      note: typeof ad === 'object' ? starterGrantNote(ad) : 'Skipper Agent starter credit',
      grantTargetCents: grantTarget,
      previouslyGrantedCents: alreadyGranted
    }
  });

  return { wallet, granted: true, grantCents: toGrant };
}

/**
 * Atomically reserve balance before an upstream API call. Returns null if insufficient.
 */
async function reserveBalance(userId, adId, reserveCents, meta = {}) {
  if (reserveCents <= 0) {
    const wallet = await getOrCreateWallet(userId, adId);
    return { wallet, reservedCents: 0 };
  }

  const wallet = await ProjectAgentWallet.findOneAndUpdate(
    { userId, adId, balanceCents: { $gte: reserveCents } },
    { $inc: { balanceCents: -reserveCents } },
    { new: true }
  );
  if (!wallet) {
    return null;
  }

  await ProjectAgentLedger.create({
    userId,
    adId,
    type: 'hold',
    amountCents: -reserveCents,
    balanceAfterCents: wallet.balanceCents,
    meta
  });

  return { wallet, reservedCents: reserveCents };
}

/** Refund a hold when the upstream call never completed or failed. */
async function releaseHold(userId, adId, holdCents, meta = {}) {
  if (holdCents <= 0) {
    const wallet = await getOrCreateWallet(userId, adId);
    return { wallet };
  }

  const wallet = await ProjectAgentWallet.findOneAndUpdate(
    { userId, adId },
    { $inc: { balanceCents: holdCents } },
    { new: true }
  );
  if (!wallet) {
    return null;
  }

  await ProjectAgentLedger.create({
    userId,
    adId,
    type: 'hold_release',
    amountCents: holdCents,
    balanceAfterCents: wallet.balanceCents,
    meta: { ...meta, reason: meta.reason || 'cancelled' }
  });

  return { wallet };
}

/**
 * Settle a prior hold against actual usage (refund unused hold; deduct overage if any).
 */
async function settleHold(userId, adId, holdCents, actualCents, meta = {}) {
  const hold = Math.max(0, Number(holdCents) || 0);
  const actual = Math.max(0, Number(actualCents) || 0);
  const refundCents = Math.max(0, hold - actual);
  const overageCents = Math.max(0, actual - hold);

  let wallet = await ProjectAgentWallet.findOne({ userId, adId });
  if (!wallet) {
    return null;
  }

  if (refundCents > 0) {
    wallet = await ProjectAgentWallet.findOneAndUpdate(
      { userId, adId },
      { $inc: { balanceCents: refundCents } },
      { new: true }
    );
    await ProjectAgentLedger.create({
      userId,
      adId,
      type: 'hold_release',
      amountCents: refundCents,
      balanceAfterCents: wallet.balanceCents,
      meta: { ...meta, holdCents: hold, actualCents: actual, refunded: refundCents }
    });
  }

  if (actual > 0) {
    await ProjectAgentLedger.create({
      userId,
      adId,
      type: 'usage',
      amountCents: -actual,
      balanceAfterCents: wallet.balanceCents,
      meta: { ...meta, holdCents: hold, settledFromHold: true }
    });
  }

  if (overageCents > 0) {
    const extra = await deductUsage(userId, adId, overageCents, {
      ...meta,
      overage: true,
      holdCents: hold,
      actualCents: actual
    });
    if (!extra) {
      return { wallet, settled: false, overageCents, actualCents: actual };
    }
    wallet = extra.wallet;
  }

  return { wallet, settled: true, actualCents: actual, refundCents };
}

/**
 * Deduct usage cost in cents. Returns null if insufficient balance.
 */
async function deductUsage(userId, adId, costCents, meta = {}) {
  if (costCents <= 0) {
    const wallet = await getOrCreateWallet(userId, adId);
    return { wallet, ledger: null };
  }

  const wallet = await ProjectAgentWallet.findOne({ userId, adId });
  if (!wallet || wallet.balanceCents < costCents) {
    return null;
  }

  wallet.balanceCents -= costCents;
  await wallet.save();

  const ledger = await ProjectAgentLedger.create({
    userId,
    adId,
    type: 'usage',
    amountCents: -costCents,
    balanceAfterCents: wallet.balanceCents,
    meta
  });

  return { wallet, ledger };
}

function walletResponse(wallet, opts = {}) {
  const grantCents =
    opts.starterGrantCents != null
      ? opts.starterGrantCents
      : getStarterGrantCentsForAd(opts.ad || wallet.adId);
  const scope =
    opts.scope ||
    (wallet.adId === 'freelancer'
      ? 'freelancer'
      : wallet.adId === 'account'
        ? 'account'
        : 'listing');
  return {
    balanceCents: wallet.balanceCents,
    balanceUsd: centsToUsd(wallet.balanceCents),
    starterGranted: wallet.starterGranted,
    starterGrantUsd: (grantCents / 100).toFixed(2),
    scope
  };
}

/**
 * Credit wallet after AquaPay top-up (idempotent if topup already paid).
 */
async function creditTopupFromPayment(topup, paymentMeta = {}) {
  if (!topup) return null;

  if (topup.status === 'paid') {
    const wallet = await getOrCreateWallet(topup.userId, topup.adId);
    return { wallet, topup, alreadyPaid: true };
  }

  const wallet = await getOrCreateWallet(topup.userId, topup.adId);
  wallet.balanceCents += topup.creditCents;
  await wallet.save();

  await ProjectAgentLedger.create({
    userId: topup.userId,
    adId: topup.adId,
    type: 'topup',
    amountCents: topup.creditCents,
    balanceAfterCents: wallet.balanceCents,
    meta: {
      topupId: topup.topupId,
      payUsd: topup.payUsd,
      feeUsd: topup.feeUsd,
      creditUsd: topup.creditUsd,
      ...paymentMeta
    }
  });

  if (topup.feeCents > 0) {
    await ProjectAgentLedger.create({
      userId: topup.userId,
      adId: topup.adId,
      type: 'topup_fee',
      amountCents: 0,
      balanceAfterCents: wallet.balanceCents,
      meta: {
        topupId: topup.topupId,
        feeUsd: topup.feeUsd,
        feeCents: topup.feeCents,
        note: 'Load fee collected via AquaPay (not deducted from balance)'
      }
    });
  }

  topup.status = 'paid';
  topup.paidAt = new Date();
  await topup.save();

  return { wallet, topup, alreadyPaid: false };
}

/**
 * Record platform-subsidized Skipper usage (no user wallet debit).
 */
async function recordListingSubsidy(userId, adId, platformCostCents, meta = {}) {
  const wallet = await getOrCreateWallet(userId, adId);
  await ProjectAgentLedger.create({
    userId,
    adId,
    type: 'adjustment',
    amountCents: 0,
    balanceAfterCents: wallet.balanceCents,
    meta: {
      ...meta,
      platformCostCents: Math.max(0, Number(platformCostCents) || 0),
      subsidy: 'project_listing_via_skipper'
    }
  });
  return { wallet };
}

module.exports = {
  STARTER_GRANT_CENTS,
  LOAD_FEE_RATE,
  computeTopupPricing,
  getOrCreateWallet,
  grantStarterIfNeeded,
  reserveBalance,
  releaseHold,
  settleHold,
  deductUsage,
  creditTopupFromPayment,
  recordListingSubsidy,
  walletResponse,
  usdToCents,
  centsToUsd
};
