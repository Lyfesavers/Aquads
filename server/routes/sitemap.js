const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Service = require('../models/Service');

// Helper function to generate the sitemap XML
const generateSitemap = async () => {
  // Start the XML document
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static routes
  const staticRoutes = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: 'marketplace', priority: '0.9', changefreq: 'daily' },
    { url: 'how-to', priority: '0.7', changefreq: 'daily' },
    { url: 'whitepaper', priority: '0.7', changefreq: 'monthly' },
    { url: 'affiliate', priority: '0.7', changefreq: 'monthly' },
    { url: 'terms', priority: '0.5', changefreq: 'monthly' }
  ];

  const baseUrl = 'https://aquads.xyz/';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Add static pages
  staticRoutes.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${route.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  // Fetch all blogs
  const blogs = await Blog.find({}).sort({ createdAt: -1 });

  // Add blog posts
  blogs.forEach(blog => {
    const lastMod = blog.updatedAt ? blog.updatedAt.toISOString().split('T')[0] : 
                  blog.createdAt.toISOString().split('T')[0];
    
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}how-to?blogId=${blog._id}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += '  </url>\n';
  });

  // Fetch all services
  const services = await Service.find({}).sort({ createdAt: -1 });

  // Add service listings
  services.forEach(service => {
    const lastMod = service.updatedAt ? service.updatedAt.toISOString().split('T')[0] : 
                    service.createdAt.toISOString().split('T')[0];
    
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}marketplace?service=${service._id}</loc>\n`;
    xml += `    <lastmod>${lastMod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += '  </url>\n';
  });

  // Close the XML document
  xml += '</urlset>';
  
  return xml;
};

/**
 * Generate a dynamic sitemap that includes all blog posts and service listings
 * This route handles the API endpoint
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const xml = await generateSitemap();
    
    // Set response headers
    res.header('Content-Type', 'application/xml');
    res.header('Content-Length', Buffer.byteLength(xml));
    
    // Send the XML sitemap
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Expose the route to handle requests at /sitemap.xml in the root
 */
router.get('/', async (req, res) => {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.aquads.xyz' 
      : 'http://localhost:3000';
    
    // Static pages
    const staticPages = [
      '', // Home
      '/marketplace',
      '/how-to',
      '/dashboard',
      '/whitepaper',
      '/affiliate',
      '/terms'
    ];
    
    // Get all services
    const services = await Service.find({ status: 'active' });
    
    // Get all blogs
    const blogs = await Blog.find();
    
    // Start XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    
    // Add static pages
    staticPages.forEach(page => {
      xml += `
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`;
    });
    
    // Add services
    services.forEach(service => {
      xml += `
  <url>
    <loc>${baseUrl}/marketplace?service=${service._id}</loc>
    <lastmod>${new Date(service.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
    
    // Add blogs
    blogs.forEach(blog => {
      xml += `
  <url>
    <loc>${baseUrl}/how-to?blogId=${blog._id}</loc>
    <lastmod>${new Date(blog.updatedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
    
    // Close XML
    xml += `
</urlset>`;
    
    // Send XML response
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

module.exports = router; 