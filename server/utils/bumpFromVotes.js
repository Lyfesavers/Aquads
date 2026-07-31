/**
 * Bubble bump requires bullish sentiment (100+ votes) AND $10k+ liquidity (configurable).
 * Liquidity eligibility is stored on the ad (meetsLiquidityRequirement) and refreshed
 * on vote/boost events or by the periodic enforcement cron — not on every shrink tick.
 */

const {
  BUMP_VOTE_THRESHOLD,
  meetsLiquidityRequirement,
  isBumpEligible,
  isVoteBumped,
  prepareAdForBumpSync
} = require('./listingRequirements');

/** Same defaults as server/routes/ads.js bubble shrink */
const DEFAULT_AD_SIZE_OPTS = {
  SHRINK_INTERVAL: 15000,
  MAX_SIZE: 100,
  MIN_SIZE: 50,
  SHRINK_PERCENTAGE: 0.9
};

function computeShrunkSize(createdAt, now, {
  shrinkInterval,
  maxSize,
  minSize,
  shrinkPercentage
}) {
  const timeSinceCreation = now - new Date(createdAt).getTime();
  const shrinkIntervals = Math.floor(timeSinceCreation / shrinkInterval);
  let newSize = maxSize;
  for (let i = 0; i < shrinkIntervals; i++) {
    newSize *= shrinkPercentage;
  }
  return Math.max(minSize, Math.round(newSize * 10) / 10);
}

/**
 * @param {object} ad - current ad (mongoose doc or plain object)
 * @param {number} bullishVotes - count after the vote/boost update
 * @param {object} sizeOpts - shrink/max constants (same as ads.js bubble shrink)
 * @returns {{ changed: boolean, $set: object }}
 */
function getBumpSyncUpdate(ad, bullishVotes, sizeOpts = {}) {
  const {
    SHRINK_INTERVAL,
    MAX_SIZE,
    MIN_SIZE,
    SHRINK_PERCENTAGE,
    now = Date.now()
  } = { ...DEFAULT_AD_SIZE_OPTS, ...sizeOpts };

  const bumpEligible = isBumpEligible(ad, bullishVotes);
  const wasBumped = !!ad.isBumped;

  const $set = {
    bumpExpiresAt: null,
    bumpDuration: null
  };

  let changed =
    bumpEligible !== wasBumped ||
    ad.bumpExpiresAt != null ||
    (ad.bumpDuration != null && ad.bumpDuration !== undefined);

  $set.isBumped = bumpEligible;

  if (bumpEligible) {
    $set.bumpedAt = wasBumped && ad.bumpedAt ? ad.bumpedAt : new Date();
    if (ad.size !== MAX_SIZE) changed = true;
    $set.size = MAX_SIZE;
  } else {
    $set.bumpedAt = null;
    const newSize = computeShrunkSize(ad.createdAt, now, {
      shrinkInterval: SHRINK_INTERVAL,
      maxSize: MAX_SIZE,
      minSize: MIN_SIZE,
      shrinkPercentage: SHRINK_PERCENTAGE
    });
    if (ad.size !== newSize) changed = true;
    $set.size = newSize;
  }

  return { changed, $set };
}

/**
 * Live liquidity refresh (when votes ≥ threshold) + persist bump state.
 * Used on vote/boost events — not on the 15s shrink loop.
 */
async function syncAdBumpState(adDoc, sizeOpts = {}, { forceRefresh = false } = {}) {
  const Ad = require('../models/Ad');
  const prepared = await prepareAdForBumpSync(adDoc, { forceRefresh });
  const bumpSync = getBumpSyncUpdate(prepared, prepared.bullishVotes, sizeOpts);

  const $set = { ...bumpSync.$set };
  const prevChecked = adDoc.liquidityCheckedAt
    ? new Date(adDoc.liquidityCheckedAt).getTime()
    : 0;
  const nextChecked = prepared.liquidityCheckedAt
    ? new Date(prepared.liquidityCheckedAt).getTime()
    : 0;
  const liquidityUpdated = nextChecked > prevChecked;

  if (liquidityUpdated) {
    $set.meetsLiquidityRequirement = prepared.meetsLiquidityRequirement;
    $set.liquidityCheckedAt = prepared.liquidityCheckedAt;
    $set.liquidityUsdSnapshot = prepared.liquidityUsdSnapshot;
  }

  if (!bumpSync.changed && !liquidityUpdated) {
    return adDoc;
  }

  return Ad.findByIdAndUpdate(adDoc._id, { $set }, { new: true });
}

