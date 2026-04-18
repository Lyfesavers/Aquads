/**
 * Bubble bump is earned from bullish sentiment (organic votes + vote boosts).
 * Paid USDC bump is removed — this is the single source of truth for "bumped" eligibility.
 */

const BUMP_VOTE_THRESHOLD = 100;

/** Same defaults as server/routes/ads.js bubble shrink */
const DEFAULT_AD_SIZE_OPTS = {
  SHRINK_INTERVAL: 15000,
  MAX_SIZE: 100,
  MIN_SIZE: 50,
  SHRINK_PERCENTAGE: 0.9
};

const isVoteBumped = (bullishVotes) => (bullishVotes || 0) >= BUMP_VOTE_THRESHOLD;

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

  const voteBumped = isVoteBumped(bullishVotes);
  const wasBumped = !!ad.isBumped;

  const $set = {
    bumpExpiresAt: null,
    bumpDuration: null
  };

  let changed =
    voteBumped !== wasBumped ||
    ad.bumpExpiresAt != null ||
    (ad.bumpDuration != null && ad.bumpDuration !== undefined);

  $set.isBumped = voteBumped;

  if (voteBumped) {
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

module.exports = {
  BUMP_VOTE_THRESHOLD,
  DEFAULT_AD_SIZE_OPTS,
  isVoteBumped,
  computeShrunkSize,
  getBumpSyncUpdate
};
