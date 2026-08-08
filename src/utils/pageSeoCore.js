/**
 * Page-level SEO metadata shared by the React components (via react-helmet)
 * and netlify/edge-functions/page-seo.js.
 *
 * Why this file exists:
 *   Helmet only writes its tags after React mounts, so the HTML Netlify sends
 *   first still carries the site-wide defaults from public/index.html. Every
 *   route therefore looked byte-identical to the homepage to any client that
 *   reads HTML without running JS. The edge function fixes that by injecting
 *   the real tags into the shell, and it reads them from here so the tags in
 *   the first response and the tags after hydration can never drift apart.
 *
 * Scope:
 *   Blog URLs are deliberately absent. /learn/* is owned by learn-blog.js and
 *   nothing here should ever run on those paths.
 */

export const CANONICAL_HOST = 'https://www.aquads.xyz';
export const DEFAULT_OG_IMAGE = `${CANONICAL_HOST}/metalogo.png`;

/**
 * AquaSwap token deep links (?token=&blockchain= or ?symbol=) render the same
 * swap page with a preselected pair. They're kept out of the index so the
 * canonical /aquaswap page isn't competing with thousands of near-duplicates.
 */
export const hasAquaSwapTokenDeepLink = (searchParams) => {
  if (!searchParams) return false;
  return Boolean(
    (searchParams.get('token') && searchParams.get('blockchain')) ||
      searchParams.get('symbol')
  );
};

export const PAGE_SEO = {
  '/marketplace': {
    title: 'Hire launch help — Web3 freelancers | Aquads',
    description:
      'Hire launch help on Aquads: logos, social content, community mods, dev, and marketing for new crypto projects. Book and pay in crypto with escrow.',
    canonical: `${CANONICAL_HOST}/marketplace`,
    ogType: 'website',
    ogTitle: 'Hire launch help — Web3 freelancers | Aquads',
    ogDescription:
      'Logos, social content, community mods, dev, and marketing for new crypto projects. Book and pay in crypto with escrow.',
    ogImage: DEFAULT_OG_IMAGE,
  },

  '/list-token-free': {
    title: 'List your token free on Aquads — no-fee bubble map listings',
    description:
      'How to list your token or crypto project free on Aquads: Starter has no listing fee, live bubble map, community votes, bumps, AquaSwap routing, and raids. Skipper Agent on all verified accounts (pay-as-you-go). Paid Premium adds 1-hour fast-track review, a $5 Skipper AI credit, plus the full launch stack.',
    canonical: `${CANONICAL_HOST}/list-token-free`,
    ogType: 'website',
    ogTitle: 'List your token free on Aquads — bubble map listings',
    ogDescription:
      'No-fee Starter listing on the interactive bubble map: votes, bumps, AquaSwap, and growth tools. Optional paid PR packages.',
    ogImage: DEFAULT_OG_IMAGE,
  },

  '/aquaswap': {
    title: 'AquaSwap - Swap Crypto Tokens Instantly | Aquads DEX',
    description:
      'Swap tokens across multiple blockchains with live charts, real-time prices, and low fees. Trade on Ethereum, Solana, BSC, Base, Arbitrum, and more on AquaSwap.',
    canonical: `${CANONICAL_HOST}/aquaswap`,
    ogType: 'website',
    ogTitle: 'AquaSwap - Swap Crypto Tokens Instantly | Aquads DEX',
    ogDescription:
      'Swap tokens across multiple blockchains with live charts, real-time prices, and low fees on AquaSwap.',
    ogImage: DEFAULT_OG_IMAGE,
    shouldNoindex: hasAquaSwapTokenDeepLink,
  },

  '/aquafi': {
    title: 'AquaFi - DeFi Savings Pools & Crypto Yields | Aquads',
    description:
      'Earn passive crypto income with AquaFi savings pools. Stake your tokens, earn competitive DeFi yields, and track your portfolio analytics on Aquads.',
    canonical: `${CANONICAL_HOST}/aquafi`,
    ogType: 'website',
    ogTitle: 'AquaFi - DeFi Savings Pools & Crypto Yields | Aquads',
    ogDescription:
      'Earn passive crypto income with AquaFi savings pools. Stake tokens and earn competitive DeFi yields.',
    ogImage: DEFAULT_OG_IMAGE,
  },
};

/** Trailing slashes are stripped so /aquafi and /aquafi/ resolve to one entry. */
export const getPageSeo = (pathname) => {
  const normalized = String(pathname || '').replace(/\/+$/, '') || '/';
  return PAGE_SEO[normalized] || null;
};
