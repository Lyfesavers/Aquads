const Job = require('../models/Job');
const axios = require('axios');

const REMOTIVE_API_URL = 'https://remotive.com/api/remote-jobs';

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
 * Clean and format HTML content to well-structured plain text
 */
function cleanHTML(html) {
  if (!html) return '';
  
  let text = html;
  
  // First, normalize whitespace within tags but preserve intentional breaks
  text = text.replace(/>\s+</g, '> <');
  
  // Handle headings - add double newline before and after, make them stand out
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n📌 $1\n\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n📌 $1\n\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n▸ $1\n\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n▸ $1\n\n');
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n$1\n\n');
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n$1\n\n');
  
  // Handle strong/bold text - keep inline
  text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1');
  text = text.replace(/<b[^>]*>(.*?)<\/b>/gi, '$1');
  
  // Handle emphasis/italic
  text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '$1');
  text = text.replace(/<i[^>]*>(.*?)<\/i>/gi, '$1');
  
  // Handle line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Handle horizontal rules
  text = text.replace(/<hr\s*\/?>/gi, '\n────────────────\n');
  
  // Handle blockquotes
  text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n│ $1\n');
  
  // Handle unordered lists
  text = text.replace(/<ul[^>]*>/gi, '\n');
  text = text.replace(/<\/ul>/gi, '\n');
  
  // Handle ordered lists
  text = text.replace(/<ol[^>]*>/gi, '\n');
  text = text.replace(/<\/ol>/gi, '\n');
  
  // Handle list items with bullet points
  text = text.replace(/<li[^>]*>/gi, '  • ');
  text = text.replace(/<\/li>/gi, '\n');
  
  // Handle divs as paragraph breaks
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '');
  
  // Handle paragraphs
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<p[^>]*>/gi, '');
  
  // Handle tables simply
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>/gi, ' | ');
  text = text.replace(/<\/th>/gi, ' | ');
  text = text.replace(/<table[^>]*>/gi, '\n');
  text = text.replace(/<\/table>/gi, '\n');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '...')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')           // Multiple spaces/tabs to single space
    .replace(/ \n/g, '\n')             // Remove trailing spaces before newlines
    .replace(/\n /g, '\n')             // Remove leading spaces after newlines
    .replace(/\n{4,}/g, '\n\n\n')      // Max 3 consecutive newlines
    .replace(/\n{3}/g, '\n\n')         // Reduce triple newlines to double
    .trim();
  
  return text;
}

/**
 * Format job description for better readability
 */
