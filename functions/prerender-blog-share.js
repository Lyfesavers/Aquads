// Netlify function to prerender blog posts for social media crawlers via /share/blog/:id
// This matches the token share pattern: /share/aquaswap
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

exports.handler = async (event, context) => {
  // Log user agent to help debug bot issues
  const userAgent = event.headers['user-agent'] || 'Unknown';
  console.log('=== PRERENDER-BLOG-SHARE CALLED ===');
  console.log('User-Agent:', userAgent);
  console.log('Full path:', event.path);
  console.log('Query params:', event.queryStringParameters);
  
  // Extract blog ID from path: /share/blog/:id
  // Handle both with and without query parameters
  const path = event.path.split('?')[0]; // Remove query params for matching
  const match = path.match(/\/share\/blog\/([a-zA-Z0-9]+)$/);
  
  if (!match) {
    console.log('No blog ID found in path. Path was:', path);
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    };
  }
  
  const blogId = match[1];
  console.log('Blog ID extracted:', blogId);
  
  try {
    // Fetch the blog data from API (backend is on Render, not Netlify)
    const apiUrl = `https://aquads.onrender.com/api/blogs/${blogId}`;
    console.log('Fetching blog from:', apiUrl);
    
    // Add timeout to prevent hanging - 8 seconds max to stay under Netlify's 10s limit
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);
    
    let response;
    try {
      response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Aquads-Prerender/1.0', // Use a consistent UA for API calls
        },
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    
    console.log('API response status:', response.status);
    
    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      // If not JSON, read as text to see what we got
      const text = await response.text();
      console.error('Non-JSON response received. First 500 chars:', text.substring(0, 500));
      throw new Error(`API returned non-JSON response: ${contentType}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API returned ${response.status} for blog ${blogId}. Response:`, errorText.substring(0, 200));
      throw new Error(`API returned ${response.status}`);
    }
    
    const blog = await response.json();
    console.log('Blog data received:', blog ? 'Yes' : 'No', blog ? `Title: ${blog.title}` : '');
    
    if (!blog || !blog._id) {
      console.log('Blog not found or invalid data');
      return {
        statusCode: 200,
        body: getDefaultHtml(),
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=300',
        },
      };
    }
    
    console.log('Blog found successfully:', blog.title);
    
    // Create clean description from blog content
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';
    
    // Create SEO-friendly URL for canonical and og:url
    const slug = createSlug(blog.title);
    const seoUrl = `https://www.aquads.xyz/learn/${slug}-${blogId}`;
    // Relative URL for redirect (works better with React Router)
    const redirectUrl = `/learn/${slug}-${blogId}`;
    
    console.log('Generated slug:', slug);
    console.log('SEO URL:', seoUrl);
    console.log('Redirect URL:', redirectUrl);
    
    return {
      statusCode: 200,
      body: getBlogHtml(blog, description, seoUrl, redirectUrl),
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache successful responses for 1 hour
      },
    };
  } catch (error) {
    console.error('Error fetching blog:', error.message || error);
    // Return default HTML with appropriate caching
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=60', // Cache errors for 1 minute only
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
  
  // Limit slug length to prevent extremely long URLs
  const maxLength = 50;
  if (slug.length > maxLength) {
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
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <meta name="google-site-verification" content="UMC2vp6y4mZgNAXQYgv9nqe83JsEKOIg7Tv8tDT7_TA">
  <title>${escapedTitle} - Aquads Blog</title>
  <meta name="description" content="${escapedDescription}">
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@_Aquads">
  <meta name="twitter:title" content="${escapedTitle} - Aquads Blog">
  <meta name="twitter:description" content="${escapedDescription}">
  <meta name="twitter:image" content="${escapedImageUrl}">
  
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
  
  <link rel="canonical" href="${escapedSeoUrl}">
  
  <script>
    // For regular users: Redirect to the React app route
    // The redirect goes to /learn/slug-id which React Router handles
    // But we'll update the URL back to /share/blog/:id after load
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '${escapedRedirectUrl}';
    }
  </script>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <p>${escapedDescription}</p>
  <p><a href="${escapedRedirectUrl}">Read the full article</a></p>
  <script>
    // Backup redirect
    setTimeout(function() {
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '${escapedRedirectUrl}';
      }
    }, 100);
  </script>
</body>
</html>`;
}

// Function to generate default HTML if blog not found
function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="Aquads - World's First BEX - Bicentralized Exchange Hub">
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@_Aquads">
  <meta name="twitter:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">
  <meta name="twitter:description" content="Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  
  <!-- Open Graph meta tags -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads">
  <meta property="og:url" content="https://www.aquads.xyz">
  <meta property="og:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">
  <meta property="og:description" content="Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  
  <title>Aquads - World's First BEX - Bicentralized Exchange Hub</title>
  <script>window.location.href='/learn';</script>
</head>
<body>
  <h1>Aquads - Web3 Crypto Hub & Freelancer Marketplace</h1>
  <p>Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!</p>
  <script>
    setTimeout(function() {
      window.location.href = '/learn';
    }, 100);
  </script>
</body>
</html>`;
}

