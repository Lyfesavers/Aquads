const crypto = require('crypto');
const axios = require('axios');
const Job = require('../models/Job');
const { cleanHTML, formatJobContent } = require('./rssJobFormatting');
const {
  parseSalary,
  extractCompany,
  extractRequirements,
  formatRequirements,
  removeRequirementsFromDescription,
} = require('./rssJobCommon');

/**
 * Bondex/Web3 Jobs API docs: https://docs.bondex.app/api-reference
 * Base endpoint (JSON): https://web3.career/api/v1
 *
 * Keep the token on the server only (never CRA public env bundles).
 *
 * Attribution: persist `apply_url` exactly — do not mutate query strings.
 */

const WEB3_API_BASE = 'https://web3.career/api/v1';

const SYNC_USER_AGENT =
  process.env.NODE_ENV === 'production'
    ? 'Aquads Job Board (+https://www.aquads.xyz)'
    : 'Aquads Jobs Dev';

const BROAD_FETCH = { limit: 100, show_description: true };
const EXTRA_TAGS = ['solidity', 'react']; // widen coverage beyond the first slice; deduped downstream

function getApiToken() {
  return (
    process.env.WEB3_CAREER_API_TOKEN ||
    process.env.WEB3_JOBS_API_TOKEN ||
    process.env.WEB3_JOBS_API ||
    ''
  ).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse web3.career mixed-array JSON root per official docs */
function extractJobObjects(data) {
  if (!Array.isArray(data)) return [];
  let jobs = data.find((item) => Array.isArray(item));
  if (
    !jobs &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    !Array.isArray(data[0])
  ) {
    jobs = data;
  }
  if (!jobs || !Array.isArray(jobs)) return [];
  return jobs.filter((j) => j && typeof j === 'object' && !Array.isArray(j));
}

function coerceApplyUrl(job) {
  const raw =
    job?.apply_url != null
      ? String(job.apply_url)
      : job?.applyUrl != null
      ? String(job.applyUrl)
      : '';
  const u = raw.trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

/** Prefer numeric id prefix so rows stay stable across syncs */
function deriveExternalId(job) {
  if (job == null || typeof job !== 'object') return null;

  const id = job.id;
  if (id !== undefined && id !== null && String(id).trim() !== '') {
    return `w3:${String(id).trim()}`;
  }

  const apply = coerceApplyUrl(job);
  if (!apply) return null;

  const h = crypto.createHash('sha256').update(apply).digest('hex').slice(0, 48);
  return `w3:h:${h}`;
}

/**
 * Prefer https. Allow common job-aggregator / ATS image hosts Web3 listings use.
 * Browser <img src> only; OG fetch still uses Sharp with timeout (see routes/og).
 */
function normalizeTrustedAggregatorLogoUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim().replace(/^\/\//, 'https://');
  let u;
  try {
    u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;

  const h = u.hostname.replace(/^www\./i, '').toLowerCase();
  if (!h.includes('.')) return null;

  const exactHosts = new Set([
    'web3.career',
    'media.licdn.com',
    'static.licdn.com',
    'snap.licdn.com',
    'avatars.githubusercontent.com',
    'pbs.twimg.com',
    'lh3.googleusercontent.com',
    'lh4.googleusercontent.com',
    'lh5.googleusercontent.com',
    'lh6.googleusercontent.com',
  ]);

  if (exactHosts.has(h)) return u.href;

  const suffixOk = [
    '.web3.career',
    '.bondex.app',
    '.licdn.com',
    '.greenhouse.io',
    '.lever.co',
    '.workable.com',
    '.workableuserdata.com',
    '.ashbyhq.com',
    '.recruit.io',
    '.recruiteecdn.com',
  ];

  for (const s of suffixOk) {
    if (h.endsWith(s)) return u.href;
  }

  return null;
}

function collectWeb3LogoCandidates(job) {
  const urls = [];

  function push(raw) {
    if (raw == null) return;
    if (typeof raw !== 'string') return;
    const t = raw.trim();
    if (!/^https?:\/\//i.test(t) && !t.startsWith('//')) return;
    urls.push(t);
  }

  const keys = [
    'company_logo_url',
    'company_logo',
    'company_image',
    'company_image_url',
    'company_icon',
    'logo',
    'logo_url',
    'logoUrl',
    'brand_logo',
    'brand_logo_url',
    'image',
    'image_url',
    'employer_logo',
    'employer_logo_url',
    'publisher_logo',
  ];

  for (const k of keys) push(job[k]);

  const comp = job.company;
  if (comp && typeof comp === 'object' && !Array.isArray(comp)) {
    push(comp.logo_url);
    push(comp.logoUrl);
    push(comp.logo);
    push(comp.image);
    push(comp.icon);
  }

  return urls;
}

function pickWeb3CompanyLogo(job) {
  for (const raw of collectWeb3LogoCandidates(job)) {
    const normalized = normalizeTrustedAggregatorLogoUrl(raw);
    if (normalized) return normalized;
  }
  return null;
}

/** Bondex/Web3 Career API mixes snake_case, camelCase, unix timestamps (sec/ms), ISO strings — never guess "today" on failure. */
const POST_DATE_KEY_ORDER = [
  'posted_date',
  'postedDate',
  'posted_at',
  'postedAt',
  'posted_on',
  'postedOn',
  'date_posted',
  'datePosted',
  'published_at',
  'publishedAt',
  'pub_date',
  'pubDate',
  /** Bondex/Web3 Careers JSON feeds (logged keys include these; not camelCase variants in practice) */
  'date_epoch',
  'dateEpoch',
  'date',
  'first_published_at',
  'firstPublishedAt',
  'listed_at',
  'listedAt',
  'job_posted_at',
  'jobPostedAt',
  'created_at',
  'createdAt',
  'posted',
];

function isPlausiblePostedDate(d) {
  if (!d || Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const now = new Date();
  if (y < 2008 || y > now.getFullYear() + 1) return false;
  return d.getTime() <= now.getTime() + 36 * 60 * 60 * 1000;
}

/** Convert API datetime primitive to Date, or null. */
function coercePostedValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return null;

  if (value instanceof Date) {
    return isPlausiblePostedDate(value) ? value : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    let ms = value;
    if (Math.abs(ms) < 1e12) ms *= 1000;
    const d = new Date(ms);
    return isPlausiblePostedDate(d) ? d : null;
  }

  if (typeof value === 'string') {
    const t = value.trim();
    if (!t || t === 'null' || t === 'undefined') return null;

    if (/^-?\d+(\.\d+)?$/.test(t)) {
      const num = Number(t);
      if (!Number.isFinite(num)) return null;
      return coercePostedValue(num);
    }

    const parsed = Date.parse(t);
    if (Number.isNaN(parsed)) return null;
    const d = new Date(parsed);
    return isPlausiblePostedDate(d) ? d : null;
  }

  return null;
}

const KEY_REJECT = /expires|expire|until|deadline|closes|indexed|scraped|crawl|ttl|expires_at|expiry/i;

/** Scan arbitrary object keys for plausible posted/published-ish fields (excludes expiry / updated-ish when possible). */
function postedDateFromObjectSlice(ob) {
  if (!ob || typeof ob !== 'object' || Array.isArray(ob)) return null;

  for (const k of POST_DATE_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(ob, k)) {
      const d = coercePostedValue(ob[k]);
      if (d) return d;
    }
  }

  for (const k of Object.keys(ob)) {
    if (KEY_REJECT.test(k)) continue;
    const lc = k.toLowerCase();
    const looksPosted =
      /posted|published|listing.?date|publish|pub_date|announce|created|opened|posted_at|postedat/.test(
        lc
      );
    const looksStale = /updated|modified|edited|changed|refreshed|synced|touched/i.test(lc);
    const barePostingDate =
      lc === 'date' || lc.endsWith('_epoch') || lc === 'epoch' || /\bposted\b/.test(lc);
    if (
      !looksPosted &&
      !(/date|time|timestamp/.test(lc) && (lc.includes('post') || barePostingDate))
    ) {
      continue;
    }
    if (looksStale && !looksPosted) continue;

    const d = coercePostedValue(ob[k]);
    if (d) return d;
  }

  return null;
}

/**
 * Canonical "when this listing was originally posted on Web3 Career" — or null if unknown / invalid.
 */
function parsePostedDate(job) {
  if (!job || typeof job !== 'object') return null;

  const primary = postedDateFromObjectSlice(job);
  if (primary) return primary;

  const nestedObjs = [];
  for (const v of Object.values(job)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      Object.keys(v).length > 0
    ) {
      nestedObjs.push(v);
    }
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      for (const child of v) nestedObjs.push(child);
    }
  }

  for (const ob of nestedObjs) {
    const d = postedDateFromObjectSlice(ob);
    if (d) return d;
  }

  return null;
}

function postedTimestampForMerge(job) {
  const d = parsePostedDate(job);
  return d ? d.getTime() : 0;
}

function arrangementAndLocation(apiJob) {
  const remote =
    apiJob?.remote === true ||
    apiJob?.remote === 'true' ||
    apiJob?.is_remote === true ||
    apiJob?.is_remote === 'true' ||
    String(apiJob?.remote ?? '').trim() === '1';

  const countryRaw =
    typeof apiJob?.country === 'string'
      ? apiJob.country.trim()
      : typeof apiJob?.country_slug === 'string'
      ? apiJob.country_slug.trim()
      : typeof apiJob?.country_name === 'string'
      ? apiJob.country_name.trim()
      : '';

  const city = typeof apiJob?.city === 'string' ? apiJob.city.trim() : '';

  function slugToLabel(slug) {
    if (!slug) return '';
    const lower = slug.toLowerCase();
    if (!lower || lower === 'worldwide') return '';

    const segs = slug.split('-').filter(Boolean);
    if (segs.length === 0) return '';
    return segs.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  const countryLabel = slugToLabel(countryRaw);

  if (remote || !countryLabel || countryRaw.toLowerCase() === 'remote') {
    return {
      workArrangement: 'remote',
      location: {
        country: countryLabel ? countryLabel : 'Remote',
        city: city || '',
      },
    };
  }

  return {
    workArrangement: 'onsite',
    location: {
      country: countryLabel || 'Various',
      city: city || countryLabel || 'Office',
    },
  };
}

function mapApiJob(job) {
  const applyUrl = coerceApplyUrl(job);
  const externalId = deriveExternalId(job);

  if (!applyUrl || !externalId) {
    return null;
  }

  const title = cleanHTML(String(job.title || '').trim()) || '(Untitled)';

  const rawHtmlDesc =
    (typeof job.description === 'string' && job.description) ||
    (typeof job.body === 'string' && job.body) ||
    '';

  let description = rawHtmlDesc
    ? formatJobContent(rawHtmlDesc)
    : 'See listing on Web3.career for full details.';
  description = description.trim() || 'See listing on Web3.career for full details.';

  const companyRaw =
    (typeof job.company === 'string' && job.company.trim()) ||
    (typeof job.company?.name === 'string' && job.company.name.trim()) ||
    (typeof job.company_name === 'string' && job.company_name.trim()) ||
    '';

  const salaryText = typeof job.salary === 'string' ? job.salary : '';

  // rssJobCommon.extractCompany(title, item, defaultCompany) — NOT (title, description, item).
  const company = extractCompany(
    title,
    {
      company: companyRaw || undefined,
      creator: typeof job.creator === 'string' ? job.creator.trim() : undefined,
    },
    'Company'
  );

  const salary = parseSalary(`${title}\n${salaryText}`, description);

  const locationBundle = arrangementAndLocation(job);

  const rawRequirements = extractRequirements(description);
  const requirements = formatRequirements(rawRequirements);

  const companyLogo = pickWeb3CompanyLogo(job);

  if (requirements && requirements !== 'See job description for requirements') {
    description = removeRequirementsFromDescription(description);
  }

  return {
    title,
    description,
    requirements: requirements || 'See job description for requirements',
    payAmount: salary?.payAmount || null,
    payType: salary?.payType || null,
    jobType: 'hiring',
    workArrangement: locationBundle.workArrangement,
    location: locationBundle.location,
    ownerUsername: company,
    ownerImage: null,
    companyLogo,
    status: 'active',
    source: 'web3career',
    externalUrl: applyUrl,
    externalId,
    lastSynced: new Date(),
  };
}

async function fetchJobsChunk(token, params) {
  let attempt = 0;
  const maxAttempts = 4;

  while (attempt <= maxAttempts) {
    const res = await axios.get(WEB3_API_BASE, {
      timeout: 45000,
      headers: {
        'User-Agent': SYNC_USER_AGENT,
        Accept: 'application/json',
      },
      validateStatus: (s) => s >= 200 && s < 600,
      params: {
        token,
        ...params,
      },
    });

    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
      const backoff = Math.min(1000 * 2 ** attempt, 10000);
      const jitter = Math.floor(backoff * 0.25 * Math.random());
      console.warn(`[Web3.career Sync] HTTP ${res.status}, backing off ${backoff + jitter}ms`);
      await sleep(backoff + jitter);
      attempt++;
      continue;
    }

    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}`);
    }

    return extractJobObjects(res.data);
  }

  throw new Error('Unreachable fetch retry loop exit');
}

async function gatherJobs(token) {
  const byKey = new Map();

  async function ingest(rows) {
    for (const j of rows) {
      const id = deriveExternalId(j);
      if (!id || !coerceApplyUrl(j)) continue;
      const existing = byKey.get(id);
      const nextPublished = postedTimestampForMerge(j);
      if (!existing || nextPublished >= postedTimestampForMerge(existing.raw)) {
        byKey.set(id, { raw: j });
      }
    }
  }

  await ingest(await fetchJobsChunk(token, BROAD_FETCH));

  for (const tag of EXTRA_TAGS) {
    await sleep(850);
    try {
      await ingest(await fetchJobsChunk(token, { limit: 80, tag, show_description: true }));
    } catch (e) {
      console.error(`[Web3.career Sync] Auxiliary tag fetch failed (${tag}):`, e.message);
    }
  }

  return [...byKey.values()].map(({ raw }) => raw);
}

async function syncWeb3CareerJobs() {
  const syncStartTime = new Date();
  console.log(`[Web3.career Sync] Starting sync at ${syncStartTime.toISOString()}`);

  const token = getApiToken();
  if (!token) {
    console.warn(
      '[Web3.career Sync] No API token configured (WEB3_CAREER_API_TOKEN / WEB3_JOBS_API_*); skipping'
    );
    return {
      success: true,
      skipped: true,
      added: 0,
      updated: 0,
      removed: 0,
      errors: 0,
      timestamp: syncStartTime,
    };
  }

  try {
    const rawJobs = await gatherJobs(token);

    if (!rawJobs.length) {
      console.log('[Web3.career Sync] Empty job set from API after merge');
      return {
        success: true,
        added: 0,
        updated: 0,
        removed: 0,
        errors: 0,
        timestamp: syncStartTime,
      };
    }

    const withLogoCount = rawJobs.reduce((n, j) => n + (pickWeb3CompanyLogo(j) ? 1 : 0), 0);
    console.log(
      `[Web3.career Sync] Merged ${rawJobs.length} jobs; ${withLogoCount} have a CDN logo URL we store`
    );

    let added = 0;
    let updated = 0;
    let errors = 0;
    let missingPostedDate = 0;
    /** First row lacking a resolved posted date — log JSON keys once to reconcile API shape vs parser. */
    let loggedMissingPostedShape = false;

    for (const row of rawJobs) {
      try {
        const jobData = mapApiJob(row);
        if (!jobData) continue;

        if (!jobData.title || !jobData.externalId) {
          console.log('[Web3.career Sync] Skipping item with missing title or ID');
          continue;
        }

        const parsedPostedDate = parsePostedDate(row);

        const existingJob = await Job.findOne({
          externalId: jobData.externalId,
          source: 'web3career',
        });

        if (existingJob) {
          existingJob.title = jobData.title;
          existingJob.description = jobData.description;
          existingJob.requirements = jobData.requirements;
          existingJob.payAmount = jobData.payAmount;
          existingJob.payType = jobData.payType;
          existingJob.workArrangement = jobData.workArrangement;
          existingJob.location = jobData.location;
          existingJob.ownerUsername = jobData.ownerUsername;
          existingJob.companyLogo = jobData.companyLogo;
          existingJob.externalUrl = jobData.externalUrl;
          if (parsedPostedDate) {
            existingJob.createdAt = parsedPostedDate;
          }
          existingJob.lastSynced = syncStartTime;
          await existingJob.save();
          updated++;
        } else {
          const payload = { ...jobData, lastSynced: syncStartTime };
          if (parsedPostedDate) {
            payload.createdAt = parsedPostedDate;
          }
          await new Job(payload).save();
          added++;
        }

        if (!parsedPostedDate) {
          missingPostedDate++;
          if (!loggedMissingPostedShape) {
            loggedMissingPostedShape = true;
            const keysSample = typeof row === 'object' && row ? Object.keys(row).sort() : [];
            console.warn(
              `[Web3.career Sync] No resolved posted date for at least one job (fallback: Mongoose default). Top-level JSON keys:`,
              keysSample.join(', ') || '(none)'
            );
          }
        }
      } catch (error) {
        console.error('[Web3.career Sync] Error processing row:', error.message);
        errors++;
      }
    }

    // Drop only after 30 days with no successful sync touch (jobs missing from latest API remain in DB)
    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const removeResult = await Job.deleteMany({
      source: 'web3career',
      lastSynced: { $lt: retentionCutoff },
    });

    const removed = removeResult.deletedCount;

    console.log('[Web3.career Sync] Sync completed successfully');
    console.log(
      `[Web3.career Sync] Added: ${added}, Updated: ${updated}, Removed: ${removed}, Errors: ${errors}` +
        (missingPostedDate
          ? `; ${missingPostedDate} jobs lacked a parseable posted date`
          : '')
    );

    return {
      success: true,
      added,
      updated,
      removed,
      errors,
      missingPostedDate,
      timestamp: syncStartTime,
    };
  } catch (error) {
    console.error('[Web3.career Sync] Sync failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: syncStartTime,
    };
  }
}

module.exports = {
  syncWeb3CareerJobs,
  deriveExternalId,
  coerceApplyUrl,
  mapApiJob,
  parsePostedDate,
};