/**
 * Owner-initiated bump: live liquidity check + sync. Requires 100+ votes and ≥ configured liquidity minimum.
 */
async function requestOwnerBump(adDoc, sizeOpts = {}) {
  const Ad = require('../models/Ad');
  const {
    BUMP_VOTE_THRESHOLD,
    MIN_BUMP_LIQUIDITY_USD,
    isVoteBumped
  } = require('./listingRequirements');

  const plain = adDoc?.toObject ? adDoc.toObject() : adDoc;
  const votes = plain.bullishVotes || 0;
  const wasBumped = !!plain.isBumped;

  if (!isVoteBumped(votes)) {
    const need = Math.max(0, BUMP_VOTE_THRESHOLD - votes);
    return {
      ad: plain,
      code: 'needs_votes',
      isBumped: false,
      bullishVotes: votes,
      votesNeeded: need,
      minLiquidityUsd: MIN_BUMP_LIQUIDITY_USD,
      message: `Reach ${BUMP_VOTE_THRESHOLD} bullish votes to bump (${votes} now — ${need} to go). Vote boosts count too.`
    };
  }

  const { refreshAdLiquidityRequirement } = require('./listingRequirements');
  const refresh = await refreshAdLiquidityRequirement(plain);
  if (!refresh) {
    return {
      ad: plain,
      code: 'check_failed',
      isBumped: wasBumped,
      bullishVotes: votes,
      minLiquidityUsd: MIN_BUMP_LIQUIDITY_USD,
      message: 'Could not verify liquidity from DEX data right now. Please try again in a few minutes.'
    };
  }

  const merged = { ...plain, ...refresh };
  const bumpSync = getBumpSyncUpdate(merged, merged.bullishVotes, sizeOpts);
  const $set = {
    ...bumpSync.$set,
    meetsLiquidityRequirement: refresh.meetsLiquidityRequirement,
    liquidityCheckedAt: refresh.liquidityCheckedAt,
    liquidityUsdSnapshot: refresh.liquidityUsdSnapshot
  };

  const updated = await Ad.findByIdAndUpdate(plain._id, { $set }, { new: true });

  if (updated.isBumped) {
    const liq = updated.liquidityUsdSnapshot;
    const liqLabel = liq != null ? `$${Math.round(liq).toLocaleString()}` : `$${MIN_BUMP_LIQUIDITY_USD.toLocaleString()}+`;
    return {
      ad: updated,
      code: wasBumped ? 'already_bumped' : 'bumped',
      isBumped: true,
      bullishVotes: updated.bullishVotes,
      liquidityUsd: liq,
      minLiquidityUsd: MIN_BUMP_LIQUIDITY_USD,
      message: wasBumped
        ? `Your bubble is bumped (${votes} bullish votes, ${liqLabel} liquidity).`
        : `Bubble bumped! ${votes} bullish votes and ${liqLabel} liquidity confirmed.`
    };
  }

  const liq = updated.liquidityUsdSnapshot;
  const liqLabel = liq != null ? `$${Math.round(liq).toLocaleString()}` : `below $${MIN_BUMP_LIQUIDITY_USD.toLocaleString()}`;
  return {
    ad: updated,
    code: 'liquidity_low',
    isBumped: false,
    bullishVotes: updated.bullishVotes,
    liquidityUsd: liq,
    minLiquidityUsd: MIN_BUMP_LIQUIDITY_USD,
    message: `Liquidity is ${liqLabel}. At least $${MIN_BUMP_LIQUIDITY_USD.toLocaleString()} is required to bump. Restore pool liquidity, then tap Bump again.`
  };
}

module.exports = {
  BUMP_VOTE_THRESHOLD,
  DEFAULT_AD_SIZE_OPTS,
  isVoteBumped,
  isBumpEligible,
  meetsLiquidityRequirement,
  computeShrunkSize,
  getBumpSyncUpdate,
  syncAdBumpState,
  requestOwnerBump
};
