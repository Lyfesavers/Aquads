/**
 * Combined Aquads leaders: lifetime points earned (sum of positive pointsHistory),
 * lifetime USDC-equivalent earnings (affiliate commission + approved CAD redemptions).
 * Ranked by weighted score.
 */

const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');

const LEADERBOARD_USER_MATCH = {
  suspended: { $ne: true },
  isAdmin: { $ne: true }
};

/** For ranking: each $1 USDC-equivalent earnings ≈ this many points */
const POINTS_PER_USDC_FOR_RANK = 100;

/**
 * Approved $100 CAD gift-card redemptions (10k pts) count as this much USDC for the board.
 * Scales linearly with redemption.amount when present (amount is CAD face value).
 */
const CAD_REDEMPTION_USDC_EQUIVALENT_PER_100_CAD = 72.5;

async function buildLifetimeCommissionByUserId() {
  const [adRows, hsRows] = await Promise.all([
    AffiliateEarning.aggregate([
      { $group: { _id: '$affiliateId', total: { $sum: '$commissionEarned' } } }
    ]),
    HyperSpaceAffiliateEarning.aggregate([
      { $group: { _id: '$affiliateId', total: { $sum: '$commissionEarned' } } }
    ])
  ]);

  const merged = new Map();
  for (const r of adRows) {
    if (!r._id) continue;
    const id = r._id.toString();
    merged.set(id, (merged.get(id) || 0) + (r.total || 0));
  }
  for (const r of hsRows) {
    if (!r._id) continue;
    const id = r._id.toString();
    merged.set(id, (merged.get(id) || 0) + (r.total || 0));
  }
  return merged;
}

/**
 * Top users by weighted score: lifetimePointsEarned + (lifetimeUsdcEarnings * POINTS_PER_USDC_FOR_RANK).
 * lifetimeUsdcEarnings = affiliate commission (USDC) + approved CAD redemptions at USDC equivalent.
 */
async function getCombinedLeaderboard(limit = 20) {
  const commissionByUserId = await buildLifetimeCommissionByUserId();
  const cadPer100 = CAD_REDEMPTION_USDC_EQUIVALENT_PER_100_CAD;

  const pointsRows = await User.aggregate([
    { $match: LEADERBOARD_USER_MATCH },
    {
      $addFields: {
        lifetimePointsEarned: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: { $ifNull: ['$pointsHistory', []] },
                  as: 'h',
                  cond: { $gt: ['$$h.amount', 0] }
                }
              },
              as: 'h',
              in: '$$h.amount'
            }
          }
        },
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
                  { $divide: [{ $ifNull: ['$$r.amount', 100] }, 100] },
                  cadPer100
                ]
              }
            }
          }
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
    const id = row._id.toString();
    const pts = Number(row.lifetimePointsEarned) || 0;
    const comm = commissionByUserId.get(id) || 0;
    const cadEq = Number(row.cadRedemptionUsdcEquivalent) || 0;
    const lifetimeUsdcEarnings = comm + cadEq;
    if (pts === 0 && lifetimeUsdcEarnings <= 0) continue;
    merged.push({
      username: row.username,
      lifetimePointsEarned: pts,
      lifetimeUsdcEarnings,
      weightedRankScore: pts + lifetimeUsdcEarnings * POINTS_PER_USDC_FOR_RANK
    });
  }

  merged.sort((a, b) => b.weightedRankScore - a.weightedRankScore);

  return merged.slice(0, limit).map(({ weightedRankScore, ...rest }) => rest);
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
