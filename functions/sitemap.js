exports.handler = async (event, context) => {
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Updated: 2025-06-12 - Static sitemap for Aquads -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.aquads.xyz/</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.aquads.xyz/marketplace</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
            <loc>https://www.aquads.xyz/learn</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.aquads.xyz/dashboard</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.aquads.xyz/whitepaper</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.aquads.xyz/affiliate</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.aquads.xyz/terms</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://www.aquads.xyz/service</loc>
    <lastmod>2025-06-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    },
    body: sitemapXML
  };
}; 