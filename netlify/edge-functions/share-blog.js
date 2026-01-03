// Netlify Edge Function to serve blog metadata for social media crawlers
// Edge functions run on Deno at the CDN edge and don't have the same bot-blocking issues

export default async (request, context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Extract blog ID from /share/blog/:id
  const blogId = pathParts[pathParts.length - 1];
  
  if (!blogId || blogId === 'blog') {
    return new Response('Blog ID required', { status: 400 });
  }

  try {
    // Fetch blog data from Render API
    const apiResponse = await fetch(`https://aquads.onrender.com/api/blogs/${blogId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Aquads-Edge-Function/1.0'
      }
    });

    if (!apiResponse.ok) {
      console.log(`API returned ${apiResponse.status} for blog ${blogId}`);
      return getDefaultResponse();
    }

    const blog = await apiResponse.json();
    
    if (!blog || !blog.title) {
      return getDefaultResponse();
    }

    // Create clean description from blog content
    const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '').trim() : '';
    const description = stripHtml(blog.content).slice(0, 200) + '...';
    
    // Use blog banner image or default
    const imageUrl = blog.bannerImage || 'https://www.aquads.xyz/logo712.png';
    
    // Redirect URL for users (after bots read meta tags)
    const redirectUrl = `https://www.aquads.xyz/learn?blogId=${blogId}`;
    
    // Build HTML with proper metadata
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(blog.title)} - Aquads Blog</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapeHtml(blog.title)} - Aquads Blog">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  
  <!-- Open Graph meta tags -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Aquads Blog">
  <meta property="og:title" content="${escapeHtml(blog.title)} - Aquads Blog">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:url" content="${escapeHtml(redirectUrl)}">
  
  <!-- Redirect to actual blog page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #00d4ff; font-size: 1.5rem; line-height: 1.4; }
    p { color: #b0b0b0; line-height: 1.6; }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(blog.title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Redirecting to blog... <a href="${escapeHtml(redirectUrl)}">Click here</a> if not redirected.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return getDefaultResponse();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDefaultResponse() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Aquads Blog</title>
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Aquads Blog">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  <meta property="og:title" content="Aquads Blog">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/learn">
</head>
<body>
  <p>Redirecting to Aquads Blog... <a href="https://www.aquads.xyz/learn">Click here</a></p>
</body>
</html>`;
  
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  path: "/share/blog/*",
};

