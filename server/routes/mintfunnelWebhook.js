const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Blog = require('../models/Blog');
const User = require('../models/User');
const { blogPublicUrl, SITE_ORIGIN } = require('../utils/blogSlug');

const DEFAULT_BANNER = `${SITE_ORIGIN}/metalogo.png`;

const getSigningSecret = () => (process.env.MINTFUNNEL_SECRET || '').trim();

const isHttpsUrl = (value) =>
  typeof value === 'string' && /^https:\/\/[^\s<>"']+$/i.test(value.trim());

const pickBannerImage = (url) => {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return DEFAULT_BANNER;
  if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(value)) return value;
  if (/^https?:\/\/[^/]+\/api\/blogs\/media\/[a-fA-F0-9]{24}(\?.*)?$/i.test(value)) return value;
  if (isHttpsUrl(value)) return value;
  return DEFAULT_BANNER;
};

const loadPublisherAuthor = async () => {
  const configuredId = (process.env.MINTFUNNEL_AUTHOR_USER_ID || '').trim();
  if (configuredId && mongoose.Types.ObjectId.isValid(configuredId)) {
    const configured = await User.findById(configuredId);
    if (configured) return configured;
  }

  const admin = await User.findOne({ isAdmin: true }).sort({ createdAt: 1 });
  if (!admin) {
    throw new Error('No admin user available to attribute Mintfunnel posts');
  }
  return admin;
};

const findExistingBlog = async (order) => {
  const externalId = order.external_post_id && String(order.external_post_id).trim();
  if (externalId && mongoose.Types.ObjectId.isValid(externalId)) {
    const byId = await Blog.findById(externalId);
    if (byId) return byId;
  }

  const orderId = Number(order.order_id);
  if (Number.isFinite(orderId)) {
    const byOrder = await Blog.findOne({ mintfunnelOrderId: orderId });
    if (byOrder) return byOrder;
  }

  return null;
};

const applyPayloadToBlog = (blog, order, author) => {
  blog.title = String(order.title || '').trim();
  blog.content = String(order.content || '').trim();
  blog.bannerImage = pickBannerImage(order.featured_image_url);
  blog.isPressRelease = true;
  blog.author = author._id;
  blog.authorUsername = (order.company_name && String(order.company_name).trim()) || author.username;
  blog.authorImage = author.image;
  const orderId = Number(order.order_id);
  if (Number.isFinite(orderId)) {
    blog.mintfunnelOrderId = orderId;
  }
  if (order.order_number) {
    blog.mintfunnelOrderNumber = String(order.order_number);
  }
};

const publishResponse = (blog) => ({
  id: String(blog._id),
  url: blogPublicUrl(blog)
});

const upsertPressRelease = async (order) => {
  const title = String(order.title || '').trim();
  const content = String(order.content || '').trim();
  if (!title || !content) {
    const err = new Error('title and content are required');
    err.status = 400;
    throw err;
  }

  const author = await loadPublisherAuthor();
  let blog = await findExistingBlog(order);
  if (!blog) blog = new Blog();

  applyPayloadToBlog(blog, order, author);
  await blog.save();

  try {
    const { invalidateBlogsCache } = require('./blogs');
    invalidateBlogsCache();
  } catch (cacheErr) {
    console.warn('[Mintfunnel] cache invalidation skipped:', cacheErr.message);
  }

  return blog;
};

// Browser check so the URL can be confirmed before Mintfunnel's test ping.
router.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'mintfunnel',
    configured: Boolean(getSigningSecret())
  });
});

// Raw body is required for signature verification. This router is mounted
// BEFORE express.json() so req.body stays a Buffer on POST.
router.post('/', express.raw({ type: 'application/json', limit: '5mb' }), async (req, res) => {
  try {
    const secret = getSigningSecret();
    if (!secret) {
      return res.status(503).send('Mintfunnel webhook is not configured');
    }

    const signature = (req.header('x-mintfunnel-signature') || '').replace(/^sha256=/, '');
    const version = req.header('x-mintfunnel-payload-version');
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).send('Invalid signature');
    }

    // Reject unknown major versions instead of guessing the schema.
    if (version && String(version).split('.')[0] !== '1') {
      return res.status(400).send('Unsupported payload version: ' + version);
    }

    const order = JSON.parse(req.body.toString('utf8'));

    switch (order.event) {
      case 'pr.test_ping':
        return res.json({ ok: true, event: order.event });

      case 'pr.publish':
      case 'pr.update': {
        const blog = await upsertPressRelease(order);
        return res.json(publishResponse(blog));
      }

      default:
        return res.json({ ok: true, ignored: order.event });
    }
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).send(error.message);
    }
    console.error('[Mintfunnel] webhook failed:', error);
    return res.status(500).json({ error: 'Failed to publish press release' });
  }
});

module.exports = router;
