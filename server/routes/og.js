const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const sharp = require('sharp');
const axios = require('axios');

// Embedded in SVG so Sharp/librsvg does not depend on OS fontconfig (fixes tofu on Railway, etc.)
const OG_FONT_FAMILY = 'AquadsOG';
let embeddedFontFaceCss = null;

function getEmbeddedFontFaceCss() {
  if (embeddedFontFaceCss !== null) return embeddedFontFaceCss;
  try {
    const pkgRoot = path.dirname(require.resolve('dejavu-fonts-ttf/package.json'));
    const regular = fs.readFileSync(path.join(pkgRoot, 'ttf', 'DejaVuSans.ttf'));
    const bold = fs.readFileSync(path.join(pkgRoot, 'ttf', 'DejaVuSans-Bold.ttf'));
    const r64 = regular.toString('base64');
    const b64 = bold.toString('base64');
    embeddedFontFaceCss = `@font-face{font-family:'${OG_FONT_FAMILY}';font-style:normal;font-weight:400;src:url('data:font/truetype;base64,${r64}') format('truetype');}
@font-face{font-family:'${OG_FONT_FAMILY}';font-style:normal;font-weight:700;src:url('data:font/truetype;base64,${b64}') format('truetype');}`;
  } catch (err) {
    console.error('OG aquaswap: could not load dejavu-fonts-ttf:', err.message);
    embeddedFontFaceCss = '';
  }
  return embeddedFontFaceCss;
}

