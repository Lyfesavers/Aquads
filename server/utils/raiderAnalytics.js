const mongoose = require('mongoose');
const TwitterRaid = require('../models/TwitterRaid');
const FacebookRaid = require('../models/FacebookRaid');
const User = require('../models/User');

const VALID_TIERS = [5, 10, 15, 20];
const LEGACY_TIER_MAP = { 50: 20 };
const DEFAULT_TIER = 20;

const BADGE_DEFS = [
  { id: 'first_raid', label: 'First Blood', icon: '🎯', description: 'Complete your first raid', check: (s) => s.approved >= 1 },
  { id: 'raider_10', label: 'Bronze Raider', icon: '🥉', description: '10 approved raids', check: (s) => s.approved >= 10 },
  { id: 'raider_50', label: 'Silver Raider', icon: '🥈', description: '50 approved raids with 40+ quality', check: (s) => s.approved >= 50 && s.qualityScore >= 40 },
  { id: 'raider_100', label: 'Gold Raider', icon: '🥇', description: '100 approved raids with 60+ quality', check: (s) => s.approved >= 100 && s.qualityScore >= 60 },
  { id: 'raider_250', label: 'Diamond Raider', icon: '💎', description: '250 approved raids with 75+ quality', check: (s) => s.approved >= 250 && s.qualityScore >= 75 },
  { id: 'elite', label: 'Elite Raider', icon: '👑', description: '50+ raids with 85+ quality score', check: (s) => s.approved >= 50 && s.qualityScore >= 85 },
  { id: 'verified_elite', label: 'Verified Elite', icon: '✓', description: '30%+ of approvals at verified tiers (15 or 20 pts)', check: (s) => s.approved >= 10 && s.verifiedTierRate >= 30 },
  { id: 'image_master', label: 'Image Master', icon: '🖼️', description: '40%+ of approvals at image tiers (10 or 20 pts)', check: (s) => s.approved >= 10 && s.imageTierRate >= 40 },
  { id: 'hot_streak', label: 'Hot Streak', icon: '🔥', description: '7-day raid streak', check: (s) => s.bestStreak >= 7 },
  { id: 'sniper', label: 'Sniper', icon: '⚡', description: '95%+ approval rate (min 20 raids)', check: (s) => s.decided >= 20 && s.approvalRate >= 95 },
];

function normalizeTier(amount) {
  if (LEGACY_TIER_MAP[amount] != null) return LEGACY_TIER_MAP[amount];
  if (VALID_TIERS.includes(amount)) return amount;
  return DEFAULT_TIER;
}

function buildPointsLookup(pointsHistory) {
  const byRaidId = new Map();
  for (const entry of pointsHistory || []) {
    if (!entry?.socialRaidId || entry.amount <= 0) continue;
    const reason = entry.reason || '';
    if (!/raid approved/i.test(reason)) continue;
    byRaidId.set(String(entry.socialRaidId), entry.amount);
  }
  return byRaidId;
}

