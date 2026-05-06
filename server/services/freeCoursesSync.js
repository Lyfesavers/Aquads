const Parser = require('rss-parser');
const FreeCourse = require('../models/FreeCourse');

// Curated RSS feeds for the "Free Online Courses" tab on /learn.
// Each feed is buckets a high-level "feed" group; finer sub-categories are derived from the title.
const FEEDS = [
  {
    feed: 'technology',
    label: 'Technology & Programming',
    url: 'https://rss.app/feeds/xZl2tEKZjmJCDVtW.xml',
  },
  {
    feed: 'business',
    label: 'Business & Marketing',
    url: 'https://rss.app/feeds/8QEP43MOqJ0G3YvT.xml',
  },
];

const parser = new Parser({
  timeout: 45000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Aquads/1.0; +https://www.aquads.xyz)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(str, max = 1500) {
  if (!str) return '';
  const t = str.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function buildExternalKey(feed, item) {
  const id = (item.guid || item.id || item.link || '').toString().trim();
  return `${feed}:${id}`.slice(0, 1200);
}

function firstImgSrcFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
}

function mediaUrlFromNode(node) {
  if (!node) return null;
  if (typeof node === 'string') return /^https?:\/\//i.test(node) ? node : null;
  if (node.$ && node.$.url) return node.$.url;
  if (node.url) return node.url;
  return null;
}

function pickImageUrl(item) {
  const mc = item.mediaContent;
  if (mc) {
    if (Array.isArray(mc)) {
      for (const n of mc) {
        const u = mediaUrlFromNode(n);
        if (u) return u;
      }
    } else {
      const u = mediaUrlFromNode(mc);
      if (u) return u;
    }
  }
  const mt = item.mediaThumbnail;
  if (mt) {
    if (Array.isArray(mt)) {
      for (const n of mt) {
        const u = mediaUrlFromNode(n);
        if (u) return u;
      }
    } else {
      const u = mediaUrlFromNode(mt);
      if (u) return u;
    }
  }
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  const htmlBlob = [item.content, item['content:encoded'], item.summary, item.contentSnippet]
    .filter(Boolean)
    .join('\n');
  return firstImgSrcFromHtml(htmlBlob);
}

function itemPublishedAt(item) {
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (item.isoDate) {
    const d = new Date(item.isoDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Keyword-based topical classifier. The RSS feeds don't expose categories per item,
// so we infer one from the course title. Order matters — first match wins.
const CATEGORY_RULES = [
  { category: 'AI & Data Science', keywords: ['ai essentials', 'artificial intelligence', 'machine learning', 'tensorflow', 'data science', 'computational thinking', 'neural'] },
  { category: 'Cybersecurity', keywords: ['cyber security', 'cybersecurity', 'systems security', 'security', 'ethical hacking'] },
  { category: 'Mobile Development', keywords: ['android', 'ios ', 'react native', 'flutter', 'kotlin', 'swift'] },
  { category: 'Web Development', keywords: ['html', 'css', 'web development', 'web dev', 'frontend', 'front-end', 'full-stack', 'full stack', 'laravel', 'django'] },
  { category: 'Programming', keywords: ['python', 'java', 'javascript', ' c ', 'c for beginners', 'c++', 'c#', 'php', 'ruby', 'rust', 'go ', 'golang', 'programming', 'software testing', 'software development', 'apis', 'api '] },
  { category: 'Databases', keywords: ['mysql', 'sql', 'mongodb', 'postgres', 'database'] },
  { category: 'Productivity & Tools', keywords: ['excel', 'word ', 'powerpoint', 'office', 'spreadsheet', 'notion'] },
  { category: 'SEO', keywords: ['seo'] },
  { category: 'Paid Ads', keywords: ['google ads', 'facebook ads', 'tiktok ads', 'instagram ads', 'youtube ads', 'meta ads', 'ad campaign'] },
  { category: 'Email Marketing', keywords: ['email marketing', 'email campaign', 'mailchimp'] },
  { category: 'Content & Copywriting', keywords: ['copywriting', 'content writing', 'writing skills', 'storytelling'] },
  { category: 'Influencer & Social', keywords: ['influencer', 'social media marketing', 'instagram marketing'] },
  { category: 'Digital Marketing', keywords: ['digital marketing', 'marketing basics', 'app marketing', 'strategic marketing', 'fundamentals of digital'] },
  { category: 'Finance & Investing', keywords: ['accounting', 'finance', 'investing', 'investment', 'corporate finance', 'managerial accounting', 'financial accounting'] },
  { category: 'Entrepreneurship', keywords: ['entrepreneur', 'entrepreneurship', 'startup'] },
  { category: 'Management & HR', keywords: ['human resource', 'hr ', 'management', 'leadership', 'purchasing'] },
];

function classifyCategory(title, feed) {
  const t = ` ${(title || '').toLowerCase()} `;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => t.includes(kw))) {
      return rule.category;
    }
  }
  return feed === 'technology' ? 'Technology' : 'Business';
}

function slugifyTitle(title) {
  return (title || 'course')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// Stable, deterministic short hash — keeps slug uniqueness across re-syncs without
// pulling in a crypto dep we don't need. (8 hex chars from FNV-1a)
function shortHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 8);
}

