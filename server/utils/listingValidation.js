const URL_REGEX =
  /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

function isValidPairAddress(address) {
  const v = String(address || '').trim();
  if (!v) return false;
  const suiRegex = /^0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[A-Z0-9_]+$/;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const hexRegex = /^0x[0-9a-fA-F]{40,64}$/;
  const generalRegex = /^[0-9a-zA-Z]{15,70}$/;
  return (
    suiRegex.test(v) ||
    base58Regex.test(v) ||
    hexRegex.test(v) ||
    generalRegex.test(v)
  );
}

function normalizeProjectUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto;
}

function isValidProjectUrl(url) {
  const normalized = normalizeProjectUrl(url);
  return Boolean(normalized && URL_REGEX.test(normalized));
}

const DEXSCREENER_CDN_LOGO = /^https:\/\/cdn\.dexscreener\.com\/.+/i;

async function validateLogoUrl(url) {
  const target = String(url || '').trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    return { ok: false, error: 'Logo must be a direct HTTPS image URL.' };
  }

  try {
    const res = await fetch(target, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(Number(process.env.LISTING_LOGO_VALIDATE_MS) || 10_000)
    });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok) {
      if (DEXSCREENER_CDN_LOGO.test(target)) {
        return { ok: true, url: target };
      }
      return { ok: false, error: `Logo URL returned HTTP ${res.status}. Use a direct image link.` };
    }
    if (
      !contentType.startsWith('image/') ||
      (!contentType.includes('gif') &&
        !contentType.includes('png') &&
        !contentType.includes('jpeg') &&
        !contentType.includes('jpg') &&
        !contentType.includes('webp'))
    ) {
      if (DEXSCREENER_CDN_LOGO.test(target)) {
        return { ok: true, url: target };
      }
      return {
        ok: false,
        error: 'Logo URL must point to a PNG, JPG, GIF, or WebP image.'
      };
    }
    return { ok: true, url: target };
  } catch (err) {
    if (DEXSCREENER_CDN_LOGO.test(target)) {
      return { ok: true, url: target };
    }
    return { ok: false, error: err.message || 'Could not validate logo URL.' };
  }
}

module.exports = {
  isValidPairAddress,
  isValidProjectUrl,
  normalizeProjectUrl,
  validateLogoUrl
};
