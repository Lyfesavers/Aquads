const express = require('express');
const router = express.Router();
const Bounty = require('../models/Bounty');
const BountyEscrow = require('../models/BountyEscrow');
const Ad = require('../models/Ad');
const User = require('../models/User');
const auth = require('../middleware/auth');
const bountyEscrowService = require('../services/bountyEscrowService');
const { getHunterAquaPayReadiness, bountyAquaPayReadinessError } = require('../utils/bountyAquaPay');

const FEE_PERCENTAGE = 0.0125;
const MAX_BOUNTY_RESOURCES = 10;
const RESOURCE_LABEL_MAX = 80;
const RESOURCE_URL_MAX = 2048;

function normalizeHttpsUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > RESOURCE_URL_MAX) return null;
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;
  return parsed.href;
}

function parseBountyResources(raw) {
  if (raw === undefined || raw === null) return { resources: [] };
  if (!Array.isArray(raw)) return { error: 'Resources must be an array' };
  if (raw.length > MAX_BOUNTY_RESOURCES) {
    return { error: `Maximum ${MAX_BOUNTY_RESOURCES} resources allowed` };
  }

  const resources = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] || {};
    const label = (item.label || '').trim();
    const urlInput = (item.url || '').trim();
    if (!label && !urlInput) continue;
    if (!label) return { error: `Resource ${i + 1}: label is required` };
    if (label.length > RESOURCE_LABEL_MAX) return { error: `Resource ${i + 1}: label is too long` };
    const url = normalizeHttpsUrl(urlInput);
    if (!url) return { error: `Resource ${i + 1}: must be a valid https:// URL` };
    resources.push({ label, url });
  }
  return { resources };
}

function resourcesChanged(existing, next) {
  const norm = (list) => JSON.stringify((list || []).map(r => ({ label: r.label, url: r.url })));
  return norm(existing) !== norm(next);
}

function emitBounty(type, bounty, extra = {}) {
  try {
    const { emitBountyUpdate } = require('../socket');
    emitBountyUpdate(type, bounty, extra);
  } catch (err) {
    console.error('Bounty socket emit error:', err.message);
  }
}

// Fill in posterImage for lean bounty objects that don't have one stored yet
// (e.g. bounties created before the posterImage field was added). Mutates in place.
async function attachPosterImages(bounties) {
  try {
    const list = Array.isArray(bounties) ? bounties : [bounties];
    const needing = list.filter(b => b && !b.posterImage && !b.projectLogo && b.posterId);
    if (!needing.length) return;
    const User = require('../models/User');
    const posterIds = [...new Set(needing.map(b => b.posterId.toString()))];
    const users = await User.find({ _id: { $in: posterIds } }).select('image').lean();
    const imageMap = {};
    users.forEach(u => { imageMap[u._id.toString()] = u.image || null; });
    needing.forEach(b => { b.posterImage = imageMap[b.posterId.toString()] || null; });
  } catch (e) {
    console.error('attachPosterImages error:', e.message);
  }
}

// Public list of bounties. Defaults to open bounties; supports ?status= & ?category=.
router.get('/', async (req, res) => {
  try {
    const { status, category, projectAdId } = req.query;
    const filter = { hidden: { $ne: true } };

    if (status) {
      filter.status = status;
    } else {
      // Public feed shows fundable/active bounties, never unfunded drafts.
      filter.status = { $in: ['open', 'completed'] };
    }
    if (category) filter.category = category;
    if (projectAdId) filter.projectAdId = projectAdId;

    const bounties = await Bounty.find(filter)
      .select('-submissions')
      .sort({ status: 1, createdAt: -1 })
      .limit(200)
      .lean();

    // Attach a lightweight submission count without exposing submissions publicly.
    const ids = bounties.map(b => b._id);
    const counts = await Bounty.aggregate([
      { $match: { _id: { $in: ids } } },
      { $project: { count: { $size: '$submissions' } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });
    bounties.forEach(b => { b.submissionCount = countMap[b._id.toString()] || 0; });

    // Backfill poster avatar for bounties created before posterImage existed.
    await attachPosterImages(bounties);

    res.json({ success: true, bounties });
  } catch (error) {
    console.error('Error listing bounties:', error);
    res.status(500).json({ error: 'Failed to load bounties' });
  }
});

// Get the projects (ads) the current user owns — used to gate/associate bounty creation.
router.get('/my-projects', auth, async (req, res) => {
  try {
    const ads = await Ad.find({
      owner: req.user.username,
      status: { $in: ['active', 'approved'] }
    }).select('id title logo').sort({ createdAt: -1 }).lean();

    res.json({ success: true, projects: ads });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ error: 'Failed to load your projects' });
  }
});

