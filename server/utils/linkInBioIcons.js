/** Allowed custom icon keys for bioLinks (must match src/utils/linkInBioCustomIcons.js). */
const ALLOWED_BIO_LINK_ICON_KEYS = new Set([
  'link', 'website', 'home', 'menu', 'featured',
  'shop', 'marketplace', 'portfolio', 'hire', 'booking', 'signup',
  'blog', 'newsletter', 'book', 'learn',
  'video', 'podcast', 'music', 'gallery', 'live',
  'calendar', 'map', 'email', 'phone', 'community', 'chat',
  'wallet', 'crypto', 'swap', 'nft', 'tip',
  'games', 'mobile-app', 'extension', 'code', 'analytics', 'launch',
  'gift', 'promo', 'award', 'favorite', 'download', 'ticket', 'support', 'settings',
  'aquads',
  // Legacy Font Awesome keys (mapped on client)
  'globe', 'store', 'shopping-bag', 'gamepad', 'rocket', 'laptop', 'chrome', 'puzzle-piece',
  'coins', 'exchange-alt', 'chart-line', 'users', 'briefcase', 'play', 'microphone', 'camera',
  'image', 'file-alt', 'map-marker-alt', 'trophy', 'heart', 'star', 'bolt', 'bullhorn', 'cog'
]);

function sanitizeBioLinkIconKey(raw) {
  if (raw == null || raw === '') return null;
  const key = String(raw).trim().toLowerCase();
  if (key === 'auto') return null;
  return ALLOWED_BIO_LINK_ICON_KEYS.has(key) ? key : null;
}

function sanitizeBioLinkIconImageUrl(raw) {
  if (raw == null || raw === '') return null;
  const url = String(raw).trim();
  if (url.length > 2048) return null;
  try {
    const u = new URL(url.length > 2 && !/^https?:\/\//i.test(url) ? `https://${url}` : url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch (_) {}
  return null;
}

module.exports = {
  ALLOWED_BIO_LINK_ICON_KEYS,
  sanitizeBioLinkIconKey,
  sanitizeBioLinkIconImageUrl
};
