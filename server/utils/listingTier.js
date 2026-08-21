const Ad = require('../models/Ad');

const LISTING_TIER_STARTER = 'starter';
const LISTING_TIER_PREMIUM = 'premium';

/** Base Premium listing fee in USDC before affiliate discount */
const PREMIUM_LISTING_FEE_USDC = 99;

/** Starter: 1 free raid per day (bump does not raise this cap) */
const STARTER_UNBUMPED_FREE_RAID_DAILY = 1;
/** Starter stays at 1/day even after a bubble bump — extra raids are a Premium unlock */
const STARTER_BUMPED_FREE_RAID_DAILY = 1;
/** Premium: free raids per day while listing exists but no Premium bubble is bumped yet */
const PREMIUM_UNBUMPED_FREE_RAID_DAILY = 5;
/** Premium: free raids per day once any Premium bubble is bumped */
const PREMIUM_BUMPED_FREE_RAID_DAILY = 10;

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
 * Mintfunnel PR add-on 5% partnership rate is paid Premium only.
 * pkg.price is the discounted Premium rate; pkg.originalPrice is the list/Starter rate.
 */
function getMintfunnelAddonChargePrice(pkg, listingTier) {
  if (!pkg) return 0;
  return listingTier === LISTING_TIER_PREMIUM ? pkg.price : (pkg.originalPrice ?? pkg.price);
}

/**
 * Daily free raid cap for Twitter/Facebook (and aligned bot flows).
 * Starter: 1/day whether bumped or not.
 * Premium: 5/day unbumped → 10/day bumped.
 * Returns { dailyLimit, quotaTier } where quotaTier drives UI copy.
 */
async function getFreeRaidQuotaForUsername(username) {
  const ads = await Ad.find({
    owner: username,
    status: { $in: ['active', 'approved'] }
  })
    .select('listingTier isBumped')
    .lean();

  if (!ads.length) return { dailyLimit: 0, quotaTier: null };

  let limit = 0;
  let quotaTier = null;

  const starterAds = ads.filter((a) => getListingTier(a) === LISTING_TIER_STARTER);
  if (starterAds.length > 0) {
    const anyStarterBumped = starterAds.some((a) => a.isBumped);
    const starterLimit = anyStarterBumped
      ? STARTER_BUMPED_FREE_RAID_DAILY
      : STARTER_UNBUMPED_FREE_RAID_DAILY;
    if (starterLimit >= limit) {
      limit = starterLimit;
      quotaTier = anyStarterBumped ? 'starter_bumped' : 'starter_unbumped';
    }
  }

  const premiumAds = ads.filter((a) => getListingTier(a) === LISTING_TIER_PREMIUM);
  if (premiumAds.length > 0) {
    const anyPremiumBumped = premiumAds.some((a) => a.isBumped);
    const premiumLimit = anyPremiumBumped
      ? PREMIUM_BUMPED_FREE_RAID_DAILY
      : PREMIUM_UNBUMPED_FREE_RAID_DAILY;
    if (premiumLimit > limit) {
      limit = premiumLimit;
      quotaTier = anyPremiumBumped ? 'premium_bumped' : 'premium_unbumped';
    }
  }

  return { dailyLimit: limit, quotaTier };
}

async function getFreeRaidDailyLimitForUsername(username) {
  const { dailyLimit } = await getFreeRaidQuotaForUsername(username);
  return dailyLimit;
}

/** User-visible hint when no live listings qualify for free raids */
const FREE_RAIDS_REQUIRES_LISTING_REASON =
  'List an approved project on Aquads first. Starter: 1 free raid/day (bump does not increase this). Premium: up to 5/day before bump, then 10/day once bumped.';

async function userHasBumpedAdForFreeRaids(username) {
  return (await getFreeRaidDailyLimitForUsername(username)) > 0;
}

module.exports = {
  LISTING_TIER_STARTER,
  LISTING_TIER_PREMIUM,
  PREMIUM_LISTING_FEE_USDC,
  STARTER_UNBUMPED_FREE_RAID_DAILY,
  STARTER_BUMPED_FREE_RAID_DAILY,
  PREMIUM_UNBUMPED_FREE_RAID_DAILY,
  PREMIUM_BUMPED_FREE_RAID_DAILY,
  /** @deprecated use STARTER_BUMPED / PREMIUM_BUMPED constants */
  BUMPED_FREE_RAID_DAILY: PREMIUM_BUMPED_FREE_RAID_DAILY,
  FREE_RAIDS_REQUIRES_LISTING_REASON,
  getListingTier,
  getMintfunnelAddonChargePrice,
  allowsCustomBranding,
  getFreeRaidQuotaForUsername,
  getFreeRaidDailyLimitForUsername,
  userHasBumpedAdForFreeRaids
};
