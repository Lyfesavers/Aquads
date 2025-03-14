// Generate static HTML pages for blogs to improve social media sharing
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function generateBlogPages() {
  console.log('Starting static blog page generation...');
  
  // Create directory for static blog pages
  const blogDir = path.join(__dirname, 'build', 'blog-static');
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
    console.log(`Created directory: ${blogDir}`);
  }

  try {
    // Fetch all blogs from your API
    console.log('Fetching blogs from API...');
    const response = await fetch('https://www.aquads.xyz/api/blogs');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blogs: ${response.status} ${response.statusText}`);
    }
    
    const blogs = await response.json();
    console.log(`Fetched ${blogs.length} blogs`);
    
    if (!Array.isArray(blogs)) {
      throw new Error('API did not return an array of blogs');
    }
    
    for (const blog of blogs) {
      if (!blog._id) {
        console.warn('Blog missing ID, skipping:', blog);
        continue;
      }
      
      // Create slug
      const slug = createSlug(blog.title);
      console.log(`Generating page for "${blog.title}" (${blog._id})`);
      
      // Generate static HTML
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="icon" href="/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(blog.title)} - Aquads Blog</title>
  <meta name="description" content="${escapeHtml(cleanDescription(blog.content))}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://www.aquads.xyz/how-to/${slug}-${blog._id}">
  <meta property="og:title" content="${escapeHtml(blog.title)} - Aquads Blog">
  <meta property="og:description" content="${escapeHtml(cleanDescription(blog.content))}">
  <meta property="og:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
  <meta property="og:site_name" content="Aquads">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://www.aquads.xyz/how-to/${slug}-${blog._id}">
  <meta name="twitter:title" content="${escapeHtml(blog.title)} - Aquads Blog">
  <meta name="twitter:description" content="${escapeHtml(cleanDescription(blog.content))}">
  <meta name="twitter:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
  
  <!-- Redirect after meta tags are read by crawlers -->
  <meta http-equiv="refresh" content="0;url=/how-to?blogId=${blog._id}${blog.author ? '&ref=' + blog.author : ''}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(blog.title)}</h1>
  <div>${blog.content || ''}</div>
  <script>
    // Redirect to the app, preserving any URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const existingParams = urlParams.toString();
    const redirectUrl = '/how-to?blogId=${blog._id}' + (existingParams ? '&' + existingParams : '');
    window.location.href = redirectUrl;
  </script>
</body>
</html>`;
      
      // Write to file
      fs.writeFileSync(path.join(blogDir, `${slug}-${blog._id}.html`), html);
    }
    
    // Create a catch-all file for blogs not in the list (maybe newly created)
    createFallbackPage(blogDir);
    
    console.log(`Successfully generated ${blogs.length} static blog pages`);
  } catch (error) {
    console.error('Error generating blog pages:', error);
    // Ensure the build doesn't fail if blog generation fails
    createFallbackPage(path.join(__dirname, 'build', 'blog-static'));
  }
}

function createFallbackPage(blogDir) {
  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Aquads Blog</title>
  <meta name="description" content="Check out the latest blog posts from Aquads - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.aquads.xyz/how-to">
  <meta property="og:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">
  <meta property="og:description" content="Check out the latest blog posts from Aquads - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://www.aquads.xyz/how-to">
  <meta property="twitter:title" content="Aquads - Web3 Crypto Hub & Freelancer Marketplace">
  <meta property="twitter:description" content="Check out the latest blog posts from Aquads - Your all-in-one Web3 crypto Hub and Freelancer marketplace!">
  <meta property="twitter:image" content="https://www.aquads.xyz/logo712.png">
  
  <!-- Redirect after meta tags are read by crawlers -->
  <meta http-equiv="refresh" content="0;url=/how-to">
</head>
<body>
  <h1>Aquads Blog</h1>
  <p>Redirecting to the blog...</p>
  <script>
    // Extract blog ID from URL and redirect to SPA
    const path = window.location.pathname;
    const match = path.match(/\/how-to\/(.+)-([a-zA-Z0-9]+)(\/|$)/);
    if (match) {
      const blogId = match[2];
      // Preserve any existing query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const existingParams = urlParams.toString();
      const redirectUrl = '/how-to?blogId=' + blogId + (existingParams ? '&' + existingParams : '');
      window.location.href = redirectUrl;
    } else {
      window.location.href = '/how-to';
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(blogDir, 'fallback.html'), fallbackHtml);
  console.log('Created fallback blog page');
}

function createSlug(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cleanDescription(content) {
  if (!content) return 'Read our latest blog post on Aquads!';
  const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return textOnly.slice(0, 200) + (textOnly.length > 200 ? '...' : '');
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Run the function
generateBlogPages(); 