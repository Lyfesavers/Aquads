// Netlify Function — prerender Free Online Course detail pages for crawlers
// hitting the canonical SPA URL `/learn/courses/:slug`.
// Mounted via netlify.toml conditional redirect (User-Agent matches *bot*, *crawler*,
// facebookexternalhit, Twitterbot, etc.) so real users still get the SPA.
const fetch = require('node-fetch');

function getRequestPath(event) {
  const raw = event.path || '';
  const headers = event.headers || {};
  const lower = {};
  for (const k of Object.keys(headers)) {
    lower[k.toLowerCase()] = headers[k];
  }
  const original =
    lower['x-netlify-original-pathname'] ||
    lower['x-forwarded-uri'] ||
    lower['x-invoke-path'] ||
    '';
  const pathOnly = original ? original.split('?')[0] : '';
  return pathOnly || raw.split('?')[0] || raw;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const FEED_LABEL = {
  technology: 'Technology & Programming',
  business: 'Business & Marketing',
  languages: 'Languages',
};

exports.handler = async (event) => {
  const path = getRequestPath(event);
  const match = path.match(/\/learn\/courses\/([^/?#]+)\/?$/);

  if (!match) {
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 'Content-Type': 'text/html' },
    };
  }

  const slug = match[1];

  try {
    const response = await fetch(
      `https://www.aquads.xyz/api/free-courses/${encodeURIComponent(slug)}`
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const course = data && data.course ? data.course : null;
    if (!course || !course.title) {
      throw new Error('Course missing in API response');
    }

    return {
      statusCode: 200,
      body: getCourseHtml(course),
      headers: { 'Content-Type': 'text/html' },
    };
  } catch (error) {
    console.error('prerender-free-course error:', error.message);
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 'Content-Type': 'text/html' },
    };
  }
};

function getCourseHtml(course) {
  const feedLabel = FEED_LABEL[course.feed] || 'Free Course';
  const description = (
    course.description || `Free ${feedLabel} course on Aquads — start learning now.`
  )
    .toString()
    .slice(0, 280);

  // Branded OG image with course title headline + Start Free Course CTA + Cursa
  // attribution baked into the PNG. Served via the Netlify edge proxy so strict
  // bots (Telegram/WhatsApp) reliably get it from the apex domain.
  const ogImageUrl = `https://www.aquads.xyz/og/course-card?slug=${encodeURIComponent(course.slug)}`;
  const canonicalUrl = `https://www.aquads.xyz/learn/courses/${course.slug}`;
  const titleWithSuffix = `${course.title} — Free ${feedLabel} Course on Aquads`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${escapeHtml(description)}" />

    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@AquadsXYZ">
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">
    <meta name="twitter:image:alt" content="${escapeHtml(course.title)} — Free Course on Aquads">
    <meta name="twitter:title" content="${escapeHtml(titleWithSuffix)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">

    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${escapeHtml(titleWithSuffix)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${escapeHtml(course.title)} — Free Course on Aquads">
    <meta property="og:site_name" content="Aquads Learn">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="article">

    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <title>${escapeHtml(titleWithSuffix)}</title>
    <script>
      window.location.href = ${JSON.stringify(canonicalUrl)};
    </script>
  </head>
  <body>
    <h1>${escapeHtml(course.title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Category: ${escapeHtml(course.category || feedLabel)}</p>
    <script>
      setTimeout(function() {
        window.location.href = ${JSON.stringify(canonicalUrl)};
      }, 100);
    </script>
  </body>
</html>`;
}

function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Hand-picked free online courses with certificates from cursa.app — programming, marketing, AI, languages and more." />

    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
    <meta name="twitter:title" content="Free Online Courses — Aquads Learn">
    <meta name="twitter:description" content="Hand-picked free online courses with certificates from cursa.app — programming, marketing, AI, languages and more.">

    <!-- Open Graph meta tags -->
    <meta property="og:title" content="Free Online Courses — Aquads Learn">
    <meta property="og:description" content="Hand-picked free online courses with certificates from cursa.app — programming, marketing, AI, languages and more.">
    <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
    <meta property="og:url" content="https://www.aquads.xyz/learn">
    <meta property="og:type" content="website">

    <title>Free Online Courses — Aquads Learn</title>
    <script>
      window.location.href = '/learn';
    </script>
  </head>
  <body>
    <h1>Free Online Courses — Aquads Learn</h1>
    <p>Hand-picked free online courses with certificates from cursa.app.</p>
    <script>
      setTimeout(function() {
        window.location.href = '/learn';
      }, 100);
    </script>
  </body>
</html>`;
}
