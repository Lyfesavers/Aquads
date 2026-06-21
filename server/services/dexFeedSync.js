const Ad = require('../models/Ad');
const DexFeedSeen = require('../models/DexFeedSeen');
const socket = require('../socket');
const { pickBestPair, normalizeResolvedPair } = require('../utils/tokenLookup');
const {
  isValidProjectUrl,
  normalizeProjectUrl,
  validateLogoUrl
} = require('../utils/listingValidation');
const { normalizeBlockchainSlug } = require('../constants/blockchains');
const { LISTING_TIER_STARTER } = require('../utils/listingTier');
const { dexScreenerGetJson } = require('../utils/dexScreenerLimiter');
const { ensureDexFeedUser } = require('../utils/ensureDexFeedUser');
const {
  LISTING_SOURCE_DEX_FEED,
  CLAIM_STATUS_UNCLAIMED,
  DEX_FEED_OWNER_USERNAME,
  DEX_FEED_ENABLED,
  DEX_FEED_MIN_MARKET_CAP_USD,
  DEX_FEED_MIN_LIQUIDITY_USD,
  DEX_FEED_SOURCES,
  DEX_TOKEN_PAIRS_URL
} = require('../constants/dexFeed');

const MAX_SIZE = 100;

let syncInProgress = false;

function marketCapUsd(pair) {
  return Math.max(Number(pair?.marketCap) || 0, Number(pair?.fdv) || 0);
}

function liquidityUsd(pair) {
  return Number(pair?.liquidity?.usd) || 0;
}

function txns24h(pair) {
  const buys = Number(pair?.txns?.h24?.buys) || 0;
  const sells = Number(pair?.txns?.h24?.sells) || 0;
  return buys + sells;
}

function pairAgeMs(pair) {
  const ts = Number(pair?.pairCreatedAt);
  if (!ts || !Number.isFinite(ts)) return null;
  return Date.now() - ts;
}

function extractWebsiteFromProfile(profile, pair) {
  const fromPair = pair?.info?.websites?.[0]?.url || pair?.info?.websites?.[0];
  if (typeof fromPair === 'string' && fromPair.trim()) return fromPair.trim();

  const links = profile?.links;
  if (!Array.isArray(links)) return '';
  const websiteLink = links.find(
    (l) =>
      String(l?.type || l?.label || '')
        .toLowerCase()
        .includes('website') || String(l?.url || '').startsWith('http')
  );
  return String(websiteLink?.url || '').trim();
}

function evaluateMetrics(pair, feedConfig = {}) {
  const minAgeHours = Number(feedConfig.minPairAgeHours) || 24;
  const minMarketCapUsd = Number(feedConfig.minMarketCapUsd) || DEX_FEED_MIN_MARKET_CAP_USD;
  const minLiquidityUsd = Number(feedConfig.minLiquidityUsd) || DEX_FEED_MIN_LIQUIDITY_USD;
  const minAgeMs = minAgeHours * 60 * 60 * 1000;

  const failures = [];
  const ageMs = pairAgeMs(pair);

  if (ageMs == null) {
    failures.push('missing pairCreatedAt');
  } else if (ageMs < minAgeMs) {
    failures.push(`pair age under ${minAgeHours}h`);
  }

  const mc = marketCapUsd(pair);
  if (mc < minMarketCapUsd) {
    failures.push(`market cap below $${minMarketCapUsd}`);
  }

  const liq = liquidityUsd(pair);
  if (liq < minLiquidityUsd) {
    failures.push(`liquidity below $${minLiquidityUsd}`);
  }

  return {
    pass: failures.length === 0,
    failures,
    snapshot: {
      feedSource: feedConfig.id || null,
      marketCap: mc,
      liquidity: liq,
      txns24h: txns24h(pair),
      pairAgeHours: ageMs != null ? ageMs / 3600000 : null,
      minPairAgeHours: minAgeHours
    }
  };
}

