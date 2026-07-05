// ============================================================================
// /api/bot — Web control panel for the Aquads Telegram Bot
// ============================================================================
// These endpoints back the /telegram-bot-panel page. Everything here is a
// direct web equivalent of a Telegram bot command so users can control the
// bot without opening Telegram. All routes require authentication; nothing
// here can be invoked anonymously.
//
// Design rules:
//   1. Reuse the same models / helpers the bot uses (User.addTelegramGroup,
//      telegramService.raidCrossPostingGroups, etc.). Never duplicate state.
//   2. When a route mutates something the bot keeps in-memory (like the opt-in
//      set), we mutate the in-memory copy AND persist via the bot's save
//      helper so the very next Telegram message reflects the change.
//   3. Return well-shaped JSON so the frontend can render without a second
//      round-trip.
// ============================================================================

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const User = require('../models/User');
const Ad = require('../models/Ad');
const TwitterRaid = require('../models/TwitterRaid');
const FacebookRaid = require('../models/FacebookRaid');
const telegramService = require('../utils/telegramService');
const {
  getListingTier,
  allowsCustomBranding,
  getFreeRaidDailyLimitForUsername,
  FREE_RAIDS_REQUIRES_LISTING_REASON,
  LISTING_TIER_PREMIUM,
} = require('../utils/listingTier');
const {
  isValidBrandingVideoUrl,
  normalizeBrandingVideoUrlCandidate,
  projectHasCustomBrandingMedia,
  BRANDING_VIDEO_MAX_MB,
} = require('../utils/brandingMedia');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Twitter/Facebook handles: strip @, allow letters/digits/underscore/dot, 1-30 chars.
// The bot itself does no strict validation (`/twitter handle` just stores whatever
// the user typed), but the web input lets us apply light hygiene without breaking
// anything already stored.
function sanitizeSocialHandle(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/^@+/, '');
  if (!s) return null;
  if (s.length > 30) return null;
  if (!/^[a-zA-Z0-9_.]+$/.test(s)) return null;
  return s;
}

// Serialize a User's telegramGroups[] plus the live opt-in flag from the bot's
// in-memory Set. Bot and API share the process, so this is always current.
function serializeGroups(user) {
  const groups = Array.isArray(user.telegramGroups) ? user.telegramGroups : [];
  const optedIn = telegramService.raidCrossPostingGroups;
  return groups
    .map((g) => ({
      groupId: g.groupId,
      groupTitle: g.groupTitle || null,
      isDefault: !!g.isDefault,
      optedInToCommunityRaids: optedIn.has(g.groupId),
      addedAt: g.addedAt || null,
      lastActiveAt: g.lastActiveAt || null,
    }))
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      const at = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bt = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      return bt - at;
    });
}

// Serialize a user's projects with everything the panel needs to render the
// branding + linked-group state. Only projects the user owns (by username).
async function loadUserProjects(username) {
  const ads = await Ad.find({
    owner: username,
    status: { $in: ['active', 'approved'] },
  })
    .select(
      '_id title logo isBumped listingTier telegramGroupId ' +
      'customBrandingImage customBrandingImageSize customBrandingVideoUrl customBrandingUploadedAt'
    )
    .sort({ isBumped: -1, updatedAt: -1 })
    .lean();

  return ads.map((a) => {
    const tier = getListingTier(a);
    const isPremium = tier === LISTING_TIER_PREMIUM;
    return {
      id: a._id.toString(),
      title: a.title || 'Untitled',
      logo: a.logo || null,
      isBumped: !!a.isBumped,
      listingTier: tier,
      isPremium,
      allowsCustomBranding: allowsCustomBranding(a),
      telegramGroupId: a.telegramGroupId || null,
      // Never send the actual base64 blob in status responses (can be hundreds of KB).
      // Frontend gets a boolean + size for display; it fetches full media only on demand.
      hasCustomBrandingImage: !!(a.customBrandingImage && a.customBrandingImage.length > 0),
      customBrandingImageSize: a.customBrandingImageSize || 0,
      customBrandingVideoUrl: a.customBrandingVideoUrl || null,
      customBrandingUploadedAt: a.customBrandingUploadedAt || null,
      hasCustomBranding: projectHasCustomBrandingMedia(a),
    };
  });
}

