const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const User = require('../models/User');
const { findMatchingJobs, canMatchJobs } = require('../utils/jobMatcher');
const { searchJoobleRemoteJobs } = require('../services/joobleSearch');
const { issueJoobleShareToken, verifyExternalShareToken } = require('../utils/externalJobShareToken');

const joobleShareSignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many share-link requests, try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Debug route
router.get('/test', (req, res) => {

  res.json({ message: 'Jobs API is working' });
});

// Get matched jobs for a freelancer based on their CV skills
router.get('/matched', auth, async (req, res) => {
  try {
    // Get the current user with CV data
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user can match jobs (has CV data)
    const matchStatus = canMatchJobs(user);
    if (!matchStatus.canMatch) {
      return res.json({ 
        matched: [],
        canMatch: false,
        reason: matchStatus.reason
      });
    }
    
    // Calculate date 1 week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Get active jobs from the last week only
    const jobs = await Job.find({ 
      status: 'active',
      createdAt: { $gte: oneWeekAgo }
    })
      .sort({ createdAt: -1 })
      .limit(500); // Process up to 500 jobs for matching
    
    // Find matching jobs (default 3)
    const limit = parseInt(req.query.limit) || 3;
    const matchedJobs = findMatchingJobs(user, jobs, limit);
    
    res.json({
      matched: matchedJobs,
      canMatch: true,
      keywordCount: matchStatus.keywordCount
    });
    
  } catch (error) {
    console.error('Error getting matched jobs:', error);
    res.status(500).json({ error: 'Failed to get matched jobs' });
  }
});

// Throttle the expensive expiry sweep to run at most once per hour.
// Running it on every GET was causing 12-second response times.
let lastJobExpirySweep = 0;
const JOB_EXPIRY_INTERVAL = 60 * 60 * 1000; // 1 hour

// Cache for the PUBLIC jobs listing (no owner filter) — very expensive due to populate + count.
const jobsPublicCache = new Map();
const jobsRefreshing = new Set(); // cache keys currently being refreshed in background
const JOBS_PUBLIC_CACHE_TTL = 60 * 1000; // 1 minute

const invalidateJobsPublicCache = () => {
  jobsPublicCache.clear();
};

const WORK_ARRANGEMENTS = ['remote', 'hybrid', 'onsite'];

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Applies workArrangement + full-text style search (AND across whitespace-separated terms).
 * Mutates `query` (Mongo filter object).
 */
const applyJobListFilters = (query, workArrangement, qRaw) => {
  if (workArrangement && WORK_ARRANGEMENTS.includes(workArrangement)) {
    query.workArrangement = workArrangement;
  }
  const q = (qRaw || '').trim();
  if (!q) return;
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 10);
  if (!terms.length) return;
  const searchClauses = terms.map((term) => ({
    $or: [
      { title: new RegExp(escapeRegex(term), 'i') },
      { description: new RegExp(escapeRegex(term), 'i') },
      { requirements: new RegExp(escapeRegex(term), 'i') },
      { ownerUsername: new RegExp(escapeRegex(term), 'i') },
    ],
  }));
  if (query.$and && Array.isArray(query.$and)) {
    query.$and.push(...searchClauses);
  } else {
    query.$and = searchClauses;
  }
};

/**
 * Optional location filter against Aquads-listed jobs only (Mongo).
 * Matches substrings against location.city / location.country.
 */
const applyJobLocationFilter = (query, locationRaw) => {
  const loc = String(locationRaw || '').trim();
  if (!loc) return;
  const rx = new RegExp(escapeRegex(loc), 'i');
  const clause = {
    $or: [{ 'location.country': rx }, { 'location.city': rx }],
  };
  if (query.$and && Array.isArray(query.$and)) {
    query.$and.push(clause);
  } else {
    query.$and = [clause];
  }
};

const makeJobsPublicCacheKey = (page, limit, workArrangement, qRaw, jobLocRaw = '') => {
  const wa = workArrangement && WORK_ARRANGEMENTS.includes(workArrangement) ? workArrangement : 'all';
  const q = (qRaw || '').trim().slice(0, 200);
  const qEnc = q ? encodeURIComponent(q) : 'none';
  const jl = String(jobLocRaw || '').trim().slice(0, 120);
  const jlEnc = jl ? encodeURIComponent(jl) : 'none';
  return `jobs_p${page}_l${limit}_wa${wa}_q${qEnc}_jl${jlEnc}`;
};

// Fetch public jobs for a given page/limit and update the cache.
const fetchPublicJobsFromMongo = async (page, limit, mongoQuery) => {
  const skip = (page - 1) * limit;
  const totalJobs = await Job.countDocuments(mongoQuery);
  const jobs = await Job.find(mongoQuery)
    .populate('owner', 'username image')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  jobs.forEach((j) => {
    if (!j.source) j.source = 'user';
  });
  return {
    jobs,
    pagination: {
      total: totalJobs,
      page,
      limit,
      totalPages: Math.ceil(totalJobs / limit),
      hasMore: skip + jobs.length < totalJobs,
    },
  };
};

