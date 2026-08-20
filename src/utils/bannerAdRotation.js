import { API_URL } from '../services/api';
import logger from './logger';
import { preloadBannerMedia } from './bannerAdMedia';

const ROTATION_MS = 10000;
const CACHE_TTL_MS = 60000;
const VISIBILITY_REFRESH_MS = 10000;

let banners = [];
let fetchedAt = 0;
let inFlight = null;
let fetchSeq = 0;
let queuedRefetch = false;
const listeners = new Set();
let rotationTimer = null;
let refreshTimer = null;
let expiryTimer = null;
let visibilityBound = false;

function expiryMs(banner) {
  if (!banner?.expiresAt) return 0;
  const ms = new Date(banner.expiresAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function filterLive(list) {
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  return list.filter((banner) => {
    if (banner.status && banner.status !== 'active') return false;
    return expiryMs(banner) > now;
  });
}

function rotationIndex(length) {
  if (length <= 1) return 0;
  return Math.floor(Date.now() / ROTATION_MS) % length;
}

function snapshot() {
  const list = filterLive(banners);
  const currentIndex = rotationIndex(list.length);
  return {
    banners: list,
    currentIndex,
    currentBanner: list[currentIndex] || null,
  };
}

function emit() {
  const state = snapshot();
  preloadAround(state);
  listeners.forEach((listener) => listener(state));
}

function preloadAround({ banners: list, currentIndex }) {
  if (!list.length) return;
  const current = list[currentIndex];
  if (current?.gif) preloadBannerMedia(current.gif);
  if (list.length > 1) {
    const next = list[(currentIndex + 1) % list.length];
    if (next?.gif) preloadBannerMedia(next.gif);
  }
}

function applyBanners(list) {
  const live = filterLive(list);
  banners = live;
  fetchedAt = Date.now();
  emit();
  scheduleExpiryTick();
}

function nextExpiryDelay(list) {
  const now = Date.now();
  let soonest = Infinity;
  for (const banner of list) {
    const ms = expiryMs(banner);
    if (ms > now && ms < soonest) soonest = ms;
  }
  if (soonest === Infinity) return null;
  return Math.max(0, soonest - now + 25);
}

function scheduleExpiryTick() {
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  if (listeners.size === 0) return;

  const delay = nextExpiryDelay(filterLive(banners));
  if (delay == null) return;

  expiryTimer = setTimeout(() => {
    expiryTimer = null;
    const live = filterLive(banners);
    if (live.length !== banners.length) {
      banners = live;
      emit();
    }
    fetchActiveBanners();
    scheduleExpiryTick();
  }, delay);
}

function fetchActiveBanners() {
  if (inFlight) {
    queuedRefetch = true;
    return inFlight;
  }

  const seq = ++fetchSeq;
  inFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/bannerAds/active`);
      if (seq !== fetchSeq) return banners;
      if (response.ok) {
        const data = await response.json();
        if (seq !== fetchSeq) return banners;
        if (Array.isArray(data)) {
          applyBanners(data);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch active banners:', error);
    } finally {
      inFlight = null;
    }

    if (seq === fetchSeq && queuedRefetch) {
      queuedRefetch = false;
      return fetchActiveBanners();
    }
    return banners;
  })();

  return inFlight;
}

function scheduleRotationTick() {
  if (rotationTimer) {
    clearTimeout(rotationTimer);
    rotationTimer = null;
  }
  if (listeners.size === 0) return;

  const delay = ROTATION_MS - (Date.now() % ROTATION_MS) || ROTATION_MS;
  rotationTimer = setTimeout(() => {
    const live = filterLive(banners);
    if (live.length !== banners.length) {
      banners = live;
      fetchActiveBanners();
    }
    emit();
    scheduleRotationTick();
  }, delay);
}

function ensureRefreshTimer() {
  if (refreshTimer || listeners.size === 0) return;
  refreshTimer = setInterval(() => {
    fetchActiveBanners();
  }, CACHE_TTL_MS);
}

function onVisibilityChange() {
  if (typeof document === 'undefined') return;
  if (document.visibilityState !== 'visible') return;
  if (listeners.size === 0) return;
  if (fetchedAt > 0 && Date.now() - fetchedAt < VISIBILITY_REFRESH_MS) return;
  fetchActiveBanners();
}

function bindVisibility() {
  if (visibilityBound || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', onVisibilityChange);
  visibilityBound = true;
}

function unbindVisibilityIfIdle() {
  if (listeners.size > 0 || !visibilityBound || typeof document === 'undefined') return;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  visibilityBound = false;
}

function stopTimersIfIdle() {
  if (listeners.size > 0) return;
  if (rotationTimer) {
    clearTimeout(rotationTimer);
    rotationTimer = null;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
  unbindVisibilityIfIdle();
}

export function getBannerRotationState() {
  return snapshot();
}

export function subscribeBannerRotation(listener) {
  listeners.add(listener);

  const live = filterLive(banners);
  const droppedExpired = live.length !== banners.length;
  if (droppedExpired) {
    banners = live;
  }

  listener(snapshot());
  scheduleRotationTick();
  scheduleExpiryTick();
  ensureRefreshTimer();
  bindVisibility();

  const cacheFresh = fetchedAt > 0 && Date.now() - fetchedAt < CACHE_TTL_MS;
  if (!cacheFresh || droppedExpired) {
    fetchActiveBanners();
  } else {
    preloadAround(snapshot());
  }

  return () => {
    listeners.delete(listener);
    stopTimersIfIdle();
  };
}
