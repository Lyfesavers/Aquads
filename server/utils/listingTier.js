const Ad = require('../models/Ad');

const LISTING_TIER_STARTER = 'starter';
const LISTING_TIER_PREMIUM = 'premium';

/** Base Premium listing fee in USDC before affiliate discount */
const PREMIUM_LISTING_FEE_USDC = 99;

/** Starter: free raids per day while listing exists but no bubble is bumped yet */
const STARTER_UNBUMPED_FREE_RAID_DAILY = 1;
/** Premium: free raids per day while listing exists but no Premium bubble is bumped yet */
const PREMIUM_UNBUMPED_FREE_RAID_DAILY = 5;
/** Starter bumped OR Premium bumped: coordinated free raids per day */
const BUMPED_FREE_RAID_DAILY = 20;

/**
 * Legacy documents without listingTier are treated as premium (paid listings before Starter existed).
 */
function getListingTier(ad) {
  if (!ad) return LISTING_TIER_PREMIUM;
  const t = ad.listingTier;
  if (t === LISTING_TIER_STARTER || t === LISTING_TIER_PREMIUM) return t;
  return LISTING_TIER_PREMIUM;
}

function allowsCustomBranding(ad) {
  return getListingTier(ad) === LISTING_TIER_PREMIUM;
}

/**
 * Daily free raid cap for Twitter/Facebook (and aligned bot flows).
 * Starter: 1/day if they have a live listing but none bumped; 20/day once any Starter bubble is bumped.
 * Premium (legacy counts as premium): 5/day when no Premium bubble is bumped; 20/day once any Premium bubble is bumped.
 */
async function getFreeRaidDailyLimitForUsername(username) {
  const ads = await Ad.find({
    owner: username,
    status: { $in: ['active', 'approved'] }
  })
    .select('listingTier isBumped')
    .lean();

  if (!ads.length) return 0;

  let limit = 0;

  const starterAds = ads.filter((a) => getListingTier(a) === LISTING_TIER_STARTER);
  if (starterAds.length > 0) {
    const anyStarterBumped = starterAds.some((a) => a.isBumped);
    limit = Math.max(limit, anyStarterBumped ? BUMPED_FREE_RAID_DAILY : STARTER_UNBUMPED_FREE_RAID_DAILY);
  }

  const premiumAds = ads.filter((a) => getListingTier(a) === LISTING_TIER_PREMIUM);
  if (premiumAds.length > 0) {
    const anyPremiumBumped = premiumAds.some((a) => a.isBumped);
    limit = Math.max(
      limit,
      anyPremiumBumped ? BUMPED_FREE_RAID_DAILY : PREMIUM_UNBUMPED_FREE_RAID_DAILY
    );
  }

  return limit;
}

/** User-visible hint when no live listings qualify for free raids */
const FREE_RAIDS_REQUIRES_LISTING_REASON =
  'List an approved project on Aquads first. Starter: 1 free raid/day before your bubble is bumped, then 20/day once bumped. Premium: up to 5/day before bump, then 20/day once bumped.';

async function userHasBumpedAdForFreeRaids(username) {
  return (await getFreeRaidDailyLimitForUsername(username)) > 0;
}

module.exports = {
  LISTING_TIER_STARTER,
  LISTING_TIER_PREMIUM,
  PREMIUM_LISTING_FEE_USDC,
  STARTER_UNBUMPED_FREE_RAID_DAILY,
  PREMIUM_UNBUMPED_FREE_RAID_DAILY,
  BUMPED_FREE_RAID_DAILY,
  FREE_RAIDS_REQUIRES_LISTING_REASON,
  getListingTier,
  allowsCustomBranding,
  getFreeRaidDailyLimitForUsername,
  userHasBumpedAdForFreeRaids
};