function computeStreaks(approvedDates) {
  if (!approvedDates.length) return { currentStreak: 0, bestStreak: 0 };

  const dayKeys = [...new Set(
    approvedDates.map((d) => {
      const dt = new Date(d);
      return `${dt.getUTCFullYear()}-${dt.getUTCMonth()}-${dt.getUTCDate()}`;
    })
  )].sort();

  let bestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < dayKeys.length; i += 1) {
    const prev = new Date(dayKeys[i - 1].replace(/-/g, '/'));
    const curr = new Date(dayKeys[i].replace(/-/g, '/'));
    const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      currentRun += 1;
      bestStreak = Math.max(bestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  const today = new Date();
  const todayKey = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${yesterday.getUTCMonth()}-${yesterday.getUTCDate()}`;
  const lastDay = dayKeys[dayKeys.length - 1];

  let currentStreak = 0;
  if (lastDay === todayKey || lastDay === yesterdayKey) {
    currentStreak = 1;
    for (let i = dayKeys.length - 2; i >= 0; i -= 1) {
      const prev = new Date(dayKeys[i].replace(/-/g, '/'));
      const next = new Date(dayKeys[i + 1].replace(/-/g, '/'));
      const diffDays = Math.round((next - prev) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) currentStreak += 1;
      else break;
    }
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}

function resolvePointsAwarded(completion, raidId, pointsByRaidId) {
  if (completion.pointsAwardedAmount && VALID_TIERS.includes(completion.pointsAwardedAmount)) {
    return completion.pointsAwardedAmount;
  }
  const fromHistory = pointsByRaidId.get(String(raidId));
  if (fromHistory) return normalizeTier(fromHistory);
  if (completion.pointsAwarded && completion.approvalStatus === 'approved') {
    return DEFAULT_TIER;
  }
  return null;
}

function extractUserCompletions(raids, platform, userIdStr, pointsByRaidId) {
  const rows = [];
  for (const raid of raids) {
    for (const completion of raid.completions || []) {
      if (!completion.userId || completion.userId.toString() !== userIdStr) continue;
      const pointsEarned = resolvePointsAwarded(completion, raid._id, pointsByRaidId);
      rows.push({
        raidId: String(raid._id),
        raidTitle: raid.title,
        platform,
        approvalStatus: completion.approvalStatus,
        completedAt: completion.completedAt,
        approvedAt: completion.approvedAt,
        rejectionReason: completion.rejectionReason || null,
        verified: !!completion.verified,
        pointsEarned,
      });
    }
  }
  return rows;
}

function computeBadges(stats) {
  return BADGE_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    icon: def.icon,
    description: def.description,
    earned: def.check(stats),
  }));
}

const APPROVED_COMPLETIONS_PIPELINE = [
  { $unwind: '$completions' },
  {
    $match: {
      'completions.approvalStatus': 'approved',
      'completions.userId': { $exists: true, $ne: null },
    },
  },
  {
    $project: {
      userId: '$completions.userId',
      raidId: { $toString: '$_id' },
    },
  },
];

const RAID_POINTS_HISTORY_PIPELINE = [
  { $unwind: '$pointsHistory' },
  {
    $match: {
      'pointsHistory.amount': { $gt: 0 },
      'pointsHistory.reason': { $regex: 'raid approved', $options: 'i' },
      'pointsHistory.socialRaidId': { $exists: true, $ne: null },
    },
  },
  {
    $project: {
      userId: '$_id',
      raidId: { $toString: '$pointsHistory.socialRaidId' },
      amount: '$pointsHistory.amount',
    },
  },
];

function mergeRaiderStandings(completionRows, historyRows) {
  const byUser = new Map();

  for (const row of completionRows) {
    const uid = String(row.userId);
    if (!byUser.has(uid)) {
      byUser.set(uid, { completionRaidIds: new Set(), historyByRaid: new Map() });
    }
    byUser.get(uid).completionRaidIds.add(String(row.raidId));
  }

  for (const row of historyRows) {
    const uid = String(row.userId);
    if (!byUser.has(uid)) {
      byUser.set(uid, { completionRaidIds: new Set(), historyByRaid: new Map() });
    }
    byUser.get(uid).historyByRaid.set(String(row.raidId), normalizeTier(row.amount));
  }

  const standings = [];

  for (const [userId, data] of byUser) {
    const allRaidIds = new Set([...data.completionRaidIds, ...data.historyByRaid.keys()]);
    if (allRaidIds.size === 0) continue;

    let totalRaidPoints = 0;
    for (const raidId of allRaidIds) {
      const fromHistory = data.historyByRaid.get(raidId);
      if (fromHistory != null) {
        totalRaidPoints += fromHistory;
      } else if (data.completionRaidIds.has(raidId)) {
        totalRaidPoints += DEFAULT_TIER;
      }
    }

    if (totalRaidPoints <= 0) continue;

    const approvedRaids = allRaidIds.size;
    const avgPoints = totalRaidPoints / approvedRaids;
    const qualityScore = Math.round((avgPoints / 50) * 100);

    standings.push({ userId, totalRaidPoints, approvedRaids, qualityScore });
  }

  standings.sort((a, b) => {
    if (b.totalRaidPoints !== a.totalRaidPoints) return b.totalRaidPoints - a.totalRaidPoints;
    if (b.approvedRaids !== a.approvedRaids) return b.approvedRaids - a.approvedRaids;
    return b.qualityScore - a.qualityScore;
  });

  return standings;
}

let standingsCache = null;
let standingsCacheTime = 0;
let standingsRefreshPromise = null;
const STANDINGS_CACHE_TTL = 60 * 1000;
const LEADERBOARD_TOP_COUNT = 25;

async function buildRaiderStandings() {
  const [twitterCompletions, facebookCompletions, historyRows] = await Promise.all([
    TwitterRaid.aggregate(APPROVED_COMPLETIONS_PIPELINE),
    FacebookRaid.aggregate(APPROVED_COMPLETIONS_PIPELINE),
    User.aggregate(RAID_POINTS_HISTORY_PIPELINE),
  ]);

  return mergeRaiderStandings(
    [...twitterCompletions, ...facebookCompletions],
    historyRows
  );
}

async function getRaiderStandings() {
  const now = Date.now();
  if (standingsCache && now - standingsCacheTime < STANDINGS_CACHE_TTL) {
    return standingsCache;
  }

  if (!standingsRefreshPromise) {
    standingsRefreshPromise = buildRaiderStandings()
      .then((standings) => {
        standingsCache = standings;
        standingsCacheTime = Date.now();
        return standings;
      })
      .finally(() => {
        standingsRefreshPromise = null;
      });
  }

  return standingsRefreshPromise;
}

async function buildLeaderboardPayload(userId, standings) {
  const userIdStr = String(userId);
  const totalRaiders = standings.length;
  const rankIndex = standings.findIndex((entry) => entry.userId === userIdStr);
  const userRank = rankIndex >= 0 ? rankIndex + 1 : null;

  const topSlice = standings.slice(0, LEADERBOARD_TOP_COUNT);
  const lookupIds = new Set(topSlice.map((entry) => entry.userId));
  if (userRank) lookupIds.add(userIdStr);

  const users = lookupIds.size
    ? await User.find({ _id: { $in: [...lookupIds] } }).select('username').lean()
    : [];
  const usernameById = Object.fromEntries(users.map((user) => [String(user._id), user.username]));

  const topRaiders = topSlice.map((entry, index) => ({
    rank: index + 1,
    username: usernameById[entry.userId] || 'Unknown',
    totalRaidPoints: entry.totalRaidPoints,
    approvedRaids: entry.approvedRaids,
    qualityScore: entry.qualityScore,
    isCurrentUser: entry.userId === userIdStr,
  }));

  let currentUserEntry = null;
  if (userRank && userRank > LEADERBOARD_TOP_COUNT) {
    const entry = standings[rankIndex];
    currentUserEntry = {
      rank: userRank,
      username: usernameById[entry.userId] || 'You',
      totalRaidPoints: entry.totalRaidPoints,
      approvedRaids: entry.approvedRaids,
      qualityScore: entry.qualityScore,
      isCurrentUser: true,
    };
  }

  return {
    totalRaiders,
    userRank,
    userIsRaider: userRank != null,
    topRaiders,
    currentUserEntry,
  };
}

async function getRaiderAnalytics(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const userIdStr = userObjectId.toString();

  const [twitterRaids, facebookRaids, user, standings] = await Promise.all([
    TwitterRaid.find({ 'completions.userId': userObjectId })
      .select('title completions')
      .lean(),
    FacebookRaid.find({ 'completions.userId': userObjectId })
      .select('title points completions')
      .lean(),
    User.findById(userObjectId).select('pointsHistory').lean(),
    getRaiderStandings(),
  ]);

  const leaderboard = await buildLeaderboardPayload(userId, standings);

  const pointsByRaidId = buildPointsLookup(user?.pointsHistory);
  const twitterRows = extractUserCompletions(twitterRaids, 'twitter', userIdStr, pointsByRaidId);
  const facebookRows = extractUserCompletions(facebookRaids, 'facebook', userIdStr, pointsByRaidId);
  const allCompletions = [...twitterRows, ...facebookRows];

  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let totalRaidPoints = 0;
  const tierBreakdown = { 5: 0, 10: 0, 15: 0, 20: 0 };
  let verifiedTierCount = 0;
  let imageTierCount = 0;
  const approvedDates = [];

  for (const row of allCompletions) {
    if (row.approvalStatus === 'pending') pending += 1;
    else if (row.approvalStatus === 'rejected') rejected += 1;
    else if (row.approvalStatus === 'approved') {
      approved += 1;
      if (row.completedAt) approvedDates.push(row.completedAt);
      const tier = row.pointsEarned != null ? normalizeTier(row.pointsEarned) : DEFAULT_TIER;
      tierBreakdown[tier] += 1;
      totalRaidPoints += tier;
      if (tier === 15 || tier === 20) verifiedTierCount += 1;
      if (tier === 10 || tier === 20) imageTierCount += 1;
    }
  }

  const decided = approved + rejected;
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0;
  const avgPointsPerRaid = approved > 0 ? Math.round((totalRaidPoints / approved) * 10) / 10 : 0;
  const qualityScore = approved > 0 ? Math.round((avgPointsPerRaid / 20) * 100) : 0;
  const raiderRating = Math.round(qualityScore * 0.6 + approvalRate * 0.4);
  const verifiedTierRate = approved > 0 ? Math.round((verifiedTierCount / approved) * 100) : 0;
  const imageTierRate = approved > 0 ? Math.round((imageTierCount / approved) * 100) : 0;

  const { currentStreak, bestStreak } = computeStreaks(approvedDates);

  const thisWeek = allCompletions.filter(
    (r) => r.approvalStatus === 'approved' && r.completedAt && new Date(r.completedAt) >= oneWeekAgo
  ).length;
  const thisMonth = allCompletions.filter(
    (r) => r.approvalStatus === 'approved' && r.completedAt && new Date(r.completedAt) >= oneMonthAgo
  ).length;

  const badgeStats = {
    approved,
    decided,
    approvalRate,
    qualityScore,
    verifiedTierRate,
    imageTierRate,
    bestStreak,
  };

  const recentActivity = allCompletions
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
    .slice(0, 10)
    .map((row) => ({
      raidTitle: row.raidTitle,
      platform: row.platform,
      status: row.approvalStatus,
      pointsEarned: row.approvalStatus === 'approved' ? (row.pointsEarned ?? DEFAULT_TIER) : null,
      completedAt: row.completedAt,
      rejectionReason: row.rejectionReason,
    }));

  return {
    summary: {
      totalCompletions: allCompletions.length,
      approved,
      rejected,
      pending,
      approvalRate,
      totalRaidPointsEarned: totalRaidPoints,
      avgPointsPerRaid,
      qualityScore,
      raiderRating,
      currentStreak,
      bestStreak,
      thisWeek,
      thisMonth,
      twitterCompletions: twitterRows.filter((r) => r.approvalStatus === 'approved').length,
      facebookCompletions: facebookRows.filter((r) => r.approvalStatus === 'approved').length,
      leaderboardRank: leaderboard.userRank,
      totalActiveRaiders: leaderboard.totalRaiders,
    },
    tierBreakdown,
    badges: computeBadges(badgeStats),
    recentActivity,
    leaderboard,
  };
}

module.exports = { getRaiderAnalytics, BADGE_DEFS, getRaiderStandings };
