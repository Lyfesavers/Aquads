// Netlify function to prerender blog posts for social media crawlers
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Extract the blog ID from the path
  const path = event.path;
  const match = path.match(/\/learn\/(.+)-([a-zA-Z0-9]+)$/);
  
  if (!match) {
    // If no match found, just serve a standard page
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }
  
  const blogId = match[2];
  
  // Check User-Agent to determine if this is a crawler
  // This is a fallback in case the redirect conditions don't catch it
  const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || '';
  const isCrawler = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
  
  // If it's definitely a regular user (not a crawler), let the SPA handle it
  // But we'll still prerender to be safe for SEO (some crawlers might not match the redirect conditions)
  // The metadata will be there for crawlers, and users will get the React app via the default SPA redirect
  
  try {
    // Fetch the blog data from API (backend is on Render, not Netlify)
    const apiUrl = `https://aquads.onrender.com/api/blogs/${blogId}`;
    console.log('Fetching blog from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const blog = await response.json();
    
    if (!blog || !blog._id) {
      console.log('Blog not found or invalid data');
      return {
        statusCode: 200,
        body: getDefaultHtml(),
        headers: { 'Content-Type': 'text/html' },
      };
    }
    
    console.log('Blog found successfully:', blog.title);
    
    // Create clean description from blog content
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';
    
    // Create SEO-friendly URL (use the original path to preserve the exact slug)
    const originalPath = path;
    const seoUrl = `https://www.aquads.xyz${originalPath}`;
    // Redirect URL should be the same as the original path (no redirect needed for direct URLs)
    const redirectUrl = originalPath;
    
    console.log('SEO URL:', seoUrl);
    console.log('Redirect URL:', redirectUrl);
    
    return {
      statusCode: 200,
      body: getBlogHtml(blog, description, seoUrl, redirectUrl),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  } catch (error) {
    console.error('Error fetching blog:', error);
    return {
      statusCode: 200, // Still return 200 to avoid breaking user experience
      body: getDefaultHtml(),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }
};

// Helper function to create URL-friendly slugs
function createSlug(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // Limit slug length to prevent extremely long URLs (keep first 50 characters)
  // This helps prevent 5xx errors due to URL length limits
  const maxLength = 50;
  if (slug.length > maxLength) {
    // Find the last complete word within the limit to avoid cutting words in half
    const truncated = slug.substring(0, maxLength);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 20 ? truncated.substring(0, lastDash) : truncated;
  }
  
  return slug;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Function to generate HTML with blog metadata
function getBlogHtml(blog, description, seoUrl, redirectUrl) {
  const escapedTitle = escapeHtml(blog.title);
  const escapedDescription = escapeHtml(description);
  const imageUrl = blog.bannerImage || 'https://www.aquads.xyz/logo712.png';
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedSeoUrl = escapeHtml(seoUrl);
  const escapedRedirectUrl = escapeHtml(redirectUrl);
  
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="google-site-verification" content="UMC2vp6y4mZgNAXQYgv9nqe83JsEKOIg7Tv8tDT7_TA" />
    <meta name="description" content="${escapedDescription}" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@_Aquads">
    <meta name="twitter:image" content="${escapedImageUrl}">
    <meta name="twitter:title" content="${escapedTitle} - Aquads Blog">
    <meta name="twitter:description" content="${escapedDescription}">
    
    <!-- Open Graph meta tags -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Aquads Blog">
    <meta property="og:url" content="${escapedSeoUrl}">
    <meta property="og:title" content="${escapedTitle} - Aquads Blog">
    <meta property="og:description" content="${escapedDescription}">
    <meta property="og:image" content="${escapedImageUrl}">
    ${blog.createdAt ? `<meta property="article:published_time" content="${blog.createdAt}">` : ''}
    ${blog.updatedAt || blog.createdAt ? `<meta property="article:modified_time" content="${blog.updatedAt || blog.createdAt}">` : ''}
    ${blog.authorUsername ? `<meta property="article:author" content="${escapeHtml(blog.authorUsername)}">` : ''}
    
    <link rel="canonical" href="${escapedSeoUrl}" />
    <title>${escapedTitle} - Aquads Blog</title>
    <script>
      // For regular users, let React Router handle the route
      // Crawlers will see the metadata above and won't execute this
      // This ensures crawlers get metadata while users get the React app
      if (typeof window !== 'undefined' && window.location) {
        // Only redirect if we're in a browser (not a crawler)
        // But actually, we want to serve the React app, so we'll let Netlify handle it
        // The metadata is already in the HTML for crawlers
      }
    </script>
  </head>
  <body>
    <h1>${escapedTitle}</h1>
    <p>${escapedDescription}</p>
    <p><a href="${escapedRedirectUrl}">Read the full article</a></p>
    <noscript>
      <p>Please enable JavaScript to view the full article.</p>
    </noscript>
  </body>
</html>`;
}

// Function to generate default HTML if blog not found
function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Aquads - World's First BEX - Bicentralized Exchange Hub" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
    <meta name="twitter:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">
    <meta name="twitter:description" content="Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">
    <meta property="og:description" content="Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
    <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
    <meta property="og:url" content="https://aquads.xyz">
    <meta property="og:type" content="website">
    
    <title>Aquads - World's First BEX - Bicentralized Exchange Hub</title>
    <script>
      // Redirect to the app
      window.location.href = '/learn';
    </script>
  </head>
  <body>
    <h1>Aquads - Web3 Crypto Hub & Freelancer Marketplace</h1>
    <p>Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!</p>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/learn';
      }, 100);
    </script>
  </body>
</html>`;
} 