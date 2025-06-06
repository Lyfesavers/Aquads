/**
 * Generate a URL-friendly slug from a title
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

exports.handler = async (event, context) => {
  try {
    const baseUrl = 'https://aquads.xyz';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Static pages with priorities and change frequencies
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/marketplace', priority: '0.9', changefreq: 'daily' },
      { url: '/how-to', priority: '0.8', changefreq: 'daily' },
      { url: '/dashboard', priority: '0.8', changefreq: 'weekly' },
      { url: '/whitepaper', priority: '0.7', changefreq: 'monthly' },
      { url: '/affiliate', priority: '0.7', changefreq: 'monthly' },
      { url: '/terms', priority: '0.5', changefreq: 'monthly' }
    ];
    
    // Start XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    staticPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${currentDate}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });
    
    // TODO: Add database connection for dynamic content
    // Future: Add services and blogs from database
    // const { MongoClient } = require('mongodb');
    // const db = await connectDB();
    // ... database operations
    
    // Close XML
    xml += '</urlset>';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: xml
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Return a minimal valid sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://aquads.xyz</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
      body: fallbackXml
    };
  }
}; 