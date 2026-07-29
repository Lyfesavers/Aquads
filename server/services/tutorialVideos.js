const Parser = require('rss-parser');

const TUTORIAL_PLAYLIST_ID = 'PLKHtulN0_0h8hun9lEhYHPGm4Mqophidj';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${TUTORIAL_PLAYLIST_ID}`;
const CACHE_TTL_MS = 15 * 60 * 1000;

// Static fallback when YouTube RSS is unavailable (common 404 from server/datacenter IPs).
const FALLBACK_VIDEOS = [
  { id: 'r1yJMsdjoSc', title: 'How to Set Up Link in the Bio with Aquads' },
  { id: 'wEawp_-uv9c', title: 'How To Get Your On Chain Resume Minted' },
  { id: 'Ic2CncO9zKU', title: 'How to find the CV section' },
  { id: 'AURpcn9ybEI', title: 'How to Find the Skills Test' },
  { id: 'Bwo0h4uFdBA', title: 'How to use the Aquads Telegram Bot for Raiding' },
  { id: '4arbIjFGvPU', title: 'How to get the image URL' },
  { id: 'ygvi580jkwM', title: 'How to raid and earn' },
  { id: 'd2bjq7_nKQc', title: 'Get referral link' },
  { id: 'gt41bzMM6Fk', title: 'A List of Websites to Get An Image Url From' },
];

const parser = new Parser({
  timeout: 45000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
    if (!videos.length) {
      console.warn('[tutorialVideos] YouTube feed empty, serving static fallback');
      return FALLBACK_VIDEOS;
    }
    cache = { videos, fetchedAt: now };
    return videos;
  } catch (err) {
    if (cache.videos) {
      console.warn('[tutorialVideos] YouTube fetch failed, serving stale cache:', err.message);
      return cache.videos;
    }
    console.warn('[tutorialVideos] YouTube fetch failed, serving static fallback:', err.message);
    return FALLBACK_VIDEOS;
  }
}

module.exports = {
  TUTORIAL_PLAYLIST_ID,
  getTutorialVideos,
};
