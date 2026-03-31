/**
 * Aquads leaders — data from DB only:
 * - Lifetime points: max(sum of positive pointsHistory, points balance − sum(negative history))
 *   so missing positive rows still reconcile when spends are logged.
 * - Affiliate commission: sum of commissionEarned from AffiliateEarning + HyperSpaceAffiliateEarning
 *   (all statuses — lifetime accrued from platform records).
 * - CAD redeem: approved giftCardRedemptions → USDC equivalent.
 *
 * Rank tiers (commission = affiliate USDC only, not CAD):
 *   1) Affiliate commission > 0 AND lifetime points > 0
 *   2) Affiliate commission > 0 (points may be 0)
 *   3) No affiliate commission — points / CAD redeem only; sorted by weighted score
 * Within tier 1–2: higher commission first, then higher lifetime points, then weighted score.
 */

const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');

const LEADERBOARD_USER_MATCH = {
  suspended: { $ne: true },
  isAdmin: { $ne: true }
};

/** Tier 3/2 tie-break and tier 3 ordering: USDC (affiliate + CAD) × this + points */
const POINTS_PER_USDC_FOR_RANK = 250;

const CAD_REDEMPTION_USDC_EQUIVALENT_PER_100_CAD = 72.5;

function numAmount(expr) {
  return {
    $convert: { input: expr, to: 'double', onError: 0, onNull: 0 }
  };
}

async function buildLifetimeAffiliateCommissionByUserId() {
  const [adRows, hsRows] = await Promise.all([
    AffiliateEarning.aggregate([
      {
        $group: {
          _id: '$affiliateId',
          total: { $sum: numAmount('$commissionEarned') }
        }
      }
    ]),
    HyperSpaceAffiliateEarning.aggregate([
      {
        $group: {
          _id: '$affiliateId',
          total: { $sum: numAmount('$commissionEarned') }
        }
      }
    ])
  ]);

  const merged = new Map();
  for (const r of adRows) {
    if (r._id == null) continue;
    const id = String(r._id);
    merged.set(id, (merged.get(id) || 0) + (Number(r.total) || 0));
  }
  for (const r of hsRows) {
    if (r._id == null) continue;
    const id = String(r._id);
    merged.set(id, (merged.get(id) || 0) + (Number(r.total) || 0));
  }
  return merged;
}

function rankTier(affiliateCommissionUsdc, lifetimePointsEarned) {
  const comm = Number(affiliateCommissionUsdc) || 0;
  const pts = Number(lifetimePointsEarned) || 0;
  if (comm > 0 && pts > 0) return 3;
  if (comm > 0) return 2;
  return 1;
}

function compareLeaderboardRows(a, b) {
  const ta = rankTier(a.affiliateCommissionUsdc, a.lifetimePointsEarned);
  const tb = rankTier(b.affiliateCommissionUsdc, b.lifetimePointsEarned);
  if (tb !== ta) return tb - ta;
  if (ta >= 2) {
    const dc = (Number(b.affiliateCommissionUsdc) || 0) - (Number(a.affiliateCommissionUsdc) || 0);
    if (dc !== 0) return dc;
    const dp = (Number(b.lifetimePointsEarned) || 0) - (Number(a.lifetimePointsEarned) || 0);
    if (dp !== 0) return dp;
  }
  return (Number(b.weightedRankScore) || 0) - (Number(a.weightedRankScore) || 0);
}

/**
 * @returns {Promise<Array<{ username, lifetimePointsEarned, affiliateCommissionUsdc, cadRedemptionUsdcEquivalent, lifetimeUsdcEarnings }>>}
 */
async function getCombinedLeaderboard(limit = 20) {
  const commissionByUserId = await buildLifetimeAffiliateCommissionByUserId();
  const cadPer100 = CAD_REDEMPTION_USDC_EQUIVALENT_PER_100_CAD;

  const pointsRows = await User.aggregate([
    { $match: LEADERBOARD_USER_MATCH },
    {
      $addFields: {
        pointsLedger: {
          $reduce: {
            input: { $ifNull: ['$pointsHistory', []] },
            initialValue: { pos: 0, neg: 0 },
            in: {
              pos: {
                $add: [
                  '$$value.pos',
                  {
                    $cond: [
                      { $gt: [numAmount('$$this.amount'), 0] },
                      numAmount('$$this.amount'),
                      0
                    ]
                  }
                ]
              },
              neg: {
                $add: [
                  '$$value.neg',
                  {
                    $cond: [
                      { $lt: [numAmount('$$this.amount'), 0] },
                      numAmount('$$this.amount'),
                      0
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    },
    {
      $addFields: {
        sumPositiveHistory: '$pointsLedger.pos',
        sumNegativeHistory: '$pointsLedger.neg',
        cadRedemptionUsdcEquivalent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ['$giftCardRedemptions', []] },
                  as: 'r',
                  cond: { $eq: ['$$r.status', 'approved'] }
                }
              },
              as: 'r',
              in: {
                $multiply: [
                  {
                    $divide: [
                      numAmount('$$r.amount'),
                      100
                    ]
                  },
                  cadPer100
                ]
              }
            }
          }
        }
      }
    },
    {
      $addFields: {
        lifetimePointsEarned: {
          $max: [
            '$sumPositiveHistory',
            {
              $subtract: [numAmount('$points'), '$sumNegativeHistory']
            }
          ]
        }
      }
    },
    {
      $project: {
        _id: 1,
        username: 1,
        lifetimePointsEarned: 1,
        cadRedemptionUsdcEquivalent: 1
      }
    }
  ]);

  const merged = [];

  for (const row of pointsRows) {
    const id = String(row._id);
    const affiliateCommissionUsdc = Number(commissionByUserId.get(id)) || 0;
    const cadEq = Number(row.cadRedemptionUsdcEquivalent) || 0;
    const lifetimeUsdcEarnings = affiliateCommissionUsdc + cadEq;
    let pts = Number(row.lifetimePointsEarned) || 0;
    if (!Number.isFinite(pts) || pts < 0) pts = 0;

    if (pts === 0 && lifetimeUsdcEarnings <= 0) continue;

    const weightedRankScore = pts + lifetimeUsdcEarnings * POINTS_PER_USDC_FOR_RANK;

    merged.push({
      username: row.username,
      lifetimePointsEarned: pts,
      affiliateCommissionUsdc,
      cadRedemptionUsdcEquivalent: cadEq,
      lifetimeUsdcEarnings,
      weightedRankScore
    });
  }

  merged.sort(compareLeaderboardRows);

  return merged.slice(0, limit).map(
    ({ weightedRankScore, ...rest }) => rest
  );
}

function rankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '🔹';
}

module.exports = {
  getCombinedLeaderboard,
  rankEmoji,
  POINTS_PER_USDC_FOR_RANK,
  CAD_REDEMPTION_USDC_EQUIVALENT_PER_100_CAD
};
