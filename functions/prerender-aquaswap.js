// Netlify function to prerender AquaSwap token pages for social media crawlers
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Extract query parameters
  const params = event.queryStringParameters || {};
  const tokenAddress = params.token;
  const blockchain = params.blockchain;
  
  if (!tokenAddress || !blockchain) {
    // If no token params, serve default AquaSwap page
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }
  
  try {
    // Try pairs endpoint first (for pair addresses)
    let dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${blockchain}/${tokenAddress}`);
    let dexData = await dexResponse.json();
    
    // If no pair found, try tokens endpoint (for token addresses)
    if (!dexData.pair && (!dexData.pairs || !dexData.pairs.length)) {
      dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
      dexData = await dexResponse.json();
    }
    
    // Get the pair data (either from pair or pairs array)
    const pair = dexData.pair || (dexData.pairs && dexData.pairs.length > 0 ? dexData.pairs[0] : null);
    
    if (!pair) {
      return {
        statusCode: 200,
        body: getDefaultHtml(),
        headers: {
          'Content-Type': 'text/html',
        },
      };
    }
    
    // Extract token data
    const baseToken = pair.baseToken || {};
    const symbol = baseToken.symbol || 'TOKEN';
    const name = baseToken.name || symbol;
    const priceUsd = pair.priceUsd ? parseFloat(pair.priceUsd) : 0;
    const priceChange24h = pair.priceChange?.h24 || 0;
    const marketCap = pair.marketCap || pair.fdv || 0;
    const volume24h = pair.volume?.h24 || 0;
    const liquidity = pair.liquidity?.usd || 0;
    
    // Get token image from DexScreener or fallback
    const tokenImage = pair.info?.imageUrl || 'https://www.aquads.xyz/logo712.png';
    
    // Format numbers for display
    const formatNumber = (num) => {
      if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
      if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
      return `$${num.toFixed(2)}`;
    };
    
    const formatPrice = (price) => {
      if (price < 0.00001) return `$${price.toExponential(2)}`;
      if (price < 0.01) return `$${price.toFixed(6)}`;
      if (price < 1) return `$${price.toFixed(4)}`;
      return `$${price.toFixed(2)}`;
    };
    
    // Create formatted title and description
    const priceChangeSign = priceChange24h >= 0 ? '+' : '';
    const priceChangeFormatted = `${priceChangeSign}${priceChange24h.toFixed(1)}%`;
    
    const ogTitle = `$${symbol} │ ${formatPrice(priceUsd)} │ ${priceChangeFormatted} 24h`;
    const ogDescription = `MCAP: ${formatNumber(marketCap)} • 24h Vol: ${formatNumber(volume24h)} • Liq: ${formatNumber(liquidity)} • Trade ${symbol} on Aquads DEX`;
    
    // Create clean URL
    const cleanUrl = `https://www.aquads.xyz/aquaswap?token=${tokenAddress}&blockchain=${blockchain}`;
    
    return {
      statusCode: 200,
      body: getTokenHtml(symbol, name, ogTitle, ogDescription, tokenImage, cleanUrl, tokenAddress, blockchain),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  } catch (error) {
    console.error('Error fetching token data:', error);
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: {
        'Content-Type': 'text/html',
      },
    };
  }
};

// Function to generate HTML with token metadata
function getTokenHtml(symbol, name, ogTitle, ogDescription, tokenImage, cleanUrl, tokenAddress, blockchain) {
  // Escape HTML to prevent XSS
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="google-site-verification" content="UMC2vp6y4mZgNAXQYgv9nqe83JsEKOIg7Tv8tDT7_TA" />
    <meta name="description" content="${escapeHtml(ogDescription)}" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@_Aquads">
    <meta name="twitter:image" content="${escapeHtml(tokenImage)}">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:image" content="${escapeHtml(tokenImage)}">
    <meta property="og:url" content="${escapeHtml(cleanUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Aquads DEX">
    
    <link rel="canonical" href="${escapeHtml(cleanUrl)}" />
    <title>$${escapeHtml(symbol)} - ${escapeHtml(name)} │ Aquads DEX</title>
    <script>
      // Redirect to the app URL
      window.location.href = '/aquaswap?token=${escapeHtml(tokenAddress)}&blockchain=${escapeHtml(blockchain)}';
    </script>
  </head>
  <body>
    <h1>$${escapeHtml(symbol)} - ${escapeHtml(name)}</h1>
    <p>${escapeHtml(ogDescription)}</p>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/aquaswap?token=${escapeHtml(tokenAddress)}&blockchain=${escapeHtml(blockchain)}';
      }, 100);
    </script>
  </body>
</html>`;
}

// Function to generate default HTML if token not found
function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="AquaSwap - Trade tokens on Aquads DEX with live charts and swap functionality" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@_Aquads">
    <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
    <meta name="twitter:title" content="AquaSwap - Aquads DEX">
    <meta name="twitter:description" content="Trade tokens on Aquads DEX with live charts and swap functionality">
    
    <!-- Open Graph meta tags -->
    <meta property="og:title" content="AquaSwap - Aquads DEX">
    <meta property="og:description" content="Trade tokens on Aquads DEX with live charts and swap functionality">
    <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
    <meta property="og:url" content="https://www.aquads.xyz/aquaswap">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Aquads DEX">
    
    <title>AquaSwap - Aquads DEX</title>
    <script>
      // Redirect to the app
      window.location.href = '/aquaswap';
    </script>
  </head>
  <body>
    <h1>AquaSwap - Aquads DEX</h1>
    <p>Trade tokens on Aquads DEX with live charts and swap functionality</p>
    <script>
      // Backup redirect
      setTimeout(function() {
        window.location.href = '/aquaswap';
      }, 100);
    </script>
  </body>
</html>`;
}

