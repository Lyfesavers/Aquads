const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const Service = require('../models/Service');

/**
 * Generate a URL-friendly slug from a title
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Generate XML sitemap
 */
router.get('/', async (req, res) => {
  try {
    // Set XML content type before any potential errors
    res.header('Content-Type', 'application/xml');

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
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    
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
    <lastmod>${new Date(service.updatedAt || service.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });
    
    // Add blogs with SEO-friendly URLs
    blogs.forEach(blog => {
      try {
        const slug = createSlug(blog.title);
        xml += `
  <url>
    <loc>${baseUrl}/how-to/${slug}-${blog._id}</loc>
    <lastmod>${new Date(blog.updatedAt || blog.createdAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      } catch (err) {
        console.error('Error adding blog to sitemap:', blog._id, err);
      }
    });
    
    // Close XML
    xml += '\n</urlset>';
    
    // Send XML response
    return res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Even on error, return a valid XML response
    const errorXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url>\n' +
      '    <loc>https://www.aquads.xyz</loc>\n' +
      '    <priority>1.0</priority>\n' +
      '  </url>\n' +
      '</urlset>';
    
    return res.status(200).send(errorXml);
  }
});

// XML sitemap endpoint for /sitemap.xml at the root
router.get('/xml', (req, res) => {
  res.redirect('/api/sitemap');
});

module.exports = router; 