// Shared helpers for bot-only SEO prerender Netlify functions.
// Humans never hit these — only crawlers matched by netlify.toml User-Agent redirects.

const CANONICAL_HOST = 'https://www.aquads.xyz';
const DEFAULT_OG_IMAGE = `${CANONICAL_HOST}/metalogo.png`;
const API_BASE = 'https://aquads-production.up.railway.app/api';

const STATIC_SEO_PAGES = {
  '/aquafi': {
    title: 'AquaFi - DeFi Savings Pools & Crypto Yields | Aquads',
    description: 'Earn passive crypto income with AquaFi savings pools. Stake your tokens, earn competitive DeFi yields, and track your portfolio analytics on Aquads.',
    h1: 'AquaFi Savings Pools',
    body: 'Earn passive crypto income with AquaFi savings pools. Stake your tokens, earn competitive DeFi yields, and track portfolio analytics on Aquads.',
    siteName: 'Aquads',
  },
  '/freelancer-benefits': {
    title: 'Freelancer Benefits - Why List on Aquads Marketplace',
    description: 'Join the premier Web3 freelancer marketplace. Connect with clients worldwide, build your reputation, and earn more with Aquads.',
    h1: 'Why List Your Services on Aquads',
    body: 'Join the premier Web3 freelancer marketplace and connect with clients worldwide. Build your reputation, grow your business, and earn more with our comprehensive platform.',
    siteName: 'Aquads',
  },
  '/verify-user': {
    title: 'Verify Aquads Users | Member Verification',
    description: 'Check if a user is a verified member of Aquads.xyz. Enter a username to see verification status and VIP level.',
    h1: 'Verify Aquads Users',
    body: 'Check if a user is a verified member of Aquads.xyz. Enter their username to see verification status and VIP level.',
    siteName: 'Aquads',
  },
  '/games/dots-and-boxes': {
    title: 'Dots and Boxes Game | Aquads Game Hub',
    description: 'Play Dots and Boxes online against a smart AI opponent on Aquads Game Hub. Free browser game with leaderboard.',
    h1: 'Dots and Boxes',
    body: 'Play Dots and Boxes online on Aquads Game Hub. Challenge a strong AI opponent, climb the leaderboard, and enjoy this classic strategy game in your browser.',
    siteName: 'Aquads Game Hub',
  },
  '/games/checkers': {
    title: 'Checkers Game | Aquads Game Hub',
    description: 'Play Checkers online on Aquads Game Hub. Free browser board game with AI opponent and leaderboard.',
    h1: 'Checkers',
    body: 'Play Checkers online on Aquads Game Hub. Challenge the AI, track your wins, and enjoy this classic board game in your browser.',
    siteName: 'Aquads Game Hub',
  },
  '/games/horse-racing': {
    title: 'Horse Racing Game | Aquads Game Hub',
    description: 'Play Horse Racing on Aquads Game Hub. Bet, race, and compete on the Aquads games leaderboard.',
    h1: 'Horse Racing',
    body: 'Play Horse Racing on Aquads Game Hub. Place your bets, watch the race, and compete for the top spot on the leaderboard.',
    siteName: 'Aquads Game Hub',
  },
  '/games/beanstalks-and-chutes': {
    title: 'Beanstalks and Chutes Game | Aquads Game Hub',
    description: 'Play Beanstalks and Chutes on Aquads Game Hub. A fun ladder-and-slide board game in your browser.',
    h1: 'Beanstalks and Chutes',
    body: 'Play Beanstalks and Chutes on Aquads Game Hub. Climb the beanstalks, avoid the chutes, and race to the finish in this browser board game.',
    siteName: 'Aquads Game Hub',
  },
  '/games/sludo': {
    title: 'Sludo Game | Aquads Game Hub',
    description: 'Play Sludo on Aquads Game Hub. A fast-paced Ludo-style board game with online leaderboard.',
    h1: 'Sludo',
    body: 'Play Sludo on Aquads Game Hub. Roll the dice, move your pieces, and compete against AI or friends in this Ludo-style browser game.',
    siteName: 'Aquads Game Hub',
  },
};

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

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMongoIdFromSlug(slug) {
  if (!slug) return null;
  const parts = slug.split('-');
  const last = parts[parts.length - 1];
  if (last && last.length === 24 && /^[0-9a-fA-F]{24}$/.test(last)) {
    return last;
  }
  return null;
}

function buildStandaloneHtml({
  title,
  description,
  canonicalUrl,
  h1,
  body,
  imageUrl = DEFAULT_OG_IMAGE,
  noindex = false,
  siteName = 'Aquads',
}) {
  const img = escapeHtml(imageUrl);
  const robots = noindex ? '\n  <meta name="robots" content="noindex, follow">' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">${robots}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${img}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@_Aquads_">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${img}">
</head>
<body>
  <h1>${escapeHtml(h1)}</h1>
  <p>${escapeHtml(body)}</p>
  <p><a href="${escapeHtml(canonicalUrl)}">View on Aquads</a></p>
</body>
</html>`;
}

function htmlResponse(body, extraHeaders = {}) {
  return {
    statusCode: 200,
    body,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      ...extraHeaders,
    },
  };
}

module.exports = {
  API_BASE,
  CANONICAL_HOST,
  DEFAULT_OG_IMAGE,
  STATIC_SEO_PAGES,
  getRequestPath,
  escapeHtml,
  stripHtml,
  extractMongoIdFromSlug,
  buildStandaloneHtml,
  htmlResponse,
};