// Backfill legacy telegramGroupId → telegramGroups[] on first web-panel load.
// Same lazy migration the bot does, so panel users don't see an empty list.
async function backfillLegacyGroup(user) {
  const hasArray = Array.isArray(user.telegramGroups) && user.telegramGroups.length > 0;
  if (!hasArray && user.telegramGroupId) {
    user.addTelegramGroup(user.telegramGroupId, { groupTitle: null, makeDefault: true });
    await user.save();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// GET /api/bot/status
// Comprehensive snapshot the panel renders on load. Consolidates what the bot
// spreads across /help, /mygroups, /mybubble, and eligibility checks so the
// UI needs just one request.
// ---------------------------------------------------------------------------
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await backfillLegacyGroup(user);

    const dailyLimit = await getFreeRaidDailyLimitForUsername(user.username);
    const eligibility = dailyLimit > 0
      ? user.checkFreeRaidEligibility(dailyLimit)
      : { eligible: false, reason: FREE_RAIDS_REQUIRES_LISTING_REASON, raidsRemaining: 0, raidsUsedToday: 0, dailyLimit: 0 };

    const projects = await loadUserProjects(user.username);

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        image: user.image || null,
        points: user.points || 0,
      },
      telegram: {
        linked: !!user.telegramId,
        telegramId: user.telegramId || null,
      },
      discord: {
        linked: !!user.discordId,
      },
      socials: {
        twitterUsername: user.twitterUsername || null,
        facebookUsername: user.facebookUsername || null,
      },
      groups: serializeGroups(user),
      defaultGroupId: user.getDefaultTelegramGroupId(),
      freeRaids: {
        dailyLimit: eligibility.dailyLimit || dailyLimit || 0,
        raidsUsedToday: eligibility.raidsUsedToday || 0,
        raidsRemaining: eligibility.raidsRemaining || 0,
        eligible: !!eligibility.eligible,
        reason: eligibility.reason || null,
      },
      projects,
    });
  } catch (error) {
    console.error('[bot-panel] GET /status error:', error);
    res.status(500).json({ error: 'Failed to load bot status' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/groups/:groupId/default
// Promote a linked group to be the user's default (used as source chat for
// website/DM raids and X Space alerts). Equivalent to the "⭐️ Default" button
// in /mygroups.
// ---------------------------------------------------------------------------
router.post('/groups/:groupId/default', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return res.status(400).json({ error: 'Missing groupId' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = user.setDefaultTelegramGroup(groupId);
    if (!ok) {
      return res.status(404).json({ error: 'That group is not linked to your account' });
    }
    await user.save();

    res.json({
      success: true,
      defaultGroupId: user.getDefaultTelegramGroupId(),
      groups: serializeGroups(user),
    });
  } catch (error) {
    console.error('[bot-panel] POST /groups/:groupId/default error:', error);
    res.status(500).json({ error: 'Failed to set default group' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/groups/:groupId/community-raids  { enabled: boolean }
// Web equivalent of /raidin (enabled=true) / /raidout (enabled=false) for a
// specific linked group. Mutates the bot's in-memory Set + persists via the
// same save helper the bot uses, so the change is live for the very next
// Telegram raid.
// ---------------------------------------------------------------------------
router.post('/groups/:groupId/community-raids', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const enabled = !!req.body?.enabled;
    if (!groupId) return res.status(400).json({ error: 'Missing groupId' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const owned = (user.telegramGroups || []).some(g => g && g.groupId === groupId);
    if (!owned) {
      return res.status(404).json({ error: 'That group is not linked to your account' });
    }

    const set = telegramService.raidCrossPostingGroups;
    const wasIn = set.has(groupId);
    if (enabled && !wasIn) {
      set.add(groupId);
      await telegramService.saveRaidCrossPostingGroups();
    } else if (!enabled && wasIn) {
      set.delete(groupId);
      await telegramService.saveRaidCrossPostingGroups();
    }

    res.json({
      success: true,
      groupId,
      optedInToCommunityRaids: set.has(groupId),
      groups: serializeGroups(user),
    });
  } catch (error) {
    console.error('[bot-panel] POST /groups/:groupId/community-raids error:', error);
    res.status(500).json({ error: 'Failed to update community raids setting' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/bot/groups/:groupId
// Fully unlink a group from the user's account. If the group is currently in
// the community raid opt-in set, we also drop it there (so the bot doesn't
// keep firing raids into a group the user no longer wants associated).
// This does NOT touch Ad.telegramGroupId — that's the per-project binding
// managed via /linkproject / /unlinkproject in the Telegram bot.
// ---------------------------------------------------------------------------
router.delete('/groups/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return res.status(400).json({ error: 'Missing groupId' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = user.removeTelegramGroup(groupId);
    if (!ok) {
      return res.status(404).json({ error: 'That group is not linked to your account' });
    }
    await user.save();

    // Also drop from the community raid opt-in set — no point keeping a group
    // opted in if the user just said they don't want it under their account.
    if (telegramService.raidCrossPostingGroups.has(groupId)) {
      telegramService.raidCrossPostingGroups.delete(groupId);
      await telegramService.saveRaidCrossPostingGroups();
    }

    res.json({
      success: true,
      defaultGroupId: user.getDefaultTelegramGroupId(),
      groups: serializeGroups(user),
    });
  } catch (error) {
    console.error('[bot-panel] DELETE /groups/:groupId error:', error);
    res.status(500).json({ error: 'Failed to remove group' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/socials  { twitterUsername?, facebookUsername? }
// Web equivalent of /twitter and /facebook. Accepts either or both. Passing
// null / empty string clears that handle.
// ---------------------------------------------------------------------------
router.post('/socials', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const body = req.body || {};
    let changed = false;

    if (Object.prototype.hasOwnProperty.call(body, 'twitterUsername')) {
      const raw = body.twitterUsername;
      if (raw === null || raw === '') {
        user.twitterUsername = null;
        changed = true;
      } else {
        const clean = sanitizeSocialHandle(raw);
        if (!clean) return res.status(400).json({ error: 'Invalid Twitter username. Use letters, digits, underscore or dot (1-30 chars).' });
        user.twitterUsername = clean;
        changed = true;
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'facebookUsername')) {
      const raw = body.facebookUsername;
      if (raw === null || raw === '') {
        user.facebookUsername = null;
        changed = true;
      } else {
        const clean = sanitizeSocialHandle(raw);
        if (!clean) return res.status(400).json({ error: 'Invalid Facebook username. Use letters, digits, underscore or dot (1-30 chars).' });
        user.facebookUsername = clean;
        changed = true;
      }
    }

    if (changed) await user.save();

    res.json({
      success: true,
      socials: {
        twitterUsername: user.twitterUsername || null,
        facebookUsername: user.facebookUsername || null,
      },
    });
  } catch (error) {
    console.error('[bot-panel] POST /socials error:', error);
    res.status(500).json({ error: 'Failed to update socials' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/bot/branding/:adId  { imageDataUrl?, videoUrl? }
// Set custom branding on a project the user owns. Mirrors /setbranding.
//   - imageDataUrl: base64 data URL, max 500KB (matches bot's 500KB rule)
//   - videoUrl:     https:// direct link, must pass isValidBrandingVideoUrl
// Passing exactly one of the two fields sets that media type and clears the other.
// ---------------------------------------------------------------------------
router.post('/branding/:adId', auth, async (req, res) => {
  try {
    const { adId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const user = await User.findById(req.user.id).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ad = await Ad.findOne({
      _id: adId,
      owner: user.username,
      isBumped: true,
      status: { $in: ['active', 'approved'] },
    });
    if (!ad) return res.status(404).json({ error: 'Project not found or not eligible' });
    if (!allowsCustomBranding(ad)) {
      return res.status(403).json({
        error: 'Custom branding requires a bumped Premium listing. Upgrade at https://aquads.xyz/dashboard.'
      });
    }

    const { imageDataUrl, videoUrl } = req.body || {};

    if (!imageDataUrl && !videoUrl) {
      return res.status(400).json({ error: 'Provide either imageDataUrl or videoUrl' });
    }

    if (videoUrl) {
      if (!isValidBrandingVideoUrl(videoUrl)) {
        return res.status(400).json({
          error: `Invalid video URL. Use a direct https:// link (max ${BRANDING_VIDEO_MAX_MB}MB, e.g. files.catbox.moe/…mp4).`
        });
      }
      ad.customBrandingVideoUrl = normalizeBrandingVideoUrlCandidate(videoUrl);
      ad.customBrandingImage = null;
      ad.customBrandingImageSize = 0;
      ad.customBrandingUploadedAt = new Date();
    } else {
      // Validate image data URL (base64) matches the bot's 500KB rule.
      if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Image must be a base64 data URL (data:image/…)' });
      }
      const commaIdx = imageDataUrl.indexOf(',');
      if (commaIdx < 0) return res.status(400).json({ error: 'Malformed data URL' });
      const b64 = imageDataUrl.slice(commaIdx + 1);
      const approxBytes = Math.floor(b64.length * 0.75);
      if (approxBytes > 500 * 1024) {
        return res.status(400).json({
          error: 'Image too large — must be under 500KB. Try compressing at tinypng.com.'
        });
      }
      ad.customBrandingImage = imageDataUrl;
      ad.customBrandingImageSize = approxBytes;
      ad.customBrandingVideoUrl = null;
      ad.customBrandingUploadedAt = new Date();
    }

    await ad.save();

    const projects = await loadUserProjects(user.username);
    res.json({ success: true, projects, updatedProjectId: ad._id.toString() });
  } catch (error) {
    console.error('[bot-panel] POST /branding/:adId error:', error);
    res.status(500).json({ error: 'Failed to set branding' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/bot/branding/:adId
// Clear custom branding on a project. Mirrors /removebranding.
// ---------------------------------------------------------------------------
router.delete('/branding/:adId', auth, async (req, res) => {
  try {
    const { adId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const user = await User.findById(req.user.id).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ad = await Ad.findOne({
      _id: adId,
      owner: user.username,
      isBumped: true,
      status: { $in: ['active', 'approved'] },
    });
    if (!ad) return res.status(404).json({ error: 'Project not found' });

    ad.customBrandingImage = null;
    ad.customBrandingImageSize = 0;
    ad.customBrandingUploadedAt = null;
    ad.customBrandingVideoUrl = null;
    await ad.save();

    const projects = await loadUserProjects(user.username);
    res.json({ success: true, projects, updatedProjectId: ad._id.toString() });
  } catch (error) {
    console.error('[bot-panel] DELETE /branding/:adId error:', error);
    res.status(500).json({ error: 'Failed to remove branding' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bot/my-raids
// List the raids the user has created that are still active (Twitter + Facebook).
// The panel's Raids tab renders these with cancel buttons.
// ---------------------------------------------------------------------------
router.get('/my-raids', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [twitter, facebook] = await Promise.all([
      TwitterRaid.find({
        createdBy: userId,
        active: true,
        status: { $nin: ['cancelled', 'expired'] },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id tweetUrl title description points createdAt isPaid paidWithPoints pointsSpent status')
        .lean(),
      FacebookRaid.find({
        createdBy: userId,
        active: { $ne: false },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('_id postUrl title description points createdAt')
        .lean(),
    ]);

    res.json({
      twitter: twitter.map((r) => ({
        id: r._id.toString(),
        platform: 'twitter',
        url: r.tweetUrl,
        title: r.title,
        description: r.description,
        points: r.points,
        createdAt: r.createdAt,
        paidWithPoints: !!r.paidWithPoints,
        pointsSpent: r.pointsSpent || 0,
        status: r.status || 'active',
      })),
      facebook: facebook.map((r) => ({
        id: r._id.toString(),
        platform: 'facebook',
        url: r.postUrl,
        title: r.title,
        description: r.description,
        points: r.points,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('[bot-panel] GET /my-raids error:', error);
    res.status(500).json({ error: 'Failed to load your raids' });
  }
});

module.exports = router;
