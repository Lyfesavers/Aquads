const express = require('express');
const router = express.Router();
const MarketNewsItem = require('../models/MarketNewsItem');
const { RETENTION_DAYS } = require('../services/marketNewsSync');

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const query = { publishedAt: { $gte: cutoff } };

    const [items, total] = await Promise.all([
      MarketNewsItem.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('source title link summary publishedAt imageUrl _id')
        .lean(),
      MarketNewsItem.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
        hasMore: skip + items.length < total,
      },
      retentionDays: RETENTION_DAYS,
    });
  } catch (err) {
    console.error('[marketNews] GET /', err);
    res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

module.exports = router;
