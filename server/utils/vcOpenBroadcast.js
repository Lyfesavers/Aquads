const path = require('path');
const fs = require('fs');

const AQUADS_WEBSITE_URL = 'https://aquads.xyz';
const { getDefaultTelegramPromoKeyboard } = require('./botPromoButtons');

const VC_OPEN_BROADCAST_TITLE = 'Live Voice Chat Happening Now!';

function getVcOpenBroadcastTelegramKeyboard() {
  return getDefaultTelegramPromoKeyboard();
}

/** Plain caption (no parse mode). */
function buildVcOpenBroadcastCaption() {
  return `${VC_OPEN_BROADCAST_TITLE}

Tap the banner at the top of this chat to join.

Powered by Aquads — ${AQUADS_WEBSITE_URL}`;
}

/** Telegram HTML caption (hyperlink “Aquads”). */
function buildVcOpenBroadcastCaptionHtml() {
  return `${VC_OPEN_BROADCAST_TITLE}

Tap the banner at the top of this chat to join.

Powered by <a href="${AQUADS_WEBSITE_URL}">Aquads</a>`;
}

/** Default VC-open alert video in repo (filename includes a space). */
const VC_OPEN_BROADCAST_VIDEO_FILENAME = 'VC open.mp4';

/**
 * Video for VC-open blasts: VC_OPEN_BROADCAST_VIDEO_PATH env, then public/VC open.mp4.
 */
function getVcOpenBroadcastVideoPath() {
  const envPath = process.env.VC_OPEN_BROADCAST_VIDEO_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const publicDir = path.join(__dirname, '../../public');
  return path.join(publicDir, VC_OPEN_BROADCAST_VIDEO_FILENAME);
}

function vcOpenBroadcastVideoExists() {
  const p = getVcOpenBroadcastVideoPath();
  return fs.existsSync(p);
}

/** Delete + unpin VC-open alerts before Telegram's ~48h bot self-delete window closes (same margin as raid posts). */
const VC_OPEN_MESSAGE_CLEANUP_AFTER_MS = 42 * 60 * 60 * 1000;

function isVcOpenMessageCleanupDue(storedAt, cleanupAfterMs = VC_OPEN_MESSAGE_CLEANUP_AFTER_MS) {
  const t = new Date(storedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= cleanupAfterMs;
}

module.exports = {
  VC_OPEN_MESSAGE_CLEANUP_AFTER_MS,
  VC_OPEN_BROADCAST_TITLE,
  AQUADS_WEBSITE_URL,
  getVcOpenBroadcastTelegramKeyboard,
  buildVcOpenBroadcastCaption,
  buildVcOpenBroadcastCaptionHtml,
  VC_OPEN_BROADCAST_VIDEO_FILENAME,
  getVcOpenBroadcastVideoPath,
  vcOpenBroadcastVideoExists,
  isVcOpenMessageCleanupDue,
};
