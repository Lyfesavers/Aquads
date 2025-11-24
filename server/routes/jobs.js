const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');
const axios = require('axios');
const { JSDOM } = require('jsdom');

// Debug route
router.get('/test', (req, res) => {

  res.json({ message: 'Jobs API is working' });
});

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const query = {};
    
    // Add owner filter if provided
    if (req.query.owner) {
      query.owner = req.query.owner;
    }
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Update status of expired user jobs (not external jobs)
    await Job.updateMany(
      { 
        source: 'user',
        createdAt: { $lt: thirtyDaysAgo },
        status: 'active'
      },
      { 
        $set: { status: 'expired' }
      }
    );
    
    // Only return active jobs
    if (!req.query.includeExpired) {
      query.status = 'active';
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 jobs per page
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalJobs = await Job.countDocuments(query);
    
    // Fetch jobs with pagination
    // Sort by source first (user jobs first), then by createdAt (newest first)
    const jobs = await Job.find(query)
      .populate('owner', 'username image')
      .sort({ source: 1, createdAt: -1 }) // User jobs first, then by date
      .skip(skip)
      .limit(limit);
    
    res.json({
      jobs,
      pagination: {
        total: totalJobs,
        page,
        limit,
        totalPages: Math.ceil(totalJobs / limit),
        hasMore: skip + jobs.length < totalJobs
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Refresh expired job
router.post('/:id/refresh', auth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      owner: req.user.userId,
      status: 'expired'
    });

    if (!job) {
      return res.status(404).json({ error: 'Expired job not found' });
    }

    // Update createdAt to now and set status back to active
    job.createdAt = new Date();
    job.status = 'active';
    await job.save();

    res.json(job);
  } catch (error) {
    console.error('Error refreshing job:', error);
    res.status(500).json({ error: 'Failed to refresh job' });
  }
});

