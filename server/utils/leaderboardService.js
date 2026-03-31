/**
 * Leaders: lifetime points earned (sum of positive pointsHistory) and
 * lifetime commission earned (Ad + HyperSpace), excluding suspended admins.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const AffiliateEarning = require('../models/AffiliateEarning');
const HyperSpaceAffiliateEarning = require('../models/HyperSpaceAffiliateEarning');

const LEADERBOARD_USER_MATCH = {
  suspended: { $ne: true },
  isAdmin: { $ne: true }
};

async function getTopLifetimePointsEarned(limit = 20) {
  const rows = await User.aggregate([
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
    { $match: { lifetimePointsEarned: { $gt: 0 } } },
    { $sort: { lifetimePointsEarned: -1 } },
    { $limit: limit },
    { $project: { _id: 0, username: 1, lifetimePointsEarned: 1 } }
  ]);
  return rows;
}

async function getTopLifetimeCommissionEarned(limit = 20) {
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

  const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return [];

  const ids = sorted.map(([id]) => new mongoose.Types.ObjectId(id));
  const users = await User.find({ _id: { $in: ids } })
    .select('username suspended isAdmin')
    .lean();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));

  const out = [];
  for (const [id, total] of sorted) {
    if (out.length >= limit) break;
    const u = byId.get(id);
    if (!u || u.suspended || u.isAdmin) continue;
    if (total <= 0) continue;
    out.push({ username: u.username, lifetimeCommissionEarned: total });
  }
  return out;
}

function rankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '🔹';
}

async function getLeaderboardPayload(limit = 20) {
  const [pointsLeaders, commissionLeaders] = await Promise.all([
    getTopLifetimePointsEarned(limit),
    getTopLifetimeCommissionEarned(limit)
  ]);
  return { pointsLeaders, commissionLeaders };
}

module.exports = {
  getTopLifetimePointsEarned,
  getTopLifetimeCommissionEarned,
  getLeaderboardPayload,
  rankEmoji
};
