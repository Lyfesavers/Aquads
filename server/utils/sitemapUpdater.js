const fs = require('fs').promises;
const path = require('path');
const Blog = require('../models/Blog');

/**
 * Updates the sitemap.xml file with the latest content
 */
async function updateSitemap() {
  try {
    // Fetch all blogs
    const blogs = await Blog.find().sort({ updatedAt: -1 });
    
    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add main pages
    const mainPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/marketplace', priority: '0.9', changefreq: 'daily' },
      { url: '/how-to', priority: '0.8', changefreq: 'daily' },
      { url: '/whitepaper', priority: '0.7', changefreq: 'monthly' },
      { url: '/affiliate', priority: '0.7', changefreq: 'monthly' },
      { url: '/terms', priority: '0.5', changefreq: 'monthly' }
    ];
    
    // Add main pages to sitemap
    mainPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>https://aquads.xyz${page.url}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });
    
    // Add blog posts to sitemap
    blogs.forEach(blog => {
      const slug = blog.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const blogUrl = `/how-to/${slug}-${blog._id}`;
      
      xml += `  <url>\n`;
      xml += `    <loc>https://aquads.xyz${blogUrl}</loc>\n`;
      xml += `    <lastmod>${new Date(blog.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });
    
    xml += '</urlset>';
    
    // Write the sitemap to the public directory
    const sitemapPath = path.join(__dirname, '../../public/sitemap.xml');
    await fs.writeFile(sitemapPath, xml, 'utf8');
    
    console.log('Sitemap updated successfully');
  } catch (error) {
    console.error('Error updating sitemap:', error);
  }
}

module.exports = updateSitemap; 