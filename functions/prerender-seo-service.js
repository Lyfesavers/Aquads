// Bot-only prerender for /service/{slug}-{id} marketplace pages.
const fetch = require('node-fetch');
const {
  API_BASE,
  CANONICAL_HOST,
  DEFAULT_OG_IMAGE,
  getRequestPath,
  stripHtml,
  extractMongoIdFromSlug,
  buildStandaloneHtml,
  htmlResponse,
} = require('./seo-prerender-shared');

function getDisplayName(seller) {
  if (!seller) return 'Freelancer';
  return seller.username || seller.displayName || 'Freelancer';
}

exports.handler = async (event) => {
  const pathname = getRequestPath(event);
  const match = pathname.match(/^\/service\/([^/]+)\/?$/);
  if (!match) {
    return htmlResponse('<!DOCTYPE html><html><head><title>Not Found</title></head><body><p>Not Found</p></body></html>');
  }

  const slug = match[1];
  const serviceId = extractMongoIdFromSlug(slug);
  if (!serviceId) {
    return htmlResponse('<!DOCTYPE html><html><head><title>Not Found</title></head><body><p>Not Found</p></body></html>');
  }

  let service;
  try {
    const response = await fetch(`${API_BASE}/services/${serviceId}/details`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Aquads-Seo-Prerender/1.0',
      },
    });
    if (!response.ok) {
      return htmlResponse('<!DOCTYPE html><html><head><title>Not Found</title></head><body><p>Service not found</p></body></html>');
    }
    service = await response.json();
    if (!service?.title || !service?._id) {
      return htmlResponse('<!DOCTYPE html><html><head><title>Not Found</title></head><body><p>Service not found</p></body></html>');
    }
  } catch (err) {
    console.error('prerender-seo-service: fetch failed', err);
    return htmlResponse('<!DOCTYPE html><html><head><title>Error</title></head><body><p>Unavailable</p></body></html>', { 'Cache-Control': 'no-cache' });
  }

  const sellerName = getDisplayName(service.seller);
  const plainDescription = stripHtml(service.description || '');
  const description = plainDescription.length > 160
    ? `${plainDescription.slice(0, 157)}...`
    : (plainDescription || `${service.title} on Aquads Marketplace`);
  const title = `${service.title} - ${sellerName} | Aquads Marketplace`;
  const canonicalUrl = `${CANONICAL_HOST}/service/${slug}`;

  const html = buildStandaloneHtml({
    title,
    description,
    canonicalUrl,
    h1: service.title,
    body: `${description} Listed by ${sellerName} on the Aquads Web3 freelancer marketplace.`,
    imageUrl: service.image || DEFAULT_OG_IMAGE,
    siteName: 'Aquads Marketplace',
  });

  return htmlResponse(html);
};
