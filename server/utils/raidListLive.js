/**
 * Live website raid list sync for bot + API creates.
 * Emits socket `raidListUpdated` and clears the GET /twitter-raids cache.
 */

const TwitterRaid = require('../models/TwitterRaid');

function invalidateTwitterRaidsListCache() {
  try {
    const twitterRaidsRoute = require('../routes/twitter-raids');
    if (typeof twitterRaidsRoute.invalidateRaidsCache === 'function') {
      twitterRaidsRoute.invalidateRaidsCache();
    }
  } catch (e) {
    console.warn('[raidListLive] cache invalidate skipped:', e.message);
  }
}

/**
 * Push a newly created Twitter raid to open website clients immediately.
 * @param {string|object} raidIdOrDoc - raid _id or saved doc
 */
async function notifyTwitterRaidCreated(raidIdOrDoc) {
  try {
    const id = raidIdOrDoc && (raidIdOrDoc._id || raidIdOrDoc);
    if (!id) return;
    const populatedRaid = await TwitterRaid.findById(id)
      .populate('createdBy', 'username')
      .select('tweetId tweetUrl title description points createdBy active createdAt completions.userId completions.approvalStatus status')
      .lean();
    if (!populatedRaid) return;

    // Match list API shape so the client can prepend without a refetch
    const approvedCompletions = (populatedRaid.completions || []).filter(
      (c) => c.approvalStatus === 'approved'
    );
    const raidForClient = {
      ...populatedRaid,
      completionCount: approvedCompletions.length,
      userCompleted: false,
    };

    const { emitRaidUpdate } = require('../socket');
    emitRaidUpdate('created', raidForClient, 'twitter');
    invalidateTwitterRaidsListCache();
  } catch (e) {
    console.error('[raidListLive] notifyTwitterRaidCreated failed:', e.message);
  }
}

module.exports = {
  notifyTwitterRaidCreated,
  invalidateTwitterRaidsListCache,
};
