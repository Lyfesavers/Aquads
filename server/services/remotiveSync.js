const Parser = require('rss-parser');
const Job = require('../models/Job');

const parser = new Parser({
  customFields: {
    item: [
      ['category', 'category'],
      ['pubDate', 'pubDate'],
      ['link', 'link'],
      ['guid', 'guid']
    ]
  }
});

const REMOTIVE_RSS_URL = 'https://remotive.com/remote-jobs/rss-feed';

/**
 * Parse salary information from job title or description
 * Returns { payAmount, payType } or null if not found
 */
function parseSalary(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  // Look for salary patterns like "$50k-$80k", "$50,000", "50k", etc.
  const salaryPatterns = [
    /\$(\d+)k?-?\$?(\d+)?k/i,  // $50k-$80k or $50k
    /\$(\d{1,3}),?(\d{3})/,     // $50,000
    /(\d+)k?\s*-\s*(\d+)k/i     // 50-80k
  ];
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseInt(match[1]);
      return {
        payAmount: amount >= 1000 ? amount : amount * 1000,
        payType: 'yearly'
      };
    }
  }
  
  return null;
}

/**
 * Parse location from job description
 * Returns work arrangement and location details
 */
function parseLocation(description, category) {
  const descLower = description.toLowerCase();
  
  // Check for remote indicators
  if (descLower.includes('remote') || descLower.includes('work from home') || 
      descLower.includes('anywhere') || category.toLowerCase().includes('remote')) {
    return {
      workArrangement: 'remote',
      location: { country: 'Remote', city: 'Anywhere' }
    };
  }
  
  // Check for hybrid
  if (descLower.includes('hybrid')) {
    return {
      workArrangement: 'hybrid',
      location: { country: 'Various', city: 'Hybrid' }
    };
  }
  
  // Default to remote for Remotive jobs (they're a remote job board)
  return {
    workArrangement: 'remote',
    location: { country: 'Remote', city: 'Anywhere' }
  };
}

/**
 * Clean and format HTML content to plain text
 */
function cleanHTML(html) {
  if (!html) return '';
  
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Extract company name from title or content
 */
function extractCompany(title, description) {
  // Common patterns: "Position at Company" or "Company - Position"
  const atPattern = /at\s+([^-\n]+)/i;
  const dashPattern = /^([^-]+)\s+-/;
  
  let match = title.match(atPattern);
  if (match) return match[1].trim();
  
  match = title.match(dashPattern);
  if (match) return match[1].trim();
  
  // If no pattern found, extract from description or use "Remote Company"
  return 'Remote Company';
}

/**
 * Map RSS feed item to Job schema
 */
function mapRSSItemToJob(item) {
  const title = cleanHTML(item.title);
  const description = cleanHTML(item.contentSnippet || item.content || item.description);
  const category = item.category || 'General';
  const company = extractCompany(title, description);
  
  // Parse salary (may be null)
  const salary = parseSalary(title, description);
  
  // Parse location
  const locationInfo = parseLocation(description, category);
  
  // Extract requirements from description (use first part as requirements)
  const descriptionParts = description.split('\n\n');
  const requirements = descriptionParts.length > 1 ? descriptionParts[1] : 'See job description for requirements';
  
  return {
    title: title,
    description: description,
    requirements: requirements,
    payAmount: salary?.payAmount || null,
    payType: salary?.payType || null,
    jobType: 'hiring', // Remotive jobs are all hiring positions
    workArrangement: locationInfo.workArrangement,
    location: locationInfo.location,
    ownerUsername: company,
    ownerImage: null,
    status: 'active',
    source: 'remotive',
    externalUrl: item.link,
    externalId: item.guid || item.link,
    lastSynced: new Date(),
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date()
  };
}

/**
 * Sync jobs from Remotive RSS feed
 */
async function syncRemotiveJobs() {
  const syncStartTime = new Date();
  console.log(`[Remotive Sync] Starting sync at ${syncStartTime.toISOString()}`);
  
  try {
    // Fetch and parse RSS feed
    console.log(`[Remotive Sync] Fetching feed from ${REMOTIVE_RSS_URL}`);
    const feed = await parser.parseURL(REMOTIVE_RSS_URL);
    
    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('[Remotive Sync] No items found in feed');
      return {
        success: true,
        added: 0,
        updated: 0,
        removed: 0,
        errors: 0
      };
    }
    
    console.log(`[Remotive Sync] Found ${feed.items.length} items in feed`);
    
    let added = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each item from the feed
    for (const item of feed.items) {
      try {
        const jobData = mapRSSItemToJob(item);
        
        // Check if job already exists
        const existingJob = await Job.findOne({ 
          externalId: jobData.externalId,
          source: 'remotive'
        });
        
        if (existingJob) {
          // Update lastSynced timestamp
          existingJob.lastSynced = syncStartTime;
          await existingJob.save();
          updated++;
        } else {
          // Create new job
          const newJob = new Job(jobData);
          await newJob.save();
          added++;
        }
      } catch (error) {
        console.error(`[Remotive Sync] Error processing item: ${item.title}`, error.message);
        errors++;
      }
    }
    
    // Remove jobs that weren't in this sync (they disappeared from the feed)
    const removeResult = await Job.deleteMany({
      source: 'remotive',
      lastSynced: { $lt: syncStartTime }
    });
    
    const removed = removeResult.deletedCount;
    
    console.log(`[Remotive Sync] Sync completed successfully`);
    console.log(`[Remotive Sync] Added: ${added}, Updated: ${updated}, Removed: ${removed}, Errors: ${errors}`);
    
    return {
      success: true,
      added,
      updated,
      removed,
      errors,
      timestamp: syncStartTime
    };
    
  } catch (error) {
    console.error('[Remotive Sync] Sync failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: syncStartTime
    };
  }
}

module.exports = {
  syncRemotiveJobs
};