function ogFontAttr() {
  return `font-family="${OG_FONT_FAMILY}, DejaVu Sans, sans-serif"`;
}

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
// IMPORTANT: librsvg (used by Sharp to rasterise SVG) only decodes PNG/JPEG inside
// <image href="data:..."> — it CANNOT handle WebP/AVIF/GIF. Cursa, Cloudflare image
// proxies, and many modern hosts serve WebP by default, which silently renders as a
// blank box. Pass `normalize: true` to first re-encode the fetched bytes through
// Sharp into a PNG (or fitted PNG) so the embedded image always paints.
async function fetchImageAsBase64(url, options = {}) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 5000,
      headers: {
        'User-Agent':
          options.userAgent ||
          'Mozilla/5.0 (compatible; Aquads-OG-Generator/1.0; +https://aquads.xyz)',
        ...(options.referer ? { Referer: options.referer } : {}),
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    let buffer = Buffer.from(response.data);
    let contentType = (response.headers['content-type'] || '').split(';')[0].trim() || 'image/png';

    if (options.normalize) {
      // Re-encode through Sharp → PNG so librsvg can definitely decode it.
      // Optional fit: { width, height, fit } resizes server-side to keep payload small.
      try {
        let pipeline = sharp(buffer, { failOn: 'none' });
        if (options.fit && options.fit.width && options.fit.height) {
          pipeline = pipeline.resize({
            width: options.fit.width,
            height: options.fit.height,
            fit: options.fit.fit || 'cover',
            position: 'center',
          });
        }
        buffer = await pipeline.png().toBuffer();
        contentType = 'image/png';
      } catch (normErr) {
        console.error('Image normalize failed, using raw bytes:', normErr.message);
        // fall through with original buffer/contentType
      }
    }

    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to fetch image:', url, '→', error.message);
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

    const priceDisplay = formatPrice(priceUsd);
    const changeLabel = `${changeArrow} ${changeSign}${priceChange24h.toFixed(2)}%`;
    // 56px bold ~36px/char (DejaVu); pad so the change pill never sits under the price tail
    const priceTailX = 80 + priceDisplay.length * 36;
    const changePillW = Math.ceil(changeLabel.length * 17 + 52);
    const changePillX = Math.min(
      1120 - changePillW - 40,
      Math.max(462, priceTailX + 36)
    );
    const changeTextX = changePillX + 22;
    const label24hX = changePillX + changePillW + 12;

    const fontCss = getEmbeddedFontFaceCss();

    // Build SVG
    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${fontCss ? `<style type="text/css"><![CDATA[${fontCss}]]></style>` : ''}
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
  <text x="1100" y="100" ${ogFontAttr()} font-size="28" font-weight="bold" fill="url(#accentGrad)" text-anchor="end">AQUADS</text>
  <text x="1100" y="125" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="end">BexTools</text>
  
  <!-- Logo glow effect -->
  <circle cx="140" cy="180" r="65" fill="url(#accentGrad)" opacity="0.3" filter="url(#glow)"/>
  
  <!-- Logo circle background -->
  <circle cx="140" cy="180" r="60" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
  
  ${logoBase64 ? `
  <!-- Token logo -->
  <image x="80" y="120" width="120" height="120" href="${logoBase64}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>
  ` : `
  <!-- Default logo placeholder -->
  <text x="140" y="190" ${ogFontAttr()} font-size="40" fill="#00d4ff" text-anchor="middle">?</text>
  `}
  
  <!-- Token Symbol -->
  <text x="230" y="160" ${ogFontAttr()} font-size="48" font-weight="bold" fill="#00d4ff">$${escapeXml(symbol)}</text>
  
  <!-- Token Name -->
  <text x="230" y="200" ${ogFontAttr()} font-size="22" fill="rgba(255,255,255,0.6)">${escapeXml(name.length > 30 ? name.substring(0, 30) + '...' : name)}</text>
  
  <!-- Chain badge -->
  <rect x="230" y="215" width="${chain.name.length * 10 + 40}" height="28" rx="14" fill="${chain.color}" opacity="0.2"/>
  <circle cx="248" cy="229" r="6" fill="${chain.color}"/>
  <text x="262" y="235" ${ogFontAttr()} font-size="14" fill="${chain.color}">${escapeXml(chain.name)}</text>
  
  <!-- Price section -->
  <text x="80" y="330" ${ogFontAttr()} font-size="56" font-weight="bold" fill="#ffffff">${escapeXml(priceDisplay)}</text>
  
  <!-- 24h Change -->
  <rect x="${changePillX}" y="290" width="${changePillW}" height="50" rx="12" fill="${changeColor}" opacity="0.15"/>
  <text x="${changeTextX}" y="325" ${ogFontAttr()} font-size="28" font-weight="bold" fill="${changeColor}">${changeLabel}</text>
  <text x="${label24hX}" y="325" ${ogFontAttr()} font-size="20" fill="rgba(255,255,255,0.5)">24H</text>
  
  <!-- Divider line -->
  <rect x="80" y="370" width="1040" height="1" fill="rgba(255,255,255,0.1)"/>
  
  <!-- Stats boxes -->
  <!-- Market Cap -->
  <rect x="80" y="400" width="240" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="100" y="435" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)" text-transform="uppercase">MARKET CAP</text>
  <text x="100" y="475" ${ogFontAttr()} font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(marketCap))}</text>
  
  <!-- Liquidity -->
  <rect x="350" y="400" width="240" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="370" y="435" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)">LIQUIDITY</text>
  <text x="370" y="475" ${ogFontAttr()} font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(liquidity))}</text>
  
  <!-- Volume -->
  <rect x="620" y="400" width="240" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="640" y="435" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)">24H VOLUME</text>
  <text x="640" y="475" ${ogFontAttr()} font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(volume24h))}</text>
  
  <!-- FDV -->
  <rect x="890" y="400" width="230" height="100" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <text x="910" y="435" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)">FDV</text>
  <text x="910" y="475" ${ogFontAttr()} font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(formatNum(fdv))}</text>
  
  <!-- Bottom CTA -->
  <text x="80" y="560" ${ogFontAttr()} font-size="18" fill="rgba(255,255,255,0.4)">Trade now on</text>
  <text x="220" y="560" ${ogFontAttr()} font-size="18" font-weight="bold" fill="url(#accentGrad)">aquads.xyz</text>
  
  <!-- Arrow icon -->
  <text x="1100" y="560" ${ogFontAttr()} font-size="24" fill="#00d4ff" text-anchor="end">→</text>
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
    
    const errFontCss = getEmbeddedFontFaceCss();
    // Return a fallback error image
    const errorSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${errFontCss ? `<style type="text/css"><![CDATA[${errFontCss}]]></style>` : ''}
  </defs>
  <rect width="1200" height="630" fill="#0a0a12"/>
  <text x="600" y="280" ${ogFontAttr()} font-size="40" fill="#00d4ff" text-anchor="middle">AQUADS BEXTOOLS</text>
  <text x="600" y="350" ${ogFontAttr()} font-size="24" fill="rgba(255,255,255,0.6)" text-anchor="middle">Trade tokens with live charts</text>
  <text x="600" y="400" ${ogFontAttr()} font-size="18" fill="rgba(255,255,255,0.4)" text-anchor="middle">aquads.xyz/aquaswap</text>
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

