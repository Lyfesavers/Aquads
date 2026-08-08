// Netlify Edge Function — injects per-page <title>, description, canonical,
// and Open Graph / Twitter tags into the SPA shell for the main product and
// marketing routes.
//
// Why this exists:
//   These routes used to rely on bot-only redirects in netlify.toml gated on
//   `conditions = {User-Agent = ...}`. Netlify only supports Country, Language,
//   Role and Cookie conditions, so those rules never matched and the prerender
//   functions behind them were never invoked. Every route fell through to the
//   SPA fallback and served an identical copy of the homepage's HTML — same
//   title, same description, no canonical — which reads as duplicate content
//   to anything that doesn't execute JavaScript.
//
// What this does:
//   Runs on every request to the routes listed in PAGE_SEO (humans and bots
//   alike, same as learn-blog.js). Fetches the normal SPA shell via
//   context.next(), removes the site-wide defaults it would otherwise
//   duplicate, and injects the route's real tags. Metadata comes from
//   src/utils/pageSeoCore.js — the same module the components feed to Helmet —
//   so the first response and the hydrated page always agree.
//
// Deliberately NOT registered on /learn/*: blog URLs are owned by
// learn-blog.js and nothing here should ever touch that path.
//
// Failure behaviour:
//   Any unknown path, non-HTML response, or thrown error falls through to the
//   unmodified SPA, so a fault here can never take a page down.

import { getPageSeo } from '../../src/utils/pageSeoCore.js';

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildMetaBlock(seo, noindex) {
  const ogTitle = seo.ogTitle || seo.title;
  const ogDescription = seo.ogDescription || seo.description;

  return `
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}">
    ${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
    <link rel="canonical" href="${escapeHtml(seo.canonical)}">

    <meta property="og:type" content="${escapeHtml(seo.ogType || 'website')}">
    <meta property="og:site_name" content="Aquads">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:image" content="${escapeHtml(seo.ogImage)}">
    <meta property="og:url" content="${escapeHtml(seo.canonical)}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@_Aquads_">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
    <meta name="twitter:image" content="${escapeHtml(seo.ogImage)}">
  `;
}

// public/index.html ships site-wide defaults describing the homepage. Only the
// keys we override are removed — charset, viewport, CSP, icons, manifest and
// the site-wide WebSite JSON-LD are all left alone.
function stripExistingHeadDefaults(html) {
  return html
    .replace(/<title>[^<]*<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:title["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:description["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:image["'](?!:)[^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:url["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:type["'][^>]*>/gi, '')
    .replace(/<meta\s+property=["']og:site_name["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:title["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:description["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']robots["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
}

// Keep <meta charset> as early as possible: inject after it when present so
// the injected block doesn't push it deep into the document.
function injectMetaBlock(html, metaBlock) {
  const charsetMatch = html.match(/<meta\s+charset=["'][^"']*["']\s*\/?>/i);
  if (charsetMatch) {
    return html.replace(charsetMatch[0], `${charsetMatch[0]}\n${metaBlock}`);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${metaBlock}`);
  }
  return html;
}

export default async (request, context) => {
  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    console.error('page-seo: could not parse request URL', err);
    return context.next();
  }

  const seo = getPageSeo(url.pathname);
  if (!seo) {
    return context.next();
  }

  let response;
  try {
    response = await context.next();
  } catch (err) {
    console.error('page-seo: context.next() failed', err);
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
    console.error('page-seo: failed to read SPA shell body', err);
    return response;
  }

  let modified;
  try {
    const noindex = typeof seo.shouldNoindex === 'function'
      ? seo.shouldNoindex(url.searchParams)
      : false;
    const metaBlock = buildMetaBlock(seo, noindex);
    modified = injectMetaBlock(stripExistingHeadDefaults(html), metaBlock);
  } catch (err) {
    console.error('page-seo: injection failed', err);
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  const newHeaders = new Headers(response.headers);
  // Both describe the untouched shell and no longer match the body we return.
  newHeaders.delete('content-length');
  newHeaders.delete('etag');

  return new Response(modified, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

export const config = {
  path: ['/marketplace', '/list-token-free', '/aquaswap', '/aquafi'],
};
