const express = require('express');
const router = express.Router();
const FreeCourse = require('../models/FreeCourse');

const VALID_FEEDS = ['technology', 'business', 'languages'];

// GET /api/free-courses
//   Query: ?feed=technology|business|all (default all)
//          ?category=<exact match>|all (default all)
//          ?search=<title contains>
//          ?page=<n> (default 1)
//          ?limit=<n> (default 24, max 100)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const skip = (page - 1) * limit;

    const query = {};

    const rawFeed = (req.query.feed || 'all').toString().toLowerCase();
    if (VALID_FEEDS.includes(rawFeed)) {
      query.feed = rawFeed;
    }

    const rawCategory = (req.query.category || 'all').toString();
    if (rawCategory && rawCategory.toLowerCase() !== 'all') {
      query.category = rawCategory;
    }

    const search = (req.query.search || '').toString().trim();
    if (search) {
      // Escape regex metacharacters from user input
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: safe, $options: 'i' };
    }

    const [items, total, categoriesAgg] = await Promise.all([
      FreeCourse.find(query)
        .sort({ publishedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .select('feed category title description link imageUrl creator slug publishedAt _id')
        .lean(),
      FreeCourse.countDocuments(query),
      // Always return the FULL category list (ignoring filters) so the filter chips
      // are stable as the user toggles between them.
      FreeCourse.aggregate([
        { $group: { _id: { feed: '$feed', category: '$category' }, count: { $sum: 1 } } },
        { $sort: { '_id.category': 1 } },
      ]),
    ]);

    const categories = categoriesAgg.map((c) => ({
      feed: c._id.feed,
      category: c._id.category,
      count: c.count,
    }));

    res.json({
      items,
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
        hasMore: skip + items.length < total,
      },
    });
  } catch (err) {
    console.error('[freeCourses] GET /', err);
    res.status(500).json({ error: 'Failed to fetch free courses' });
  }
});

// GET /api/free-courses/:slug — single course detail (powers the dedicated page).
router.get('/:slug', async (req, res) => {
  try {
    const slug = (req.params.slug || '').toString().toLowerCase();
    if (!slug) {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const course = await FreeCourse.findOne({ slug })
      .select('feed category title description link imageUrl creator slug publishedAt _id')
      .lean();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Pull a few related courses from the same category for the bottom of the detail page.
    const related = await FreeCourse.find({
      category: course.category,
      _id: { $ne: course._id },
    })
      .sort({ publishedAt: -1 })
      .limit(6)
      .select('feed category title link imageUrl slug publishedAt _id')
      .lean();

    res.json({ course, related });
  } catch (err) {
    console.error('[freeCourses] GET /:slug', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

module.exports = router;
