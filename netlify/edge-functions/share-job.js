// Netlify Edge Function — guaranteed share URL for Job listings.
// Path: /share/job/:id
// Mirrors share-blog.js / share-free-course.js — always renders rich Open Graph
// / Twitter Card meta tags for any crawler (Twitter, Facebook, Telegram,
// Discord, WhatsApp, LinkedIn, Slack, etc.) then redirects real browsers on to
// the canonical SPA listing page with the job pre-expanded.

export default async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path looks like ['share', 'job', ':id']
  const jobId = pathParts[pathParts.length - 1];

  if (!jobId || jobId === 'job') {
    return getDefaultResponse();
  }

  try {
    const apiResponse = await fetch(
      `https://aquads-production.up.railway.app/api/jobs/${encodeURIComponent(jobId)}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Aquads-Edge-Function/1.0',
        },
      }
    );

    if (!apiResponse.ok) {
      console.log(`API returned ${apiResponse.status} for job ${jobId}`);
      return getDefaultResponse();
    }

    const job = await apiResponse.json();

    if (!job || !job.title) {
      return getDefaultResponse();
    }

    // Build a clean description: prefer description, fall back to requirements
    const stripHtml = (s) => (s ? String(s).replace(/<[^>]*>/g, '').trim() : '');
    const rawDesc = stripHtml(job.description) || stripHtml(job.requirements) || '';
    const description = (
      rawDesc.length > 0
        ? rawDesc
        : `Apply for ${job.title} on Aquads — find your next Web3 role.`
    ).slice(0, 280);

    // Pay summary for richer previews when available
    let paySummary = '';
    if (job.payAmount && job.payType) {
      paySummary =
        job.payType === 'percentage'
          ? `${job.payAmount}%`
          : `$${Number(job.payAmount).toLocaleString()}/${job.payType}`;
    }

    // Work arrangement label
    const arrangementLabel = (() => {
      switch (job.workArrangement) {
        case 'remote':
          return 'Remote';
        case 'hybrid':
          return 'Hybrid';
        case 'onsite':
          return 'On-site';
        default:
          return '';
      }
    })();

    const locationLabel = (() => {
      const loc = job.location || {};
      if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
      return loc.country || loc.city || '';
    })();

    const sourceLabel = (() => {
      switch (job.source) {
        case 'remotive':
          return 'via Remotive';
        case 'himalayas':
          return 'via Himalayas';
        default:
          return job.ownerUsername ? `by ${job.ownerUsername}` : '';
      }
    })();

    const titleSuffixParts = ['Job on Aquads'];
    if (arrangementLabel) titleSuffixParts.unshift(arrangementLabel);
    const titleWithSuffix = `${job.title} — ${titleSuffixParts.join(' ')}`;

    // Build a tagline used in the description if pay/location/source info exists
    const taglineBits = [arrangementLabel, locationLabel, paySummary, sourceLabel].filter(Boolean);
    const finalDescription = taglineBits.length
      ? `${taglineBits.join(' · ')} — ${description}`.slice(0, 300)
      : description;

    // Prefer the company logo (external boards) or owner image as the OG image,
    // fall back to the Aquads logo. Crawlers want a 1200×630-ish image; small
    // square avatars still work as `summary_large_image` falls back gracefully.
    const imageUrl =
      (job.source && job.source !== 'user' && job.companyLogo) ||
      job.ownerImage ||
      (job.owner && job.owner.image) ||
      'https://www.aquads.xyz/logo712.png';

    // Canonical SPA URL — opens marketplace with Jobs view active and the job
    // pre-expanded/highlighted (handled by Marketplace.js URL effect).
    const canonicalUrl = `https://www.aquads.xyz/marketplace?jobs=true&job=${encodeURIComponent(jobId)}`;
    const sharePageUrl = `https://www.aquads.xyz/share/job/${encodeURIComponent(jobId)}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titleWithSuffix)}</title>
  <meta name="description" content="${escapeHtml(finalDescription)}">

  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapeHtml(titleWithSuffix)}">
  <meta name="twitter:description" content="${escapeHtml(finalDescription)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(job.title)} — Job on Aquads">

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Aquads Jobs">
  <meta property="og:title" content="${escapeHtml(titleWithSuffix)}">
  <meta property="og:description" content="${escapeHtml(finalDescription)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(job.title)} — Job on Aquads">
  <meta property="og:url" content="${escapeHtml(sharePageUrl)}">

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}">

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #00d4ff; font-size: 1.5rem; line-height: 1.4; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(0,212,255,0.15); color: #7ee0ff; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 4px 4px 12px 4px; }
    p { color: #b0b0b0; line-height: 1.6; }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    ${arrangementLabel ? `<span class="badge">${escapeHtml(arrangementLabel)}</span>` : ''}
    ${paySummary ? `<span class="badge">${escapeHtml(paySummary)}</span>` : ''}
    ${locationLabel ? `<span class="badge">${escapeHtml(locationLabel)}</span>` : ''}
    <h1>${escapeHtml(job.title)}</h1>
    <p>${escapeHtml(finalDescription)}</p>
    <p>Redirecting to job listing… <a href="${escapeHtml(canonicalUrl)}">Click here</a> if not redirected.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Short CDN cache — job listings can be edited / expire / be deleted.
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('share-job edge error:', error);
    return getDefaultResponse();
  }
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDefaultResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Web3 & Crypto Jobs — Aquads</title>
  <meta name="description" content="Browse Web3, crypto and remote jobs hand-picked for the Aquads community.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Web3 & Crypto Jobs — Aquads">
  <meta name="twitter:description" content="Browse Web3, crypto and remote jobs hand-picked for the Aquads community.">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  <meta property="og:title" content="Web3 & Crypto Jobs — Aquads">
  <meta property="og:description" content="Browse Web3, crypto and remote jobs hand-picked for the Aquads community.">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  <meta property="og:url" content="https://www.aquads.xyz/marketplace?jobs=true">
  <meta property="og:type" content="website">
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/marketplace?jobs=true">
</head>
<body>
  <p>Redirecting to Aquads Jobs… <a href="https://www.aquads.xyz/marketplace?jobs=true">Click here</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  path: '/share/job/*',
};
