const axios = require('axios');

const TWEET_ID_REGEX = /\/status\/(\d+)/i;
const TWEET_USER_REGEX = /(?:twitter\.com|x\.com)\/([^/?#]+)\/status\/\d+/i;

function extractTweetId(tweetUrl) {
  if (!tweetUrl || typeof tweetUrl !== 'string') return null;
  const m = tweetUrl.match(TWEET_ID_REGEX);
  return m ? m[1] : null;
}

function extractUsernameFromUrl(tweetUrl) {
  if (!tweetUrl || typeof tweetUrl !== 'string') return null;
  const m = tweetUrl.match(TWEET_USER_REGEX);
  if (!m) return null;
  const user = m[1];
  if (!user || user === 'i' || user === 'intent') return null;
  return user;
}

function truncateText(text, maxLen) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/**
 * Fetch public tweet metadata (text + author) for raid message enrichment.
 * Uses FxTwitter; fails soft (returns null) so raid sends still work.
 */
async function fetchTweetMetadata(tweetUrl) {
  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) return null;

  try {
    const { data } = await axios.get(`https://api.fxtwitter.com/status/${tweetId}`, {
      timeout: 8000,
      headers: { Accept: 'application/json' },
      validateStatus: (s) => s >= 200 && s < 500,
    });

    if (!data || data.code !== 200 || !data.tweet) return null;

    const tweet = data.tweet;
    const author = tweet.author || {};
    const text = (tweet.text || tweet.raw_text?.text || '').trim();
    const authorUsername = (author.screen_name || extractUsernameFromUrl(tweetUrl) || '').trim();
    const authorName = (author.name || '').trim();

    if (!text && !authorUsername) return null;

    return {
      tweetId,
      url: tweet.url || tweetUrl,
      text,
      authorUsername,
      authorName,
    };
  } catch (e) {
    console.log(`[tweetMetadata] fetch failed for ${tweetId}:`, e.message);
    return null;
  }
}

/** Default tweet-text teaser length (well under 500; keep raid body short). */
const DEFAULT_TWEET_SNIPPET_LEN = 100;
/** Absolute ceiling for the whole meta block (author + snippet). */
const MAX_TWEET_META_BLOCK_LEN = 160;

/**
 * Plain-text teaser under the tweet URL in raid notifications.
 * Short on purpose — not a full tweet dump.
 * @param {object|null} meta
 * @param {{ maxTextLen?: number }} [opts]
 */
function formatTweetMetaForMessage(meta, opts = {}) {
  if (!meta) return '';
  const maxTextLen = Math.min(opts.maxTextLen ?? DEFAULT_TWEET_SNIPPET_LEN, 500);
  const lines = [];

  if (meta.authorUsername) {
    const handle = meta.authorUsername.startsWith('@')
      ? meta.authorUsername
      : `@${meta.authorUsername}`;
    lines.push(`👤 ${handle}`);
  }

  const snippet = truncateText(meta.text, maxTextLen);
  if (snippet) {
    lines.push(`💬 ${snippet}`);
  }

  if (!lines.length) return '';

  let block = `\n${lines.join('\n')}`;
  // Hard-cap the whole teaser block so the raid caption stays compact
  if (block.length > MAX_TWEET_META_BLOCK_LEN) {
    block = `${block.slice(0, MAX_TWEET_META_BLOCK_LEN - 1).trimEnd()}…`;
  }
  return block;
}

module.exports = {
  extractTweetId,
  extractUsernameFromUrl,
  fetchTweetMetadata,
  formatTweetMetaForMessage,
  truncateText,
  DEFAULT_TWEET_SNIPPET_LEN,
  MAX_TWEET_META_BLOCK_LEN,
};
