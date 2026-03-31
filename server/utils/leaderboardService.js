/**
 * Aquads leaders:
 * - Lifetime points earned: max(sum of positive pointsHistory, points − sum(negatives in history))
 * - Lifetime USDC earnings: affiliate commission + approved gift-card (CAD) redemptions at USDC equivalent
 *
 * Rank: higher total USDC earnings first; ties broken by lifetime points.
 */

const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');

const LEADERBOARD_USER_MATCH = {
  suspended: { $ne: true },
  isAdmin: { $ne: true }
};

/** Approved $100 CAD gift redemption (10k pts) → USDC value counted in earnings (per 100 CAD face). */
const GIFT_CARD_USDC_PER_100_CAD = 72.5;

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

function compareByUsdcEarningsThenPoints(a, b) {
  const du =
    (Number(b.lifetimeUsdcEarnings) || 0) - (Number(a.lifetimeUsdcEarnings) || 0);
  if (du !== 0) return du;
  return (Number(b.lifetimePointsEarned) || 0) - (Number(a.lifetimePointsEarned) || 0);
}

/**
 * @returns {Promise<Array<{ username, lifetimePointsEarned, lifetimeUsdcEarnings }>>}
 */
async function getCombinedLeaderboard(limit = 15) {
  const commissionByUserId = await buildLifetimeAffiliateCommissionByUserId();
  const giftUsdcPer100 = GIFT_CARD_USDC_PER_100_CAD;

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
        giftCardRedemptionUsdc: {
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
                  { $divide: [numAmount('$$r.amount'), 100] },
                  giftUsdcPer100
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
        giftCardRedemptionUsdc: 1
      }
    }
  ]);

  const merged = [];

  for (const row of pointsRows) {
    const id = String(row._id);
    const affiliateCommissionUsdc = Number(commissionByUserId.get(id)) || 0;
    const giftUsdc = Number(row.giftCardRedemptionUsdc) || 0;
    const lifetimeUsdcEarnings = affiliateCommissionUsdc + giftUsdc;

    let pts = Number(row.lifetimePointsEarned) || 0;
    if (!Number.isFinite(pts) || pts < 0) pts = 0;

    if (pts === 0 && lifetimeUsdcEarnings <= 0) continue;

    merged.push({
      username: row.username,
      lifetimePointsEarned: pts,
      lifetimeUsdcEarnings
    });
  }

  merged.sort(compareByUsdcEarningsThenPoints);

  return merged.slice(0, limit);
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
  GIFT_CARD_USDC_PER_100_CAD
};