// Bounties the current user posted (any status, includes unfunded drafts).
router.get('/mine', auth, async (req, res) => {
  try {
    const bounties = await Bounty.find({ posterId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    await attachPosterImages(bounties);
    res.json({ success: true, bounties });
  } catch (error) {
    console.error('Error fetching my bounties:', error);
    res.status(500).json({ error: 'Failed to load your bounties' });
  }
});

// Bounty detail including submissions (submissions visible to poster/admin only).
router.get('/:id', async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id).lean();
    if (!bounty || bounty.hidden) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    // Only the poster or an admin sees full submission details; others see counts.
    let viewerId = null;
    let isAdmin = false;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        viewerId = decoded._id || decoded.userId;
        isAdmin = Boolean(decoded.isAdmin);
      } catch { /* anonymous viewer */ }
    }

    const isPoster = viewerId && bounty.posterId.toString() === viewerId.toString();
    if (!isPoster && !isAdmin) {
      const mySubmission = viewerId
        ? (bounty.submissions || []).find(s => s.hunterId.toString() === viewerId.toString())
        : null;
      bounty.submissionCount = (bounty.submissions || []).length;
      bounty.mySubmission = mySubmission || null;
      delete bounty.submissions;
    }

    // Backfill poster avatar for bounties created before posterImage existed.
    await attachPosterImages(bounty);

    res.json({ success: true, bounty });
  } catch (error) {
    console.error('Error fetching bounty:', error);
    res.status(500).json({ error: 'Failed to load bounty' });
  }
});

// Create a bounty (project owners only). Also creates the escrow awaiting the poster's deposit.
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, deliverables, rules, resources, category, amount, deadline, projectAdId } = req.body;

    if (!title || !description || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Title, description and amount are required' });
    }
    const parsedResources = parseBountyResources(resources);
    if (parsedResources.error) {
      return res.status(400).json({ error: parsedResources.error });
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      return res.status(400).json({ error: 'Amount must be at least 1 USDC' });
    }

    // Gate: only owners of an active project listing may post bounties.
    const ownedAds = await Ad.find({
      owner: req.user.username,
      status: { $in: ['active', 'approved'] }
    }).select('id title logo').lean();

    if (!ownedAds.length) {
      return res.status(403).json({ error: 'Only project owners can post bounties. List a project first.' });
    }

    let project = null;
    if (projectAdId) {
      project = ownedAds.find(a => a.id === projectAdId);
      if (!project) {
        return res.status(400).json({ error: 'Selected project not found or not owned by you' });
      }
    }

    // Poster's profile image — used as the bounty avatar when no project is selected.
    let posterImage = null;
    try {
      const User = require('../models/User');
      const posterUser = await User.findById(req.user.userId).select('image').lean();
      posterImage = posterUser?.image || null;
    } catch (e) { /* non-fatal */ }

    const bounty = new Bounty({
      title: title.trim(),
      description,
      deliverables: deliverables || '',
      rules: rules || '',
      resources: parsedResources.resources,
      category: category || 'other',
      amount: amountNum,
      currency: 'USDC',
      posterId: req.user.userId,
      posterUsername: req.user.username,
      posterImage,
      projectAdId: project ? project.id : null,
      projectName: project ? project.title : null,
      projectLogo: project ? project.logo : null,
      status: 'unfunded',
      deadline: deadline ? new Date(deadline) : null
    });
    await bounty.save();

    const escrow = new BountyEscrow({
      bountyId: bounty._id,
      buyerId: req.user.userId,
      amount: amountNum,
      currency: 'USDC',
      feePercentage: FEE_PERCENTAGE,
      status: 'awaiting_deposit'
    });
    await escrow.save();

    bounty.escrowId = escrow._id;
    await bounty.save();

    res.json({ success: true, bounty, escrowId: escrow._id });
  } catch (error) {
    console.error('Error creating bounty:', error);
    res.status(500).json({ error: 'Failed to create bounty' });
  }
});

