// Netlify function to prerender blog posts for social media crawlers
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Extract the blog ID from the path
  const path = event.path;
  const match = path.match(/\/how-to\/(.+)-([a-zA-Z0-9]+)$/);
  
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
  
  try {
    // Fetch the blog data from your API
    const response = await fetch(`https://www.aquads.xyz/api/blogs/${blogId}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const blog = await response.json();
    
    // Create clean description from blog content
    const description = blog.content
      ? blog.content.replace(/<[^>]*>/g, '').slice(0, 200) + '...'
      : 'Read our latest blog post on Aquads!';
    
    // Create SEO-friendly URL
    const slug = createSlug(blog.title);
    const seoUrl = `https://www.aquads.xyz/how-to/${slug}-${blogId}`;
    
    return {
      statusCode: 200,
      body: getBlogHtml(blog, description, seoUrl),
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
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Function to generate HTML with blog metadata
function getBlogHtml(blog, description, seoUrl) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="google-site-verification" content="UMC2vp6y4mZgNAXQYgv9nqe83JsEKOIg7Tv8tDT7_TA" />
    <meta name="description" content="${description}" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
    <meta name="twitter:title" content="${blog.title} - Aquads Blog">
    <meta name="twitter:description" content="${description}">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${blog.title} - Aquads Blog">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${blog.bannerImage || 'https://www.aquads.xyz/logo712.png'}">
    <meta property="og:url" content="${seoUrl}">
    <meta property="og:type" content="article">
    
    <link rel="canonical" href="${seoUrl}" />
    <title>${blog.title} - Aquads Blog</title>
    <script>
      // Redirect to the app URL
      window.location.href = '/how-to?blogId=${blog._id}';
    </script>
  </head>
  <body>
    <h1>${blog.title}</h1>
    <div>${blog.content || ''}</div>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/how-to?blogId=${blog._id}';
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
      window.location.href = '/how-to';
    </script>
  </head>
  <body>
    <h1>Aquads - Web3 Crypto Hub & Freelancer Marketplace</h1>
    <p>Join the Aquads community - Your all-in-one Web3 crypto Hub and Freelancer marketplace!</p>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/how-to';
      }, 100);
    </script>
  </body>
</html>`;
} 