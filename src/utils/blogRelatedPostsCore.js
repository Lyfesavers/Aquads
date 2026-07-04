/** Canonical slug rules — must match BlogPage, sitemap, and learn-blog edge. */
export const createBlogSlug = (title) => {
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
};

export const blogPath = (blog) =>
  `/learn/${createBlogSlug(blog.title)}-${blog._id}`;

/** Cornerstone listing guides — linked from /list-token-free. */
export const LISTING_GUIDE_POSTS = [
  {
    _id: '6a02db09023eb9f78eb93b9d',
    title: 'How to List Your Crypto Token for Free: The 2026 Guide to Community-Driven Discovery',
  },
  {
    _id: '6a151d1f7a30f891a21ce0d3',
    title: 'Best Free Token Listing Platforms in 2026: Where to List Your Token After Launch',
  },
  {
    _id: '6a173e11fbb544c5a5e318d3',
    title: 'Successfully Created a Token on Smithii? Here is Your Next 48-Hour Growth Strategy',
  },
  {
    _id: '6a39a97ed5640e624d3bb928',
    title: 'How to Get on DexScreener Trending (And What to Do After You Get There)',
  },
  {
    _id: '6a12466f2f82e614a5c024d0',
    title: 'Not a Billboard. A Stack. Why Token Listing Sites Are Broken — And What Aquads Built Instead',
  },
];

const BLOG_CLUSTERS = [
  {
    id: 'listing',
    keywords: [
      'list', 'listing', 'token', 'launch', 'dexscreener', 'smithii', 'pump',
      'billboard', 'discovery', 'free token', 'where to list',
    ],
    postIds: [
      '6a12466f2f82e614a5c024d0',
      '6a151d1f7a30f891a21ce0d3',
      '6a02db09023eb9f78eb93b9d',
      '683d361c9dae82d8f5b1e5f7',
      '6a173e11fbb544c5a5e318d3',
      '6a39a97ed5640e624d3bb928',
    ],
  },
  {
    id: 'raids',
    keywords: ['raid', 'telegram', 'bot', 'community growth', 'advertising', 'visibility', 'hyperspace', 'organic'],
    postIds: [
      '6a1d30891b206fdfd27e94d6',
      '6984a8c2f00dd42231508200',
      '6948aa5a2afa36e3899f9c78',
    ],
  },
  {
    id: 'product',
    keywords: ['aquapay', 'aquafi', 'aquaswap', 'payment', 'savings', 'defi', 'on-chain resume', 'resume', 'attestation'],
    postIds: [
      '696777ff2a786bafbba4b520',
      '68d116ddb333586baafa0685',
      '6953daaae2cba556cef3f151',
      '68812c12144dc2f2aa1c289f',
      '68a38af8fd64c913ced286cf',
    ],
  },
  {
    id: 'freelance',
    keywords: ['freelanc', 'skill', 'work', 'ai', 'job title', 'ambassador', 'earn', 'tax', 'compliance'],
    postIds: [
      '6978296f0f0122ef10153b0b',
      '698e0f45e2e60eaa8f7c8f64',
      '693286012ae2b7ddbb72f64c',
      '696e08b5e22538b302f74cb1',
      '68d10d69b333586baad4dd7f',
      '67e03e669bea4b6126658c11',
      '69960c453f185e70bdcfe33a',
      '6996153d3f185e70bd49ebb9',
      '6996100c3f185e70bdf818d1',
      '6997e91a3f185e70bd5e2929',
      '6998bb923f185e70bde76d5d',
      '6998c0833f185e70bd14db25',
    ],
  },
  {
    id: 'safety',
    keywords: ['rug', 'scam', 'wallet', 'security', 'arbitrage', 'liquidity', 'meme'],
    postIds: [
      '696774b12a786bafbb86cbc7',
      '69634bf4ff7fef38c93b5841',
      '6958a926e2cba556ce866a5b',
    ],
  },
];

/** Raid bots comparison — cross-linked with /telegram-bot. */
export const TELEGRAM_RAID_BOTS_ARTICLE = {
  _id: '6a1d30891b206fdfd27e94d6',
  title: '5 Best Telegram Raid Bots for Crypto Projects in 2026',
};

const BLOG_FEATURE_LINKS = {
  '6a1d30891b206fdfd27e94d6': {
    to: '/telegram-bot',
    label: 'Aquads Telegram & Discord Bot',
    description:
      'Run Twitter and Facebook raids, earn points, and boost your bubble — includes 20 free raid posts daily for lifetime bumped projects.',
  },
};

const CLUSTER_FEATURE_LINKS = {
  listing: {
    to: '/list-token-free',
    label: 'List your token free on Aquads',
    description:
      'Free bubble-map listing with community votes, bumps, and AquaSwap routing — optional Premium and PR add-ons when you are ready to scale.',
  },
  raids: {
    to: '/telegram-bot',
    label: 'Aquads Telegram & Discord Bot',
    description:
      'Coordinate community raids on Telegram and Discord with the Aquads bot — free to start for linked accounts.',
  },
};

const normalizeId = (id) => String(id || '');

const scoreCluster = (cluster, blog) => {
  const blogId = normalizeId(blog._id);
  if (cluster.postIds.includes(blogId)) return 100;

  const haystack = `${blog.title || ''} ${blog.content || ''}`.toLowerCase();
  let score = 0;
  for (const kw of cluster.keywords) {
    if (haystack.includes(kw)) score += 1;
  }
  return score;
};

const resolveCluster = (blog) => {
  let best = BLOG_CLUSTERS[0];
  let bestScore = 0;
  for (const cluster of BLOG_CLUSTERS) {
    const score = scoreCluster(cluster, blog);
    if (score > bestScore) {
      bestScore = score;
      best = cluster;
    }
  }
  return bestScore > 0 ? best : BLOG_CLUSTERS[0];
};

const blogsById = (allBlogs) => {
  const map = new Map();
  for (const b of allBlogs) {
    if (b && b._id) map.set(normalizeId(b._id), b);
  }
  return map;
};

export const getFeatureLinkForBlog = (blog) => {
  if (!blog?._id) return null;
  const byId = BLOG_FEATURE_LINKS[normalizeId(blog._id)];
  if (byId) return byId;
  const cluster = resolveCluster(blog);
  return CLUSTER_FEATURE_LINKS[cluster.id] || null;
};

export const getRelatedBlogs = (currentBlog, allBlogs, limit = 3) => {
  if (!currentBlog || !Array.isArray(allBlogs) || allBlogs.length === 0) return [];

  const currentId = normalizeId(currentBlog._id);
  const byId = blogsById(allBlogs);
  const cluster = resolveCluster(currentBlog);
  const picked = [];
  const seen = new Set([currentId]);

  const pushBlog = (blog) => {
    const id = normalizeId(blog?._id);
    if (!id || seen.has(id) || !blog.title) return;
    seen.add(id);
    picked.push(blog);
  };

  for (const id of cluster.postIds) {
    if (picked.length >= limit) break;
    if (id === currentId) continue;
    const blog = byId.get(id);
    if (blog) pushBlog(blog);
  }

  if (picked.length < limit && cluster.id !== 'listing') {
    for (const id of BLOG_CLUSTERS[0].postIds) {
      if (picked.length >= limit) break;
      const blog = byId.get(id);
      if (blog) pushBlog(blog);
    }
  }

  if (picked.length < limit) {
    for (const blog of allBlogs) {
      if (picked.length >= limit) break;
      pushBlog(blog);
    }
  }

  return picked.slice(0, limit);
};
