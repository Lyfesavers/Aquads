const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const axios = require('axios');

// Simple test endpoint to verify route is loaded
router.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'OG routes working', timestamp: new Date().toISOString() });
});

// Chain name mapping (same as edge function)
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

// Chain display info
const chainInfo = {
  'ethereum': { name: 'Ethereum', color: '#627EEA' },
  'solana': { name: 'Solana', color: '#14F195' },
  'bsc': { name: 'BNB Chain', color: '#F0B90B' },
  'arbitrum': { name: 'Arbitrum', color: '#28A0F0' },
  'base': { name: 'Base', color: '#0052FF' },
  'polygon': { name: 'Polygon', color: '#8247E5' },
  'avalanche': { name: 'Avalanche', color: '#E84142' },
  'optimism': { name: 'Optimism', color: '#FF0420' },
  'fantom': { name: 'Fantom', color: '#1969FF' },
  'blast': { name: 'Blast', color: '#FCFC03' },
};

// Simple in-memory cache for generated images (5 min TTL)
const imageCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Format numbers
function formatNum(n) {
  if (!n || n === 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// Format price
function formatPrice(p) {
  if (!p || p === 0) return '$0';
  if (p < 0.00000001) return `$${p.toExponential(2)}`;
  if (p < 0.0001) return `$${p.toFixed(8)}`;
  if (p < 0.01) return `$${p.toFixed(6)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  if (p < 1000) return `$${p.toFixed(2)}`;
  return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

// Escape XML special characters
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fetch and convert image to base64
async function fetchImageAsBase64(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: {
        'User-Agent': 'Aquads-OG-Generator/1.0'
      }
    });
    const base64 = Buffer.from(response.data).toString('base64');
    const contentType = response.headers['content-type'] || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to fetch token image:', error.message);
    return null;
  }
}

// Generate OG image for AquaSwap tokens
router.get('/aquaswap', async (req, res) => {
  const { token, blockchain } = req.query;

  if (!token || !blockchain) {
    return res.status(400).send('Missing token or blockchain parameter');
  }

  // Check cache
  const cacheKey = `${token}-${blockchain}`;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  try {
    // Map blockchain name
    const mappedChain = chainMapping[blockchain.toLowerCase()] || blockchain.toLowerCase();
    const chain = chainInfo[mappedChain] || { name: blockchain, color: '#00d4ff' };

    // Fetch token data from DEXScreener
    let tokenData = null;
    
    // Try pairs endpoint first
    try {
      const pairsUrl = `https://api.dexscreener.com/latest/dex/pairs/${mappedChain}/${token}`;
      const pairsRes = await axios.get(pairsUrl, { timeout: 8000 });
      if (pairsRes.data.pair) {
        tokenData = pairsRes.data.pair;
      } else if (pairsRes.data.pairs && pairsRes.data.pairs.length > 0) {
        tokenData = pairsRes.data.pairs[0];
      }
    } catch (e) {
      console.log('Pairs endpoint failed, trying tokens endpoint');
    }

    // Try tokens endpoint if pairs didn't work
    if (!tokenData) {
      try {
        const tokensUrl = `https://api.dexscreener.com/latest/dex/tokens/${token}`;
        const tokensRes = await axios.get(tokensUrl, { timeout: 8000 });
        if (tokensRes.data.pairs && tokensRes.data.pairs.length > 0) {
          tokenData = tokensRes.data.pairs[0];
        }
      } catch (e) {
        console.log('Tokens endpoint also failed');
      }
    }

    // Default values if no data found
    const symbol = tokenData?.baseToken?.symbol || 'TOKEN';
    const name = tokenData?.baseToken?.name || symbol;
    const priceUsd = parseFloat(tokenData?.priceUsd) || 0;
    const priceChange24h = tokenData?.priceChange?.h24 || 0;
    const marketCap = tokenData?.marketCap || tokenData?.fdv || 0;
    const liquidity = tokenData?.liquidity?.usd || 0;
    const volume24h = tokenData?.volume?.h24 || 0;
    const fdv = tokenData?.fdv || 0;
    const tokenImageUrl = tokenData?.info?.imageUrl || null;

    // Fetch token logo as base64
    let logoBase64 = null;
    if (tokenImageUrl) {
      logoBase64 = await fetchImageAsBase64(tokenImageUrl);
    }

    // Determine price change color and arrow
    const isPositive = priceChange24h >= 0;
    const changeColor = isPositive ? '#00d4aa' : '#ff6b6b';
    const changeArrow = isPositive ? '▲' : '▼';
    const changeSign = isPositive ? '+' : '';

    // Build SVG
    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a12"/>
      <stop offset="50%" style="stop-color:#0d0d1a"/>
      <stop offset="100%" style="stop-color:#12082a"/>
    </linearGradient>
    
    <!-- Accent gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00d4ff"/>
      <stop offset="100%" style="stop-color:#8a2be2"/>
    </linearGradient>
    
    <!-- Card background -->
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.08)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0.02)"/>
    </linearGradient>
    
    <!-- Logo glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Clip path for logo -->
    <clipPath id="logoClip">
      <circle cx="140" cy="180" r="60"/>
    </clipPath>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  
  <!-- Decorative circles -->
  <circle cx="100" cy="100" r="300" fill="rgba(0,212,255,0.03)"/>
  <circle cx="1100" cy="530" r="250" fill="rgba(138,43,226,0.03)"/>
  
  <!-- Top accent line -->
  <rect x="40" y="40" width="1120" height="2" fill="url(#accentGrad)" opacity="0.6"/>
  
  <!-- Main card background -->
  <rect x="40" y="50" width="1120" height="540" rx="24" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  
  <!-- AQUADS branding top right -->
  <text x="1100" y="100" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="url(#accentGrad)" text-anchor="end">AQUADS</text>
  <text x="1100" y="125" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.5)" text-anchor="end">BEX</text>
  
  <!-- Logo glow effect -->
  <circle cx="140" cy="180" r="65" fill="url(#accentGrad)" opacity="0.3" filter="url(#glow)"/>
  
  <!-- Logo circle background -->
  <circle cx="140" cy="180" r="60" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
  
  ${logoBase64 ? `
  <!-- Token logo -->
  <image x="80" y="120" width="120" height="120" href="${logoBase64}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>
  ` : `
  <!-- Default logo placeholder -->
  <text x="140" y="190" font-family="Arial, sans-serif" font-size="40" fill="#00d4ff" text-anchor="middle">?</text>
  `}
  
  <!-- Token Symbol -->
  <text x="230" y="160" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#00d4ff">$${escapeXml(symbol)}</text>
  
  <!-- Token Name -->
  <text x="230" y="200" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.6)">${escapeXml(name.length > 30 ? name.substring(0, 30) + '...' : name)}</text>
  
  <!-- Chain badge -->
  <rect x="230" y="215" width="${chain.name.length * 10 + 40}" height="28" rx="14" fill="${chain.color}" opacity="0.2"/>
  <circle cx="248" cy="229" r="6" fill="${chain.color}"/>
  <text x="262" y="235" font-family="Arial, sans-serif" font-size="14" fill="${chain.color}">${escapeXml(chain.name)}</text>
  
  <!-- Price section -->
  <text x="80" y="330" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#ffffff">${escapeXml(formatPrice(priceUsd))}</text>
  
  <!-- 24h Change -->
  <rect x="450" y="290" width="${String(changeSign + priceChange24h.toFixed(2)).length * 14 + 80}" height="50" rx="12" fill="${changeColor}" opacity="0.15"/>
  <text x="470" y="325" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${changeColor}">${changeArrow} ${changeSign}${priceChange24h.toFixed(2)}%</text>
  <text x="${470 + String(changeSign + priceChange24h.toFixed(2)).length * 14 + 50}" y="325" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.5)">24H</text>
  
  <!-- Divider line -->
  <rect x="80" y="370" width="1040" height="1" fill="rgba(255,255,255,0.1)"/>
  
  <!-- Stats boxes -->
  <!-- Market Cap -->
  <rect x="80" y="400" width="240" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="100" y="435" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)" text-transform="uppercase">MARKET CAP</text>
  <text x="100" y="475" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(marketCap))}</text>
  
  <!-- Liquidity -->
  <rect x="350" y="400" width="240" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="370" y="435" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">LIQUIDITY</text>
  <text x="370" y="475" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(liquidity))}</text>
  
  <!-- Volume -->
  <rect x="620" y="400" width="240" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="640" y="435" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">24H VOLUME</text>
  <text x="640" y="475" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(volume24h))}</text>
  
  <!-- FDV -->
  <rect x="890" y="400" width="230" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="910" y="435" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">FDV</text>
  <text x="910" y="475" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(fdv))}</text>
  
  <!-- Bottom CTA -->
  <text x="80" y="560" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.4)">Trade now on</text>
  <text x="220" y="560" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="url(#accentGrad)">aquads.xyz</text>
  
  <!-- Arrow icon -->
  <text x="1100" y="560" font-family="Arial, sans-serif" font-size="24" fill="#00d4ff" text-anchor="end">→</text>
</svg>`;

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    // Cache the result
    imageCache.set(cacheKey, {
      buffer: pngBuffer,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (imageCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }

    // Send response
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Cache', 'MISS');
    res.send(pngBuffer);

  } catch (error) {
    console.error('OG image generation error:', error);
    
    // Return a fallback error image
    const errorSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a12"/>
  <text x="600" y="280" font-family="Arial, sans-serif" font-size="48" fill="#00d4ff" text-anchor="middle">AQUADS BEX</text>
  <text x="600" y="350" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.6)" text-anchor="middle">Trade tokens with live charts</text>
  <text x="600" y="400" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.4)" text-anchor="middle">aquads.xyz/aquaswap</text>
</svg>`;

    try {
      const errorPng = await sharp(Buffer.from(errorSvg)).png().toBuffer();
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=60');
      res.send(errorPng);
    } catch (e) {
      res.status(500).send('Failed to generate image');
    }
  }
});

module.exports = router;

