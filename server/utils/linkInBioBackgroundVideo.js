/**
 * Link-in-bio background videos (must match src/utils/linkInBioBackgroundVideo.js).
 *
 * The page plays these in a plain <video> tag, so only direct media files work.
 * Embed/watch pages (YouTube, Vimeo, TikTok, …) are rejected rather than saved
 * and silently failing to render.
 */
const BACKGROUND_VIDEO_EXTENSION = /\.(mp4|webm|m4v|mov|ogv)$/i;

function sanitizeLinkInBioBackgroundVideoUrl(raw) {
  if (raw == null || raw === '') return null;
  const value = String(raw).trim();
  if (!value || value.length > 2048) return null;
  try {
    const u = new URL(value.length > 2 && !/^https?:\/\//i.test(value) ? `https://${value}` : value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!BACKGROUND_VIDEO_EXTENSION.test(decodeURIComponent(u.pathname))) return null;
    return u.toString();
  } catch (_) {
    return null;
  }
}

module.exports = {
  BACKGROUND_VIDEO_EXTENSION,
  sanitizeLinkInBioBackgroundVideoUrl
};