const fetchAndCachePublicJobs = async (page, limit, cacheKey, mongoQuery) => {
  const responseData = await fetchPublicJobsFromMongo(page, limit, mongoQuery);
  jobsPublicCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
  return responseData;
};

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const query = {};

    const workArrangement = typeof req.query.workArrangement === 'string' ? req.query.workArrangement : '';
    const listSearchQ =
      typeof req.query.q === 'string'
        ? req.query.q
        : (typeof req.query.search === 'string' ? req.query.search : '');

    const jobLocationRaw =
      typeof req.query.jobLocation === 'string'
        ? req.query.jobLocation
        : typeof req.query.joobleLocation === 'string'
          ? req.query.joobleLocation
          : '';
    const jobLocationParam = jobLocationRaw.trim();

    // Add owner filter if provided
    if (req.query.owner) {
      query.owner = req.query.owner;
    }
    
    // Calculate date 7 days ago (user postings auto-expire after 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Only expire jobs once per hour instead of on every request
    const now = Date.now();
    if (now - lastJobExpirySweep > JOB_EXPIRY_INTERVAL) {
      lastJobExpirySweep = now;
      Job.updateMany(
        { source: 'user', createdAt: { $lt: sevenDaysAgo }, status: 'active' },
        { $set: { status: 'expired' } }
      ).catch(err => console.error('Job expiry sweep error:', err));
    }
    
    // Only return active jobs
    if (!req.query.includeExpired) {
      query.status = 'active';
    }

    applyJobListFilters(query, workArrangement, listSearchQ);
    applyJobLocationFilter(query, jobLocationParam);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Serve public job listings from cache (owner queries are too specific to cache)
    const isPublicRequest = !req.query.owner && !req.query.includeExpired;
    const joobleKey = (process.env.JOOBLE_API_KEY || '').trim();
    const useJoobleSearch =
      isPublicRequest &&
      Boolean(joobleKey) &&
      Boolean(jobLocationParam) &&
      String(listSearchQ || '').trim() &&
      !workArrangement;

    if (useJoobleSearch) {
      const mongoQuery = { status: 'active' };
      applyJobListFilters(mongoQuery, workArrangement, listSearchQ);
      applyJobLocationFilter(mongoQuery, jobLocationParam);
      const qKeywords = String(listSearchQ).trim();

      const [mongoPart, jooblePart] = await Promise.all([
        fetchPublicJobsFromMongo(page, limit, mongoQuery),
        searchJoobleRemoteJobs({ keywords: qKeywords, page, location: jobLocationParam }),
      ]);

      const hint = parseInt(process.env.JOOBLE_PAGE_HINT || '20', 10) || 20;
      const approxJoobleSeenEnd = (page - 1) * hint + jooblePart.jobs.length;
      const joobleHasMore =
        jooblePart.jobs.length > 0 &&
        Number(jooblePart.totalCount || 0) > approxJoobleSeenEnd;
      const mongoHasMore = mongoPart.pagination.hasMore;

      const responseData = {
        jobs: [...mongoPart.jobs, ...jooblePart.jobs],
        pagination: {
          total: mongoPart.pagination.total + Number(jooblePart.totalCount || 0),
          page,
          limit,
          totalPages: Math.max(
            mongoPart.pagination.totalPages,
            Math.ceil(Number(jooblePart.totalCount || 0) / Math.max(hint, 1))
          ),
          hasMore: mongoHasMore || joobleHasMore,
        },
        jooble: {
          count: jooblePart.jobs.length,
          totalCount: jooblePart.totalCount,
          hasMore: joobleHasMore,
          error: jooblePart.error,
        },
      };

      res.set('X-Cache', 'MISS');
      return res.json(responseData);
    }

    if (isPublicRequest) {
      const cacheKey = makeJobsPublicCacheKey(page, limit, workArrangement, listSearchQ, jobLocationParam);
      const cached = jobsPublicCache.get(cacheKey);
      if (cached) {
        res.set('X-Cache', now - cached.timestamp < JOBS_PUBLIC_CACHE_TTL ? 'HIT' : 'STALE');
        res.json(cached.data);
        if (!jobsRefreshing.has(cacheKey) && now - cached.timestamp >= JOBS_PUBLIC_CACHE_TTL) {
          jobsRefreshing.add(cacheKey);
          const mongoQuery = { status: 'active' };
          applyJobListFilters(mongoQuery, workArrangement, listSearchQ);
          applyJobLocationFilter(mongoQuery, jobLocationParam);
          fetchAndCachePublicJobs(page, limit, cacheKey, mongoQuery).catch(err =>
            console.error('[Jobs Cache] Background refresh failed:', err.message)
          ).finally(() => { jobsRefreshing.delete(cacheKey); });
        }
        return;
      }

      // No cache — must wait
      const mongoQuery = { status: 'active' };
      applyJobListFilters(mongoQuery, workArrangement, listSearchQ);
      applyJobLocationFilter(mongoQuery, jobLocationParam);
      const responseData = await fetchAndCachePublicJobs(page, limit, cacheKey, mongoQuery);
      res.set('X-Cache', 'MISS');
      return res.json(responseData);
    }

    // Owner-specific or includeExpired queries — always hit DB
    const totalJobs = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .populate('owner', 'username image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    jobs.forEach(j => { if (!j.source) j.source = 'user'; });

    const responseData = {
      jobs,
      pagination: {
        total: totalJobs, page, limit,
        totalPages: Math.ceil(totalJobs / limit),
        hasMore: skip + jobs.length < totalJobs
      }
    };

    res.set('X-Cache', 'MISS');
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Signed OG share for Jooble (no Mongo row). Canonical + redirects point at Jooble.
router.post('/external-share/sign', joobleShareSignLimiter, (req, res) => {
  try {
    const body = req.body || {};
    const locCity = typeof body.locationCity === 'string' ? body.locationCity.trim() : '';
    const locCountry = typeof body.locationCountry === 'string' ? body.locationCountry.trim() : '';
    const locationLine = [locCity, locCountry].filter(Boolean).join(', ');

    const token = issueJoobleShareToken({
      targetUrl: body.targetUrl || body.externalUrl,
      title: body.title,
      company: body.company,
      description: body.description,
      workArrangement: body.workArrangement,
      locationLine,
      payHint: typeof body.payHint === 'string' ? body.payHint.trim() : body.payHint,
    });
    return res.json({ token });
  } catch (err) {
    const code = err && err.message;
    const message =
      code === 'missing_signing_secret'
        ? 'Share signing not configured on server'
        : code === 'invalid_jooble_target_url'
        ? 'Only HTTPS Jooble job listing URLs are allowed'
        : 'Could not create share link';
    return res.status(400).json({ error: message });
  }
});

// Netlify edge + crawlers fetch meta for `/share/external-job?token=` here.
router.get('/external-share/meta', (req, res) => {
  const meta = verifyExternalShareToken(req.query.token);
  if (!meta) {
    return res.status(404).json({ error: 'invalid_or_expired_share' });
  }

  const JOB_ARR_LABEL = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' };
  const arrangementLabel = JOB_ARR_LABEL[meta.workArrangement] || 'Remote';

  const rawDesc =
    meta.description ||
    meta.title ||
    'Discover this role discovered on Aquads — apply on Jooble.';
  const descriptionSnippet = rawDesc.slice(0, 280);

  const taglineParts = [];
  taglineParts.push(arrangementLabel);
  if (meta.payHint) {
    taglineParts.push(meta.payHint.slice(0, 48));
  }
  if (
    meta.locationLine &&
    (meta.workArrangement === 'hybrid' || meta.workArrangement === 'onsite')
  ) {
    taglineParts.push(meta.locationLine.slice(0, 80));
  }
  taglineParts.push(`via Jooble`);

  const finalDescription =
    `${taglineParts.filter(Boolean).join(' · ')} — ${descriptionSnippet}`.slice(0, 300);

  const titleWithSuffix = `${meta.title.trim()} — ${arrangementLabel} · Job · Aquads`;

  const tokenEnc = encodeURIComponent(req.query.token);
  const imageUrl =
    `${process.env.AQUADS_SITE_ORIGIN || 'https://www.aquads.xyz'}/og/external-job-card` +
    `?token=${tokenEnc}&ogv=1`;
  const sharePageUrl =
    `${process.env.AQUADS_SITE_ORIGIN || 'https://www.aquads.xyz'}/share/external-job` +
    `?token=${tokenEnc}`;

  return res.json({
    titlePage: titleWithSuffix,
    descriptionSocial: finalDescription,
    twitterImageAlt: `${meta.title} — via Aquads × Jooble`,
    imageUrl,
    joobleCanonicalUrl: meta.targetUrl,
    /** Where human click / og:url resolves for attribution */
    attributionUrl: meta.targetUrl,
    sharePageUrl,
  });
});

// Get a single job by id (public — used by /share/job/:id edge function for OG meta tags)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid job id' });
    }

    const job = await Job.findById(id)
      .populate('owner', 'username image')
      .lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.source) job.source = 'user';
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ error: 'Failed to fetch job' });
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
    invalidateJobsPublicCache();
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
    invalidateJobsPublicCache();
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

    invalidateJobsPublicCache();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Pre-warm the public jobs cache on startup so the first visit to the jobs page is fast.
const warmupJobsCache = async () => {
  try {
    const cacheKey = makeJobsPublicCacheKey(1, 20, '', '', '');
    const mongoQuery = { status: 'active' };
    const responseData = await fetchAndCachePublicJobs(1, 20, cacheKey, mongoQuery);
    console.log(`[Jobs Cache] Warmed up ${responseData.jobs.length} jobs (${responseData.pagination.total} total)`);
  } catch (err) {
    console.error('[Jobs Cache] Warmup failed (non-critical):', err.message);
  }
};

module.exports = router;
module.exports.warmupJobsCache = warmupJobsCache;