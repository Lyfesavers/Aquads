const Ad = require('../models/Ad');
const User = require('../models/User');
const { getListingTier, LISTING_TIER_PREMIUM, LISTING_TIER_STARTER } = require('./listingTier');

/** Reserved wallet/thread scope id (not a bubble listing). */
const FREELANCER_SCOPE_AD_ID = 'freelancer';
/** Verified users with no live listing yet. */
const ACCOUNT_SCOPE_AD_ID = 'account';

/** One-time trial credit for verified users (account workspace, Starter listings, freelancers). */
const TRIAL_STARTER_CENTS =
  Number(process.env.PROJECT_AGENT_TRIAL_STARTER_CENTS) ||
  Number(process.env.PROJECT_AGENT_FREELANCER_STARTER_CENTS) ||
  100;
const FREELANCER_STARTER_CENTS = TRIAL_STARTER_CENTS;
const PREMIUM_STARTER_CENTS = Number(process.env.PROJECT_AGENT_STARTER_CENTS) || 500;

function isFreelancerScopeAdId(adId) {
  return String(adId) === FREELANCER_SCOPE_AD_ID;
}

function isAccountScopeAdId(adId) {
  return String(adId) === ACCOUNT_SCOPE_AD_ID;
}

function userHasFreelancerAccess(userType) {
  return userType === 'freelancer' || userType === 'both';
}

function resolveAgentScopeLabel(ad) {
  if (!ad) return 'account';
  if (ad.isFreelancerScope) return 'freelancer';
  if (ad.isAccountScope) return 'account';
  return getListingTier(ad) === LISTING_TIER_PREMIUM ? LISTING_TIER_PREMIUM : LISTING_TIER_STARTER;
}

/**
 * Starter wallet credit in cents (0 = pay-as-you-go until Premium bonus).
 * @param {object|string} adOrId — listing/ad scope object, or legacy ad id string
 */
function getStarterGrantCentsForAd(adOrId) {
  const adId = typeof adOrId === 'string' ? adOrId : adOrId?.id;
  if (isFreelancerScopeAdId(adId)) {
    return TRIAL_STARTER_CENTS;
  }
  if (isAccountScopeAdId(adId)) {
    return TRIAL_STARTER_CENTS;
  }
  if (typeof adOrId === 'object' && adOrId != null) {
    return getListingTier(adOrId) === LISTING_TIER_PREMIUM ? PREMIUM_STARTER_CENTS : TRIAL_STARTER_CENTS;
  }
  return 0;
}

/** @deprecated use getStarterGrantCentsForAd */
function getStarterGrantCentsForAdId(adId) {
  return getStarterGrantCentsForAd(adId);
}

/**
 * Resolve listing, freelancer, or account workspace for Skipper Agent.
 * Requires email-verified account.
 * @param {string} adId
 * @param {{ username: string, userId: string, emailVerified?: boolean }} user
 */
async function loadProjectAgentScope(adId, user) {
  const username = user?.username;
  const userId = user?.userId;
  const emailVerified = Boolean(user?.emailVerified);

  if (!emailVerified) {
    return {
      error: 'Verify your email to use Skipper Agent.',
      status: 403,
      code: 'EMAIL_VERIFICATION_REQUIRED'
    };
  }

  if (isFreelancerScopeAdId(adId)) {
    const dbUser = await User.findById(userId).select('username userType cv image').lean();
    if (!dbUser) {
      return { error: 'User not found.', status: 404 };
    }
    if (!userHasFreelancerAccess(dbUser.userType)) {
      return {
        error: 'Skipper Agent freelancer workspace is for freelancer accounts.',
        status: 403,
        code: 'FREELANCER_REQUIRED'
      };
    }

    const ad = {
      id: FREELANCER_SCOPE_AD_ID,
      title: `${dbUser.username} — Freelancer`,
      logo: dbUser.image || '',
      blockchain: '',
      url: '',
      pairAddress: '',
      listingTier: 'freelancer',
      isFreelancerScope: true,
      projectProfile: {}
    };

    return { ad, user: dbUser, scope: 'freelancer' };
  }

  if (isAccountScopeAdId(adId)) {
    const dbUser = await User.findById(userId).select('username image').lean();
    if (!dbUser) {
      return { error: 'User not found.', status: 404 };
    }

    const ad = {
      id: ACCOUNT_SCOPE_AD_ID,
      title: `${dbUser.username} — Workspace`,
      logo: dbUser.image || '',
      blockchain: '',
      url: '',
      pairAddress: '',
      listingTier: 'account',
      isAccountScope: true,
      projectProfile: {}
    };

    return { ad, user: dbUser, scope: 'account' };
  }

  const ad = await Ad.findOne({
    id: adId,
    owner: username,
    status: { $in: ['active', 'approved'] }
  }).lean();

  if (!ad) {
    return { error: 'Listing not found or you do not own this project.', status: 404 };
  }

  return { ad, scope: resolveAgentScopeLabel(ad) };
}

module.exports = {
  FREELANCER_SCOPE_AD_ID,
  ACCOUNT_SCOPE_AD_ID,
  TRIAL_STARTER_CENTS,
  FREELANCER_STARTER_CENTS,
  PREMIUM_STARTER_CENTS,
  isFreelancerScopeAdId,
  isAccountScopeAdId,
  userHasFreelancerAccess,
  resolveAgentScopeLabel,
  getStarterGrantCentsForAd,
  getStarterGrantCentsForAdId,
  loadProjectAgentScope
};