// Create job
router.post('/', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const job = new Job({
      ...req.body,
      owner: req.user.userId,
      ownerUsername: req.user.username,
      ownerImage: user.image,
      status: 'active'
    });
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.patch('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      owner: req.user.userId 
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    Object.assign(job, req.body);
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', auth, requireEmailVerification, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // Build query - admins can delete any job, regular users only their own
    const query = { _id: req.params.id };
    if (!user.isAdmin) {
      query.owner = req.user.userId;
    }

    const job = await Job.findOneAndDelete(query);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * Extract jobs from careers page HTML
 */
function extractJobsFromHTML(html, baseUrl, careersPageUrl) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const jobs = [];

  // Use the careers page URL's domain as the base (handles subdomains like jobs.solana.com)
  let actualBaseUrl = baseUrl;
  if (careersPageUrl) {
    try {
      const careersUrlObj = new URL(careersPageUrl);
      actualBaseUrl = `${careersUrlObj.protocol}//${careersUrlObj.host}`;
    } catch (e) {
      // Fallback to original baseUrl
    }
  }

  // Common selectors for job listings (more comprehensive)
  const jobSelectors = [
    // Direct job links
    'a[href*="/jobs/"]',
    'a[href*="/careers/"]',
    'a[href*="/openings/"]',
    'a[href*="/positions/"]',
    'a[href*="/opportunities/"]',
    // Class-based selectors
    '[class*="job"] a',
    '[class*="position"] a',
    '[class*="opening"] a',
    '[class*="opportunity"] a',
    '[class*="role"] a',
    '[class*="vacancy"] a',
    // Data attribute selectors
    '[data-job-id]',
    '[data-position-id]',
    '[data-job-url]',
    '[data-apply-url]',
    // Common job listing containers
    'article a',
    '[role="article"] a',
    '.job-listing a',
    '.position-listing a'
  ];

  const foundLinks = new Set();

  // Try each selector
  for (const selector of jobSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        // Try multiple ways to get the href
        let href = element.getAttribute('href') || 
                   element.getAttribute('data-href') ||
                   element.getAttribute('data-url') ||
                   element.getAttribute('data-job-url') ||
                   element.getAttribute('data-apply-url');
        
        // Also check if there's a data attribute with the job ID that we can construct
        if (!href) {
          const jobId = element.getAttribute('data-job-id') || 
                       element.getAttribute('data-position-id');
          if (jobId) {
            // Try to construct URL from job ID
            try {
              const careersUrlObj = new URL(careersPageUrl || actualBaseUrl);
              href = `${careersUrlObj.origin}/jobs/${jobId}`;
            } catch (e) {
              continue;
            }
          }
        }
        
        if (!href) continue;

        // Build full URL - handle all cases
        let jobUrl = href.trim();
        
        // Skip invalid URLs
        if (jobUrl.startsWith('#') || jobUrl.startsWith('javascript:') || jobUrl.startsWith('mailto:')) {
          continue;
        }
        
        // If it's already a full URL, use it (but validate domain)
        if (jobUrl.startsWith('http://') || jobUrl.startsWith('https://')) {
          // Already absolute - validate it's a job URL
          try {
            const urlObj = new URL(jobUrl);
            const careersUrlObj = new URL(careersPageUrl || actualBaseUrl);
            
            // Check if it's a job detail page (not just a listing page)
            const path = urlObj.pathname.toLowerCase();
            const isJobDetailPage = path.match(/\/(jobs?|careers?|openings?|positions?)\/[^\/]+\//) || 
                                   path.match(/\/(jobs?|careers?|openings?|positions?)\/[^\/]+$/);
            
            // Allow same domain or subdomain
            const careersDomain = careersUrlObj.hostname.replace(/^www\./, '');
            const jobDomain = urlObj.hostname.replace(/^www\./, '');
            
            // Check if same domain or subdomain (e.g., jobs.company.com and company.com)
            const careersBase = careersDomain.split('.').slice(-2).join('.');
            const jobBase = jobDomain.split('.').slice(-2).join('.');
            
            // Must be same base domain and look like a job URL
            if (careersBase !== jobBase || (!isJobDetailPage && !path.includes('/jobs') && !path.includes('/careers'))) {
              continue;
            }
          } catch (e) {
            // Invalid URL, skip
            continue;
          }
        } 
        // If it starts with //, add https:
        else if (jobUrl.startsWith('//')) {
          jobUrl = `https:${jobUrl}`;
        }
        // If it starts with /, it's absolute path - use actualBaseUrl (handles subdomains)
        else if (jobUrl.startsWith('/')) {
          jobUrl = `${actualBaseUrl}${jobUrl}`;
        }
        // Otherwise, it's a relative path
        else {
          // Get the directory from careers page URL for relative paths
          try {
            const careersUrlObj = new URL(careersPageUrl || actualBaseUrl);
            const careersPath = careersUrlObj.pathname;
            // If careers path ends with /, use it, otherwise get parent directory
            const basePath = careersPath.endsWith('/') ? careersPath : careersPath.substring(0, careersPath.lastIndexOf('/') + 1);
            // Remove leading slash from jobUrl if present, then combine
            const cleanJobUrl = jobUrl.replace(/^\//, '');
            jobUrl = `${actualBaseUrl}${basePath}${cleanJobUrl}`;
          } catch (e) {
            // Fallback: just append to base
            const basePath = actualBaseUrl.replace(/\/$/, '');
            jobUrl = `${basePath}/${jobUrl}`;
          }
        }

        // Clean up the URL (normalize, but keep fragments like #content)
        try {
          const urlObj = new URL(jobUrl);
          // Reconstruct URL to keep hash fragments
          jobUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
        } catch (e) {
          // Invalid URL, skip
          continue;
        }
        
        // Additional validation: URL should look like a job detail page
        // Skip if it's just the careers listing page itself
        const urlLower = jobUrl.toLowerCase();
        const isListingPage = urlLower.match(/\/jobs\/?$|\/careers\/?$|\/openings\/?$|\/positions\/?$/) ||
                             urlLower === careersPageUrl.toLowerCase();
        
        if (isListingPage) {
          continue; // Skip the listing page itself
        }
        
        // Must contain job-related path segments
        const looksLikeJobPage = urlLower.includes('/jobs/') || 
                                 urlLower.includes('/careers/') || 
                                 urlLower.includes('/openings/') ||
                                 urlLower.includes('/positions/') ||
                                 urlLower.match(/\/job\/|\/position\/|\/opening\//);
        
        if (!looksLikeJobPage) {
          // Skip if it doesn't look like a job page (might be a category or filter link)
          continue;
        }
        
        // Additional check: job URLs usually have more path segments than listing pages
        // e.g., /jobs/123-title vs just /jobs
        try {
          const urlObj = new URL(jobUrl);
          const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
          // Job detail pages usually have at least 2-3 path segments
          // e.g., ['jobs', '123-title'] or ['companies', 'company-id', 'jobs', 'job-id']
          if (pathSegments.length < 2) {
            continue; // Too short, probably not a job detail page
          }
        } catch (e) {
          continue;
        }

        // Skip if we've already found this job
        if (foundLinks.has(jobUrl)) continue;
        foundLinks.add(jobUrl);

        // Extract job title
        let title = element.textContent?.trim() || '';
        // Try to find title in parent elements
        if (!title || title.length < 3) {
          const parent = element.closest('[class*="job"], [class*="position"], [class*="opening"], li, div');
          if (parent) {
            const titleEl = parent.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"]');
            if (titleEl) title = titleEl.textContent?.trim() || '';
          }
        }

        // Extract location (common patterns)
        let location = '';
        const parent = element.closest('[class*="job"], [class*="position"], li, div');
        if (parent) {
          const locationEl = parent.querySelector('[class*="location"], [class*="city"], [class*="place"]');
          if (locationEl) {
            location = locationEl.textContent?.trim() || '';
          } else {
            // Try to find location in text
            const text = parent.textContent || '';
            const locationMatch = text.match(/(Remote|Hybrid|On-site|Onsite|[A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i);
            if (locationMatch) location = locationMatch[1];
          }
        }

        // Validate URL is actually a valid HTTP/HTTPS URL
        let isValidUrl = false;
        try {
          const testUrl = new URL(jobUrl);
          isValidUrl = testUrl.protocol === 'http:' || testUrl.protocol === 'https:';
        } catch (e) {
          isValidUrl = false;
        }

        // Only add if we have a valid title and URL
        if (title && title.length > 3 && isValidUrl) {
          jobs.push({
            title: title.substring(0, 150), // Limit title length
            location: location || 'Not specified',
            url: jobUrl,
            company: baseUrl.replace(/^https?:\/\//, '').split('/')[0]
          });

          // Limit to 20 jobs
          if (jobs.length >= 20) break;
        }
      }

      if (jobs.length > 0) break; // Found jobs, stop trying other selectors
    } catch (err) {
      continue;
    }
  }

  return jobs;
}

/**
 * Check if website has a careers/jobs page and extract jobs
 * GET /api/jobs/check-careers?domain=github.com
 */
router.get('/check-careers', async (req, res) => {
  try {
    const domain = req.query.domain?.trim();
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const baseUrl = `https://${cleanDomain}`;

    // Common career page paths
    const careersPaths = [
      '/careers',
      '/jobs',
      '/work-with-us',
      '/join-us',
      '/careers/jobs',
      '/open-positions',
      '/hiring',
      '/we-are-hiring',
      '/careers/opportunities'
    ];

    // Check each path
    for (const path of careersPaths) {
      try {
        const url = `${baseUrl}${path}`;
        
        // First check if page exists
        const headResponse = await axios.head(url, {
          timeout: 5000,
          validateStatus: (status) => status < 500,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (headResponse.status === 200) {
          // Page exists, now fetch and parse it
          try {
            const htmlResponse = await axios.get(url, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              }
            });

            // Extract jobs from HTML (pass careers page URL to use correct domain)
            const jobs = extractJobsFromHTML(htmlResponse.data, baseUrl, url);

            // Log for debugging (remove in production if needed)
            console.log(`[Job Search] Found ${jobs.length} jobs for ${cleanDomain}`);
            if (jobs.length > 0) {
              console.log(`[Job Search] Sample job URL: ${jobs[0].url}`);
            }

            return res.json({
              found: true,
              url: url,
              domain: cleanDomain,
              jobs: jobs,
              jobsCount: jobs.length
            });
          } catch (htmlError) {
            // Couldn't fetch HTML, but page exists - return URL only
            return res.json({
              found: true,
              url: url,
              domain: cleanDomain,
              jobs: [],
              jobsCount: 0
            });
          }
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }

    // No careers page found
    return res.json({
      found: false,
      domain: cleanDomain,
      jobs: [],
      jobsCount: 0
    });

  } catch (error) {
    console.error('Error checking careers page:', error);
    res.status(500).json({ error: 'Failed to check for careers page' });
  }
});

module.exports = router;