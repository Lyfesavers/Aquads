const jwt = require('jsonwebtoken');

const DEFAULT_TTL_SEC = parseInt(
  process.env.EXTERNAL_JOB_SHARE_TTL_SECONDS || String(86400 * 14),
  10
);

function signingSecret() {
  return (
    process.env.EXTERNAL_JOB_SHARE_SECRET ||
    process.env.JWT_SECRET ||
    ''
  ).trim();
}

/** Only https Jooble-hosted listing URLs allowed in share tokens. */
function validateJoobleUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  let u;
  try {
    u = new URL(urlStr.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (h !== 'jooble.org' && !h.endsWith('.jooble.org')) return null;
  return u.href;
}

function stripHtmlSnippet(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * @param {object} fields
 * @param {string} fields.targetUrl
 * @param {string} fields.title
 * @param {string} [fields.company]
 * @param {string} [fields.description]
 * @param {'remote'|'hybrid'|'onsite'} [fields.workArrangement]
 * @param {string} [fields.locationLine]
 * @returns {string} HS256 JWT
 */
function issueJoobleShareToken(fields) {
  const url = validateJoobleUrl(fields.targetUrl || fields.externalUrl || '');
  if (!url) {
    throw new Error('invalid_jooble_target_url');
  }
  const sec = signingSecret();
  if (!sec) {
    throw new Error('missing_signing_secret');
  }

  const wa = fields.workArrangement;
  const workArrangement =
    wa === 'hybrid' || wa === 'onsite' ? wa : 'remote';

  const payload = {
    v: 1,
    src: 'jooble',
    url,
    t: stripHtmlSnippet(String(fields.title || 'Job').slice(0, 240)),
    c: stripHtmlSnippet(String(fields.company || '').slice(0, 120)),
    d: stripHtmlSnippet(String(fields.description || '').slice(0, 600)),
    w: workArrangement,
    loc: stripHtmlSnippet(String(fields.locationLine || '').slice(0, 120)),
    pay: stripHtmlSnippet(String(fields.payHint || '').slice(0, 80)),
  };

  return jwt.sign(payload, sec, {
    algorithm: 'HS256',
    expiresIn: Math.min(Math.max(DEFAULT_TTL_SEC, 3600), 86400 * 30),
  });
}

/**
 * @returns {null|{
 *  source:string,
 *  targetUrl:string,
 *  title:string,
 *  company:string,
 *  description:string,
 *  workArrangement:string,
 *  locationLine:string,
 *  payHint:string
 * }}
 */
function verifyExternalShareToken(tok) {
  const sec = signingSecret();
  if (!sec || !tok || typeof tok !== 'string') return null;
  try {
    const p = jwt.verify(tok.trim(), sec, { algorithms: ['HS256'] });
    if (p.v !== 1 || p.src !== 'jooble') return null;
    const url = validateJoobleUrl(p.url);
    if (!url) return null;

    const wa = p.w === 'hybrid' || p.w === 'onsite' ? p.w : 'remote';

    return {
      source: 'jooble',
      targetUrl: url,
      title: String(p.t || '').slice(0, 240),
      company: String(p.c || '').slice(0, 120),
      description: String(p.d || '').slice(0, 600),
      workArrangement: wa,
      locationLine: String(p.loc || '').slice(0, 120),
      payHint: String(p.pay || '').slice(0, 80),
    };
  } catch {
    return null;
  }
}

module.exports = {
  issueJoobleShareToken,
  verifyExternalShareToken,
  validateJoobleUrl,
};
