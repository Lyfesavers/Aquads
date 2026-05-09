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

function normalizeTrustedWeb3LogoUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim();
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.replace(/^www\./i, '').toLowerCase();
  if (h !== 'web3.career' && !h.endsWith('.web3.career')) {
    return null;
  }
  return u.href;
}

function parsePostedDate(job) {
  const cand = (
    [
      job?.posted_date,
      job?.posted_at,
      job?.created_at,
      job?.published_at,
      job?.updated_at,
    ].find(Boolean) ?? ''
  ).toString();

  const d = new Date(cand);
  return Number.isNaN(d.getTime()) ? new Date() : d;
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

  const companyLogoCandidate =
    job.company_logo || job.logo || job.company_logo_url || job.logo_url || null;

  const companyLogo = normalizeTrustedWeb3LogoUrl(companyLogoCandidate);

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
    createdAt: parsePostedDate(job),
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
      const nextPublished = parsePostedDate(j).getTime();
      if (!existing || nextPublished >= parsePostedDate(existing.raw).getTime()) {
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

    let added = 0;
    let updated = 0;
    let errors = 0;

    for (const row of rawJobs) {
      try {
        const jobData = mapApiJob(row);
        if (!jobData) continue;

        if (!jobData.title || !jobData.externalId) {
          console.log('[Web3.career Sync] Skipping item with missing title or ID');
          continue;
        }

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
          existingJob.createdAt = jobData.createdAt;
          existingJob.lastSynced = syncStartTime;
          await existingJob.save();
          updated++;
        } else {
          await new Job(jobData).save();
          added++;
        }
      } catch (error) {
        console.error('[Web3.career Sync] Error processing row:', error.message);
        errors++;
      }
    }

    const removeResult = await Job.deleteMany({
      source: 'web3career',
      lastSynced: { $lt: syncStartTime },
    });

    const removed = removeResult.deletedCount;

    console.log('[Web3.career Sync] Sync completed successfully');
    console.log(
      `[Web3.career Sync] Added: ${added}, Updated: ${updated}, Removed: ${removed}, Errors: ${errors}`
    );

    return {
      success: true,
      added,
      updated,
      removed,
      errors,
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
};
