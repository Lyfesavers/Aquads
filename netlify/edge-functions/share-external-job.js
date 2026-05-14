// Guaranteed share primer for ephemeral Jooble API rows (JWT, no Mongo _id).
// Rich OG/Twitter preview points at Aquads-generated image; canonical + redirect
// go straight to Jooble attribution URL.

const RAILWAY_META = 'https://aquads-production.up.railway.app/api/jobs/external-share/meta';

export default async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token || !token.trim()) {
    return getDefaultJoobleFallback();
  }

  try {
    const apiResponse = await fetch(
      `${RAILWAY_META}?token=${encodeURIComponent(token.trim())}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Aquads-Edge-Function/1.0',
        },
      }
    );

    if (!apiResponse.ok) {
      console.log(`external-share meta HTTP ${apiResponse.status}`);
      return getDefaultJoobleFallback();
    }

    const meta = await apiResponse.json();

    if (!meta || !meta.titlePage || !meta.joobleCanonicalUrl) {
      return getDefaultJoobleFallback();
    }

    const joobleRedirect = meta.joobleCanonicalUrl || meta.attributionUrl;
    const sharePageAbsolute = `${url.origin}${url.pathname}?token=${encodeURIComponent(token.trim())}`;
    const imageUrl = meta.imageUrl || '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.titlePage)}</title>
  <meta name="description" content="${escapeHtml(meta.descriptionSocial)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapeHtml(meta.titlePage)}">
  <meta name="twitter:description" content="${escapeHtml(meta.descriptionSocial)}">
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : ''}
  ${meta.twitterImageAlt ? `<meta name="twitter:image:alt" content="${escapeHtml(meta.twitterImageAlt)}">` : ''}

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Aquads Jobs">
  <meta property="og:title" content="${escapeHtml(meta.titlePage)}">
  <meta property="og:description" content="${escapeHtml(meta.descriptionSocial)}">
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : ''}
  ${imageUrl ? `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">` : ''}
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  ${meta.twitterImageAlt ? `<meta property="og:image:alt" content="${escapeHtml(meta.twitterImageAlt)}">` : ''}

  <!-- Canonical resolves to Jooble posting (not Aquads SPA job row). -->
  <meta property="og:url" content="${escapeHtml(joobleRedirect)}">
  <link rel="canonical" href="${escapeHtml(joobleRedirect)}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(joobleRedirect)}">

  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #00d4ff; font-size: 1.4rem; line-height: 1.35; }
    p { color: #b0b0b0; line-height: 1.55; font-size: 0.92rem; }
    a.go { display: inline-block; margin-top: 16px; padding: 10px 20px; border-radius: 10px; background: linear-gradient(90deg,#6366f1,#8b5cf6); color: #fff; font-weight: 700; text-decoration: none; }
    a.sec { display: block; margin-top: 20px; color: #93c5fd; font-size: 0.85rem; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(meta.titlePage)}</h1>
    <p>${escapeHtml(meta.descriptionSocial)}</p>
    <a class="go" href="${escapeHtml(joobleRedirect)}">Open listing on Jooble</a>
    <a class="sec" href="${escapeHtml(sharePageAbsolute)}">Aquads preview link</a>
    <p>Redirecting automatically… If not,<a href="${escapeHtml(joobleRedirect)}"> continue here</a>.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('share-external-job edge error:', error);
    return getDefaultJoobleFallback();
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

function getDefaultJoobleFallback() {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Aquads Jobs — Jooble</title>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/marketplace?jobs=true"></head>
<body><p><a href="https://www.aquads.xyz/marketplace?jobs=true">Aquads Jobs</a></p></body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export const config = {
  path: '/share/external-job',
};