// ──────────────────────────────────────────────────────────────────────────────
// /og/free-course — OG card for "Free Online Courses" tab on /learn
// Renders a 1200×630 image with course thumbnail, headline (course title),
// a "Start Free Course →" call-to-action button, and a clear "Provided by
// cursa.app" attribution so we credit the upstream content provider.
// ──────────────────────────────────────────────────────────────────────────────

const FREE_COURSE_FEED_LABEL = {
  technology: 'Technology & Programming',
  business: 'Business & Marketing',
  languages: 'Languages',
};

const FREE_COURSE_FEED_ACCENT = {
  technology: '#38bdf8', // sky-400
  business: '#34d399', // emerald-400
  languages: '#fb7185', // rose-400
};

// Word-aware wrap so long titles render on up to N lines instead of overflowing.
function wrapTextToLines(text, maxCharsPerLine, maxLines) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (lines.length === maxLines - 1 && (current + ' ' + word).length > maxCharsPerLine) {
      // Last line — push current and start the final line, which we'll truncate later.
      lines.push(current.trim());
      current = word;
      continue;
    }
    if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + word).trim();
    } else {
      lines.push(current.trim());
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current.trim());
  }
  // Truncate the last line with ellipsis if we ran out of room
  if (lines.length === maxLines) {
    const consumed = lines.join(' ').length;
    const totalChars = (text || '').length;
    if (consumed < totalChars - 4) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.length > maxCharsPerLine - 1
        ? last.slice(0, maxCharsPerLine - 1).replace(/\s+\S*$/, '') + '…'
        : last + '…';
    }
  }
  return lines;
}

