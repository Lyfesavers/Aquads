const Parser = require('rss-parser');
const MarketNewsItem = require('../models/MarketNewsItem');

const COINDESK_RSS_URL = 'https://www.coindesk.com/arc/outboundfeeds/rss';
// BBC News (world) — widely trusted; thumbnails often in description HTML or media fields
const GLOBAL_RSS_URL = 'https://feeds.bbci.co.uk/news/world/rss.xml';

/** Only keep stories newer than this (rolling window). News moves fast; 72h keeps the list fresh. */
const RETENTION_HOURS = 72;

function getPublishedAtCutoff() {
  return new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
}

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

function truncate(str, max = 400) {
  if (!str) return '';
  const t = str.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function buildExternalKey(source, item) {
  const id = (item.guid || item.id || item.link || '').toString().trim();
  return `${source}:${id}`.slice(0, 1200);
}

function firstImgSrcFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  let m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m) return m[1].trim();
  m = html.match(/\ssrc=(https?:\/\/[^\s>]+)/i);
  return m ? m[1].trim() : null;
}

function mediaUrlFromNode(node) {
  if (!node) return null;
  if (typeof node === 'string') return /^https?:\/\//i.test(node) ? node : null;
  if (node.$ && node.$.url) return node.$.url;
  if (node.url) return node.url;
  return null;
}

function collectMediaThumbnailNodes(item) {
  const raw = item.mediaThumbnail ?? item['media:thumbnail'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function pickRawImageUrl(item) {
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
  for (const tn of collectMediaThumbnailNodes(item)) {
    const u = mediaUrlFromNode(tn);
    if (u) return u;
  }
  if (item.enclosure && item.enclosure.url && /^image\//i.test(item.enclosure.type || '')) {
    return item.enclosure.url;
  }
  const htmlBlob = [item.content, item['content:encoded'], item.summary, item.contentSnippet]
    .filter(Boolean)
    .join('\n');
  const fromContent = firstImgSrcFromHtml(htmlBlob);
  if (fromContent) return fromContent;
  return null;
}

function refineImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return null;
  try {
    // BBC ichef: older feeds use /news/{w}/…; newer use /ace/standard/{w}/…
    if (trimmed.includes('ichef.bbci.co.uk')) {
      let u = trimmed;
      u = u.replace(/\/news\/(\d{2,4})\//gi, (match, w) => {
        const n = parseInt(w, 10);
        if (n > 0 && n < 800) return '/news/976/';
        return match;
      });
      u = u.replace(/\/ace\/standard\/(\d{2,4})\//gi, (match, w) => {
        const n = parseInt(w, 10);
        if (n > 0 && n < 800) return '/ace/standard/976/';
        return match;
      });
      return u.slice(0, 2000);
    }
  } catch {
    return trimmed.slice(0, 2000);
  }
  return trimmed.slice(0, 2000);
}

function extractItemImageUrl(item) {
  return refineImageUrl(pickRawImageUrl(item));
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
  return null;
}

async function ingestFeed(url, source) {
  const feed = await parser.parseURL(url);
  const cutoff = getPublishedAtCutoff();

  let added = 0;
  let updated = 0;
  let skipped = 0;

  const items = feed.items || [];
  for (const item of items) {
    try {
      const publishedAt = itemPublishedAt(item);
      if (!publishedAt) {
        skipped += 1;
        continue;
      }
      if (publishedAt < cutoff) {
        continue;
      }

      const link = (item.link || '').trim();
      if (!link) {
        skipped += 1;
        continue;
      }

      const title = stripHtml(item.title || '').trim() || 'Untitled';
      const rawSummary =
        item.contentSnippet || item.summary || stripHtml(item.content || item['content:encoded'] || '');
      const summary = truncate(rawSummary, 400);
      const externalKey = buildExternalKey(source, item);
      const imageUrl = extractItemImageUrl(item);

      const before = await MarketNewsItem.findOne({ externalKey }).select('_id').lean();

      const $set = {
        source,
        externalKey,
        link,
        title: title.slice(0, 500),
        summary,
        publishedAt,
        lastSyncedAt: new Date(),
      };
      if (imageUrl) {
        $set.imageUrl = imageUrl;
      }
      if (item.guid) {
        $set.guid = String(item.guid).slice(0, 500);
      }

      const updateOps = { $set };
      if (!imageUrl) {
        updateOps.$unset = { imageUrl: '' };
      }

      await MarketNewsItem.updateOne({ externalKey }, updateOps, { upsert: true });

      if (before) updated += 1;
      else added += 1;
    } catch (err) {
      console.error(`[MarketNews Sync] Item error (${source}):`, err.message);
      skipped += 1;
    }
  }

  return { added, updated, skipped, feedItemCount: items.length };
}

async function syncMarketNews() {
  const start = new Date();
  console.log(`[MarketNews Sync] Starting at ${start.toISOString()}`);

  const results = { coindesk: null, global: null };

  try {
    results.coindesk = await ingestFeed(COINDESK_RSS_URL, 'coindesk');
    console.log('[MarketNews Sync] CoinDesk:', results.coindesk);
  } catch (err) {
    console.error('[MarketNews Sync] CoinDesk feed failed:', err.message);
    results.coindesk = { error: err.message };
  }

  try {
    results.global = await ingestFeed(GLOBAL_RSS_URL, 'global');
    console.log('[MarketNews Sync] Global feed:', GLOBAL_RSS_URL, results.global);
  } catch (err) {
    console.error('[MarketNews Sync] Global feed failed:', err.message);
    results.global = { error: err.message };
  }

  const cutoff = getPublishedAtCutoff();
  const del = await MarketNewsItem.deleteMany({ publishedAt: { $lt: cutoff } });

  console.log(`[MarketNews Sync] Pruned ${del.deletedCount} items older than ${RETENTION_HOURS} hours`);

  return {
    results,
    pruned: del.deletedCount,
    finishedAt: new Date(),
  };
}

module.exports = {
  syncMarketNews,
  RETENTION_HOURS,
  getPublishedAtCutoff,
  COINDESK_RSS_URL,
  GLOBAL_RSS_URL,
};
