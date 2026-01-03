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

// Chain display names and icons
const chainInfo = {
  'ethereum': { name: 'Ethereum', icon: '⟠' },
  'solana': { name: 'Solana', icon: '◎' },
  'bsc': { name: 'BNB Chain', icon: '🔶' },
  'arbitrum': { name: 'Arbitrum', icon: '🔵' },
  'base': { name: 'Base', icon: '🔵' },
  'polygon': { name: 'Polygon', icon: '💜' },
  'avalanche': { name: 'Avalanche', icon: '🔺' },
  'optimism': { name: 'Optimism', icon: '🔴' },
  'fantom': { name: 'Fantom', icon: '👻' },
  'blast': { name: 'Blast', icon: '💥' },
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

    // Extract comprehensive token data
    const baseToken = pair.baseToken || {};
    const quoteToken = pair.quoteToken || {};
    const symbol = baseToken.symbol || 'TOKEN';
    const name = baseToken.name || symbol;
    const priceUsd = parseFloat(pair.priceUsd) || 0;
    const priceChange24h = pair.priceChange?.h24 || 0;
    const priceChange1h = pair.priceChange?.h1 || 0;
    const priceChange6h = pair.priceChange?.h6 || 0;
    const marketCap = pair.marketCap || pair.fdv || 0;
    const fdv = pair.fdv || 0;
    const volume24h = pair.volume?.h24 || 0;
    const volume6h = pair.volume?.h6 || 0;
    const liquidity = pair.liquidity?.usd || 0;
    const tokenImage = pair.info?.imageUrl || 'https://www.aquads.xyz/logo712.png';
    const dexName = pair.dexId || 'DEX';
    const pairCreatedAt = pair.pairCreatedAt;
    const txns24h = pair.txns?.h24 || { buys: 0, sells: 0 };
    const chainDisplay = chainInfo[blockchain] || { name: blockchain, icon: '🔗' };

    console.log('Token found:', symbol, 'Image:', tokenImage);

    // Format numbers
    const formatNum = (n) => {
      if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
      if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
      return `$${n.toFixed(2)}`;
    };

    const formatPrice = (p) => {
      if (p === 0) return '$0';
      if (p < 0.00000001) return `$${p.toExponential(2)}`;
      if (p < 0.0001) return `$${p.toFixed(10).replace(/\.?0+$/, '')}`;
      if (p < 0.01) return `$${p.toFixed(6)}`;
      if (p < 1) return `$${p.toFixed(4)}`;
      if (p < 1000) return `$${p.toFixed(2)}`;
      return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    };

    const formatAge = (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days > 365) return `${Math.floor(days/365)}y old`;
      if (days > 30) return `${Math.floor(days/30)}mo old`;
      if (days > 0) return `${days}d old`;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 0) return `${hours}h old`;
      return 'New';
    };

    const changeSign = (val) => val >= 0 ? '+' : '';
    const changeEmoji = priceChange24h >= 10 ? '🚀' : priceChange24h >= 0 ? '📈' : priceChange24h <= -10 ? '📉' : '📊';
    
    // Enhanced title with more context
    const title = `$${symbol} ${changeEmoji} ${formatPrice(priceUsd)} (${changeSign(priceChange24h)}${priceChange24h.toFixed(1)}%)`;
    
    // Rich description with more stats
    const description = `💰 MCap: ${formatNum(marketCap)} • 💧 Liq: ${formatNum(liquidity)} • 📊 Vol: ${formatNum(volume24h)} • ${chainDisplay.icon} ${chainDisplay.name} • Trade $${symbol} on Aquads`;
    
    const pageUrl = `https://www.aquads.xyz/aquaswap?token=${tokenAddress}&blockchain=${rawBlockchain}`;
    const tokenAge = formatAge(pairCreatedAt);

    // Build HTML with enhanced Aquads-branded design
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
  <meta name="twitter:creator" content="@AquadsXYZ">
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
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  
  <!-- Redirect to actual AquaSwap page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(145deg, #0a0a12 0%, #0d0d1a 50%, #12082a 100%);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      overflow: hidden;
    }
    
    /* Animated background elements */
    body::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 70%, rgba(0, 212, 255, 0.05) 0%, transparent 50%),
                  radial-gradient(circle at 70% 30%, rgba(138, 43, 226, 0.05) 0%, transparent 50%);
      animation: pulse 8s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
    }
    
    .card {
      position: relative;
      background: linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      backdrop-filter: blur(20px);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5),
                  inset 0 1px 0 rgba(255,255,255,0.1);
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent);
    }
    
    /* Header with logo */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .logo-wrap {
      position: relative;
      width: 72px;
      height: 72px;
      flex-shrink: 0;
    }
    
    .logo-glow {
      position: absolute;
      inset: -4px;
      background: linear-gradient(135deg, #00d4ff, #8a2be2);
      border-radius: 50%;
      opacity: 0.6;
      filter: blur(8px);
      animation: glow 3s ease-in-out infinite;
    }
    
    @keyframes glow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    
    .logo {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid rgba(255,255,255,0.2);
      background: #1a1a2e;
    }
    
    .token-info {
      flex: 1;
      min-width: 0;
    }
    
    .token-symbol {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .token-symbol .ticker {
      background: linear-gradient(135deg, #00d4ff, #00a8cc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .chain-badge {
      font-size: 0.7rem;
      padding: 4px 10px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
    }
    
    .token-name {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.5);
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Price section */
    .price-section {
      background: rgba(0,0,0,0.3);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .price-main {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .price {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
    }
    
    .change-24h {
      font-size: 1.1rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 8px;
    }
    
    .change-24h.positive { background: rgba(0,212,170,0.2); color: #00d4aa; }
    .change-24h.negative { background: rgba(255,107,107,0.2); color: #ff6b6b; }
    
    .price-changes {
      display: flex;
      gap: 16px;
      font-size: 0.85rem;
    }
    
    .price-changes span {
      color: rgba(255,255,255,0.5);
    }
    
    .price-changes .val { font-weight: 600; margin-left: 4px; }
    .price-changes .val.pos { color: #00d4aa; }
    .price-changes .val.neg { color: #ff6b6b; }
    
    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .stat {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 14px;
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .stat-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
    }
    
    /* Activity row */
    .activity {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.85rem;
    }
    
    .activity-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .buys { color: #00d4aa; }
    .sells { color: #ff6b6b; }
    .age { color: rgba(255,255,255,0.5); }
    
    /* Footer */
    .footer {
      text-align: center;
    }
    
    .cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
      color: #000;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,212,255,0.3);
    }
    
    .cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,212,255,0.4);
    }
    
    .aquads-brand {
      margin-top: 16px;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.3);
    }
    
    .aquads-brand span {
      background: linear-gradient(135deg, #00d4ff, #8a2be2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-wrap">
        <div class="logo-glow"></div>
        <img src="${escapeHtml(tokenImage)}" alt="${escapeHtml(symbol)}" class="logo" onerror="this.src='https://www.aquads.xyz/logo712.png'">
      </div>
      <div class="token-info">
        <div class="token-symbol">
          <span class="ticker">$${escapeHtml(symbol)}</span>
          <span class="chain-badge">${chainDisplay.icon} ${chainDisplay.name}</span>
        </div>
        <div class="token-name">${escapeHtml(name)}</div>
      </div>
    </div>
    
    <div class="price-section">
      <div class="price-main">
        <span class="price">${formatPrice(priceUsd)}</span>
        <span class="change-24h ${priceChange24h >= 0 ? 'positive' : 'negative'}">${changeSign(priceChange24h)}${priceChange24h.toFixed(2)}%</span>
      </div>
      <div class="price-changes">
        <span>1h: <span class="val ${priceChange1h >= 0 ? 'pos' : 'neg'}">${changeSign(priceChange1h)}${priceChange1h.toFixed(1)}%</span></span>
        <span>6h: <span class="val ${priceChange6h >= 0 ? 'pos' : 'neg'}">${changeSign(priceChange6h)}${priceChange6h.toFixed(1)}%</span></span>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-label">💰 Market Cap</div>
        <div class="stat-value">${formatNum(marketCap)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">💧 Liquidity</div>
        <div class="stat-value">${formatNum(liquidity)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">📊 24h Volume</div>
        <div class="stat-value">${formatNum(volume24h)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">🏦 FDV</div>
        <div class="stat-value">${formatNum(fdv)}</div>
      </div>
    </div>
    
    <div class="activity">
      <div class="activity-item buys">🟢 ${txns24h.buys} buys</div>
      <div class="activity-item sells">🔴 ${txns24h.sells} sells</div>
      ${tokenAge ? `<div class="activity-item age">⏱️ ${tokenAge}</div>` : ''}
    </div>
    
    <div class="footer">
      <a href="${escapeHtml(pageUrl)}" class="cta">
        Trade on Aquads DEX →
      </a>
      <div class="aquads-brand">Powered by <span>Aquads</span> • Web3 Crypto Hub</div>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
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
  <meta name="description" content="Trade tokens on Aquads DEX with live charts, real-time prices, and instant swaps">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@AquadsXYZ">
  <meta name="twitter:title" content="AquaSwap - Aquads DEX 🌊">
  <meta name="twitter:description" content="Trade tokens on Aquads DEX with live charts, real-time prices, and instant swaps">
  <meta name="twitter:image" content="https://www.aquads.xyz/logo712.png">
  
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Aquads DEX">
  <meta property="og:url" content="https://www.aquads.xyz/aquaswap">
  <meta property="og:title" content="AquaSwap - Aquads DEX 🌊">
  <meta property="og:description" content="Trade tokens on Aquads DEX with live charts, real-time prices, and instant swaps">
  <meta property="og:image" content="https://www.aquads.xyz/logo712.png">
  
  <meta http-equiv="refresh" content="0;url=https://www.aquads.xyz/aquaswap">
</head>
<body style="font-family: sans-serif; background: #0a0a12; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center;">
    <h1 style="color: #00d4ff;">AquaSwap</h1>
    <p>Redirecting to Aquads DEX...</p>
    <a href="https://www.aquads.xyz/aquaswap" style="color: #00d4ff;">Click here</a>
  </div>
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