router.get('/free-course', async (req, res) => {
  const { slug } = req.query;
  if (!slug) {
    return res.status(400).send('Missing slug parameter');
  }

  const ogv = (req.query.ogv || '1').toString();
  const cacheKey = `free-course:${slug}:v${ogv}`;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  try {
    // Pull course from our own DB (the route module is loaded above).
    const FreeCourse = require('../models/FreeCourse');
    const course = await FreeCourse.findOne({ slug })
      .select('feed category title description imageUrl creator')
      .lean();

    if (!course) {
      return res.status(404).send('Course not found');
    }

    const feedLabel = FREE_COURSE_FEED_LABEL[course.feed] || 'Free Course';
    const accent = FREE_COURSE_FEED_ACCENT[course.feed] || '#38bdf8';

    // Auto-fit the title: shrink font-size + tighten char budget for long titles
    // so they never overflow the 640px-wide text column.
    const rawTitle = (course.title || '').trim();
    let titleFontSize, titleMaxChars, titleMaxLines, titleLineHeight;
    if (rawTitle.length <= 28) {
      titleFontSize = 56; titleMaxChars = 22; titleMaxLines = 2; titleLineHeight = 66;
    } else if (rawTitle.length <= 60) {
      titleFontSize = 46; titleMaxChars = 26; titleMaxLines = 3; titleLineHeight = 56;
    } else {
      titleFontSize = 38; titleMaxChars = 32; titleMaxLines = 4; titleLineHeight = 48;
    }
    const titleLines = wrapTextToLines(rawTitle, titleMaxChars, titleMaxLines);

    let thumbBase64 = null;
    if (course.imageUrl) {
      thumbBase64 = await fetchImageAsBase64(course.imageUrl, {
        timeout: 8000,
        referer: 'https://cursa.app/',
        // Re-encode through Sharp → PNG so librsvg can render it (WebP from cursa
        // would otherwise silently fail), and pre-fit to the thumbnail slot to
        // keep the embedded data URL small.
        normalize: true,
        fit: { width: 720, height: 540, fit: 'cover' },
      });
    }

    const fontCss = getEmbeddedFontFaceCss();

    const titleStartY = 280;
    const titleSvg = titleLines
      .map(
        (line, i) =>
          `<text x="500" y="${titleStartY + i * titleLineHeight}" ${ogFontAttr()} font-size="${titleFontSize}" font-weight="bold" fill="#ffffff">${escapeXml(line)}</text>`
      )
      .join('\n  ');

    const tagline = `Free ${feedLabel} Course`.toUpperCase();
    const categoryLabel = course.category && course.category !== feedLabel ? course.category : null;

    // Combined label rendered as plain colored text (no pill collisions).
    const labelLine = categoryLabel
      ? `${tagline}  ·  ${categoryLabel.toUpperCase()}`
      : tagline;
    // Truncate the label if it's somehow huge (defensive — keeps it inside the column).
    const labelDisplay = labelLine.length > 56 ? labelLine.slice(0, 55) + '…' : labelLine;

    // Pick a safe Unicode glyph for the placeholder (DejaVu covers these).
    const placeholderGlyphByFeed = {
      technology: '⚙',
      business: '★',
      languages: '✦',
    };
    const placeholderGlyph = placeholderGlyphByFeed[course.feed] || '✦';
    const placeholderLabel = (course.feed || 'free').toUpperCase();

    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${fontCss ? `<style type="text/css"><![CDATA[${fontCss}]]></style>` : ''}
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a12"/>
      <stop offset="55%" style="stop-color:#0d1124"/>
      <stop offset="100%" style="stop-color:#181030"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent}"/>
      <stop offset="100%" style="stop-color:#8a2be2"/>
    </linearGradient>
    <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="thumbFallback" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accent};stop-opacity:0.22"/>
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.18"/>
    </linearGradient>
    <clipPath id="thumbClip">
      <rect x="80" y="180" width="360" height="270" rx="20"/>
    </clipPath>
    <filter id="ctaShadow" x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dy="4" result="offsetblur"/>
      <feFlood flood-color="#000" flood-opacity="0.4"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <circle cx="100" cy="100" r="320" fill="rgba(56,189,248,0.04)"/>
  <circle cx="1100" cy="530" r="260" fill="rgba(139,92,246,0.05)"/>

  <!-- Top accent line -->
  <rect x="40" y="40" width="1120" height="2" fill="url(#accentGrad)" opacity="0.7"/>

  <!-- Card frame -->
  <rect x="40" y="50" width="1120" height="540" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <!-- AQUADS LEARN branding (top-right) -->
  <text x="1120" y="100" ${ogFontAttr()} font-size="30" font-weight="bold" fill="url(#accentGrad)" text-anchor="end">AQUADS LEARN</text>
  <text x="1120" y="125" ${ogFontAttr()} font-size="15" fill="rgba(255,255,255,0.55)" text-anchor="end">Free Online Courses</text>

  <!-- Course thumbnail (left side) -->
  ${thumbBase64
    ? `<rect x="80" y="180" width="360" height="270" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
       <image x="80" y="180" width="360" height="270" href="${thumbBase64}" clip-path="url(#thumbClip)" preserveAspectRatio="xMidYMid slice"/>
       <rect x="80" y="180" width="360" height="270" rx="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`
    : `<rect x="80" y="180" width="360" height="270" rx="20" fill="url(#thumbFallback)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
       <text x="260" y="305" ${ogFontAttr()} font-size="84" font-weight="bold" fill="${accent}" opacity="0.85" text-anchor="middle">${placeholderGlyph}</text>
       <text x="260" y="365" ${ogFontAttr()} font-size="22" font-weight="bold" fill="rgba(255,255,255,0.85)" text-anchor="middle">${escapeXml(placeholderLabel)}</text>
       <text x="260" y="395" ${ogFontAttr()} font-size="15" fill="rgba(255,255,255,0.55)" text-anchor="middle">FREE COURSE</text>`}

  <!-- Combined feed + category label (single line, plain text — no overlap) -->
  <text x="500" y="200" ${ogFontAttr()} font-size="18" font-weight="bold" fill="${accent}" letter-spacing="2">${escapeXml(labelDisplay)}</text>
  <rect x="500" y="215" width="60" height="3" rx="1.5" fill="${accent}" opacity="0.85"/>

  <!-- Headline (course title) -->
  ${titleSvg}

  <!-- Divider -->
  <rect x="500" y="475" width="620" height="1" fill="rgba(255,255,255,0.08)"/>

  <!-- CTA button -->
  <g filter="url(#ctaShadow)">
    <rect x="500" y="500" width="360" height="68" rx="16" fill="url(#ctaGrad)"/>
    <text x="525" y="544" ${ogFontAttr()} font-size="26" fill="#ffffff">▶</text>
    <text x="565" y="544" ${ogFontAttr()} font-size="26" font-weight="bold" fill="#ffffff">Start Free Course</text>
    <text x="836" y="544" ${ogFontAttr()} font-size="26" font-weight="bold" fill="#ffffff" text-anchor="end">→</text>
  </g>

  <!-- Cursa attribution (bottom-right) — credits the upstream provider -->
  <text x="1120" y="540" ${ogFontAttr()} font-size="13" fill="rgba(255,255,255,0.45)" text-anchor="end">Course provided by</text>
  <text x="1120" y="562" ${ogFontAttr()} font-size="18" font-weight="bold" fill="rgba(255,255,255,0.85)" text-anchor="end">cursa.app</text>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    imageCache.set(cacheKey, { buffer: pngBuffer, timestamp: Date.now() });
    if (imageCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Cache', 'MISS');
    return res.send(pngBuffer);
  } catch (error) {
    console.error('OG free-course image error:', error);
    const fallbackFontCss = getEmbeddedFontFaceCss();
    const errorSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>${fallbackFontCss ? `<style type="text/css"><![CDATA[${fallbackFontCss}]]></style>` : ''}</defs>
  <rect width="1200" height="630" fill="#0a0a12"/>
  <text x="600" y="290" ${ogFontAttr()} font-size="44" fill="#38bdf8" text-anchor="middle">AQUADS LEARN · Free Courses</text>
  <text x="600" y="350" ${ogFontAttr()} font-size="22" fill="rgba(255,255,255,0.6)" text-anchor="middle">Hand-picked free certificate courses from cursa.app</text>
  <text x="600" y="410" ${ogFontAttr()} font-size="18" fill="rgba(255,255,255,0.4)" text-anchor="middle">aquads.xyz/learn</text>
</svg>`;
    try {
      const errorPng = await sharp(Buffer.from(errorSvg)).png().toBuffer();
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=60');
      return res.send(errorPng);
    } catch (e) {
      return res.status(500).send('Failed to generate image');
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// /og/job — Branded OG card for Job listings (1200×630)
// Renders headline (job title), work arrangement / location / pay metadata,
// owner / company avatar, an "Apply Now →" CTA, and a source attribution
// (Posted by <user> / via Remotive / via Himalayas).
// Mirrors the /og/free-course layout so the job preview has the same polish.
// ──────────────────────────────────────────────────────────────────────────────

const JOB_ARRANGEMENT_LABEL = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

const JOB_ARRANGEMENT_ACCENT = {
  remote: '#34d399', // emerald-400
  hybrid: '#60a5fa', // blue-400
  onsite: '#a78bfa', // violet-400
};

const JOB_SOURCE_LABEL = {
  remotive: 'Remotive',
  himalayas: 'Himalayas',
};

function formatJobPay(job) {
  if (!job || !job.payAmount || !job.payType) return '';
  if (job.payType === 'percentage') return `${job.payAmount}%`;
  try {
    return `$${Number(job.payAmount).toLocaleString()}/${job.payType}`;
  } catch (_) {
    return `$${job.payAmount}/${job.payType}`;
  }
}

router.get('/job', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).send('Missing id parameter');
  }
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return res.status(400).send('Invalid job id');
  }

  const ogv = (req.query.ogv || '1').toString();
  const cacheKey = `job:${id}:v${ogv}`;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  try {
    const Job = require('../models/Job');
    const job = await Job.findById(id)
      .populate('owner', 'username image')
      .lean();

    if (!job) {
      return res.status(404).send('Job not found');
    }

    const arrangement = job.workArrangement || 'remote';
    const arrangementLabel = JOB_ARRANGEMENT_LABEL[arrangement] || 'Remote';
    const accent = JOB_ARRANGEMENT_ACCENT[arrangement] || '#34d399';

    // Build location string (only meaningful for hybrid / onsite)
    const loc = job.location || {};
    const locationLabel = (() => {
      if (!loc.city && !loc.country) return '';
      if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
      return loc.country || loc.city;
    })();

    // Source attribution
    const sourceLabel = (() => {
      if (job.source === 'remotive' || job.source === 'himalayas') {
        return `via ${JOB_SOURCE_LABEL[job.source]}`;
      }
      return job.ownerUsername ? `Posted by ${job.ownerUsername}` : '';
    })();

    // Top-right context line: arrangement + location (or just arrangement)
    const contextBits = [arrangementLabel.toUpperCase()];
    if (locationLabel && (arrangement === 'hybrid' || arrangement === 'onsite')) {
      contextBits.push(locationLabel.toUpperCase());
    }
    const contextLine = contextBits.join('  ·  ');
    const contextDisplay = contextLine.length > 56 ? contextLine.slice(0, 55) + '…' : contextLine;

    // Auto-fit the title — same staircase as free-course OG.
    const rawTitle = (job.title || '').trim();
    let titleFontSize, titleMaxChars, titleMaxLines, titleLineHeight;
    if (rawTitle.length <= 28) {
      titleFontSize = 56; titleMaxChars = 22; titleMaxLines = 2; titleLineHeight = 66;
    } else if (rawTitle.length <= 60) {
      titleFontSize = 46; titleMaxChars = 26; titleMaxLines = 3; titleLineHeight = 56;
    } else {
      titleFontSize = 38; titleMaxChars = 32; titleMaxLines = 4; titleLineHeight = 48;
    }
    const titleLines = wrapTextToLines(rawTitle, titleMaxChars, titleMaxLines);

    // Pick the avatar image: company logo (external boards) → owner image → null
    const avatarSrc =
      (job.source && job.source !== 'user' && job.companyLogo) ||
      (job.owner && job.owner.image) ||
      job.ownerImage ||
      null;

    let avatarBase64 = null;
    if (avatarSrc) {
      avatarBase64 = await fetchImageAsBase64(avatarSrc, {
        timeout: 8000,
        normalize: true,
        fit: { width: 480, height: 480, fit: 'cover' },
      });
    }

    const fontCss = getEmbeddedFontFaceCss();

    const titleStartY = 280;
    const titleSvg = titleLines
      .map(
        (line, i) =>
          `<text x="500" y="${titleStartY + i * titleLineHeight}" ${ogFontAttr()} font-size="${titleFontSize}" font-weight="bold" fill="#ffffff">${escapeXml(line)}</text>`
      )
      .join('\n  ');

    // Pay pill — only render when we actually have pay info (don't fake it).
    const payDisplay = formatJobPay(job);

    // Initial for placeholder avatar — first letter of source provider or username.
    const placeholderLetter = ((
      job.source === 'remotive' ? 'R' :
      job.source === 'himalayas' ? 'H' :
      (job.ownerUsername || 'A').charAt(0)
    ) || 'A').toUpperCase();

    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${fontCss ? `<style type="text/css"><![CDATA[${fontCss}]]></style>` : ''}
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a12"/>
      <stop offset="55%" style="stop-color:#0d1124"/>
      <stop offset="100%" style="stop-color:#181030"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent}"/>
      <stop offset="100%" style="stop-color:#8a2be2"/>
    </linearGradient>
    <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="avatarBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accent};stop-opacity:0.22"/>
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.18"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="260" cy="315" r="135"/>
    </clipPath>
    <filter id="ctaShadow" x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dy="4" result="offsetblur"/>
      <feFlood flood-color="#000" flood-opacity="0.4"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="avatarGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  <circle cx="100" cy="100" r="320" fill="rgba(99,102,241,0.05)"/>
  <circle cx="1100" cy="530" r="260" fill="rgba(139,92,246,0.05)"/>

  <!-- Top accent line -->
  <rect x="40" y="40" width="1120" height="2" fill="url(#accentGrad)" opacity="0.7"/>

  <!-- Card frame -->
  <rect x="40" y="50" width="1120" height="540" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <!-- AQUADS JOBS branding (top-right) -->
  <text x="1120" y="100" ${ogFontAttr()} font-size="30" font-weight="bold" fill="url(#accentGrad)" text-anchor="end">AQUADS JOBS</text>
  <text x="1120" y="125" ${ogFontAttr()} font-size="15" fill="rgba(255,255,255,0.55)" text-anchor="end">Web3 &amp; Crypto Careers</text>

  <!-- Avatar / company logo (left side, circular) -->
  <circle cx="260" cy="315" r="142" fill="url(#avatarBgGrad)" filter="url(#avatarGlow)" opacity="0.85"/>
  <circle cx="260" cy="315" r="135" fill="#0d1124" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  ${avatarBase64
    ? `<image x="125" y="180" width="270" height="270" href="${avatarBase64}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<text x="260" y="345" ${ogFontAttr()} font-size="120" font-weight="bold" fill="${accent}" text-anchor="middle">${escapeXml(placeholderLetter)}</text>`}

  <!-- HIRING badge below avatar -->
  <rect x="170" y="475" width="180" height="42" rx="21" fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.5)" stroke-width="1"/>
  <circle cx="195" cy="496" r="5" fill="#22c55e"/>
  <text x="210" y="503" ${ogFontAttr()} font-size="18" font-weight="bold" fill="#86efac">HIRING NOW</text>

  <!-- Context line (arrangement · location) -->
  <text x="500" y="200" ${ogFontAttr()} font-size="18" font-weight="bold" fill="${accent}" letter-spacing="2">${escapeXml(contextDisplay)}</text>
  <rect x="500" y="215" width="60" height="3" rx="1.5" fill="${accent}" opacity="0.85"/>

  <!-- Headline (job title) -->
  ${titleSvg}

  <!-- Pay strip (only when we have pay info) -->
  ${payDisplay
    ? `<text x="500" y="465" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="2">COMPENSATION</text>
       <text x="500" y="498" ${ogFontAttr()} font-size="32" font-weight="bold" fill="#4ade80">${escapeXml(payDisplay)}</text>`
    : `<text x="500" y="465" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="2">COMPENSATION</text>
       <text x="500" y="498" ${ogFontAttr()} font-size="28" font-weight="bold" fill="rgba(255,255,255,0.7)">Competitive</text>`}

  <!-- CTA button -->
  <g filter="url(#ctaShadow)">
    <rect x="820" y="465" width="300" height="68" rx="16" fill="url(#ctaGrad)"/>
    <text x="850" y="509" ${ogFontAttr()} font-size="26" font-weight="bold" fill="#ffffff">Apply Now</text>
    <text x="1095" y="509" ${ogFontAttr()} font-size="28" font-weight="bold" fill="#ffffff" text-anchor="end">→</text>
  </g>

  <!-- Source attribution (bottom-right) -->
  ${sourceLabel
    ? `<text x="1120" y="562" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.45)" text-anchor="end">${escapeXml(sourceLabel)}</text>`
    : ''}
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    imageCache.set(cacheKey, { buffer: pngBuffer, timestamp: Date.now() });
    if (imageCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }

    res.set('Content-Type', 'image/png');
    // Short cache — jobs can be edited / refreshed / deleted, so don't pin too long.
    res.set('Cache-Control', 'public, max-age=600');
    res.set('X-Cache', 'MISS');
    return res.send(pngBuffer);
  } catch (error) {
    console.error('OG job image error:', error);
    const fallbackFontCss = getEmbeddedFontFaceCss();
    const errorSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>${fallbackFontCss ? `<style type="text/css"><![CDATA[${fallbackFontCss}]]></style>` : ''}</defs>
  <rect width="1200" height="630" fill="#0a0a12"/>
  <text x="600" y="290" ${ogFontAttr()} font-size="44" fill="#6366f1" text-anchor="middle">AQUADS JOBS</text>
  <text x="600" y="350" ${ogFontAttr()} font-size="22" fill="rgba(255,255,255,0.6)" text-anchor="middle">Web3 &amp; Crypto Careers — find your next role</text>
  <text x="600" y="410" ${ogFontAttr()} font-size="18" fill="rgba(255,255,255,0.4)" text-anchor="middle">aquads.xyz/marketplace?jobs=true</text>
</svg>`;
    try {
      const errorPng = await sharp(Buffer.from(errorSvg)).png().toBuffer();
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=60');
      return res.send(errorPng);
    } catch (e) {
      return res.status(500).send('Failed to generate image');
    }
  }
});

module.exports = router;

