const Parser = require('rss-parser');

const TUTORIAL_PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${TUTORIAL_PLAYLIST_ID}`;
const CACHE_TTL_MS = 15 * 60 * 1000;

const parser = new Parser({
  timeout: 45000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; Aquads/1.0; +https://www.aquads.xyz)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

let cache = { videos: null, fetchedAt: 0 };

function extractVideoId(item) {
  const rawId = (item.id || '').toString();
  if (rawId.startsWith('yt:video:')) {
    return rawId.slice('yt:video:'.length);
  }
  const link = (item.link || '').toString();
  const match = link.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

async function fetchTutorialVideosFromYouTube() {
  const feed = await parser.parseURL(FEED_URL);
  return (feed.items || [])
    .map((item) => {
      const id = extractVideoId(item);
      if (!id) return null;
      return {
        id,
        title: (item.title || '').trim(),
        publishedAt: item.isoDate || item.pubDate || null,
      };
    })
    .filter(Boolean);
}

async function getTutorialVideos({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cache.videos && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.videos;
  }

  try {
    const videos = await fetchTutorialVideosFromYouTube();
    cache = { videos, fetchedAt: now };
    return videos;
  } catch (err) {
    if (cache.videos) {
      console.warn('[tutorialVideos] YouTube fetch failed, serving stale cache:', err.message);
      return cache.videos;
    }
    throw err;
  }
}

module.exports = {
  TUTORIAL_PLAYLIST_ID,
  getTutorialVideos,
};
