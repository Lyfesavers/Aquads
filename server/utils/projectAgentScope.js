const Ad = require('../models/Ad');
const User = require('../models/User');
const { isPremiumListing } = require('./projectAgentContext');

/** Reserved wallet/thread scope id (not a bubble listing). */
const FREELANCER_SCOPE_AD_ID = 'freelancer';

const FREELANCER_STARTER_CENTS = Number(process.env.PROJECT_AGENT_FREELANCER_STARTER_CENTS) || 100;

function isFreelancerScopeAdId(adId) {
  return String(adId) === FREELANCER_SCOPE_AD_ID;
}

function userHasFreelancerAccess(userType) {
  return userType === 'freelancer' || userType === 'both';
}

function getStarterGrantCentsForAdId(adId) {
  return isFreelancerScopeAdId(adId)
    ? FREELANCER_STARTER_CENTS
    : Number(process.env.PROJECT_AGENT_STARTER_CENTS) || 500;
}

/**
 * Resolve Premium listing or freelancer trial workspace.
 * @param {string} adId
 * @param {string} username
 * @param {import('mongoose').Types.ObjectId|string} userId
 */
async function loadProjectAgentScope(adId, username, userId) {
  if (isFreelancerScopeAdId(adId)) {
    const user = await User.findById(userId).select('username userType cv image').lean();
    if (!user) {
      return { error: 'User not found.', status: 404 };
    }
    if (!userHasFreelancerAccess(user.userType)) {
      return {
        error: 'Skipper Agent freelancer trial is for freelancer accounts.',
        status: 403,
        code: 'FREELANCER_REQUIRED'
      };
    }

    const ad = {
      id: FREELANCER_SCOPE_AD_ID,
      title: `${user.username} — Freelancer`,
      logo: user.image || '',
      blockchain: '',
      url: '',
      pairAddress: '',
      listingTier: 'freelancer',
      isFreelancerScope: true,
      projectProfile: {}
    };

    return { ad, user, scope: 'freelancer' };
  }

  const ad = await Ad.findOne({
    id: adId,
    owner: username,
    status: { $in: ['active', 'approved'] }
  }).lean();

  if (!ad) {
    return { error: 'Listing not found or you do not own this project.', status: 404 };
  }
  if (!isPremiumListing(ad)) {
    return {
      error: 'Skipper Agent is included with Premium listings. Upgrade this project to Premium to unlock.',
      status: 403,
      code: 'PREMIUM_REQUIRED'
    };
  }
  return { ad, scope: 'premium' };
}

module.exports = {
  FREELANCER_SCOPE_AD_ID,
  FREELANCER_STARTER_CENTS,
  isFreelancerScopeAdId,
  userHasFreelancerAccess,
  getStarterGrantCentsForAdId,
  loadProjectAgentScope
};
