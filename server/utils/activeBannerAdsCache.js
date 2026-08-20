const BannerAd = require('../models/BannerAd');

const BANNERS_CACHE_TTL = 60 * 1000;

let activeBannersCache = null;
let activeBannersCacheTime = 0;
let cacheGeneration = 0;
let activeBannersRefreshing = false;

function expiryMs(banner) {
  if (!banner?.expiresAt) return 0;
  const ms = new Date(banner.expiresAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function filterLiveBanners(banners) {
  if (!Array.isArray(banners)) return [];
  const now = Date.now();
  return banners.filter((banner) => {
    if (banner.status && banner.status !== 'active') return false;
    return expiryMs(banner) > now;
  });
}

function liveFromCache() {
  if (!activeBannersCache) return null;
  const live = filterLiveBanners(activeBannersCache);
  const pruned = live.length !== activeBannersCache.length;
  if (pruned) {
    activeBannersCache = live;
  }
  return { banners: live, pruned };
}

function invalidateActiveBannerAdsCache() {
  activeBannersCache = null;
  activeBannersCacheTime = 0;
  cacheGeneration += 1;
}

async function fetchAndCacheBanners(isRetry = false) {
  const generation = cacheGeneration;
  const banners = await BannerAd.find({
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 }).lean();

  if (generation !== cacheGeneration) {
    if (!isRetry) {
      return fetchAndCacheBanners(true);
    }
    const hit = liveFromCache();
    return hit ? hit.banners : filterLiveBanners(banners);
  }

  activeBannersCache = banners;
  activeBannersCacheTime = Date.now();
  return banners;
}

function startBackgroundRefresh() {
  if (activeBannersRefreshing) return;
  activeBannersRefreshing = true;
  fetchAndCacheBanners()
    .catch((err) => {
      console.error('[Banners Cache] Background refresh failed:', err.message);
    })
    .finally(() => {
      activeBannersRefreshing = false;
    });
}

async function getActiveBanners() {
  const now = Date.now();
  const hit = liveFromCache();

  if (hit) {
    const stale = now - activeBannersCacheTime >= BANNERS_CACHE_TTL;
    if (stale || hit.pruned) {
      startBackgroundRefresh();
    }
    return {
      banners: hit.banners,
      cacheStatus: stale ? 'STALE' : 'HIT'
    };
  }

  const banners = await fetchAndCacheBanners();
  return {
    banners,
    cacheStatus: 'MISS'
  };
}

module.exports = {
  invalidateActiveBannerAdsCache,
  getActiveBanners,
  filterLiveBanners
};
