const Ad = require('../models/Ad');
const User = require('../models/User');
const socket = require('../socket');
const { LISTING_TIER_STARTER } = require('../utils/listingTier');
const { resolveTokenFromAddress } = require('../utils/tokenLookup');
const {
  isValidPairAddress,
  isValidProjectUrl,
  normalizeProjectUrl,
  validateLogoUrl
} = require('../utils/listingValidation');

const MAX_SIZE = 100;
const MIN_SIZE = 50;
const MAX_AGENT_LISTINGS_PER_DAY =
  Number(process.env.PROJECT_AGENT_LIST_STARTER_PER_DAY) || 5;

async function countRecentAgentListings(username) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Ad.countDocuments({
    owner: username,
    listingTier: LISTING_TIER_STARTER,
    createdAt: { $gte: since },
    txSignature: 'starter-free'
  });
}

/**
 * Preview token fields for Agent mode (lookup only).
 */
async function lookupTokenForListing(tokenOrPairAddress) {
  const resolved = await resolveTokenFromAddress(tokenOrPairAddress);
  if (!resolved.ok) {
    return { success: false, error: resolved.error, code: 'TOKEN_NOT_FOUND' };
  }
  return {
    success: true,
    token: resolved.token,
    needsWebsite: !resolved.token.websiteUrl,
    note: resolved.token.websiteUrl
      ? 'Website found on DexScreener — ready to submit with logo URL.'
      : 'Ask the user for their project website URL before submitting.'
  };
}

/**
 * Create a free Starter listing via Skipper Agent (pending admin approval).
 */
async function submitStarterListingViaAgent({
  userId,
  username,
  tokenOrPairAddress,
  logoUrl,
  websiteUrl
}) {
  if (!userId || !username) {
    return { success: false, error: 'Authentication required.', code: 'AUTH_REQUIRED' };
  }

  const user = await User.findById(userId).select('emailVerified username').lean();
  if (!user?.emailVerified) {
    return {
      success: false,
      error: 'Verify your email before listing via Skipper Agent.',
      code: 'EMAIL_VERIFICATION_REQUIRED'
    };
  }

  const recentCount = await countRecentAgentListings(username);
  if (recentCount >= MAX_AGENT_LISTINGS_PER_DAY) {
    return {
      success: false,
      error: `Starter listing limit reached (${MAX_AGENT_LISTINGS_PER_DAY}/24h). Try again tomorrow or use the List Project modal.`,
      code: 'RATE_LIMIT'
    };
  }

  const logoCheck = await validateLogoUrl(logoUrl);
  if (!logoCheck.ok) {
    return { success: false, error: logoCheck.error, code: 'INVALID_LOGO' };
  }

  const resolved = await resolveTokenFromAddress(tokenOrPairAddress);
  if (!resolved.ok) {
    return { success: false, error: resolved.error, code: 'TOKEN_NOT_FOUND' };
  }

  const token = resolved.token;
  if (!isValidPairAddress(token.pairAddress)) {
    return { success: false, error: 'Resolved pair address is invalid.', code: 'INVALID_PAIR' };
  }

  const finalWebsite = String(websiteUrl || token.websiteUrl || '').trim();
  if (!finalWebsite) {
    return {
      success: false,
      error: 'Project website URL is required. Ask the user for their site URL, then call submit_starter_listing again with website_url.',
      code: 'NEEDS_WEBSITE',
      token
    };
  }

  const url = normalizeProjectUrl(finalWebsite);
  if (!isValidProjectUrl(url)) {
    return { success: false, error: 'Website URL is not valid.', code: 'INVALID_WEBSITE' };
  }

  let existingGlobal = await Ad.findOne({
    pairAddress: token.pairAddress,
    status: { $in: ['active', 'approved', 'pending'] }
  })
    .select('owner status title id pairAddress')
    .lean();

  if (!existingGlobal && token.pairAddress.startsWith('0x')) {
    existingGlobal = await Ad.findOne({
      pairAddress: { $regex: new RegExp(`^${token.pairAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      status: { $in: ['active', 'approved', 'pending'] }
    })
      .select('owner status title id pairAddress')
      .lean();
  }

  if (existingGlobal && existingGlobal.owner !== username) {
    return {
      success: false,
      error: 'This token pair is already listed by another project on Aquads.',
      code: 'DUPLICATE_LISTING'
    };
  }

  if (existingGlobal && existingGlobal.owner === username) {
    return {
      success: false,
      error: `You already have a listing for this pair (${existingGlobal.title}, status: ${existingGlobal.status}).`,
      code: 'DUPLICATE_OWN_LISTING',
      existingAdId: existingGlobal.id
    };
  }

  const ad = new Ad({
    id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: token.title,
    logo: logoCheck.url,
    url,
    pairAddress: token.pairAddress,
    blockchain: token.blockchain || 'ethereum',
    size: MAX_SIZE,
    x: 0,
    y: 0,
    owner: username,
    txSignature: 'starter-free',
    paymentChain: '',
    chainSymbol: '',
    chainAddress: '',
    selectedAddons: [],
    totalAmount: 0,
    listingFee: 0,
    listingTier: LISTING_TIER_STARTER,
    status: 'pending'
  });

  const savedAd = await ad.save();

  try {
    socket.getIO().emit('adsUpdated', { type: 'create', ad: savedAd });
    socket.getIO().emit('newPendingAd', { ad: savedAd, createdAt: new Date() });
  } catch (socketErr) {
    console.error('[project-agent] list-starter socket emit failed:', socketErr.message);
  }

  try {
    const { invalidatePublicAdsCache } = require('../routes/ads');
    invalidatePublicAdsCache();
  } catch {
    // non-fatal
  }

  return {
    success: true,
    code: 'LISTING_SUBMITTED',
    adId: savedAd.id,
    title: savedAd.title,
    logo: savedAd.logo,
    url: savedAd.url,
    pairAddress: savedAd.pairAddress,
    blockchain: savedAd.blockchain,
    listingTier: LISTING_TIER_STARTER,
    status: 'pending',
    message:
      'Starter listing submitted successfully. It is pending admin approval before appearing on the bubble map.',
    resolvedFrom: {
      tokenOrPairAddress: String(tokenOrPairAddress).trim(),
      contractAddress: token.contractAddress,
      dexUrl: token.dexUrl
    }
  };
}

module.exports = {
  lookupTokenForListing,
  submitStarterListingViaAgent
};
