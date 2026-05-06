// Netlify Edge Function — guaranteed share URL for Free Online Courses.
// Path: /share/courses/:slug
// Always renders rich Open Graph / Twitter Card meta tags for any crawler
// (Twitter, Facebook, Telegram, Discord, WhatsApp, LinkedIn, Slack, etc.)
// then redirects real browsers on to the canonical SPA detail page.

export default async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Path looks like ['share', 'courses', ':slug']
  const slug = pathParts[pathParts.length - 1];

  if (!slug || slug === 'courses') {
    return getDefaultResponse();
  }

  try {
    const apiResponse = await fetch(
      `https://aquads-production.up.railway.app/api/free-courses/${encodeURIComponent(slug)}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Aquads-Edge-Function/1.0',
        },
      }
    );

    if (!apiResponse.ok) {
      console.log(`API returned ${apiResponse.status} for course ${slug}`);
      return getDefaultResponse();
    }

    const data = await apiResponse.json();
    const course = data && data.course ? data.course : null;

    if (!course || !course.title) {
      return getDefaultResponse();
    }

    const FEED_LABEL = {
      technology: 'Technology & Programming',
      business: 'Business & Marketing',
      languages: 'Languages',
    };
    const feedLabel = FEED_LABEL[course.feed] || 'Free Course';

    const description = (course.description || `Free ${feedLabel} course on Aquads — start learning now.`)
      .toString()
      .slice(0, 280);

    // Branded OG image (1200×630) generated server-side: includes course title,
    // a "Start Free Course →" CTA, and a "Provided by cursa.app" attribution
    // baked into the image — that's our single source-credit surface.
    const ogImageUrl = `https://www.aquads.xyz/og/course-card?slug=${encodeURIComponent(course.slug)}&ogv=2`;
    const canonicalUrl = `https://www.aquads.xyz/learn/courses/${course.slug}`;
    const titleWithSuffix = `${course.title} — Free ${feedLabel} Course on Aquads`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titleWithSuffix)}</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapeHtml(titleWithSuffix)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(course.title)} — Free Course on Aquads">

  <!-- Open Graph meta tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Aquads Learn">
  <meta property="og:title" content="${escapeHtml(titleWithSuffix)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(course.title)} — Free Course on Aquads">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}">

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #00d4ff; font-size: 1.5rem; line-height: 1.4; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(0,212,255,0.15); color: #7ee0ff; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
    p { color: #b0b0b0; line-height: 1.6; }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">${escapeHtml(feedLabel)} · Free Course</span>
    <h1>${escapeHtml(course.title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Redirecting to course… <a href="${escapeHtml(canonicalUrl)}">Click here</a> if not redirected.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // 1-hour CDN cache; course content is evergreen so this is safe
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('share-free-course edge error:', error);
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
  <title>Free Online Courses — Aquads Learn</title>
  <meta name="description" content="Hand-picked free online courses with certificates from cursa.app — programming, marketing, AI, languages and more.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Free Online Courses — Aquads Learn">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  <meta name="twitter:description" content="Hand-picked free online courses with certificates from cursa.app — programming, marketing, AI, languages and more.">
  <meta property="og:title" content="Free Online Courses — Aquads Learn">
  <meta property="og:description" content="Hand-picked free online courses with certificates from cursa.app — programming, marketing, AI, languages and more.">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  <meta property="og:url" content="https://www.aquads.xyz/learn">
  <meta property="og:type" content="website">
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/learn">
</head>
<body>
  <p>Redirecting to Aquads Learn… <a href="https://www.aquads.xyz/learn">Click here</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  path: '/share/courses/*',
};