// Edit a bounty's text (title/description/deliverables/category) and extend its deadline.
// Amount/currency/chain are locked because the reward is already escrowed.
router.patch('/:id', auth, async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    if (bounty.posterId.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the poster can edit this bounty' });
    }
    if (!['open', 'unfunded'].includes(bounty.status)) {
      return res.status(400).json({ error: 'Only open bounties can be edited' });
    }

    const { title, description, deliverables, rules, resources, category, deadline } = req.body;
    let scopeChanged = false;

    if (title !== undefined && title.trim() && title.trim() !== bounty.title) {
      bounty.title = title.trim(); scopeChanged = true;
    }
    if (description !== undefined && description !== bounty.description) {
      bounty.description = description; scopeChanged = true;
    }
    if (deliverables !== undefined && deliverables !== bounty.deliverables) {
      bounty.deliverables = deliverables; scopeChanged = true;
    }
    if (rules !== undefined && rules !== bounty.rules) {
      bounty.rules = rules; scopeChanged = true;
    }
    if (resources !== undefined) {
      const parsedResources = parseBountyResources(resources);
      if (parsedResources.error) {
        return res.status(400).json({ error: parsedResources.error });
      }
      if (resourcesChanged(bounty.resources, parsedResources.resources)) {
        bounty.resources = parsedResources.resources;
        scopeChanged = true;
      }
    }
    if (category !== undefined && category !== bounty.category) {
      bounty.category = category;
    }

    // Deadline: extend only. Allow removing (→ no deadline) or moving later; reject shortening.
    if (deadline !== undefined) {
      if (deadline === null || deadline === '') {
        bounty.deadline = null; // removing a deadline is an extension
      } else {
        const newDeadline = new Date(deadline);
        if (isNaN(newDeadline.getTime())) {
          return res.status(400).json({ error: 'Invalid deadline' });
        }
        if (newDeadline < new Date()) {
          return res.status(400).json({ error: 'Deadline must be in the future' });
        }
        if (bounty.deadline && newDeadline < new Date(bounty.deadline)) {
          return res.status(400).json({ error: 'Deadline can only be extended, not shortened' });
        }
        bounty.deadline = newDeadline;
      }
    }

    // Transparency flag: scope text changed while submissions already exist.
    if (scopeChanged && bounty.submissions.length > 0) {
      bounty.editedAfterSubmissions = true;
    }
    bounty.lastEditedAt = new Date();
    await bounty.save();

    const publicBounty = bounty.toObject();
    delete publicBounty.submissions;
    publicBounty.submissionCount = bounty.submissions.length;
    emitBounty('updated', publicBounty);

    res.json({ success: true, bounty: publicBounty });
  } catch (error) {
    console.error('Error editing bounty:', error);
    res.status(500).json({ error: 'Failed to edit bounty' });
  }
});

function emitCommentUpdate(bountyId, notifyUserId) {
  try {
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      io.emit('bountyCommentUpdated', { bountyId: bountyId.toString() });
      if (notifyUserId) {
        io.to(`user_${notifyUserId}`).emit('bountyActivity', { type: 'comment', bountyId: bountyId.toString() });
      }
    }
  } catch (err) {
    console.error('Bounty comment socket emit error:', err.message);
  }
}