function formatJobContent(content) {
  if (!content) return '';
  
  let formatted = cleanHTML(content);
  
  // Add section headers if they exist but aren't formatted
  const sectionPatterns = [
    { pattern: /^(about\s+(?:the\s+)?(?:role|position|job|company|us|team))[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(responsibilities|what\s+you['']?ll\s+do|your\s+role)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(requirements?|qualifications?|what\s+we['']?re\s+looking\s+for|what\s+you['']?ll\s+need|must\s+have|skills?)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(nice\s+to\s+have|preferred|bonus\s+points?)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(benefits?|perks?|what\s+we\s+offer|compensation)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(how\s+to\s+apply|application\s+process)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
    { pattern: /^(about\s+(?:the\s+)?company|who\s+we\s+are)[:.]?\s*/gim, replacement: '\n\n📋 $1\n' },
  ];
  
  for (const { pattern, replacement } of sectionPatterns) {
    formatted = formatted.replace(pattern, replacement);
  }
  
  // Convert common text patterns to bullet points if not already
  formatted = formatted.replace(/^[\-\*]\s+/gm, '  • ');
  
  // Convert numbered items to cleaner format
  formatted = formatted.replace(/^(\d+)\.\s+/gm, '  $1. ');
  
  // Ensure proper spacing after section headers
  formatted = formatted.replace(/(📋[^\n]+)\n([^\n])/g, '$1\n\n$2');
  
  // Clean up any remaining issues
  formatted = formatted
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s+/gm, (match) => match.length > 4 ? '    ' : match)
    .trim();
  
  return formatted;
}

/**
 * Extract company name from title, content, or item
 */
function extractCompany(title, description, item = {}) {
  // First check if company name is directly provided (from API)
  if (item.company) return item.company;
  
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
  const rawContent = item.contentSnippet || item.content || item.description;
  const description = formatJobContent(rawContent);
  const category = item.category || 'General';
  const company = extractCompany(title, description, item);
  
  // Parse salary from item data or description
  let salary = null;
  if (item.salary) {
    const salaryStr = item.salary.toString();
    const salaryLower = salaryStr.toLowerCase();
    
    // Skip if it's not USD salary
    const isUSD = salaryLower.includes('usd') || 
                  salaryLower.includes('$') || 
                  (!salaryLower.includes('yen') && 
                   !salaryLower.includes('mxn') && 
                   !salaryLower.includes('pln') && 
                   !salaryLower.includes('inr') &&
                   !salaryLower.includes(' rs ') &&
                   !salaryLower.includes('cad') &&
                   !salaryLower.includes('gbp') &&
                   !salaryLower.includes('£') &&
                   !salaryLower.includes('₱') &&
                   !salaryLower.includes('php'));
    
    // Check for pay period indicators
    const isHourly = salaryLower.includes('/hr') || 
                     salaryLower.includes('per hour') ||
                     salaryLower.includes('/hour');
    const isMonthly = salaryLower.includes('month') || 
                      salaryLower.includes('/mo') || 
                      salaryLower.includes('per month');
    const isYearly = salaryLower.includes('year') || 
                     salaryLower.includes('annual') || 
                     salaryLower.includes('/yr') ||
                     salaryLower.includes('per year');
    
    // Skip if it's a benefits description (like "401k")
    const isBenefits = salaryLower.includes('401k') || 
                       salaryLower.includes('benefits');
    
    // Only process if it's USD and not benefits
    if (isUSD && !isBenefits) {
      // Extract numbers - handle ranges like "$5k-$8k", "$22/hr", or just "$5k"
      const salaryMatch = salaryStr.match(/\$?(\d+,?\d*)[kK]?/);
      if (salaryMatch) {
        const amountStr = salaryMatch[1].replace(',', '');
        const amount = parseInt(amountStr);
        
        // Determine pay type and normalize amount
        let payType = 'year'; // Default assumption
        let normalizedAmount = amount;
        
        if (isHourly) {
          // Hourly rate - keep as is (don't multiply by 1000)
          payType = 'hour';
          normalizedAmount = amount;
          console.log(`[Remotive] Hourly rate detected: $${normalizedAmount}/hour`);
        } else if (isMonthly) {
          payType = 'month';
          normalizedAmount = amount >= 1000 ? amount : amount * 1000;
        } else if (isYearly) {
          payType = 'year';
          normalizedAmount = amount >= 1000 ? amount : amount * 1000;
        } else {
          // Heuristic based on amount
          if (amount < 100) {
            // Small numbers are likely hourly
            payType = 'hour';
            normalizedAmount = amount;
          } else if (amount < 1000) {
            // Numbers in hundreds could be 500k salary
            normalizedAmount = amount * 1000;
            payType = 'year';
          } else if (normalizedAmount < 30000) {
            // Under 30k likely monthly
            payType = 'month';
          } else {
            // Over 30k likely yearly
            payType = 'year';
          }
        }
        
        salary = {
          payAmount: normalizedAmount,
          payType: payType
        };
      }
    }
  } else {
    // Parse from description
    salary = parseSalary(title, description);
  }
  
  // Parse location from API data or description
  let locationInfo;
  if (item.location) {
    // Parse location string - can be like "USA", "Europe", "Worldwide", etc.
    const locationStr = item.location.trim();
    let country = locationStr;
    let city = '';
    
    // Check if it's a specific country or region
    if (locationStr.toLowerCase().includes('worldwide') || locationStr.toLowerCase().includes('anywhere')) {
      country = 'Worldwide';
      city = 'Remote';
    } else if (locationStr.includes(',')) {
      // Format like "City, Country"
      const parts = locationStr.split(',');
      city = parts[0].trim();
      country = parts[1].trim();
    } else {
      // Just country/region
      country = locationStr;
      city = '';
    }
    
    locationInfo = {
      workArrangement: 'remote',
      location: { 
        country: country,
        city: city || undefined
      }
    };
  } else {
    locationInfo = parseLocation(description, category);
  }
  
  // Extract requirements from description
  // Split by common section headers
  const descLower = description.toLowerCase();
  let requirements = 'See job description for requirements';
  
  if (descLower.includes('requirements:') || descLower.includes('qualifications:')) {
    const reqStart = Math.max(
      descLower.indexOf('requirements:'),
      descLower.indexOf('qualifications:')
    );
    if (reqStart > -1) {
      const reqSection = description.substring(reqStart);
      const nextSection = reqSection.search(/\n\n[A-Z]/);
      requirements = nextSection > -1 ? reqSection.substring(0, nextSection) : reqSection.substring(0, 500);
    }
  } else {
    // Use second paragraph as fallback
    const descriptionParts = description.split('\n\n');
    if (descriptionParts.length > 1) {
      requirements = descriptionParts[1].substring(0, 500);
    }
  }
  
  return {
    title: title,
    description: description,
    requirements: requirements.trim() || 'See job description for requirements',
    payAmount: salary?.payAmount || null,
    payType: salary?.payType || null,
    jobType: 'hiring', // Remotive jobs are all hiring positions
    workArrangement: locationInfo.workArrangement,
    location: locationInfo.location,
    ownerUsername: company,
    ownerImage: null,
    companyLogo: item.companyLogo || null, // Store company logo
    status: 'active',
    source: 'remotive',
    externalUrl: item.link,
    externalId: item.guid || item.link,
    lastSynced: new Date(),
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date()
  };
}

/**
 * Sync jobs from Remotive API
 */
async function syncRemotiveJobs() {
  const syncStartTime = new Date();
  console.log(`[Remotive Sync] Starting sync at ${syncStartTime.toISOString()}`);
  
  try {
    // Fetch jobs from Remotive API
    console.log(`[Remotive Sync] Fetching jobs from ${REMOTIVE_API_URL}`);
    
    const response = await axios.get(REMOTIVE_API_URL, {
      headers: {
        'User-Agent': 'Aquads Job Board',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    if (!response.data || !response.data.jobs) {
      console.log('[Remotive Sync] No jobs found in API response');
      return {
        success: true,
        added: 0,
        updated: 0,
        removed: 0,
        errors: 0
      };
    }
    
    // Convert API response to feed format for processing
    const feed = {
      items: response.data.jobs.slice(0, 100).map(job => ({
        title: job.title,
        link: job.url,
        guid: job.id ? job.id.toString() : job.url,
        pubDate: job.publication_date,
        category: job.category,
        content: job.description,
        contentSnippet: job.description,
        company: job.company_name,
        companyLogo: job.company_logo || job.company_logo_url,
        salary: job.salary,
        jobType: job.job_type,
        location: job.candidate_required_location,
        tags: job.tags
      }))
    };
    
    console.log(`[Remotive Sync] Successfully fetched ${feed.items.length} jobs from API`);
    
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
          // Update existing job with all new data
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

