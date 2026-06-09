// Netlify Edge Function — injects blog-specific head metadata, full JSON-LD,
// and the article body into the SPA shell for canonical blog URLs.
//
// Why this exists:
//   The legacy bot-only redirect for /learn/* was gated on a narrow
//   User-Agent allow-list (facebookexternalhit, Googlebot, Twitterbot, …).
//   Third-party OG validators (opengraph.xyz, Iframely, Embedly, LinkPreview,
//   most Mastodon instances, etc.) fetch with generic Mozilla UAs and so they
//   were getting the bare SPA shell with no per-blog metadata.
//
// What this does:
//   Runs on every request to /learn/* (humans AND bots) at Netlify's CDN edge.
//   - If the path matches /learn/{slug}-{24-hex-id}, fetch the blog from the
//     API, ask Netlify for the normal SPA shell via context.next(), and inject
//     blog-specific <head> tags plus a static <article> before #root so
//     crawlers see real article text without waiting for React.
//   - BlogPage removes #aquads-seo-content on mount so users only see the SPA.
//   - For any other /learn path (the Learn hub, /learn/courses/*, etc.) we
//     simply call context.next() and return the response unchanged.
//   - On any fetch / parse error we fall through to the SPA so the blog is
//     never blocked by an edge-function failure.
//
// SEO impact:
//   - Canonical URL (/learn/{slug}-{id}) is the URL we want Google to rank.
//     We do NOT mark it noindex — only the /share/blog/{id} wrapper carries
//     the noindex hint. <link rel="canonical"> points at itself.
//   - BlogPosting JSON-LD (with articleBody) lives here only — not in React
//     Helmet — so Google never sees duplicate structured data on direct loads.

const BLOG_API_BASE = 'https://aquads-production.up.railway.app/api/blogs';
const CANONICAL_HOST = 'https://www.aquads.xyz';
const DEFAULT_OG_IMAGE = `${CANONICAL_HOST}/metalogo.png`;

function createSlug(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const maxLength = 50;
  if (slug.length > maxLength) {
    const truncated = slug.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
  }
  return slug;
}

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

function wordCount(plainText) {
  if (!plainText) return 0;
  return plainText.split(/\s+/).filter(Boolean).length;
}

function buildMetaBlock(blog, canonicalUrl) {
  const title = `${blog.title} - Aquads Blog`;
  const plainText = stripHtml(blog.content);
  const articleBody = plainText;
  const description = plainText.length > 200
    ? plainText.slice(0, 197) + '...'
    : (plainText || 'Read the latest from the Aquads blog.');
  const imageUrl = blog.bannerImage || DEFAULT_OG_IMAGE;
  const author = blog.authorUsername || 'Aquads';
  const publishedAt = blog.createdAt ? new Date(blog.createdAt).toISOString() : '';
  const updatedAt = blog.updatedAt ? new Date(blog.updatedAt).toISOString() : publishedAt;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description,
    image: imageUrl,
    url: canonicalUrl,
    articleBody,
    wordCount: wordCount(plainText),
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Aquads',
      logo: {
        '@type': 'ImageObject',
        url: `${CANONICAL_HOST}/metalogo.png`,
      },
    },
    datePublished: publishedAt,
    dateModified: updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Aquads">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    ${publishedAt ? `<meta property="article:published_time" content="${escapeHtml(publishedAt)}">` : ''}
    ${updatedAt ? `<meta property="article:modified_time" content="${escapeHtml(updatedAt)}">` : ''}
    <meta property="article:author" content="${escapeHtml(author)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@AquadsXYZ">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `;
}

// Admin-authored HTML; injected for crawlers. BlogPage removes this on mount.
function buildArticleBlock(blog) {
  const content = blog.content || '';
  return `<article id="aquads-seo-content" data-seo-prerender="true">
  <h1>${escapeHtml(blog.title)}</h1>
  <div class="aquads-seo-article-body">${content}</div>
</article>`;
}

function injectArticleBlock(html, articleBlock) {
  if (html.includes('id="aquads-seo-content"')) {
    return html.replace(/<article id="aquads-seo-content"[\s\S]*?<\/article>/i, articleBlock);
  }
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `${articleBlock}\n<div id="root"></div>`);
  }
  if (html.includes('<div id="root">')) {
    return html.replace(/<div id="root">\s*<\/div>/i, `${articleBlock}\n<div id="root"></div>`);
  }
  return html.replace('</body>', `${articleBlock}\n</body>`);
}

function stripExistingHeadDefaults(html) {
  // The static index.html in /public ships with a small set of site-wide
  // defaults (og:site_name, twitter:card, og:image:width/height, viewport,
  // etc.). Most of those are fine to keep, but the values we override here
  // (title, description, og:title/description/image/url, twitter:*) must be
  // removed first so social parsers don't see two values for the same key
  // and pick the wrong one.
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
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only act on canonical blog URLs: /learn/{slug}-{24-hex-mongo-id}
  // [^/]+ guarantees the slug doesn't span a path segment, so URLs like
  // /learn/courses/whatever pass straight through to the existing
  // /learn/courses/* redirect / SPA fallback.
  const match = pathname.match(/^\/learn\/([^/]+)-([a-fA-F0-9]{24})\/?$/);
  if (!match) {
    return context.next();
  }

  const blogId = match[2];

  let blog;
  try {
    const apiResponse = await fetch(`${BLOG_API_BASE}/${blogId}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Aquads-Edge-Function/1.0',
      },
    });
    if (!apiResponse.ok) {
      return context.next();
    }
    blog = await apiResponse.json();
    if (!blog || !blog.title || !blog._id) {
      return context.next();
    }
  } catch (err) {
    console.error('learn-blog: blog fetch failed', err);
    return context.next();
  }

  let response;
  try {
    response = await context.next();
  } catch (err) {
    console.error('learn-blog: context.next() failed', err);
    return new Response('Internal Server Error', { status: 500 });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  let html;
  try {
    html = await response.text();
  } catch (err) {
    console.error('learn-blog: failed to read SPA shell body', err);
    return response;
  }

  const titleSlug = createSlug(blog.title) || 'post';
  const canonicalUrl = `${CANONICAL_HOST}/learn/${titleSlug}-${blog._id}`;
  const metaBlock = buildMetaBlock(blog, canonicalUrl);
  const articleBlock = buildArticleBlock(blog);

  const cleaned = stripExistingHeadDefaults(html);
  let modified = cleaned.includes('<head>')
    ? cleaned.replace('<head>', `<head>\n${metaBlock}`)
    : cleaned;
  modified = injectArticleBlock(modified, articleBlock);

  const newHeaders = new Headers(response.headers);
  // Length will change after injection — let the platform recompute it
  newHeaders.delete('content-length');
  // Short edge cache so blog edits propagate quickly while still avoiding
  // hammering the origin API on every preview crawl.
  newHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400');

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export const config = {
  path: '/learn/*',
};
