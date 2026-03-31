/**
 * Combined Aquads leaders: lifetime points earned (sum of positive pointsHistory),
 * lifetime commission (Ad + HyperSpace). Ranked by weighted score.
 * Affiliate stream/space 100-pt awards count when recorded as positive pointsHistory rows.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');

const LEADERBOARD_USER_MATCH = {
  suspended: { $ne: true },
  isAdmin: { $ne: true }
};

/** For ranking only: each $1 USDC lifetime commission ≈ this many points */
const POINTS_PER_USDC_FOR_RANK = 100;

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
 * Top users by weighted score: lifetimePointsEarned + (USDC commission * POINTS_PER_USDC_FOR_RANK).
 * Each row: username, lifetimePointsEarned, lifetimeCommissionEarned (0 if none).
 */
async function getCombinedLeaderboard(limit = 20) {
  const commissionByUserId = await buildLifetimeCommissionByUserId();

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
        }
      }
    },
    {
      $project: {
        _id: 1,
        username: 1,
        lifetimePointsEarned: 1
      }
    }
  ]);

  const merged = [];

  for (const row of pointsRows) {
    const id = row._id.toString();
    const pts = Number(row.lifetimePointsEarned) || 0;
    const comm = commissionByUserId.get(id) || 0;
    if (pts === 0 && comm <= 0) continue;
    merged.push({
      username: row.username,
      lifetimePointsEarned: pts,
      lifetimeCommissionEarned: comm,
      weightedRankScore: pts + comm * POINTS_PER_USDC_FOR_RANK
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
  POINTS_PER_USDC_FOR_RANK
};
