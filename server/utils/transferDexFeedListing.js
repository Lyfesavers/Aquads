const Ad = require('../models/Ad');
const socket = require('../socket');
const {
  LISTING_SOURCE_DEX_FEED,
  CLAIM_STATUS_UNCLAIMED,
  CLAIM_STATUS_CLAIMED,
  DEX_FEED_OWNER_USERNAME
} = require('../constants/dexFeed');

async function transferDexFeedListing(adId, targetUsername) {
  const username = String(targetUsername || '').trim();
  if (!username) {
    throw new Error('Username is required');
  }
  if (username.toLowerCase() === DEX_FEED_OWNER_USERNAME.toLowerCase()) {
    throw new Error('Cannot transfer to the system feed account');
  }

  const User = require('../models/User');
  const targetUser = await User.findOne({ username }).select('username').lean();
  if (!targetUser) {
    throw new Error('Target user not found');
  }

  const ad = await Ad.findOne({ id: adId });
  if (!ad) {
    throw new Error('Listing not found');
  }
  if (ad.listingSource !== LISTING_SOURCE_DEX_FEED) {
    throw new Error('Not a dex-feed listing');
  }
  if (ad.claimStatus !== CLAIM_STATUS_UNCLAIMED) {
    throw new Error('Listing is not unclaimed');
  }
  if (ad.owner !== DEX_FEED_OWNER_USERNAME) {
    throw new Error('Listing is not owned by the dex feed account');
  }

  const duplicateOwned = await Ad.findOne({
    owner: username,
    pairAddress: ad.pairAddress,
    status: { $in: ['active', 'approved', 'pending'] },
    id: { $ne: ad.id }
  })
    .select('id title')
    .lean();

  if (duplicateOwned) {
    throw new Error(`User already has a listing for this pair (${duplicateOwned.title})`);
  }

  ad.owner = username;
  ad.claimStatus = CLAIM_STATUS_CLAIMED;
  ad.claimedAt = new Date();
  ad.claimedBy = username;
  await ad.save();

  try {
    const { invalidatePublicAdsCache } = require('../routes/ads');
    invalidatePublicAdsCache();
  } catch {
    // non-fatal
  }

  try {
    socket.emitAdUpdate('update', ad);
    const io = socket.getIO();
    const unclaimedCount = await Ad.countDocuments({
      listingSource: LISTING_SOURCE_DEX_FEED,
      claimStatus: CLAIM_STATUS_UNCLAIMED,
      owner: DEX_FEED_OWNER_USERNAME,
      status: 'active'
    });
    io.emit('unclaimedDexAdsUpdated', {
      action: 'transfer',
      adId: ad.id,
      newOwner: username,
      total: unclaimedCount
    });
  } catch (err) {
    console.error('[DexFeed] transfer socket emit failed:', err.message);
  }

  return ad;
}

module.exports = {
  transferDexFeedListing
};
