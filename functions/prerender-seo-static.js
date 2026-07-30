// Bot-only prerender for static marketing + game pages (see netlify.toml User-Agent redirects).
const {
  CANONICAL_HOST,
  STATIC_SEO_PAGES,
  getRequestPath,
  buildStandaloneHtml,
  htmlResponse,
} = require('./seo-prerender-shared');

exports.handler = async (event) => {
  const pathname = getRequestPath(event).replace(/\/$/, '') || '/';
  const page = STATIC_SEO_PAGES[pathname];

  if (!page) {
    return htmlResponse('<!DOCTYPE html><html><head><title>Not Found</title></head><body><p>Not Found</p></body></html>', { 'Cache-Control': 'no-cache' });
  }

  const canonicalUrl = `${CANONICAL_HOST}${pathname}`;
  const html = buildStandaloneHtml({
    title: page.title,
    description: page.description,
    canonicalUrl,
    h1: page.h1,
    body: page.body,
    siteName: page.siteName,
  });

  return htmlResponse(html);
};
