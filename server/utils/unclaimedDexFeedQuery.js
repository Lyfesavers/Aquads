const Ad = require('../models/Ad');
const {
  LISTING_SOURCE_DEX_FEED,
  CLAIM_STATUS_UNCLAIMED,
  DEX_FEED_OWNER_USERNAME
} = require('../constants/dexFeed');

/** Fields needed by the admin Dex Feed transfer UI — omit voterData, branding blobs, etc. */
const ADMIN_UNCLAIMED_DEX_SELECT =
  'id title logo url blockchain contractAddress pairAddress feedListedAt feedMetricsSnapshot claimStatus listingSource owner status createdAt';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUnclaimedDexFilter(q = '') {
  const filter = {
    listingSource: LISTING_SOURCE_DEX_FEED,
    claimStatus: CLAIM_STATUS_UNCLAIMED,
    owner: DEX_FEED_OWNER_USERNAME,
    status: 'active'
  };

  const term = String(q || '').trim();
  if (!term) return filter;

  const rx = new RegExp(escapeRegex(term), 'i');
  return {
    ...filter,
    $or: [
      { title: rx },
      { contractAddress: rx },
      { pairAddress: rx },
      { blockchain: rx },
      { id: rx }
    ]
  };
}

function normalizePagination(page, limit) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(limit, 10) || DEFAULT_PAGE_SIZE)
  );
  return { page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum };
}

async function countUnclaimedDexAds(q = '') {
  return Ad.countDocuments(buildUnclaimedDexFilter(q));
}

/**
 * Paginated unclaimed dex-feed listings for admin panel.
 * @returns {{ ads: object[], total: number, page: number, limit: number, totalPages: number }}
 */
async function fetchUnclaimedDexAds({ q = '', page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const filter = buildUnclaimedDexFilter(q);
  const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);

  const [ads, total] = await Promise.all([
    Ad.find(filter)
      .select(ADMIN_UNCLAIMED_DEX_SELECT)
      .sort({ feedListedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Ad.countDocuments(filter)
  ]);

  return {
    ads,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum) || 1)
  };
}

module.exports = {
  ADMIN_UNCLAIMED_DEX_SELECT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  buildUnclaimedDexFilter,
  countUnclaimedDexAds,
  fetchUnclaimedDexAds
};
