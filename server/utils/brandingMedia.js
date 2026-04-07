/**
 * Shared URL helpers for two separate features (do not conflate storage):
 *
 * 1) Telegram / Discord branding → Ad.customBrandingVideoUrl
 *    Validated with isValidBrandingVideoUrl (https only; Telegram/Discord fetch the file).
 *
 * 2) AquaSwap project deep dive intro → Ad.projectProfile.introVideoUrl
 *    Validated with isValidDeepDiveIntroVideoUrl (https + direct .mp4/.webm/.ogg path).
 *    Stricter so browser <video src> only gets file URLs, not arbitrary pages.
 *
 * normalizeBrandingVideoUrlCandidate is shared trimming/HTML-stripping for both.
 */

const MAX_BRANDING_VIDEO_URL_LENGTH = 2048;

/** Max branding video file size (Discord fetch + user-facing rule). Telegram relies on API limits + this hint. */
const BRANDING_VIDEO_MAX_MB = 5;
const BRANDING_VIDEO_MAX_BYTES = BRANDING_VIDEO_MAX_MB * 1024 * 1024;

/**
 * Shown in Telegram/Discord when explaining video branding (** only if your client parses Markdown).
 */
const BRANDING_VIDEO_URL_GUIDANCE =
  '🎬 **Video:** Direct **https://** link to your **.mp4** file (not YouTube/watch pages). **Max 5MB.**\n' +
  '💡 **Easy host:** **catbox.moe** — upload free → copy the **files.catbox.moe/…mp4** link.';

function normalizeBrandingVideoUrlCandidate(text) {
  if (!text || typeof text !== 'string') return null;
  let t = text.trim();
  if (!t) return null;
  if ((t.startsWith('<') || t.includes('<')) && t.includes('http')) {
    const m = t.match(/https:\/\/[^\s<>"']+/i);
    if (m) t = m[0];
  }
  return t;
}

function isValidBrandingVideoUrl(text) {
  const t = normalizeBrandingVideoUrlCandidate(text);
  if (!t || t.length > MAX_BRANDING_VIDEO_URL_LENGTH) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
}

function projectUsesVideoBranding(project) {
  const url = project?.customBrandingVideoUrl;
  return !!(url && typeof url === 'string' && isValidBrandingVideoUrl(url));
}

function projectHasCustomBrandingMedia(project) {
  const img = !!(project?.customBrandingImage && project.customBrandingImage.length > 0);
  return projectUsesVideoBranding(project) || img;
}

/**
 * Deep dive intro video: direct HTTPS file URL only (.mp4 / .webm / .ogg), e.g. files.catbox.moe/….mp4
 */
function isValidDeepDiveIntroVideoUrl(text) {
  const t = normalizeBrandingVideoUrlCandidate(text);
  if (!t || t.length > MAX_BRANDING_VIDEO_URL_LENGTH) return false;
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

module.exports = {
  normalizeBrandingVideoUrlCandidate,
  isValidBrandingVideoUrl,
  isValidDeepDiveIntroVideoUrl,
  projectUsesVideoBranding,
  projectHasCustomBrandingMedia,
  MAX_BRANDING_VIDEO_URL_LENGTH,
  BRANDING_VIDEO_MAX_MB,
  BRANDING_VIDEO_MAX_BYTES,
  BRANDING_VIDEO_URL_GUIDANCE,
};
