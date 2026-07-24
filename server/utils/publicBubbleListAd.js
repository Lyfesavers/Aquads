const { toPublicAdPayload } = require('./brandingMedia');
const {
  LISTING_SOURCE_DEX_FEED,
  CLAIM_STATUS_UNCLAIMED
} = require('../constants/dexFeed');

/** Fields omitted from owner/claimed listings on the public bubble map API. */
const PUBLIC_LIST_OMIT = [
  'feedMetricsSnapshot',
  'txSignature',
  'paymentChain',
  'chainSymbol',
  'chainAddress',
  'listingFee',
  'selectedAddons',
  'totalAmount',
  'appliedDiscountCode',
  'discountAmount',
  'rejectionReason',
  'telegramGroupId',
  'discordChannelId',
  'discordGuildId',
  'customBrandingUploadedAt',
  'feedListedAt',
  'claimedAt',
  'claimedBy',
  'lastBumpTx',
  'bumpedAt',
  'bumpDuration',
  'bumpExpiresAt',
  '__v',
  'voterData',
  'customBrandingImage'
];

function isUnclaimedDexFeedListing(ad) {
  return ad?.listingSource === LISTING_SOURCE_DEX_FEED &&
    ad?.claimStatus === CLAIM_STATUS_UNCLAIMED;
}

/**
 * Minimal payload for auto-listed unclaimed dex-feed bubbles (~500B vs ~1.6KB+).
 * Admin dex-feed panel uses /api/ads/admin/unclaimed-dex-feed for full metrics.
 */
function toDexFeedBubbleSummary(ad) {
  return {
    _id: ad._id,
    id: ad.id,
    title: ad.title,
    logo: ad.logo,
    url: ad.url || '',
    size: ad.size,
    x: ad.x,
    y: ad.y,
    isBumped: !!ad.isBumped,
    owner: ad.owner,
    status: ad.status,
    pairAddress: ad.pairAddress,
    contractAddress: ad.contractAddress,
    blockchain: ad.blockchain,
    bullishVotes: ad.bullishVotes || 0,
    bearishVotes: ad.bearishVotes || 0,
    listingSource: ad.listingSource,
    claimStatus: ad.claimStatus,
    listingTier: ad.listingTier,
    clicks: ad.clicks || 0,
    createdAt: ad.createdAt,
    hasCustomBrandingImage: !!ad.hasCustomBrandingImage,
    customBrandingImageSize: ad.customBrandingImageSize || 0,
    customBrandingVideoUrl: ad.customBrandingVideoUrl || null
  };
}

/** Strip dex-feed bulk and branding blobs; keep project deep-dive for owned/claimed listings. */
function toPublicBubbleListAd(ad) {
  if (!ad || typeof ad !== 'object') return ad;

  const base = toPublicAdPayload(ad);

  if (isUnclaimedDexFeedListing(base)) {
    return toDexFeedBubbleSummary(base);
  }

  const slim = { ...base };
  for (const key of PUBLIC_LIST_OMIT) {
    delete slim[key];
  }
  return slim;
}

/** Mongo .select() string — skip heavy fields not needed to build the public bubble list. */
const PUBLIC_BUBBLE_LIST_SELECT =
  '-voterData -customBrandingImage -feedMetricsSnapshot';

module.exports = {
  toPublicBubbleListAd,
  isUnclaimedDexFeedListing,
  PUBLIC_BUBBLE_LIST_SELECT
};
