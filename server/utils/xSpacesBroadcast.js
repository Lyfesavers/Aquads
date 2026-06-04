const path = require('path');
const fs = require('fs');

/** X/Twitter Spaces share links (not tweet /status URLs). */
const SPACES_URL_REGEX = /(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/i\/spaces\/[A-Za-z0-9]+)/i;

const AQUADS_WEBSITE_URL = 'https://aquads.xyz';
const { AQUADS_HOME_URL, getDefaultTelegramPromoKeyboard } = require('./botPromoButtons');
const SPACES_BROADCAST_TITLE = 'Live X Space Happening Now!';

function getSpacesBroadcastTelegramKeyboard() {
  return getDefaultTelegramPromoKeyboard();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractSpacesUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(SPACES_URL_REGEX);
  return m ? m[1].trim() : null;
}

/** Plain caption (no parse mode). */
function buildSpacesBroadcastCaption(spaceUrl) {
  return `${SPACES_BROADCAST_TITLE}

Join the conversation on X:

🔗 ${spaceUrl}

Powered by Aquads — ${AQUADS_WEBSITE_URL}`;
}

/** Telegram HTML caption (hyperlink “Aquads”). */
function buildSpacesBroadcastCaptionHtml(spaceUrl) {
  const safeUrl = escapeHtml(spaceUrl);
  return `${SPACES_BROADCAST_TITLE}

Join the conversation on X:

🔗 ${safeUrl}

Powered by <a href="${AQUADS_WEBSITE_URL}">Aquads</a>`;
}

/** Discord embed description (markdown link). */
function buildSpacesBroadcastDescriptionDiscord(spaceUrl) {
  return `Join the conversation on X:

🔗 ${spaceUrl}

Powered by [Aquads](${AQUADS_WEBSITE_URL})`;
}

/** Default Space alert video in repo (filename includes a space). */
const SPACES_BROADCAST_VIDEO_FILENAME = 'NEW SPACE.mp4';

/**
 * Video for Space blasts: SPACES_BROADCAST_VIDEO_PATH env, then public/NEW SPACE.mp4, then timeraid.mp4.
 */
function getSpacesBroadcastVideoPath() {
  const envPath = process.env.SPACES_BROADCAST_VIDEO_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const publicDir = path.join(__dirname, '../../public');
  const dedicated = path.join(publicDir, SPACES_BROADCAST_VIDEO_FILENAME);
  if (fs.existsSync(dedicated)) return dedicated;
  const raidFallback = path.join(publicDir, 'timeraid.mp4');
  if (fs.existsSync(raidFallback)) return raidFallback;
  return dedicated;
}

function spacesBroadcastVideoExists() {
  const p = getSpacesBroadcastVideoPath();
  return fs.existsSync(p);
}

/** Delete + unpin Space alert posts after this age (Telegram + Discord). */
const SPACES_MESSAGE_CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;

function isSpacesMessageCleanupDue(storedAt, cleanupAfterMs = SPACES_MESSAGE_CLEANUP_AFTER_MS) {
  const t = new Date(storedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= cleanupAfterMs;
}

module.exports = {
  SPACES_URL_REGEX,
  SPACES_MESSAGE_CLEANUP_AFTER_MS,
  SPACES_BROADCAST_TITLE,
  AQUADS_WEBSITE_URL,
  AQUADS_HOME_URL,
  getSpacesBroadcastTelegramKeyboard,
  extractSpacesUrl,
  buildSpacesBroadcastCaption,
  buildSpacesBroadcastCaptionHtml,
  buildSpacesBroadcastDescriptionDiscord,
  SPACES_BROADCAST_VIDEO_FILENAME,
  getSpacesBroadcastVideoPath,
  spacesBroadcastVideoExists,
  isSpacesMessageCleanupDue,
};
