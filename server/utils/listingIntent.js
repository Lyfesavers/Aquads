const LISTING_ADDRESS_RE =
  /(?:0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[A-Z0-9_]+|0x[0-9a-fA-F]{40,64}|[1-9A-HJ-NP-Za-km-z]{32,44})/;
const LISTING_LOGO_URL_RE = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:[?#]\S*)?/i;

function stripUrls(text) {
  return String(text || '').replace(/https?:\/\/\S+/gi, ' ');
}

function hasListingAddress(text) {
  return LISTING_ADDRESS_RE.test(stripUrls(text));
}

function hasListingLogoUrl(text) {
  return LISTING_LOGO_URL_RE.test(String(text || ''));
}

/** CA/PA + logo URL in one message (matches frontend looksLikeListingRequest). */
function isFullListingIntent(text) {
  return hasListingLogoUrl(text) && hasListingAddress(text);
}

/**
 * User is in a Starter listing flow via Skipper (CA step, logo follow-up, or full paste).
 * @param {string} currentMessage
 * @param {Array<{ role?: string, content?: string }>} history
 */
function isListingOnboardingFlow(currentMessage, history = []) {
  const current = String(currentMessage || '');

  if (isFullListingIntent(current)) return true;
  if (hasListingAddress(current) && !hasListingLogoUrl(current)) return true;

  if (hasListingLogoUrl(current)) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const m = history[i];
      if (m?.role === 'user' && hasListingAddress(m.content)) return true;
    }
  }

  for (const m of history) {
    if (m?.role !== 'user') continue;
    const content = String(m.content || '');
    if (isFullListingIntent(content) || hasListingAddress(content)) return true;
  }

  return false;
}

module.exports = {
  LISTING_ADDRESS_RE,
  LISTING_LOGO_URL_RE,
  hasListingAddress,
  hasListingLogoUrl,
  isFullListingIntent,
  isListingOnboardingFlow
};
