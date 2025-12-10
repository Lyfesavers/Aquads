const Job = require('../models/Job');
const Parser = require('rss-parser');

const CRYPTO_JOBS_RSS_URL = 'https://api.cryptojobslist.com/jobs.rss';

// Initialize RSS parser with custom fields
const parser = new Parser({
  customFields: {
    item: [
      ['company', 'company'],
      ['location', 'location'],
      ['salary', 'salary'],
      ['category', 'category'],
      ['dc:creator', 'creator'],
      ['media:content', 'mediaContent']
    ]
  }
});

/**
 * Parse salary information from job content
 * Returns { payAmount, payType } or null if not found
 */
function parseSalary(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  // Look for salary patterns like "$50k-$80k", "$50,000", "50k", "$100/hr", etc.
  const salaryPatterns = [
    /\$(\d+)k?\s*-\s*\$?(\d+)?k?\s*(?:\/hr|per\s*hour|hourly)/i, // Hourly range
    /\$(\d+)\s*(?:\/hr|per\s*hour|hourly)/i, // Hourly single
    /\$(\d+)k?\s*-\s*\$?(\d+)?k?\s*(?:\/yr|per\s*year|yearly|annual)/i, // Yearly range
    /\$(\d+)k?\s*-\s*\$?(\d+)?k/i,  // $50k-$80k or $50k
    /\$(\d{1,3}),?(\d{3})/,         // $50,000
    /(\d+)k?\s*-\s*(\d+)k/i         // 50-80k
  ];
  
  // Check for hourly
  const isHourly = text.includes('/hr') || text.includes('per hour') || text.includes('hourly');
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(',', ''));
      
      if (isHourly) {
        return {
          payAmount: amount,
          payType: 'hour'
        };
      }
      
      return {
        payAmount: amount >= 1000 ? amount : amount * 1000,
        payType: 'year'
      };
    }
  }
  
  return null;
}

/**
 * Clean and format HTML content to plain text
 */
function cleanHTML(html) {
  if (!html) return '';
  
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract company name from title or item
 */
function extractCompany(title, item = {}) {
  // Check if company name is directly provided
  if (item.company) return item.company.trim();
  if (item.creator) return item.creator.trim();
  
  // Common patterns: "Position at Company" or "Company - Position" or "Company: Position"
  const atPattern = /at\s+([^-–\n]+?)(?:\s*[-–]|$)/i;
  const dashPattern = /^([^-–]+?)\s*[-–]/;
  const colonPattern = /^([^:]+?):\s/;
  
  let match = title.match(atPattern);
  if (match) return match[1].trim();
  
  match = title.match(dashPattern);
  if (match) return match[1].trim();
  
  match = title.match(colonPattern);
  if (match) return match[1].trim();
  
  return 'Crypto Company';
}

/**
 * Parse location from item or description
 */
function parseLocation(item, description) {
  const descLower = description.toLowerCase();
  
  // Check item location field first
  if (item.location) {
    const locationStr = item.location.trim().toLowerCase();
    
    if (locationStr.includes('remote') || locationStr.includes('worldwide') || locationStr.includes('anywhere')) {
      return {
        workArrangement: 'remote',
        location: { country: 'Remote', city: 'Worldwide' }
      };
    }
    
    // Parse location string
    if (item.location.includes(',')) {
      const parts = item.location.split(',');
      return {
        workArrangement: 'remote', // Most crypto jobs are remote
        location: { city: parts[0].trim(), country: parts[1].trim() }
      };
    }
    
    return {
      workArrangement: 'remote',
      location: { country: item.location.trim(), city: '' }
    };
  }
  
  // Check description for location indicators
  if (descLower.includes('remote') || descLower.includes('work from home') || 
      descLower.includes('anywhere') || descLower.includes('worldwide')) {
    return {
      workArrangement: 'remote',
      location: { country: 'Remote', city: 'Worldwide' }
    };
  }
  
  if (descLower.includes('hybrid')) {
    return {
      workArrangement: 'hybrid',
      location: { country: 'Various', city: 'Hybrid' }
    };
  }
  
  // Default to remote for crypto jobs (most are remote)
  return {
    workArrangement: 'remote',
    location: { country: 'Remote', city: 'Worldwide' }
  };
}

/**
 * Extract requirements from description
 */
function extractRequirements(description) {
  const descLower = description.toLowerCase();
  
  // Look for requirements section
  const reqPatterns = [
    /requirements?:?\s*([\s\S]*?)(?=\n\n[A-Z]|responsibilities|benefits|about|how to apply|$)/i,
    /qualifications?:?\s*([\s\S]*?)(?=\n\n[A-Z]|responsibilities|benefits|about|how to apply|$)/i,
    /what you['']?ll need:?\s*([\s\S]*?)(?=\n\n[A-Z]|responsibilities|benefits|about|how to apply|$)/i,
    /must have:?\s*([\s\S]*?)(?=\n\n[A-Z]|responsibilities|benefits|about|how to apply|$)/i
  ];
  
  for (const pattern of reqPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 1000);
    }
  }
  
  // Fallback: use first 500 chars of description
  return description.substring(0, 500).trim() || 'See job description for requirements';
}

/**
 * Map RSS feed item to Job schema
 */
