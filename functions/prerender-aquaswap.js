// Netlify function to prerender AquaSwap token pages for social media crawlers
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('=== PRERENDER-AQUASWAP CALLED ===');
  
  const params = event.queryStringParameters || {};
  const tokenAddress = params.token;
  const blockchain = params.blockchain;
  
  console.log('Token:', tokenAddress, 'Blockchain:', blockchain);
  
  if (!tokenAddress || !blockchain) {
    console.log('Missing params, returning default');
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 'Content-Type': 'text/html' },
    };
  }
  
  try {
    // Try pairs endpoint first
    let url = `https://api.dexscreener.com/latest/dex/pairs/${blockchain}/${tokenAddress}`;
    console.log('Fetching:', url);
    
    let response = await fetch(url);
    let data = await response.json();
    
    // If no pair, try tokens endpoint
    if (!data.pair && (!data.pairs || !data.pairs.length)) {
      url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
      console.log('Trying tokens endpoint:', url);
      response = await fetch(url);
      data = await response.json();
    }
    
    const pair = data.pair || (data.pairs && data.pairs[0]) || null;
    
    if (!pair) {
      console.log('No pair found');
      return {
        statusCode: 200,
        body: getDefaultHtml(),
        headers: { 'Content-Type': 'text/html' },
      };
    }
    
    // Extract token data
    const baseToken = pair.baseToken || {};
    const symbol = baseToken.symbol || 'TOKEN';
    const name = baseToken.name || symbol;
    const priceUsd = parseFloat(pair.priceUsd) || 0;
    const priceChange24h = pair.priceChange?.h24 || 0;
    const marketCap = pair.marketCap || pair.fdv || 0;
    const volume24h = pair.volume?.h24 || 0;
    const liquidity = pair.liquidity?.usd || 0;
    const tokenImage = pair.info?.imageUrl || 'https://www.aquads.xyz/logo712.png';
    
    console.log('Token found:', symbol, 'Image:', tokenImage);
    
    // Format numbers
    const formatNum = (n) => {
      if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
      if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
      return `$${n.toFixed(2)}`;
    };
    
    const formatPrice = (p) => {
      if (p < 0.00001) return `$${p.toExponential(2)}`;
      if (p < 0.01) return `$${p.toFixed(6)}`;
      if (p < 1) return `$${p.toFixed(4)}`;
      return `$${p.toFixed(2)}`;
    };
    
    const changeSign = priceChange24h >= 0 ? '+' : '';
    const title = `$${symbol} │ ${formatPrice(priceUsd)} │ ${changeSign}${priceChange24h.toFixed(1)}% 24h`;
    const description = `MCAP: ${formatNum(marketCap)} • Vol: ${formatNum(volume24h)} • Liq: ${formatNum(liquidity)} • Trade ${symbol} on Aquads DEX`;
    const pageUrl = `https://www.aquads.xyz/aquaswap?token=${tokenAddress}&blockchain=${blockchain}`;
    
    return {
      statusCode: 200,
      body: getTokenHtml(symbol, name, title, description, tokenImage, pageUrl, tokenAddress, blockchain),
      headers: { 'Content-Type': 'text/html' },
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 200,
      body: getDefaultHtml(),
      headers: { 'Content-Type': 'text/html' },
    };
  }
};

function getTokenHtml(symbol, name, title, description, image, url, token, blockchain) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$${symbol} - ${name} │ Aquads DEX</title>
  <meta name="description" content="${description}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@_Aquads">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads DEX">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  
  <script>window.location.href='/aquaswap?token=${token}&blockchain=${blockchain}';</script>
</head>
<body>
  <h1>$${symbol} - ${name}</h1>
  <p>${description}</p>
</body>
</html>`;
}

function getDefaultHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AquaSwap - Aquads DEX</title>
  <meta name="description" content="Trade tokens on Aquads DEX with live charts">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@_Aquads">
  <meta name="twitter:title" content="AquaSwap - Aquads DEX">
  <meta name="twitter:description" content="Trade tokens on Aquads DEX with live charts">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads DEX">
  <meta property="og:url" content="https://www.aquads.xyz/aquaswap">
  <meta property="og:title" content="AquaSwap - Aquads DEX">
  <meta property="og:description" content="Trade tokens on Aquads DEX with live charts">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  
  <script>window.location.href='/aquaswap';</script>
</head>
<body>
  <h1>AquaSwap - Aquads DEX</h1>
  <p>Trade tokens on Aquads DEX with live charts</p>
</body>
</html>`;
}