async function listingExistsForToken(chainId, tokenAddress, pairAddress) {
  const tokenLower = String(tokenAddress).trim();
  const pairLower = String(pairAddress || '').trim().toLowerCase();

  const orConditions = [{ contractAddress: tokenLower }];
  if (pairLower) {
    orConditions.push({ pairAddress: pairLower });
    if (pairLower.startsWith('0x')) {
      orConditions.push({
        pairAddress: {
          $regex: new RegExp(
            `^${pairLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          )
        }
      });
    }
  }

  return Ad.findOne({
    $or: orConditions,
    status: { $in: ['active', 'approved', 'pending'] }
  })
    .select('id owner status')
    .lean();
}

async function emitListingEvents(savedAd) {
  try {
    const io = socket.getIO();
    io.emit('adsUpdated', { type: 'create', ad: savedAd });

    const unclaimedCount = await Ad.countDocuments({
      listingSource: LISTING_SOURCE_DEX_FEED,
      claimStatus: 'unclaimed',
      owner: DEX_FEED_OWNER_USERNAME,
      status: 'active'
    });
    io.emit('dexFeedListingCreated', { ad: savedAd, unclaimedTotal: unclaimedCount });
    io.emit('unclaimedDexAdsUpdated', { action: 'create', ad: savedAd, total: unclaimedCount });
  } catch (err) {
    console.error('[DexFeed] Socket emit failed:', err.message);
  }

  try {
    const { invalidatePublicAdsCache } = require('../routes/ads');
    invalidatePublicAdsCache();
  } catch {
    // non-fatal
  }
}

function hasRequiredListingFields(token, logoUrl, profile) {
  const title = String(token?.title || '').trim();
  const pairAddress = String(token?.pairAddress || '').trim();
  const blockchain = String(token?.blockchain || profile?.chainId || '').trim();
  const contractAddress = String(
    token?.contractAddress || profile?.tokenAddress || ''
  ).trim();
  const logo = String(logoUrl || '').trim();

  if (!title || title === 'TOKEN') return false;
  if (!pairAddress) return false;
  if (!blockchain) return false;
  if (!contractAddress) return false;
  if (!logo) return false;
  return true;
}

async function createListingFromPair(profile, pair, metrics) {
  if (!metrics.pass) {
    return {
      skipped: true,
      reason: metrics.failures.length
        ? metrics.failures.join('; ')
        : 'metrics gate failed'
    };
  }

  await ensureDexFeedUser();

  const token = normalizeResolvedPair(pair);
  if (!token) return { skipped: true, reason: 'normalize failed' };

  const logoCandidate =
    String(token.logoFromDex || '').trim() || String(profile?.icon || '').trim();
  const logoCheck = await validateLogoUrl(logoCandidate);
  if (!logoCheck.ok) {
    return { skipped: true, reason: logoCheck.error || 'invalid logo' };
  }

  if (!hasRequiredListingFields(token, logoCheck.url, profile)) {
    return { skipped: true, reason: 'missing required listing fields' };
  }

  const websiteRaw = extractWebsiteFromProfile(profile, pair);
  let url = '';
  if (websiteRaw) {
    url = normalizeProjectUrl(websiteRaw);
    if (!isValidProjectUrl(url)) url = '';
  }

  const ad = new Ad({
    id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: token.title,
    logo: logoCheck.url,
    url,
    pairAddress: token.pairAddress,
    contractAddress: token.contractAddress || String(profile.tokenAddress).trim(),
    blockchain: normalizeBlockchainSlug(token.blockchain || profile.chainId),
    size: MAX_SIZE,
    x: 0,
    y: 0,
    owner: DEX_FEED_OWNER_USERNAME,
    txSignature: 'dex-feed',
    paymentChain: '',
    chainSymbol: '',
    chainAddress: '',
    selectedAddons: [],
    totalAmount: 0,
    listingFee: 0,
    listingTier: LISTING_TIER_STARTER,
    listingSource: LISTING_SOURCE_DEX_FEED,
    claimStatus: CLAIM_STATUS_UNCLAIMED,
    feedListedAt: new Date(),
    feedMetricsSnapshot: metrics.snapshot,
    status: 'active',
    isBumped: false
  });

  const savedAd = await ad.save();

  await DexFeedSeen.findOneAndUpdate(
    {
      chainId: String(profile.chainId).trim().toLowerCase(),
      tokenAddress: String(profile.tokenAddress).trim()
    },
    { adId: savedAd.id, firstSeenAt: new Date() },
    { upsert: true }
  );

  await emitListingEvents(savedAd);

  return {
    created: true,
    adId: savedAd.id,
    status: 'active',
    title: savedAd.title
  };
}

async function processProfile(profile, feedConfig) {
  const chainId = String(profile?.chainId || '').trim().toLowerCase();
  const tokenAddress = String(profile?.tokenAddress || '').trim();
  if (!chainId || !tokenAddress) {
    return { skipped: true, reason: 'missing chain or token' };
  }

  const seen = await DexFeedSeen.findOne({ chainId, tokenAddress }).lean();
  if (seen?.adId) {
    return { skipped: true, reason: 'already processed' };
  }

  let pairs = [];
  try {
    pairs = await dexScreenerGetJson(
      `${DEX_TOKEN_PAIRS_URL}/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`
    );
  } catch (err) {
    return { skipped: true, reason: err.message };
  }

  if (!Array.isArray(pairs) || !pairs.length) {
    await DexFeedSeen.findOneAndUpdate(
      { chainId, tokenAddress },
      { firstSeenAt: new Date() },
      { upsert: true }
    );
    return { skipped: true, reason: 'no pairs' };
  }

  const best = pickBestPair(pairs);
  if (!best) {
    return { skipped: true, reason: 'no best pair' };
  }

  const existing = await listingExistsForToken(chainId, tokenAddress, best.pairAddress);
  if (existing) {
    await DexFeedSeen.findOneAndUpdate(
      { chainId, tokenAddress },
      { adId: existing.id, firstSeenAt: new Date() },
      { upsert: true }
    );
    return { skipped: true, reason: 'duplicate listing' };
  }

  const metrics = evaluateMetrics(best, feedConfig);
  return createListingFromPair(profile, best, metrics);
}

function profileKey(profile) {
  const chainId = String(profile?.chainId || '').trim().toLowerCase();
  const tokenAddress = String(profile?.tokenAddress || '').trim();
  return chainId && tokenAddress ? `${chainId}:${tokenAddress}` : null;
}

async function syncDexFeedListings() {
  if (!DEX_FEED_ENABLED) {
    return { skipped: true, reason: 'DEX_FEED_ENABLED is not true' };
  }

  if (syncInProgress) {
    return { skipped: true, reason: 'sync already running' };
  }

  syncInProgress = true;
  const summary = {
    sources: [],
    profiles: 0,
    created: 0,
    skipped: 0,
    errors: 0
  };

  try {
    await ensureDexFeedUser();

    const seenThisRun = new Set();

    for (const source of DEX_FEED_SOURCES) {
      const sourceSummary = {
        id: source.id,
        profiles: 0,
        created: 0,
        skipped: 0,
        errors: 0
      };

      let profiles = [];
      try {
        profiles = await dexScreenerGetJson(source.url);
      } catch (err) {
        summary.errors += 1;
        sourceSummary.errors += 1;
        console.error(`[DexFeed] ${source.id} fetch error:`, err.message);
        summary.sources.push(sourceSummary);
        continue;
      }

      if (!Array.isArray(profiles)) {
        summary.errors += 1;
        sourceSummary.errors += 1;
        console.error(`[DexFeed] ${source.id} returned non-array`);
        summary.sources.push(sourceSummary);
        continue;
      }

      sourceSummary.profiles = profiles.length;
      summary.profiles += profiles.length;

      for (const profile of profiles) {
        const key = profileKey(profile);
        if (!key || seenThisRun.has(key)) {
          sourceSummary.skipped += 1;
          summary.skipped += 1;
          continue;
        }
        seenThisRun.add(key);

        try {
          const result = await processProfile(profile, source);
          if (result?.created) {
            sourceSummary.created += 1;
            summary.created += 1;
          } else {
            sourceSummary.skipped += 1;
            summary.skipped += 1;
          }
        } catch (err) {
          sourceSummary.errors += 1;
          summary.errors += 1;
          console.error(`[DexFeed] ${source.id} profile error:`, err.message);
        }
      }

      console.log(
        `[DexFeed] ${source.id} — profiles: ${sourceSummary.profiles}, listed: ${sourceSummary.created}, skipped: ${sourceSummary.skipped}, errors: ${sourceSummary.errors} (≥${source.minPairAgeHours}h, MC≥$${DEX_FEED_MIN_MARKET_CAP_USD}, liq≥$${DEX_FEED_MIN_LIQUIDITY_USD})`
      );
      summary.sources.push(sourceSummary);
    }

    console.log(
      `[DexFeed] Sync done — profiles: ${summary.profiles}, listed: ${summary.created}, skipped: ${summary.skipped}, errors: ${summary.errors}`
    );

    return summary;
  } finally {
    syncInProgress = false;
  }
}

module.exports = {
  syncDexFeedListings,
  evaluateMetrics,
  DEX_FEED_OWNER_USERNAME
};
