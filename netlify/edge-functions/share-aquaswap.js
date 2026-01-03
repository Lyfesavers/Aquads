// Netlify Edge Function to serve AquaSwap token metadata for social media crawlers
// Edge functions run on Deno at the CDN edge and don't have the same bot-blocking issues

// Map chain names to DEXScreener format
const chainMapping = {
  'ether': 'ethereum',
  'eth': 'ethereum',
  'sol': 'solana',
  'bnb': 'bsc',
  'avax': 'avalanche',
  'arb': 'arbitrum',
  'op': 'optimism',
  'ftm': 'fantom',
  'matic': 'polygon',
  'base': 'base',
  'blast': 'blast',
  'sui': 'sui',
  'ton': 'ton',
  'tron': 'tron',
  'aptos': 'aptos',
  'cronos': 'cronos',
  'pulsechain': 'pulsechain',
  'mantle': 'mantle',
  'linea': 'linea',
  'scroll': 'scroll',
  'zksync': 'zksync',
};

export default async (request, context) => {
  const url = new URL(request.url);
  const tokenAddress = url.searchParams.get('token');
  const rawBlockchain = url.searchParams.get('blockchain');

  console.log('AquaSwap share request:', { tokenAddress, rawBlockchain });

  if (!tokenAddress || !rawBlockchain) {
    console.log('Missing params, returning default');
    return getDefaultResponse();
  }

  // Map blockchain name to DEXScreener format
  const blockchain = chainMapping[rawBlockchain.toLowerCase()] || rawBlockchain.toLowerCase();
  console.log('Mapped blockchain:', rawBlockchain, '->', blockchain);

  try {
    // Try pairs endpoint first
    let apiUrl = `https://api.dexscreener.com/latest/dex/pairs/${blockchain}/${tokenAddress}`;
    console.log('Fetching:', apiUrl);

    let response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Aquads-Edge-Function/1.0'
      }
    });
    
    let data = await response.json();

    // If no pair, try tokens endpoint
    if (!data.pair && (!data.pairs || !data.pairs.length)) {
      apiUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
      console.log('Trying tokens endpoint:', apiUrl);
      response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Aquads-Edge-Function/1.0'
        }
      });
      data = await response.json();
    }

    const pair = data.pair || (data.pairs && data.pairs[0]) || null;

    if (!pair) {
      console.log('No pair found');
      return getDefaultResponse();
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

    // Build HTML with proper metadata
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$${escapeHtml(symbol)} - ${escapeHtml(name)} │ Aquads DEX</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(tokenImage)}">
  
  <!-- Open Graph meta tags -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads DEX">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(tokenImage)}">
  
  <!-- Redirect to actual AquaSwap page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}">
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%); color: #fff; min-height: 100vh; }
    .container { max-width: 600px; margin: 0 auto; }
    .token-header { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px; }
    .token-logo { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #00d4ff; }
    h1 { color: #00d4ff; font-size: 1.8rem; margin: 0; }
    .price { font-size: 1.4rem; color: #fff; margin: 10px 0; }
    .change { color: ${priceChange24h >= 0 ? '#00d4aa' : '#ff6b6b'}; }
    .stats { color: #b0b0b0; line-height: 1.8; }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="token-header">
      <img src="${escapeHtml(tokenImage)}" alt="${escapeHtml(symbol)}" class="token-logo" onerror="this.style.display='none'">
      <h1>$${escapeHtml(symbol)}</h1>
    </div>
    <p class="price">${formatPrice(priceUsd)} <span class="change">(${changeSign}${priceChange24h.toFixed(1)}%)</span></p>
    <p class="stats">${escapeHtml(description)}</p>
    <p>Redirecting to Aquads DEX... <a href="${escapeHtml(pageUrl)}">Click here</a> if not redirected.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes (prices change frequently)
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return getDefaultResponse();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
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
  <title>AquaSwap - Aquads DEX</title>
  <meta name="description" content="Trade tokens on Aquads DEX with live charts">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="AquaSwap - Aquads DEX">
  <meta name="twitter:description" content="Trade tokens on Aquads DEX with live charts">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads DEX">
  <meta property="og:url" content="https://www.aquads.xyz/aquaswap">
  <meta property="og:title" content="AquaSwap - Aquads DEX">
  <meta property="og:description" content="Trade tokens on Aquads DEX with live charts">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/aquaswap">
</head>
<body>
  <p>Redirecting to AquaSwap... <a href="https://www.aquads.xyz/aquaswap">Click here</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  path: "/share/aquaswap",
};

