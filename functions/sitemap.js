const fetch = require('node-fetch');

// Helper function to create SEO-friendly slug from title
const createSlug = (title) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Limit slug length to prevent extremely long URLs
  const maxLength = 50;
  if (slug.length > maxLength) {
    const truncated = slug.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
  }
  
  return slug;
};

// Helper function to format date for sitemap
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

exports.handler = async (event, context) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Static pages
  const staticPages = [
    { loc: 'https://www.aquads.xyz/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://www.aquads.xyz/marketplace', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://www.aquads.xyz/learn', changefreq: 'daily', priority: '0.8' },
    { loc: 'https://www.aquads.xyz/aquaswap', changefreq: 'daily', priority: '0.9' },
    { loc: 'https://www.aquads.xyz/games', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://www.aquads.xyz/games/horse-racing', changefreq: 'weekly', priority: '0.7' },
    { loc: 'https://www.aquads.xyz/games/dots-and-boxes', changefreq: 'weekly', priority: '0.7' },
    { loc: 'https://www.aquads.xyz/whitepaper', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://www.aquads.xyz/affiliate', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://www.aquads.xyz/aquafi', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://www.aquads.xyz/partner-rewards', changefreq: 'weekly', priority: '0.7' },
    { loc: 'https://www.aquads.xyz/why-list', changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://www.aquads.xyz/freelancer-benefits', changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://www.aquads.xyz/terms', changefreq: 'monthly', priority: '0.4' },
    { loc: 'https://www.aquads.xyz/privacy-policy', changefreq: 'monthly', priority: '0.4' },
  ];

  // Generate XML for static pages
  let urlEntries = staticPages.map(page => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

  // Fetch blogs from API and add them to sitemap
  try {
    const response = await fetch('https://aquads.onrender.com/api/blogs', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Aquads-Sitemap-Generator/1.0'
      },
      timeout: 8000 // 8 second timeout to stay within Netlify function limits
    });

    if (response.ok) {
      const blogs = await response.json();
      
      if (Array.isArray(blogs) && blogs.length > 0) {
        const blogEntries = blogs.map(blog => {
          const slug = createSlug(blog.title || 'untitled');
          const blogUrl = `https://www.aquads.xyz/learn/${slug}-${blog._id}`;
          const lastmod = formatDate(blog.updatedAt || blog.createdAt);
          
          return `  <url>
    <loc>${blogUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        }).join('\n');
        
        urlEntries += '\n' + blogEntries;
        console.log(`Sitemap: Added ${blogs.length} blog posts`);
      }
    } else {
      console.log(`Sitemap: Failed to fetch blogs - ${response.status}`);
    }
  } catch (error) {
    // If API fails, continue with static pages only
    console.log(`Sitemap: Error fetching blogs - ${error.message}`);
  }

  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex'
    },
    body: sitemapXML
  };
}; 