// List discussion comments for a bounty (public).
router.get('/:id/comments', async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id).select('comments posterId hidden').lean();
    if (!bounty || bounty.hidden) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    const posterId = bounty.posterId.toString();
    const comments = (bounty.comments || []).map(c => ({
      ...c,
      isPoster: c.authorId.toString() === posterId
    })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Error loading comments:', error);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// Add a comment or reply to a bounty (any logged-in user).
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Comment is too long' });
    }

    const bounty = await Bounty.findById(req.params.id);
    if (!bounty || bounty.hidden) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    // Discussion closes once the bounty is finalized.
    if (['completed', 'cancelled'].includes(bounty.status)) {
      return res.status(400).json({ error: 'Discussion is closed for this bounty' });
    }

    // Replies may only attach to a top-level comment (one level deep).
    if (parentId) {
      const parent = bounty.comments.id(parentId);
      if (!parent) {
        return res.status(400).json({ error: 'Parent comment not found' });
      }
      if (parent.parentId) {
        return res.status(400).json({ error: 'Cannot reply to a reply' });
      }
    }

    bounty.comments.push({
      authorId: req.user.userId,
      authorUsername: req.user.username,
      authorImage: req.user.image || null,
      text: text.trim(),
      parentId: parentId || null
    });
    await bounty.save();

    // Notify the poster of new discussion activity (unless they wrote it).
    const notifyUserId = bounty.posterId.toString() !== req.user.userId
      ? bounty.posterId.toString()
      : null;
    emitCommentUpdate(bounty._id, notifyUserId);

    const created = bounty.comments[bounty.comments.length - 1].toObject();
    created.isPoster = bounty.posterId.toString() === req.user.userId;
    res.json({ success: true, comment: created });
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Delete a comment (author, the bounty poster, or an admin). Removes its replies too.
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    const comment = bounty.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isAuthor = comment.authorId.toString() === req.user.userId;
    const isPoster = bounty.posterId.toString() === req.user.userId;
    if (!isAuthor && !isPoster && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Remove the comment and any replies attached to it.
    const idStr = comment._id.toString();
    bounty.comments = bounty.comments.filter(c =>
      c._id.toString() !== idStr && (c.parentId ? c.parentId.toString() !== idStr : true)
    );
    await bounty.save();

    emitCommentUpdate(bounty._id, null);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Submit a deliverable to an open bounty.
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { submissionUrl, description } = req.body;
    if (!submissionUrl || !submissionUrl.trim()) {
      return res.status(400).json({ error: 'A submission link is required' });
    }

    const bounty = await Bounty.findById(req.params.id);
    if (!bounty || bounty.hidden) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    if (bounty.status !== 'open') {
      return res.status(400).json({ error: 'This bounty is not accepting submissions' });
    }
    if (bounty.posterId.toString() === req.user.userId) {
      return res.status(400).json({ error: 'You cannot submit to your own bounty' });
    }
    if (bounty.deadline && new Date() > new Date(bounty.deadline)) {
      return res.status(400).json({ error: 'The deadline for this bounty has passed' });
    }
    const already = bounty.submissions.find(s => s.hunterId.toString() === req.user.userId);
    if (already) {
      return res.status(400).json({ error: 'You have already submitted to this bounty' });
    }

    const hunter = await User.findById(req.user.userId).select('aquaPay').lean();
    const aquaPayReadiness = getHunterAquaPayReadiness(hunter?.aquaPay);
    if (!aquaPayReadiness.ready) {
      return res.status(400).json({ error: bountyAquaPayReadinessError(aquaPayReadiness.missing) });
    }

    bounty.submissions.push({
      hunterId: req.user.userId,
      hunterUsername: req.user.username,
      submissionUrl: submissionUrl.trim(),
      description: description || '',
      status: 'pending'
    });
    await bounty.save();

    const publicBounty = bounty.toObject();
    delete publicBounty.submissions;
    publicBounty.submissionCount = bounty.submissions.length;
    emitBounty('submission', publicBounty, { notifyUserId: bounty.posterId.toString() });

    res.json({ success: true, message: 'Submission received' });
  } catch (error) {
    console.error('Error submitting to bounty:', error);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

// Poster approves a winning submission → releases the escrowed reward to that hunter.
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { submissionId } = req.body;
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    if (bounty.posterId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the poster can approve a winner' });
    }
    if (bounty.status !== 'open') {
      return res.status(400).json({ error: 'This bounty is not open' });
    }

    const submission = bounty.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const escrow = await BountyEscrow.findById(bounty.escrowId);
    if (!escrow || escrow.status !== 'funded') {
      return res.status(400).json({ error: 'Escrow is not funded or already resolved' });
    }

    const winner = await User.findById(submission.hunterId).select('aquaPay').lean();
    const aquaPayReadiness = getHunterAquaPayReadiness(winner?.aquaPay);
    if (!aquaPayReadiness.ready) {
      return res.status(400).json({
        error: `This hunter cannot be paid yet. ${bountyAquaPayReadinessError(aquaPayReadiness.missing)}`
      });
    }

    // Assign the winner then release on-chain.
    escrow.sellerId = submission.hunterId;
    await escrow.save();

    let result;
    try {
      result = await bountyEscrowService.releaseToWinner(escrow._id);
    } catch (releaseErr) {
      // Roll back the winner assignment so the poster can retry.
      escrow.sellerId = null;
      await escrow.save();
      return res.status(400).json({ error: releaseErr.message || 'Failed to release reward' });
    }

    submission.status = 'approved';
    bounty.status = 'completed';
    bounty.winnerId = submission.hunterId;
    bounty.winningSubmissionId = submission._id;
    bounty.completedAt = new Date();
    await bounty.save();

    const publicBounty = bounty.toObject();
    delete publicBounty.submissions;
    emitBounty('completed', publicBounty, { notifyUserId: submission.hunterId.toString() });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error approving bounty winner:', error);
    res.status(500).json({ error: 'Failed to approve winner' });
  }
});

