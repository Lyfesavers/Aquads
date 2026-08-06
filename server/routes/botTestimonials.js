const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BotTestimonial = require('../models/BotTestimonial');
const User = require('../models/User');
const Ad = require('../models/Ad');

const POPULATE_USER = { path: 'userId', select: 'username image' };
const POPULATE_AD = { path: 'adId', select: 'id title logo' };

function requireAdmin(req, res) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serialize(doc) {
  const t = doc.toObject ? doc.toObject() : doc;
  const user = t.userId && typeof t.userId === 'object' && t.userId.username
    ? { _id: t.userId._id, username: t.userId.username, image: t.userId.image || null }
    : null;
  const project = t.adId && typeof t.adId === 'object' && t.adId.title
    ? { _id: t.adId._id, id: t.adId.id, title: t.adId.title, logo: t.adId.logo || null }
    : null;

  return {
    _id: t._id,
    quote: t.quote,
    displayName: t.displayName || null,
    role: t.role || null,
    published: Boolean(t.published),
    sortOrder: t.sortOrder || 0,
    user,
    project,
    userId: user?._id || (t.userId && t.userId._id ? t.userId._id : t.userId) || null,
    adId: project?._id || (t.adId && t.adId._id ? t.adId._id : t.adId) || null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

async function resolveAdId(adId, projectQuery) {
  if (adId && mongooseIsObjectId(adId)) {
    const byOid = await Ad.findById(adId).select('_id').lean();
    if (byOid) return byOid._id;
  }
  if (adId) {
    const byPublicId = await Ad.findOne({ id: String(adId).trim() }).select('_id').lean();
    if (byPublicId) return byPublicId._id;
  }
  if (projectQuery) {
    const q = String(projectQuery).trim();
    const found = await Ad.findOne({
      $or: [
        { id: q },
        { title: { $regex: new RegExp(`^${escapeRegex(q)}$`, 'i') } },
      ],
    })
      .select('_id')
      .lean();
    if (found) return found._id;
  }
  return null;
}

function mongooseIsObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(String(v || ''));
}

async function resolveUserId(userId, username) {
  if (userId && mongooseIsObjectId(userId)) {
    const byOid = await User.findById(userId).select('_id').lean();
    if (byOid) return byOid._id;
  }
  if (username) {
    const u = await User.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(String(username).trim())}$`, 'i') },
    })
      .select('_id')
      .lean();
    if (u) return u._id;
  }
  return null;
}

function validateAttribution({ userId, adId, displayName }) {
  if (!userId && !adId && !(displayName && String(displayName).trim())) {
    return 'Select a user, a project, or provide a display name';
  }
  return null;
}

/** Public: published testimonials only */
router.get('/', async (req, res) => {
  try {
    const list = await BotTestimonial.find({ published: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(24)
      .populate(POPULATE_USER)
      .populate(POPULATE_AD)
      .lean();
    res.json(list.map(serialize));
  } catch (error) {
    console.error('Error fetching bot testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

/** Admin: all testimonials */
router.get('/admin', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const list = await BotTestimonial.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(100)
      .populate(POPULATE_USER)
      .populate(POPULATE_AD)
      .lean();
    res.json(list.map(serialize));
  } catch (error) {
    console.error('Error fetching admin bot testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

/** Admin: username typeahead */
router.get('/lookup/users', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.json([]);
    const users = await User.find({ username: { $regex: escapeRegex(q), $options: 'i' } })
      .select('username image')
      .limit(10)
      .lean();
    res.json(
      users.map((u) => ({
        _id: u._id,
        username: u.username,
        image: u.image || null,
      }))
    );
  } catch (error) {
    console.error('Bot testimonial user lookup error:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

/** Admin: project typeahead */
router.get('/lookup/projects', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.json([]);
    const filter = {
      status: { $in: ['active', 'approved'] },
      $or: [
        { title: { $regex: escapeRegex(q), $options: 'i' } },
        { id: { $regex: escapeRegex(q), $options: 'i' } },
        { owner: { $regex: escapeRegex(q), $options: 'i' } },
      ],
    };
    const ads = await Ad.find(filter).select('id title logo owner').limit(10).lean();
    res.json(
      ads.map((a) => ({
        _id: a._id,
        id: a.id,
        title: a.title,
        logo: a.logo || null,
        owner: a.owner || null,
      }))
    );
  } catch (error) {
    console.error('Bot testimonial project lookup error:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const quote = String(req.body.quote || '').trim();
    if (!quote) return res.status(400).json({ error: 'Quote is required' });
    if (quote.length > 500) return res.status(400).json({ error: 'Quote must be 500 characters or less' });

    const resolvedUserId = await resolveUserId(req.body.userId, req.body.username);
    const resolvedAdId = await resolveAdId(req.body.adId, req.body.projectQuery);
    const displayName = req.body.displayName ? String(req.body.displayName).trim().slice(0, 80) : null;
    const role = req.body.role ? String(req.body.role).trim().slice(0, 80) : null;

    const attrErr = validateAttribution({
      userId: resolvedUserId,
      adId: resolvedAdId,
      displayName,
    });
    if (attrErr) return res.status(400).json({ error: attrErr });

    const doc = await BotTestimonial.create({
      quote,
      userId: resolvedUserId,
      adId: resolvedAdId,
      displayName,
      role,
      published: req.body.published !== false,
      sortOrder: Number.isFinite(Number(req.body.sortOrder)) ? Number(req.body.sortOrder) : 0,
      createdBy: req.user.userId,
    });

    await doc.populate([POPULATE_USER, POPULATE_AD]);
    res.status(201).json(serialize(doc));
  } catch (error) {
    console.error('Error creating bot testimonial:', error);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    if (!mongooseIsObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const doc = await BotTestimonial.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Testimonial not found' });

    if (req.body.quote !== undefined) {
      const quote = String(req.body.quote || '').trim();
      if (!quote) return res.status(400).json({ error: 'Quote is required' });
      if (quote.length > 500) return res.status(400).json({ error: 'Quote must be 500 characters or less' });
      doc.quote = quote;
    }

    if (req.body.clearUser === true) {
      doc.userId = null;
    } else if (req.body.userId !== undefined || req.body.username !== undefined) {
      doc.userId = await resolveUserId(req.body.userId, req.body.username);
    }

    if (req.body.clearProject === true) {
      doc.adId = null;
    } else if (req.body.adId !== undefined || req.body.projectQuery !== undefined) {
      doc.adId = await resolveAdId(req.body.adId, req.body.projectQuery);
    }

    if (req.body.displayName !== undefined) {
      doc.displayName = req.body.displayName
        ? String(req.body.displayName).trim().slice(0, 80)
        : null;
    }
    if (req.body.role !== undefined) {
      doc.role = req.body.role ? String(req.body.role).trim().slice(0, 80) : null;
    }
    if (req.body.published !== undefined) {
      doc.published = Boolean(req.body.published);
    }
    if (req.body.sortOrder !== undefined && Number.isFinite(Number(req.body.sortOrder))) {
      doc.sortOrder = Number(req.body.sortOrder);
    }

    const attrErr = validateAttribution({
      userId: doc.userId,
      adId: doc.adId,
      displayName: doc.displayName,
    });
    if (attrErr) return res.status(400).json({ error: attrErr });

    await doc.save();
    await doc.populate([POPULATE_USER, POPULATE_AD]);
    res.json(serialize(doc));
  } catch (error) {
    console.error('Error updating bot testimonial:', error);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    if (!mongooseIsObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const deleted = await BotTestimonial.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ error: 'Testimonial not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot testimonial:', error);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

module.exports = router;
