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

const WWR_RSS_URL = 'https://weworkremotely.com/remote-jobs.rss';

/** Logo hosts WWR uses in RSS / description HTML (extend if their CDN changes). */
const WWR_LOGO_HOSTS = new Set(['we-work-remotely.imgix.net', 'wwr-pro.s3.amazonaws.com']);

function isTrustedWWRLogoHost(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  if (WWR_LOGO_HOSTS.has(h)) return true;
  for (const allowed of WWR_LOGO_HOSTS) {
    if (h.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

/** Only persist http(s) URLs on known WWR image hosts. */
function normalizeTrustedWWRLogoUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim();
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!isTrustedWWRLogoHost(u.hostname)) return null;
  return u.href;
}

/**
 * First <img src> in description HTML when <media:content> is missing.
 * Many listings still have no image in RSS at all — then we return null.
 */
function extractWWRLogoFromDescriptionHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const quoted = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"'<>]+)["']/i);
  const unquoted = quoted ? null : html.match(/<img\b[^>]*\bsrc\s*=\s*([^\s>"']+)/i);
  const raw = quoted ? quoted[1] : unquoted ? unquoted[1] : null;
  if (!raw) return null;
  const src = raw
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
  return normalizeTrustedWWRLogoUrl(src);
}

const parser = new Parser({
  customFields: {
    item: [
      ['region', 'region'],
      ['country', 'country'],
      ['state', 'state'],
      ['skills', 'skills'],
      ['category', 'category'],
      ['type', 'type'],
      ['expires_at', 'expiresAt'],
      ['media:content', 'mediaContent'],
    ],
  },
});

function parseLocationWWR(item) {
  const regionRaw = (item.region || '').trim();
  const region = regionRaw.toLowerCase();

  if (
    !region ||
    region.includes('anywhere') ||
    region.includes('world') ||
    region.includes('worldwide')
  ) {
    const country = regionRaw || (item.country && item.country.trim()) || 'Remote';
    const city = (item.state && item.state.trim()) || '';
    return {
      workArrangement: 'remote',
      location: { country, city },
    };
  }

  const country = (item.country && item.country.trim()) || regionRaw;
  const city = (item.state && item.state.trim()) || '';
  return {
    workArrangement: 'remote',
    location: { country, city },
  };
}

function mapRSSItemToJob(item) {
  const title = cleanHTML(item.title || '', { source: 'weworkremotely' });
  const rawContent = item.content || item.contentSnippet || item.description || '';

  let description = formatJobContent(rawContent, 'weworkremotely');
  const company = extractCompany(title, item, 'We Work Remotely');

  const salary = parseSalary(title, description);
  const locationInfo = parseLocationWWR(item);

  const rawRequirements = extractRequirements(description);
  const requirements = formatRequirements(rawRequirements);

  if (requirements && requirements !== 'See job description for requirements') {
    description = removeRequirementsFromDescription(description);
  }

  let companyLogo =
    normalizeTrustedWWRLogoUrl(item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) ||
    normalizeTrustedWWRLogoUrl(item.enclosure && item.enclosure.url) ||
    extractWWRLogoFromDescriptionHtml(rawContent);

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
    source: 'weworkremotely',
    externalUrl: item.link,
    externalId: (item.guid || item.link || '').toString(),
    lastSynced: new Date(),
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  };
}

async function syncWeWorkRemotelyJobs() {
  const syncStartTime = new Date();
  console.log(`[WeWorkRemotely Sync] Starting sync at ${syncStartTime.toISOString()}`);

  try {
    console.log(`[WeWorkRemotely Sync] Fetching jobs from ${WWR_RSS_URL}`);

    const feed = await parser.parseURL(WWR_RSS_URL);

    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('[WeWorkRemotely Sync] No jobs found in RSS feed');
      return { success: true, added: 0, updated: 0, removed: 0, errors: 0 };
    }

    console.log(`[WeWorkRemotely Sync] Successfully fetched ${feed.items.length} jobs from RSS`);

    let added = 0;
    let updated = 0;
    let errors = 0;

    for (const item of feed.items) {
      try {
        const jobData = mapRSSItemToJob(item);

        if (!jobData.title || !jobData.externalId) {
          console.log('[WeWorkRemotely Sync] Skipping item with missing title or ID');
          continue;
        }

        const existingJob = await Job.findOne({
          externalId: jobData.externalId,
          source: 'weworkremotely',
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
        console.error(`[WeWorkRemotely Sync] Error processing item: ${item.title}`, error.message);
        errors++;
      }
    }

    const removeResult = await Job.deleteMany({
      source: 'weworkremotely',
      lastSynced: { $lt: syncStartTime },
    });

    const removed = removeResult.deletedCount;

    console.log('[WeWorkRemotely Sync] Sync completed successfully');
    console.log(`[WeWorkRemotely Sync] Added: ${added}, Updated: ${updated}, Removed: ${removed}, Errors: ${errors}`);

    return {
      success: true,
      added,
      updated,
      removed,
      errors,
      timestamp: syncStartTime,
    };
  } catch (error) {
    console.error('[WeWorkRemotely Sync] Sync failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: syncStartTime,
    };
  }
}

module.exports = {
  syncWeWorkRemotelyJobs,
};
