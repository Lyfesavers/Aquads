const Ad = require('../models/Ad');
const socket = require('../socket');
const { BUMP_VOTE_THRESHOLD } = require('../utils/listingRequirements');
const { syncAdBumpState } = require('../utils/bumpFromVotes');

let enforcementInProgress = false;

/**
 * Re-check liquidity for all vote-qualified or currently bumped bubbles.
 * Unbumps projects below the bump liquidity minimum; keeps them unbumped until liquidity recovers.
 */
async function enforceBumpedLiquidityRequirements() {
  if (enforcementInProgress) {
    console.log('[BumpLiquidity] Skipping — previous run still in progress');
    return { skipped: true };
  }

  enforcementInProgress = true;
  const summary = {
    checked: 0,
    unbumped: 0,
    rebumped: 0,
    unchanged: 0,
    errors: 0
  };

  try {
    const ads = await Ad.find({
      status: { $in: ['active', 'approved'] },
      $or: [{ isBumped: true }, { bullishVotes: { $gte: BUMP_VOTE_THRESHOLD } }]
    })
      .select(
        '_id id bullishVotes isBumped pairAddress contractAddress blockchain meetsLiquidityRequirement liquidityCheckedAt liquidityUsdSnapshot size bumpedAt bumpExpiresAt bumpDuration createdAt'
      )
      .lean();

    console.log(`[BumpLiquidity] Checking ${ads.length} bubble(s)...`);

    for (const ad of ads) {
      try {
        const wasBumped = !!ad.isBumped;
        const updated = await syncAdBumpState(ad, {}, { forceRefresh: true });
        summary.checked += 1;

        if (wasBumped && !updated.isBumped) {
          summary.unbumped += 1;
          socket.emitAdUpdate('update', updated);
          console.log(`[BumpLiquidity] Unbumped ${updated.id} (liq $${updated.liquidityUsdSnapshot ?? '?'})`);
        } else if (!wasBumped && updated.isBumped) {
          summary.rebumped += 1;
          socket.emitAdUpdate('update', updated);
        } else if (updated !== ad && (updated.isBumped !== wasBumped || updated.liquidityUsdSnapshot !== ad.liquidityUsdSnapshot)) {
          socket.emitAdUpdate('update', updated);
          summary.unchanged += 1;
        } else {
          summary.unchanged += 1;
        }
      } catch (err) {
        summary.errors += 1;
        console.error(`[BumpLiquidity] Error for ad ${ad.id}:`, err.message);
      }
    }

    try {
      const { invalidatePublicAdsCache } = require('../routes/ads');
      if (typeof invalidatePublicAdsCache === 'function') {
        invalidatePublicAdsCache();
      }
    } catch (_) {
      // non-fatal
    }

    console.log(
      `[BumpLiquidity] Done — checked: ${summary.checked}, unbumped: ${summary.unbumped}, rebumped: ${summary.rebumped}, errors: ${summary.errors}`
    );
    return summary;
  } finally {
    enforcementInProgress = false;
  }
}

module.exports = {
  enforceBumpedLiquidityRequirements
};
