import logger from './logger';

const ADS_CACHE_KEY = 'cachedAds';
const AD_VOTES_CACHE_KEY = 'cachedAdVotes';

/** Lightweight vote snapshot so counts survive even when full ads cache is too large for localStorage. */
export function persistAdVotesSnapshot(ads) {
  if (!Array.isArray(ads)) return;
  try {
    const votes = {};
    ads.forEach((ad) => {
      if (!ad?.id) return;
      votes[ad.id] = {
        bullishVotes: ad.bullishVotes || 0,
        bearishVotes: ad.bearishVotes || 0,
        isBumped: !!ad.isBumped,
        size: ad.size,
        userVote: ad.userVote,
      };
    });
    localStorage.setItem(AD_VOTES_CACHE_KEY, JSON.stringify(votes));
  } catch (error) {
    logger.warn('Failed to persist ad vote snapshot:', error);
  }
}

export function mergeAdVotesSnapshot(ads) {
  if (!Array.isArray(ads)) return [];
  try {
    const raw = localStorage.getItem(AD_VOTES_CACHE_KEY);
    if (!raw) return ads;
    const votes = JSON.parse(raw);
    return ads.map((ad) => {
      const snap = votes[ad.id];
      if (!snap) return ad;
      return {
        ...ad,
        bullishVotes: snap.bullishVotes ?? ad.bullishVotes ?? 0,
        bearishVotes: snap.bearishVotes ?? ad.bearishVotes ?? 0,
        isBumped: snap.isBumped ?? ad.isBumped,
        size: snap.size ?? ad.size,
        userVote: snap.userVote ?? ad.userVote,
      };
    });
  } catch (error) {
    logger.warn('Failed to merge ad vote snapshot:', error);
    return ads;
  }
}

export function persistAdsCache(ads) {
  if (!Array.isArray(ads)) return;
  persistAdVotesSnapshot(ads);
  try {
    localStorage.setItem(ADS_CACHE_KEY, JSON.stringify(ads));
  } catch (error) {
    logger.warn('Full ads cache too large for localStorage; using vote snapshot only:', error);
  }
}

export function readAdsCache() {
  try {
    const raw = localStorage.getItem(ADS_CACHE_KEY);
    if (raw) {
      // Old builds cached the full list with voterData (~7MB) and could exceed quota.
      if (raw.length > 4_000_000) {
        logger.warn('Skipping oversized cachedAds entry');
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeAdVotesSnapshot(parsed);
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to read ads cache:', error);
  }
  return [];
}

/** Prefer fresher in-memory vote fields when a refetch returns stale counts. */
export function mergeIncomingAdsWithCurrent(incomingAds, currentAds, mergeRecentVoteFields) {
  if (!Array.isArray(incomingAds)) return [];
  const currentById = Object.fromEntries(
    (Array.isArray(currentAds) ? currentAds : [])
      .filter((ad) => ad?.id)
      .map((ad) => [ad.id, ad])
  );

  return incomingAds.map((ad) => {
    let merged = mergeRecentVoteFields({
      ...ad,
      bullishVotes: ad.bullishVotes || 0,
      bearishVotes: ad.bearishVotes || 0,
    });

    const current = currentById[ad.id];
    if (!current) return merged;

    const inBull = merged.bullishVotes || 0;
    const inBear = merged.bearishVotes || 0;
    const curBull = current.bullishVotes || 0;
    const curBear = current.bearishVotes || 0;
    const inTotal = inBull + inBear;
    const curTotal = curBull + curBear;

    const currentIsAhead =
      curTotal > inTotal ||
      (curTotal === inTotal && curBull > inBull) ||
      (!!current.isBumped && !merged.isBumped);

    if (!currentIsAhead) return merged;

    return {
      ...merged,
      bullishVotes: curBull,
      bearishVotes: curBear,
      isBumped: current.isBumped ?? merged.isBumped,
      size: current.isBumped ? current.size : merged.size,
      userVote: current.userVote ?? merged.userVote,
    };
  });
}
