/**
 * Link-in-bio background videos (must match server/utils/linkInBioBackgroundVideo.js).
 *
 * The page plays these in a plain <video> tag, so only direct media files work.
 * Embed/watch pages (YouTube, Vimeo, TikTok, …) are rejected rather than saved
 * and silently failing to render.
 */
export const BACKGROUND_VIDEO_EXTENSION = /\.(mp4|webm|m4v|mov|ogv)$/i;

export function sanitizeLinkInBioBackgroundVideoUrl(raw) {
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

const EMBED_VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|dailymotion\.com|twitch\.tv|streamable\.com|loom\.com)$/i;

/** True for watch/embed pages, which cannot be used as a raw <video> source. */
export function isEmbedPageUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return false;
  try {
    const u = new URL(value.length > 2 && !/^https?:\/\//i.test(value) ? `https://${value}` : value);
    return EMBED_VIDEO_HOSTS.test(u.hostname);
  } catch (_) {
    return false;
  }
}

/**
 * Heavy autoplaying media is a bad trade on metered/slow connections and for
 * users who asked for less motion — those visitors fall back to the page's
 * background image or color.
 */
export function shouldLoadBackgroundVideo() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch (_) {}
  const conn = typeof navigator !== 'undefined'
    ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection)
    : null;
  if (conn) {
    if (conn.saveData) return false;
    if (typeof conn.effectiveType === 'string' && /^(slow-)?2g$/.test(conn.effectiveType)) return false;
  }
  return true;
}
