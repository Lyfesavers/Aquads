/**
 * Username rename cascade.
 *
 * Historically, several collections store a user's identity as a username STRING
 * instead of (or alongside) an ObjectId reference to User. When a user renames
 * their account, those records would otherwise be orphaned under the old name —
 * which surfaced as e.g. the Telegram bot reporting "not enough points" because
 * `Ad.find({ owner: <newUsername> })` returned no listings, so the free-raid
 * quota lookup in utils/listingTier.js fell through to the points-based path.
 *
 * This helper propagates a username change to every collection where the
 * username is used either:
 *   (a) as the SOLE ownership/identity key — these are functional-impact fields
 *       that MUST be kept in sync, or
 *   (b) as a denormalized cached username paired with an ObjectId — these are
 *       display-impact fields we still want consistent so the user's old name
 *       doesn't keep appearing on their reviews, blogs, comments, etc.
 *
 * Intentionally NOT touched:
 *   • Notification.emailTrigger.bookingDetails.{buyer,seller}Username — these
 *     are point-in-time snapshots of an outgoing email payload.
 *   • TwitterRaid.completions[].twitterUsername /
 *     FacebookRaid.completions[].facebookUsername — those are the user's
 *     external social handles, not Aquads usernames.
 *   • Anything inside the User document itself — caller updates that directly.
 */

const Ad = require('../models/Ad');
const VoteBoost = require('../models/VoteBoost');
const BumpRequest = require('../models/BumpRequest');
const AddonOrder = require('../models/AddonOrder');
const DiscountCode = require('../models/DiscountCode');
const Job = require('../models/Job');
const Blog = require('../models/Blog');
const Review = require('../models/Review');
const ServiceReview = require('../models/ServiceReview');
const GameComment = require('../models/GameComment');
const HyperSpaceOrder = require('../models/HyperSpaceOrder');
const ProjectAgentTopup = require('../models/ProjectAgentTopup');
const ClickTracking = require('../models/ClickTracking');
const HorseRaceResult = require('../models/HorseRaceResult');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const SolitaireGame = require('../models/SolitaireGame');
const LinkInBioBannerAd = require('../models/LinkInBioBannerAd');

/**
 * Each entry: { label, model, field }. We rewrite `field` from oldUsername to
 * newUsername wherever it currently equals oldUsername.
 *
 * Splitting "critical" (functional) from "denormalized" (display) only for the
 * benefit of the log summary — both groups are updated the same way.
 */
const CRITICAL_TARGETS = [
  { label: 'Ad.owner',               model: Ad,            field: 'owner' },
  { label: 'VoteBoost.owner',        model: VoteBoost,     field: 'owner' },
  { label: 'BumpRequest.owner',      model: BumpRequest,   field: 'owner' },
  { label: 'AddonOrder.owner',       model: AddonOrder,    field: 'owner' },
  { label: 'DiscountCode.createdBy', model: DiscountCode,  field: 'createdBy' }
];

const DENORMALIZED_TARGETS = [
  { label: 'Job.ownerUsername',                model: Job,               field: 'ownerUsername' },
  { label: 'Blog.authorUsername',              model: Blog,              field: 'authorUsername' },
  { label: 'Review.username',                  model: Review,            field: 'username' },
  { label: 'ServiceReview.username',           model: ServiceReview,     field: 'username' },
  { label: 'GameComment.username',             model: GameComment,       field: 'username' },
  { label: 'HyperSpaceOrder.username',         model: HyperSpaceOrder,   field: 'username' },
  { label: 'ProjectAgentTopup.username',       model: ProjectAgentTopup, field: 'username' },
  { label: 'ClickTracking.username',           model: ClickTracking,     field: 'username' },
  { label: 'HorseRaceResult.username',         model: HorseRaceResult,   field: 'username' },
  { label: 'LeaderboardEntry.username',        model: LeaderboardEntry,  field: 'username' },
  { label: 'SolitaireGame.username',           model: SolitaireGame,     field: 'username' },
  { label: 'LinkInBioBannerAd.targetUsername', model: LinkInBioBannerAd, field: 'targetUsername' }
];

/**
 * Rewrite all collections where `field === oldUsername` to `newUsername`.
 *
 * Designed to be called AFTER the User document has been saved with the new
 * username. Failure to update a single collection is logged but does not throw
 * — the rename has already succeeded on the User row, and this routine is
 * safely re-runnable (idempotent: no records will match oldUsername the second
 * time around).
 *
 * @param {string} oldUsername
 * @param {string} newUsername
 * @returns {Promise<{ totalUpdated: number, perCollection: Array<{ label: string, matched: number, modified: number, error?: string }> }>}
 */
async function cascadeUsernameRename(oldUsername, newUsername) {
  if (!oldUsername || !newUsername || oldUsername === newUsername) {
    return { totalUpdated: 0, perCollection: [] };
  }

  const targets = [...CRITICAL_TARGETS, ...DENORMALIZED_TARGETS];

  const results = await Promise.all(
    targets.map(async ({ label, model, field }) => {
      try {
        const res = await model.updateMany(
          { [field]: oldUsername },
          { $set: { [field]: newUsername } }
        );
        return {
          label,
          matched: res.matchedCount ?? res.n ?? 0,
          modified: res.modifiedCount ?? res.nModified ?? 0
        };
      } catch (err) {
        // Don't let one collection failing block the others.
        console.error(`[usernameRenameCascade] Failed updating ${label}:`, err);
        return { label, matched: 0, modified: 0, error: err.message };
      }
    })
  );

  const totalUpdated = results.reduce((sum, r) => sum + (r.modified || 0), 0);

  if (totalUpdated > 0 || results.some((r) => r.error)) {
    console.log(
      `[usernameRenameCascade] "${oldUsername}" → "${newUsername}":`,
      results
        .filter((r) => r.modified > 0 || r.error)
        .map((r) =>
          r.error
            ? `${r.label} ERROR (${r.error})`
            : `${r.label} ${r.modified}`
        )
        .join(', ')
    );
  }

  return { totalUpdated, perCollection: results };
}

module.exports = {
  cascadeUsernameRename
};
