const axios = require('axios');
const crypto = require('crypto');

const JOOBLE_API_BASE = 'https://jooble.org/api';

function getUserAgent() {
  return process.env.NODE_ENV === 'production'
    ? 'Aquads Job Board (+https://www.aquads.xyz)'
    : 'Aquads Jobs Dev';
}

function inferWorkArrangement(locationStr, snippetStr) {
  const text = `${locationStr || ''} ${snippetStr || ''}`.toLowerCase();
  if (/\bhybrid\b/.test(text)) return 'hybrid';
  if (/\bon-?site\b|\bin[\s-]office\b|\bon[\s]premises\b/i.test(text)) return 'onsite';
  return 'remote';
}

/**
 * Maps Jooble location string → { city, country } for Aquads badges.
 */
function splitJoobleLocation(locationStr) {
  const raw = String(locationStr || '').trim();
  if (!raw) return { city: '', country: '' };
  if (/\b(remote|worldwide|anywhere|global)\b/i.test(raw)) {
    return { city: '', country: 'Remote' };
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: '', country: raw };
}

function stripSnippetHtml(snippet) {
  if (!snippet || typeof snippet !== 'string') return '';
  return snippet
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize one Jooble job row → public job list shape (not persisted).
 * Intentionally omits companyLogo so UI uses syndicated company-name avatar.
 */
function mapJoobleJobToListing(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.id != null ? String(raw.id).trim() : '';
  const link =
    typeof raw.link === 'string' && /^https?:\/\//i.test(raw.link.trim()) ? raw.link.trim() : '';
  if (!link) return null;

  const company = String(raw.company || 'Company').trim() || 'Company';
  const snippet = stripSnippetHtml(raw.snippet || '');
  const salaryStr = typeof raw.salary === 'string' ? raw.salary.trim() : '';
  const title = String(raw.title || 'Job posting').trim() || 'Job posting';
  const locParts = splitJoobleLocation(raw.location || '');
  const workArrangement = inferWorkArrangement(raw.location, raw.snippet);

  let description = snippet || 'Search result from Jooble. Open the posting for full details.';
  if (salaryStr) {
    description = `💰 ${salaryStr}\n\n${description}`;
  }

  const externalKey = id || crypto.createHash('sha256').update(link).digest('hex').slice(0, 24);

  let createdAt = new Date();
  if (raw.updated) {
    const d = new Date(raw.updated);
    if (!Number.isNaN(d.getTime())) createdAt = d;
  }

  return {
    _id: `jooble:${externalKey}`,
    title,
    description,
    requirements: 'See job description for requirements',
    payAmount: null,
    payType: null,
    jobType: 'hiring',
    workArrangement,
    location: {
      country: locParts.country || (workArrangement === 'remote' ? 'Remote' : ''),
      city: locParts.city || '',
    },
    ownerUsername: company,
    ownerImage: null,
    companyLogo: null,
    status: 'active',
    source: 'jooble',
    externalUrl: link,
    externalId: id || externalKey,
    createdAt,
    owner: null,
  };
}

/**
 * Live search only — not stored in Mongo. Key must stay server-side.
 *
 * @param {object} opts
 * @param {string} opts.keywords – search query
 * @param {number} [opts.page]
 * @param {boolean} [opts.companysearch]
 * @returns {Promise<{ jobs: object[], totalCount: number, error?: string }>}
 */
async function searchJoobleRemoteJobs(opts) {
  const apiKey = (process.env.JOOBLE_API_KEY || '').trim();
  if (!apiKey) {
    return { jobs: [], totalCount: 0, error: 'no_key' };
  }

  const keywords = String(opts.keywords || '').trim();
  if (!keywords) {
    return { jobs: [], totalCount: 0 };
  }

  const locationForApi = opts.location != null ? String(opts.location).trim() : '';
  if (!locationForApi) {
    return { jobs: [], totalCount: 0, error: 'missing_location' };
  }

  const page = Math.max(1, parseInt(String(opts.page || '1'), 10) || 1);
  const companysearch =
    opts.companysearch === true || opts.companysearch === 'true' || opts.companysearch === '1';

  /** Jooble resolves `location` against real places (see their REST API docs); we never send placeholders like "World". */
  const url = `${JOOBLE_API_BASE}/${encodeURIComponent(apiKey)}`;
  const body = {
    keywords: keywords.slice(0, 480),
    location: locationForApi.slice(0, 120),
    radius: process.env.JOOBLE_RADIUS != null ? String(process.env.JOOBLE_RADIUS) : '80',
    page: String(page),
    companysearch: companysearch ? 'true' : 'false',
  };

  try {
    const { data, status } = await axios.post(url, body, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
      },
      validateStatus: () => true,
    });

    if (status === 403) {
      console.warn('[Jooble Search] Access denied — check JOOBLE_API_KEY');
      return { jobs: [], totalCount: 0, error: 'forbidden' };
    }
    if (status !== 200 || data == null) {
      console.warn('[Jooble Search] Non-OK response:', status);
      return { jobs: [], totalCount: 0, error: `http_${status}` };
    }

    const list = Array.isArray(data.jobs) ? data.jobs : [];
    const mapped = [];
    const seenLinks = new Set();
    for (const row of list) {
      const m = mapJoobleJobToListing(row);
      if (m && m.externalUrl && !seenLinks.has(m.externalUrl)) {
        seenLinks.add(m.externalUrl);
        mapped.push(m);
      }
    }

    const totalCount =
      typeof data.totalCount === 'number' && !Number.isNaN(data.totalCount)
        ? data.totalCount
        : mapped.length;

    return { jobs: mapped, totalCount };
  } catch (err) {
    console.warn('[Jooble Search] Request failed:', err.message);
    return { jobs: [], totalCount: 0, error: 'request_failed' };
  }
}

module.exports = {
  searchJoobleRemoteJobs,
  mapJoobleJobToListing,
};
