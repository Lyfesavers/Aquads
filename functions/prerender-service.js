// Netlify function to prerender service pages for social media crawlers
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Extract the service ID from the path
  const path = event.path;
  const match = path.match(/\/service\/(.+)-([a-zA-Z0-9]+)$/);
  
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
  
  const serviceId = match[2];
  
  try {
    // Fetch the service data from your API
    const response = await fetch(`https://aquads.onrender.com/api/services/${serviceId}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const service = await response.json();
    
    // Create clean description from service description
    const description = service.description
      ? service.description.replace(/<[^>]*>/g, '').slice(0, 160) + '...'
      : 'Check out this freelance service on Aquads!';
    
    // Create SEO-friendly URL
    const slug = createSlug(service.title);
    const seoUrl = `https://www.aquads.xyz/service/${slug}-${serviceId}`;
    
    return {
      statusCode: 200,
      body: getServiceHtml(service, description, seoUrl),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  } catch (error) {
    console.error('Error fetching service:', error);
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

// Function to generate HTML with service metadata
function getServiceHtml(service, description, seoUrl) {
  // Format the price for display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Construct seller info
  const sellerName = service.seller?.username || 'Freelancer';
  const sellerImage = service.seller?.image || 'https://www.aquads.xyz/default-avatar.png';
  
  // Generate catchy title for meta tags
  const metaTitle = `${service.title} | ${sellerName} on Aquads`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${description}" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${service.image || sellerImage}">
    <meta name="twitter:title" content="${metaTitle}">
    <meta name="twitter:description" content="${description}">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${metaTitle}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${service.image || sellerImage}">
    <meta property="og:url" content="${seoUrl}">
    <meta property="og:type" content="product">
    <meta property="og:price:amount" content="${service.price}">
    <meta property="og:price:currency" content="USD">
    
    <link rel="canonical" href="${seoUrl}" />
    <title>${metaTitle}</title>
    <script>
      // Redirect to the app URL
      window.location.href = '/marketplace?serviceId=${service._id}';
    </script>
  </head>
  <body>
    <h1>${service.title}</h1>
    <h2>By ${sellerName}</h2>
    <div>${formatPrice(service.price)}</div>
    <div>${service.description || ''}</div>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/marketplace?serviceId=${service._id}';
      }, 100);
    </script>
  </body>
</html>`;
}

// Function to generate default HTML if service not found
function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Aquads - The Premier Web3 Freelancer Marketplace" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
    <meta name="twitter:title" content="Aquads Freelancer Marketplace">
    <meta name="twitter:description" content="Find top Web3 freelancers and services on Aquads, the premier crypto freelancer marketplace.">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="Aquads Freelancer Marketplace">
    <meta property="og:description" content="Find top Web3 freelancers and services on Aquads, the premier crypto freelancer marketplace.">
    <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
    <meta property="og:url" content="https://aquads.xyz/marketplace">
    <meta property="og:type" content="website">
    
    <title>Aquads Freelancer Marketplace</title>
    <script>
      // Redirect to the app
      window.location.href = '/marketplace';
    </script>
  </head>
  <body>
    <h1>Aquads Freelancer Marketplace</h1>
    <p>Find top Web3 freelancers and services on Aquads, the premier crypto freelancer marketplace.</p>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/marketplace';
      }, 100);
    </script>
  </body>
</html>`;
} 