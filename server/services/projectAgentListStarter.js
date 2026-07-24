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
const { normalizeBlockchainSlug } = require('../constants/blockchains');

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
  const logoFromDex = resolved.token.logoFromDex || null;
  const websiteNote = resolved.token.websiteUrl
    ? 'Website found on DexScreener — will be included if user does not provide one.'
    : 'Website is optional — user can add a site later from their dashboard.';
  const logoNote = logoFromDex
    ? 'DexScreener profile logo is available — omit logo_url on submit to use it automatically.'
    : 'No DexScreener profile logo — ask the user for a direct HTTPS image URL before submitting.';

  return {
    success: true,
    token: resolved.token,
    logoFromDex,
    needsWebsite: false,
    note: `${logoNote} ${websiteNote}`
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

  const resolved = await resolveTokenFromAddress(tokenOrPairAddress);
  if (!resolved.ok) {
    return { success: false, error: resolved.error, code: 'TOKEN_NOT_FOUND' };
  }

  const token = resolved.token;
  const userLogo = String(logoUrl || '').trim();
  const effectiveLogoUrl = userLogo || String(token.logoFromDex || '').trim();
  if (!effectiveLogoUrl) {
    return {
      success: false,
      error:
        'Logo URL is required. No DexScreener profile image was found for this token — provide a direct HTTPS image URL (png/jpg/gif/webp).',
      code: 'LOGO_REQUIRED'
    };
  }

  const logoCheck = await validateLogoUrl(effectiveLogoUrl);
  if (!logoCheck.ok) {
    return { success: false, error: logoCheck.error, code: 'INVALID_LOGO' };
  }

  const logoSource = userLogo ? 'user' : 'dexscreener';
  if (!isValidPairAddress(token.pairAddress)) {
    return { success: false, error: 'Resolved pair address is invalid.', code: 'INVALID_PAIR' };
  }

  const finalWebsite = String(websiteUrl || token.websiteUrl || '').trim();
  let url = '';
  if (finalWebsite) {
    url = normalizeProjectUrl(finalWebsite);
    if (!isValidProjectUrl(url)) {
      return { success: false, error: 'Website URL is not valid.', code: 'INVALID_WEBSITE' };
    }
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
    blockchain: normalizeBlockchainSlug(token.blockchain || 'ethereum'),
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
    socket.emitAdUpdate('create', savedAd);
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
    logoSource,
    resolvedFrom: {
      tokenOrPairAddress: String(tokenOrPairAddress).trim(),
      contractAddress: token.contractAddress,
      dexUrl: token.dexUrl,
      logoFromDex: token.logoFromDex || null
    }
  };
}

module.exports = {
  lookupTokenForListing,
  submitStarterListingViaAgent
};