// Poster cancels a bounty (refunds if already funded and no winner chosen).
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    if (bounty.posterId.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (['completed', 'cancelled'].includes(bounty.status)) {
      return res.status(400).json({ error: 'Bounty already finalized' });
    }

    const escrow = bounty.escrowId ? await BountyEscrow.findById(bounty.escrowId) : null;

    if (bounty.status === 'open' && escrow && escrow.status === 'funded') {
      // Refund the poster before cancelling.
      try {
        await bountyEscrowService.refundToPoster(escrow._id, req.user.userId, 'Bounty cancelled by poster');
      } catch (refundErr) {
        return res.status(400).json({ error: refundErr.message || 'Refund failed' });
      }
    } else if (escrow && ['awaiting_deposit', 'deposit_pending'].includes(escrow.status)) {
      escrow.status = 'cancelled';
      await escrow.save();
    }

    bounty.status = 'cancelled';
    await bounty.save();

    const publicBounty = bounty.toObject();
    delete publicBounty.submissions;
    emitBounty('cancelled', publicBounty);

    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling bounty:', error);
    res.status(500).json({ error: 'Failed to cancel bounty' });
  }
});

// ADMIN: list bounties for moderation.
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const bounties = await Bounty.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ success: true, bounties });
  } catch (error) {
    console.error('Error fetching admin bounties:', error);
    res.status(500).json({ error: 'Failed to load bounties' });
  }
});

// ADMIN: hide/unhide a bounty.
router.post('/admin/:id/hide', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { hidden } = req.body;
    const bounty = await Bounty.findByIdAndUpdate(
      req.params.id,
      { hidden: Boolean(hidden), updatedAt: new Date() },
      { new: true }
    ).lean();
    if (!bounty) return res.status(404).json({ error: 'Bounty not found' });

    const publicBounty = { ...bounty };
    delete publicBounty.submissions;
    emitBounty(hidden ? 'cancelled' : 'created', publicBounty);

    res.json({ success: true, bounty: publicBounty });
  } catch (error) {
    console.error('Error hiding bounty:', error);
    res.status(500).json({ error: 'Failed to update bounty' });
  }
});

module.exports = router;