function buildSlug(title, externalKey) {
  const base = slugifyTitle(title);
  return `${base}-${shortHash(externalKey)}`;
}

function cleanDescription(item) {
  // Cursa.app feed wraps its description in HTML containing the thumbnail <img> + a
  // wrapping <div> with the actual blurb. Strip HTML and squash whitespace.
  const raw = item.contentSnippet || stripHtml(item.content || item['content:encoded'] || item.summary || '');
  return truncate(raw, 1500);
}

async function ingestFeed({ feed, url }) {
  const parsed = await parser.parseURL(url);

  let added = 0;
  let updated = 0;
  let skipped = 0;

  const items = parsed.items || [];
  for (const item of items) {
    try {
      const link = (item.link || '').trim();
      if (!link) {
        skipped += 1;
        continue;
      }

      const title = stripHtml(item.title || '').trim() || 'Free course';
      const description = cleanDescription(item);
      const imageUrl = pickImageUrl(item);
      const publishedAt = itemPublishedAt(item);
      const externalKey = buildExternalKey(feed, item);
      const category = classifyCategory(title, feed);

      const $set = {
        feed,
        category,
        externalKey,
        link,
        title: title.slice(0, 500),
        description,
        publishedAt,
        lastSyncedAt: new Date(),
      };
      if (imageUrl) $set.imageUrl = imageUrl;
      if (item.creator) $set.creator = String(item.creator).slice(0, 200);
      if (item.guid) $set.guid = String(item.guid).slice(0, 500);

      const before = await FreeCourse.findOne({ externalKey }).select('_id slug').lean();
      // Slug is generated once per externalKey; never rotate it (would break shared links).
      const slug = before?.slug || buildSlug(title, externalKey);
      $set.slug = slug;

      const updateOps = { $set };
      if (!imageUrl) {
        updateOps.$unset = { imageUrl: '' };
      }

      await FreeCourse.updateOne({ externalKey }, updateOps, { upsert: true });

      if (before) updated += 1;
      else added += 1;
    } catch (err) {
      console.error(`[FreeCourses Sync] Item error (${feed}):`, err.message);
      skipped += 1;
    }
  }

  return { added, updated, skipped, feedItemCount: items.length };
}

async function syncFreeCourses() {
  const start = new Date();
  console.log(`[FreeCourses Sync] Starting at ${start.toISOString()}`);

  const results = {};
  for (const feed of FEEDS) {
    try {
      results[feed.feed] = await ingestFeed(feed);
      console.log(`[FreeCourses Sync] ${feed.label}:`, results[feed.feed]);
    } catch (err) {
      console.error(`[FreeCourses Sync] ${feed.label} feed failed:`, err.message);
      results[feed.feed] = { error: err.message };
    }
  }

  return {
    results,
    finishedAt: new Date(),
  };
}

module.exports = {
  syncFreeCourses,
  FEEDS,
};
