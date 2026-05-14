const Job = require('../models/Job');
const Parser = require('rss-parser');
const { cleanHTML, formatJobContent } = require('./rssJobFormatting');
const {
  parseSalary,
  extractCompany,
  extractRequirements,
  formatRequirements,
  removeRequirementsFromDescription,
} = require('./rssJobCommon');

const HIMALAYAS_RSS_URL = 'https://himalayas.app/jobs/rss';

/** Logo hosts Himalayas uses in its RSS (extend if their CDN changes). */
const HIMALAYAS_LOGO_HOSTS = new Set(['cdn-images.himalayas.app']);

function isTrustedHimalayasLogoHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (HIMALAYAS_LOGO_HOSTS.has(h)) return true;
  for (const allowed of HIMALAYAS_LOGO_HOSTS) {
    if (h.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

/** Only persist http(s) URLs on known Himalayas image hosts. */
function normalizeTrustedHimalayasLogoUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim();
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!isTrustedHimalayasLogoHost(u.hostname)) return null;
  return u.href;
}

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['himalayasJobs:companyName', 'himalayasCompanyName'],
      ['himalayasJobs:companyLogo', 'himalayasCompanyLogo'],
      ['himalayasJobs:locationRestriction', 'himalayasLocations', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

/**
 * Map Himalayas <himalayasJobs:locationRestriction> values into the Job
 * schema. Himalayas is a remote job board, so workArrangement stays 'remote'
 * and we only use the restriction text to populate country/city for display.
 */
function parseLocationHimalayas(item) {
  const restrictions = Array.isArray(item.himalayasLocations)
    ? item.himalayasLocations.map((s) => (s || '').trim()).filter(Boolean)
    : [];

  if (restrictions.length === 0) {
    return {
      workArrangement: 'remote',
      location: { country: 'Remote', city: '' },
    };
  }

  const first = restrictions[0];
  const lower = first.toLowerCase();

  if (
    lower.includes('worldwide') ||
    lower.includes('anywhere') ||
    lower.includes('global') ||
    lower === 'remote'
  ) {
    return {
      workArrangement: 'remote',
      location: { country: 'Remote', city: '' },
    };
  }

  if (restrictions.length > 1) {
    return {
      workArrangement: 'remote',
      location: { country: first, city: '' },
    };
  }

  if (first.includes(',')) {
    const parts = first.split(',');
    return {
      workArrangement: 'remote',
      location: { country: parts[1].trim(), city: parts[0].trim() },
    };
  }

  return {
    workArrangement: 'remote',
    location: { country: first, city: '' },
  };
}

function mapRSSItemToJob(item) {
  const title = cleanHTML(item.title || '');
  const rawContent =
    item.contentEncoded || item.content || item.contentSnippet || item.description || '';

  let description = formatJobContent(rawContent);

  // Himalayas exposes the company name as a dedicated namespaced field.
  // Feed it into the shared extractor via item.company so existing fallbacks
  // (title parsing, "Company") still apply when the field is missing.
  const companyName = (item.himalayasCompanyName || '').trim();
  const company = extractCompany(
    title,
    { ...item, company: companyName || item.company },
    'Himalayas'
  );

  const salary = parseSalary(title, description);
  const locationInfo = parseLocationHimalayas(item);

  const rawRequirements = extractRequirements(description);
  const requirements = formatRequirements(rawRequirements);

  if (requirements && requirements !== 'See job description for requirements') {
    description = removeRequirementsFromDescription(description);
  }

  // Image priority: dedicated himalayasJobs:companyLogo, then media:content,
  // then enclosure (rare on this feed). All gated through the trusted-host
  // allowlist so we never persist arbitrary external URLs.
  const companyLogo =
    normalizeTrustedHimalayasLogoUrl(item.himalayasCompanyLogo) ||
    normalizeTrustedHimalayasLogoUrl(item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) ||
    normalizeTrustedHimalayasLogoUrl(item.enclosure && item.enclosure.url);

  return {
    title,
    description,
    requirements: requirements || 'See job description for requirements',
    payAmount: salary?.payAmount || null,
    payType: salary?.payType || null,
    jobType: 'hiring',
    workArrangement: locationInfo.workArrangement,
    location: locationInfo.location,
    ownerUsername: company,
    ownerImage: null,
    companyLogo,
    status: 'active',
    source: 'himalayas',
    externalUrl: item.link,
    externalId: (item.guid || item.link || '').toString(),
    lastSynced: new Date(),
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  };
}

async function syncHimalayasJobs() {
  const syncStartTime = new Date();
  console.log(`[Himalayas Sync] Starting sync at ${syncStartTime.toISOString()}`);

  try {
    console.log(`[Himalayas Sync] Fetching jobs from ${HIMALAYAS_RSS_URL}`);

    const feed = await parser.parseURL(HIMALAYAS_RSS_URL);

    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('[Himalayas Sync] No jobs found in RSS feed');
      return { success: true, added: 0, updated: 0, removed: 0, errors: 0 };
    }

    console.log(`[Himalayas Sync] Successfully fetched ${feed.items.length} jobs from RSS`);

    let added = 0;
    let updated = 0;
    let errors = 0;

    for (const item of feed.items) {
      try {
        const jobData = mapRSSItemToJob(item);

        if (!jobData.title || !jobData.externalId) {
          console.log('[Himalayas Sync] Skipping item with missing title or ID');
          continue;
        }

        const existingJob = await Job.findOne({
          externalId: jobData.externalId,
          source: 'himalayas',
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
          existingJob.lastSynced = syncStartTime;
          await existingJob.save();
          updated++;
        } else {
          await new Job(jobData).save();
          added++;
        }
      } catch (error) {
        console.error(`[Himalayas Sync] Error processing item: ${item.title}`, error.message);
        errors++;
      }
    }

    // Drop only after 30 days with no successful sync touch (jobs missing from latest RSS remain in DB)
    const retentionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const removeResult = await Job.deleteMany({
      source: 'himalayas',
      lastSynced: { $lt: retentionCutoff },
    });

    const removed = removeResult.deletedCount;

    console.log('[Himalayas Sync] Sync completed successfully');
    console.log(`[Himalayas Sync] Added: ${added}, Updated: ${updated}, Removed: ${removed}, Errors: ${errors}`);

    return {
      success: true,
      added,
      updated,
      removed,
      errors,
      timestamp: syncStartTime,
    };
  } catch (error) {
    console.error('[Himalayas Sync] Sync failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: syncStartTime,
    };
  }
}

module.exports = {
  syncHimalayasJobs,
  // Exported for test scripts / dry-run probing.
  mapRSSItemToJob,
};
