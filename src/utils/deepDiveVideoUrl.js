/** Max length aligned with server (brandingMedia MAX_BRANDING_VIDEO_URL_LENGTH). */
export const MAX_DEEP_DIVE_VIDEO_URL_LENGTH = 2048;

export function normalizeDeepDiveVideoUrlCandidate(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.trim();
  if (!t) return '';
  if ((t.startsWith('<') || t.includes('<')) && t.includes('http')) {
    const m = t.match(/https:\/\/[^\s<>"']+/i);
    if (m) t = m[0];
  }
  return t.slice(0, MAX_DEEP_DIVE_VIDEO_URL_LENGTH);
}

/** Direct https file URL ending in .mp4, .webm, or .ogg (e.g. files.catbox.moe/….mp4). */
export function isValidDeepDiveIntroVideoUrl(text) {
  const t = normalizeDeepDiveVideoUrlCandidate(text);
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) return false;
    const path = u.pathname.toLowerCase();
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(path);
  } catch {
    return false;
  }
}
