// Injects bounty OG/Twitter metadata into the SPA shell for canonical
// /bounties/{mongoId} URLs — same pattern as learn-blog.js for blogs.

const BOUNTY_API_BASE = 'https://aquads-production.up.railway.app/api/bounties';
const CANONICAL_HOST = 'https://www.aquads.xyz';

const CATEGORY_LABEL = {
  development: 'Development',
  design: 'Design',
  content: 'Content',
  marketing: 'Marketing',
  community: 'Community',
  research: 'Research',
  other: 'Other',
};

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMetaBlock(bounty, canonicalUrl) {
  const title = `${bounty.title} — Bounty on Aquads`;
  const plainText = stripHtml(bounty.description);
  const description = plainText.length > 200
    ? plainText.slice(0, 197) + '...'
    : (plainText || `Claim this bounty on Aquads — ${bounty.title}`);
  const imageUrl = `${CANONICAL_HOST}/og/bounty-card?id=${encodeURIComponent(bounty._id)}&ogv=2`;

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Aquads Bounties">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@AquadsXYZ">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  `;
}

function buildArticleBlock(bounty) {
  const projectName = bounty.projectName || bounty.posterUsername || 'Project';
  const reward = `$${bounty.amount} ${bounty.currency || 'USDC'}`;
  const category = CATEGORY_LABEL[bounty.category] || 'Bounty';

  return `<article id="aquads-seo-content" data-seo-prerender="true">
  <h1>${escapeHtml(bounty.title)}</h1>
  <p><strong>Reward:</strong> ${escapeHtml(reward)} · <strong>Category:</strong> ${escapeHtml(category)} · <strong>Project:</strong> ${escapeHtml(projectName)}</p>
  <p>${escapeHtml(stripHtml(bounty.description))}</p>
  <p><a href="${CANONICAL_HOST}/bounties/${escapeHtml(bounty._id)}">View bounty on Aquads</a></p>
</article>`;
}

function injectArticleBlock(html, articleBlock) {
  if (html.includes('id="aquads-seo-content"')) {
    return html.replace(/<article id="aquads-seo-content"[\s\S]*?<\/article>/i, articleBlock);
  }
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `${articleBlock}\n<div id="root"></div>`);
  }
  return html.replace('</body>', `${articleBlock}\n</body>`);
}

function stripExistingHeadDefaults(html) {
  return html
    .replace(/<title>[^<]*<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:title["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:image["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:url["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:type["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
}

export default async (request, context) => {
  const match = new URL(request.url).pathname.match(/^\/bounties\/([a-fA-F0-9]{24})\/?$/);
  if (!match) {
    return context.next();
  }

  const bountyId = match[1];
  let bounty;

  try {
    const response = await fetch(`${BOUNTY_API_BASE}/${bountyId}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Aquads-Edge-Function/1.0' },
    });
    if (!response.ok) return context.next();
    const data = await response.json();
    bounty = data?.bounty || data;
    if (!bounty?.title || !bounty._id || bounty.hidden || !['open', 'completed'].includes(bounty.status)) {
      return context.next();
    }
  } catch {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const canonicalUrl = `${CANONICAL_HOST}/bounties/${bounty._id}`;
  const metaBlock = buildMetaBlock(bounty, canonicalUrl);
  const articleBlock = buildArticleBlock(bounty);

  let modified = stripExistingHeadDefaults(html);
  modified = modified.includes('<head>')
    ? modified.replace('<head>', `<head>\n${metaBlock}`)
    : modified;
  modified = injectArticleBlock(modified, articleBlock);

  const newHeaders = new Headers(response.headers);
  newHeaders.delete('content-length');
  newHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export const config = {
  path: '/bounties/*',
};