function mapRSSItemToJob(item) {
  const title = cleanHTML(item.title || '');
  const description = cleanHTML(item.contentSnippet || item.content || item.description || '');
  const company = extractCompany(title, item);
  
  // Parse salary
  const salary = item.salary 
    ? parseSalaryFromField(item.salary) 
    : parseSalary(title, description);
  
  // Parse location
  const locationInfo = parseLocation(item, description);
  
  // Extract requirements
  const requirements = extractRequirements(description);
  
  // Get company logo if available
  let companyLogo = null;
  if (item.mediaContent && item.mediaContent.$) {
    companyLogo = item.mediaContent.$.url;
  } else if (item.enclosure && item.enclosure.url) {
    companyLogo = item.enclosure.url;
  }
  
  return {
    title: title,
    description: description,
    requirements: requirements || 'See job description for requirements',
    payAmount: salary?.payAmount || null,
    payType: salary?.payType || null,
    jobType: 'hiring', // CryptoJobsList jobs are hiring positions
    workArrangement: locationInfo.workArrangement,
    location: locationInfo.location,
    ownerUsername: company,
    ownerImage: null,
    companyLogo: companyLogo,
    status: 'active',
    source: 'cryptojobslist',
    externalUrl: item.link,
    externalId: item.guid || item.link,
    lastSynced: new Date(),
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date()
  };
}

/**
 * Parse salary from a dedicated salary field
 */
function parseSalaryFromField(salaryStr) {
  if (!salaryStr) return null;
  
  const salaryLower = salaryStr.toLowerCase();
  
  // Skip non-USD currencies
  if (salaryLower.includes('eur') || salaryLower.includes('gbp') || 
      salaryLower.includes('£') || salaryLower.includes('€') ||
      salaryLower.includes('cad') || salaryLower.includes('aud')) {
    // Still try to parse if no USD indicator
    if (!salaryLower.includes('usd') && !salaryLower.includes('$')) {
      return null;
    }
  }
  
  // Check pay period
  const isHourly = salaryLower.includes('/hr') || salaryLower.includes('per hour') || salaryLower.includes('hourly');
  const isMonthly = salaryLower.includes('month') || salaryLower.includes('/mo');
  
  // Extract first number
  const match = salaryStr.match(/\$?(\d+,?\d*)[kK]?/);
  if (match) {
    const amountStr = match[1].replace(',', '');
    let amount = parseInt(amountStr);
    
    // Normalize based on indicators
    if (salaryStr.toLowerCase().includes('k')) {
      amount = amount * 1000;
    }
    
    if (isHourly) {
      return { payAmount: amount, payType: 'hour' };
    } else if (isMonthly) {
      return { payAmount: amount, payType: 'month' };
    } else {
      // Assume yearly for larger amounts
      if (amount < 500) {
        return { payAmount: amount, payType: 'hour' };
      }
      return { payAmount: amount >= 1000 ? amount : amount * 1000, payType: 'year' };
    }
  }
  
  return null;
}

/**
 * Sync jobs from CryptoJobsList RSS feed
 */
async function syncCryptoJobsListJobs() {
  const syncStartTime = new Date();
  console.log(`[CryptoJobsList Sync] Starting sync at ${syncStartTime.toISOString()}`);
  
  try {
    // Fetch and parse RSS feed
    console.log(`[CryptoJobsList Sync] Fetching jobs from ${CRYPTO_JOBS_RSS_URL}`);
    
    const feed = await parser.parseURL(CRYPTO_JOBS_RSS_URL);
    
    if (!feed || !feed.items || feed.items.length === 0) {
      console.log('[CryptoJobsList Sync] No jobs found in RSS feed');
      return {
        success: true,
        added: 0,
        updated: 0,
        removed: 0,
        errors: 0
      };
    }
    
    console.log(`[CryptoJobsList Sync] Successfully fetched ${feed.items.length} jobs from RSS`);
    
    let added = 0;
    let updated = 0;
    let errors = 0;
    
    // Process each item from the feed (limit to 100 most recent)
    const itemsToProcess = feed.items.slice(0, 100);
    
    for (const item of itemsToProcess) {
      try {
        const jobData = mapRSSItemToJob(item);
        
        // Skip if essential data is missing
        if (!jobData.title || !jobData.externalId) {
          console.log(`[CryptoJobsList Sync] Skipping item with missing title or ID`);
          continue;
        }
        
        // Check if job already exists
        const existingJob = await Job.findOne({ 
          externalId: jobData.externalId,
          source: 'cryptojobslist'
        });
        
        if (existingJob) {
          // Update existing job
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
          // Create new job
          const newJob = new Job(jobData);
          await newJob.save();
          added++;
        }
      } catch (error) {
        console.error(`[CryptoJobsList Sync] Error processing item: ${item.title}`, error.message);
        errors++;
      }
    }
    
    // Remove jobs that weren't in this sync (they disappeared from the feed)
    const removeResult = await Job.deleteMany({
      source: 'cryptojobslist',
      lastSynced: { $lt: syncStartTime }
    });
    
    const removed = removeResult.deletedCount;
    
    console.log(`[CryptoJobsList Sync] Sync completed successfully`);
    console.log(`[CryptoJobsList Sync] Added: ${added}, Updated: ${updated}, Removed: ${removed}, Errors: ${errors}`);
    
    return {
      success: true,
      added,
      updated,
      removed,
      errors,
      timestamp: syncStartTime
    };
    
  } catch (error) {
    console.error('[CryptoJobsList Sync] Sync failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: syncStartTime
    };
  }
}

module.exports = {
  syncCryptoJobsListJobs
};

