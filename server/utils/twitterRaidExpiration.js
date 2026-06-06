const TwitterRaid = require('../models/TwitterRaid');

const RAID_LIFETIME_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours
const TWITTER_EPOCH_MS = 1288834974657;

const getRaidExpiresAt = (createdAt = new Date()) =>
  new Date(new Date(createdAt).getTime() + RAID_LIFETIME_MS);

/** Decode tweet snowflake ID to approximate post time. */
const getTweetCreatedAt = (tweetId) => {
  if (!tweetId) return null;
  try {
    const id = BigInt(String(tweetId));
    const ms = Number((id >> 22n) + BigInt(TWITTER_EPOCH_MS));
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const isTweetOlderThanRaidWindow = (tweetId) => {
  const tweetDate = getTweetCreatedAt(tweetId);
  if (!tweetDate) return false;
  return Date.now() - tweetDate.getTime() > RAID_LIFETIME_MS;
};

const getTweetAgeError = (tweetId) => {
  if (!isTweetOlderThanRaidWindow(tweetId)) return null;
  const tweetDate = getTweetCreatedAt(tweetId);
  const ageHours = tweetDate
    ? Math.round((Date.now() - tweetDate.getTime()) / (60 * 60 * 1000))
    : null;
  const ageText = ageHours != null ? ` (posted ~${ageHours}h ago)` : '';
  return `This tweet is too old to raid${ageText}. Only tweets posted within the last 48 hours can be raided.`;
};

const isRaidExpired = (raid) => {
  if (!raid) return true;
  if (raid.status === 'expired' || raid.status === 'cancelled') return true;
  if (raid.expiresAt && new Date(raid.expiresAt) <= new Date()) return true;
  if (raid.createdAt) {
    return Date.now() - new Date(raid.createdAt).getTime() > RAID_LIFETIME_MS;
  }
  return false;
};

const getRaidCompletableError = (raid) => {
  if (!raid) return 'Twitter raid not found';
  if (raid.status === 'cancelled' || !raid.active) {
    return 'This Twitter raid is no longer active';
  }
  if (isRaidExpired(raid)) {
    return 'This Twitter raid has expired (past the 48-hour window)';
  }
  return null;
};

const applyNewRaidDefaults = (raidDoc) => {
  if (!raidDoc.status) raidDoc.status = 'active';
  if (!raidDoc.expiresAt) {
    raidDoc.expiresAt = getRaidExpiresAt(raidDoc.createdAt || new Date());
  }
  return raidDoc;
};

const rejectPendingCompletion = (completion, reason) => {
  completion.approvalStatus = 'rejected';
  completion.rejectionReason = reason;
  completion.approvedAt = new Date();
};

const rejectInvalidPendingCompletions = async () => {
  const raids = await TwitterRaid.find({
    completions: { $elemMatch: { approvalStatus: 'pending' } }
  });

  for (const raid of raids) {
    let changed = false;
    const raidExpired = isRaidExpired(raid);

    for (const completion of raid.completions) {
      if (completion.approvalStatus !== 'pending') continue;
      if (raidExpired || raid.status === 'expired') {
        rejectPendingCompletion(completion, 'Raid expired (past 48-hour window)');
        changed = true;
      }
    }

    if (changed) {
      await raid.save({ validateBeforeSave: false });
    }
  }
};

/** Mark raids past 48h as expired in the database and auto-reject stale pending completions. */
const expireStaleRaids = async () => {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - RAID_LIFETIME_MS);

  await TwitterRaid.updateMany(
    {
      active: true,
      status: { $nin: ['cancelled', 'expired'] },
      $or: [
        { createdAt: { $lte: twoDaysAgo } },
        { expiresAt: { $lte: now } }
      ]
    },
    {
      $set: {
        status: 'expired',
        active: false,
        expiredAt: now
      }
    }
  );

  await rejectInvalidPendingCompletions();

  return { expiredAt: now };
};

const formatPendingCompletion = (raid, completion, trustScore) => {
  const tweetPostedAt = getTweetCreatedAt(raid.tweetId);
  const raidExpired = isRaidExpired(raid);

  return {
    completionId: completion._id,
    raidId: raid._id,
    raidTitle: raid.title,
    raidTweetUrl: raid.tweetUrl,
    raidCreatedAt: raid.createdAt,
    raidExpiresAt: raid.expiresAt || getRaidExpiresAt(raid.createdAt),
    raidStatus: raid.status || (raidExpired ? 'expired' : 'active'),
    raidExpired,
    tweetPostedAt,
    tweetTooOld: isTweetOlderThanRaidWindow(raid.tweetId),
    pointsAmount: raid.points || 20,
    user: completion.userId,
    twitterUsername: completion.twitterUsername,
    verificationMethod: completion.verificationMethod,
    verificationNote: completion.verificationNote,
    iframeVerified: completion.iframeVerified,
    completedAt: completion.completedAt,
    ipAddress: completion.ipAddress,
    trustScore: trustScore || {
      totalCompletions: 0,
      approvedCompletions: 0,
      approvalRate: 0,
      trustLevel: 'new'
    }
  };
};

module.exports = {
  RAID_LIFETIME_MS,
  getRaidExpiresAt,
  getTweetCreatedAt,
  isTweetOlderThanRaidWindow,
  getTweetAgeError,
  isRaidExpired,
  getRaidCompletableError,
  applyNewRaidDefaults,
  expireStaleRaids,
  formatPendingCompletion
};
