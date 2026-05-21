const { verifyExternalShareToken } = require('../utils/externalJobShareToken');
const { findListingLogoForToken } = require('../utils/listingLogoLookup');

const crypto = require('crypto');
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

function stripHtmlSnippet(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// librsvg (Sharp's SVG rasterizer) only paints PNG/JPEG in embedded <image> tags.
const LIBSVG_SAFE_ACCEPT = 'image/png,image/jpeg,image/jpg,image/pjpeg,image/*;q=0.8';

function toLibsvgSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('dexscreener.com')) {
      parsed.searchParams.set('format', 'png');
      return parsed.toString();
    }
  } catch {
    // fall through to string replace
  }
  if (/format=auto/i.test(url)) {
    return url.replace(/format=auto/i, 'format=png');
  }
  return url;
}

function isLibsvgSafeContentType(contentType) {
  const ct = (contentType || '').toLowerCase();
  return ct.includes('png') || ct.includes('jpeg') || ct.includes('jpg');
}

// Fetch and convert image to base64
// IMPORTANT: librsvg (used by Sharp to rasterise SVG) only decodes PNG/JPEG inside
// <image href="data:..."> — it CANNOT handle WebP/AVIF/GIF. Cursa, Cloudflare image
// proxies, and many modern hosts serve WebP by default, which silently renders as a
// blank box. Pass `normalize: true` to first re-encode the fetched bytes through
// Sharp into a PNG (or fitted PNG) so the embedded image always paints.
async function fetchImageAsBase64(url, options = {}) {
  const fetchUrl = options.normalize ? toLibsvgSafeImageUrl(url) : url;

  try {
    const response = await axios.get(fetchUrl, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 5000,
      headers: {
        'User-Agent':
          options.userAgent ||
          'Mozilla/5.0 (compatible; Aquads-OG-Generator/1.0; +https://aquads.xyz)',
        ...(options.referer ? { Referer: options.referer } : {}),
        Accept: options.normalize
          ? (options.accept || LIBSVG_SAFE_ACCEPT)
          : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
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
        console.error('Image normalize failed:', fetchUrl, '→', normErr.message);
        if (isLibsvgSafeContentType(contentType)) {
          // Already PNG/JPEG — embed as-is for librsvg even if Sharp couldn't re-encode.
          const base64 = buffer.toString('base64');
          return `data:${contentType};base64,${base64}`;
        }
        return null;
      }
    }

    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to fetch image:', fetchUrl, '→', error.message);
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
  const cacheKey = `aquaswap:v3:${token}-${blockchain}`;
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

    // Prefer Aquads listing logo (uploaded by project) over DEX CDN (often AVIF/WebP).
    const listingLogoUrl =
      (await findListingLogoForToken(token, blockchain)) ||
      (tokenData?.baseToken?.address
        ? await findListingLogoForToken(tokenData.baseToken.address, blockchain)
        : null);
    const tokenImageUrl = listingLogoUrl || tokenData?.info?.imageUrl || null;

    let logoBase64 = null;
    if (tokenImageUrl) {
      logoBase64 = await fetchImageAsBase64(tokenImageUrl, {
        timeout: 8000,
        normalize: true,
        fit: { width: 240, height: 240, fit: 'cover' },
      });
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

// Right edge of headline column (~x=500 ... ~1140). Char-only wrapping underestimated
// DejaVu Sans Bold widths and caused clipped glyphs in the OG PNG.
const FREE_COURSE_TEXT_RIGHT = 1136;
const FREE_COURSE_HEADLINE_LEFT = 500;
const FREE_COURSE_HEADLINE_WIDTH = FREE_COURSE_TEXT_RIGHT - FREE_COURSE_HEADLINE_LEFT;

// Estimate how many Latin characters fit on one line given font-size (px units in SVG).
// Conservative for embedded DejaVu Sans Bold (+ optional letter-spacing between glyphs).
function estimateCharsPerSvgLine(columnWidthPx, fontSizePx, letterSpacingPx = 0, bold = true) {
  // Conservative: Bold DejaVu Sans runs wider than ~0.55em averages (W, M, '&').
  const multiplier = bold ? 0.62 : 0.53;
  const avgGlyph = fontSizePx * multiplier;
  const perChar = avgGlyph + letterSpacingPx;
  if (perChar <= 0) return 12;
  return Math.max(6, Math.floor((columnWidthPx + letterSpacingPx) / perChar));
}

// Word-aware wrap; splits tokens longer than maxCharsPerLine so nothing overflows horizontally.
function wrapTextToLines(text, maxCharsPerLine, maxLines) {
  if (!maxLines || maxCharsPerLine < 6) return [];
  const raw = (text || '').trim();
  if (!raw) return [];

  function splitWord(word) {
    if (word.length <= maxCharsPerLine) return [word];
    const parts = [];
    for (let i = 0; i < word.length; i += maxCharsPerLine) {
      parts.push(word.slice(i, i + maxCharsPerLine));
    }
    return parts;
  }

  const tokens = raw.split(/\s+/).filter(Boolean).flatMap(splitWord);
  const lines = [];
  let ti = 0;
  while (ti < tokens.length && lines.length < maxLines) {
    let line = tokens[ti];
    ti += 1;
    while (
      ti < tokens.length &&
      `${line} ${tokens[ti]}`.length <= maxCharsPerLine
    ) {
      line = `${line} ${tokens[ti]}`;
      ti += 1;
    }
    lines.push(line);
  }

  if (ti < tokens.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    const ell = '…';
    last = last.replace(/\s*$/,'');
    while (last.length + ell.length > maxCharsPerLine && last.length > 4) {
      last = last.replace(/\s*\S*$/, '').trim();
    }
    if (last.length + ell.length <= maxCharsPerLine) {
      lines[lines.length - 1] = `${last}${ell}`;
    } else {
      lines[lines.length - 1] = last.slice(0, Math.max(1, maxCharsPerLine - ell.length)).trimEnd() + ell;
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

    const colW = FREE_COURSE_HEADLINE_WIDTH;

    // Auto-fit the title: shrink font-size; per-line capacity from estimated glyph width.
    const rawTitle = (course.title || '').trim();
    let titleFontSize, titleMaxChars, titleMaxLines, titleLineHeight;
    if (rawTitle.length <= 28) {
      titleFontSize = 56;
      titleMaxLines = 2;
      titleLineHeight = 62;
      titleMaxChars = estimateCharsPerSvgLine(colW, titleFontSize);
    } else if (rawTitle.length <= 60) {
      titleFontSize = 46;
      titleMaxLines = 3;
      titleLineHeight = 52;
      titleMaxChars = estimateCharsPerSvgLine(colW, titleFontSize);
    } else {
      titleFontSize = 38;
      titleMaxLines = 4;
      titleLineHeight = 46;
      titleMaxChars = estimateCharsPerSvgLine(colW, titleFontSize);
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

    const tagline = `Free ${feedLabel} Course`.toUpperCase();
    const categoryLabel = course.category && course.category !== feedLabel ? course.category : null;

    // Combined feed + category: wrap up to two lines using width-aware budget (letter-spacing eats space).
    const labelFull = categoryLabel ? `${tagline}  ·  ${categoryLabel.toUpperCase()}` : tagline;
    const labelLetterSpacingPx = 1.75;
    const labelFontPx = 17;
    const labelLineHeightPx = 24;
    const labelMaxChars = estimateCharsPerSvgLine(colW, labelFontPx, labelLetterSpacingPx, true);
    const labelLinesWrapped = wrapTextToLines(labelFull, labelMaxChars, 2);
    const labelBaseY = 196;
    const labelSvgLines = labelLinesWrapped
      .map(
        (line, i) =>
          `<text x="500" y="${labelBaseY + i * labelLineHeightPx}" ${ogFontAttr()} font-size="${labelFontPx}" font-weight="bold" fill="${accent}" letter-spacing="1.75">${escapeXml(line)}</text>`
      )
      .join('\n  ');

    const accentBarY = labelBaseY + (labelLinesWrapped.length - 1) * labelLineHeightPx + 12;
    const titleStartY = labelBaseY + labelLinesWrapped.length * labelLineHeightPx + 40;

    const titleSvg = titleLines
      .map(
        (line, i) =>
          `<text x="500" y="${titleStartY + i * titleLineHeight}" ${ogFontAttr()} font-size="${titleFontSize}" font-weight="bold" fill="#ffffff">${escapeXml(line)}</text>`
      )
      .join('\n  ');

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

  <!-- Combined feed + category label (wrapped to stay inside headline column) -->
  ${labelSvgLines}
  <rect x="500" y="${accentBarY}" width="620" height="3" rx="1.5" fill="${accent}" opacity="0.55"/>

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
  web3career: 'Web3.Career',
  jooble: 'Jooble',
};

function isSyndicatedJobSource(source) {
  return !!(source && JOB_SOURCE_LABEL[source]);
}

/** Multi-line centered company label when syndicated feeds have no logo (matches in-app avatar treatment). */
function syndicatedLogoPlaceholderTexts(rawCompanyName, options = {}) {
  const company = String(rawCompanyName || '').trim();
  if (!company) return '';

  const circleCx = 260;
  const circleCy = 315;
  const colW = options.columnWidthPx ?? 232;
  const maxLines = options.maxLines ?? 3;

  let fontSize = options.startFontPx ?? 34;
  let lines = [];
  const maxBlockPx = options.maxBlockHeightPx ?? 228;

  while (fontSize >= 17) {
    const maxChars = Math.max(8, estimateCharsPerSvgLine(colW, fontSize, 0, true));
    lines = wrapTextToLines(company, maxChars, maxLines);
    if (!lines.length) lines = [company.slice(0, maxChars)];
    const lineHeight = Math.round(fontSize * 1.12);
    const block = (lines.length - 1) * lineHeight + Math.round(fontSize * 1.05);
    if (block <= maxBlockPx) break;
    fontSize -= 2;
  }

  const lineHeight = Math.round(fontSize * 1.12);
  const fillAttr = options.fill ?? '#f8fafc';
  const firstBaseline =
    circleCy +
    Math.round(fontSize * 0.06) -
    Math.round((((lines.length - 1) * lineHeight) / 2));

  return lines
    .map(
      (line, i) =>
        `<text x="${circleCx}" y="${firstBaseline + i * lineHeight}" ${ogFontAttr()} font-size="${fontSize}" font-weight="bold" fill="${fillAttr}" text-anchor="middle">${escapeXml(
          line
        )}</text>`
    )
    .join('\n  ');
}

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

    // Source attribution at the bottom of the card. The hiring entity
    // (company / poster) gets its own prominent line above the title (see
    // hiringLine below), so the bottom attribution is just the syndication
    // source for external boards and is omitted entirely for user posts.
    const sourceLabel = (() => {
      if (
        job.source === 'remotive' ||
        job.source === 'himalayas' ||
        job.source === 'web3career' ||
        job.source === 'jooble'
      ) {
        return `via ${JOB_SOURCE_LABEL[job.source]}`;
      }
      return '';
    })();

    // Hiring entity line shown right above the headline. For external boards
    // (remotive / himalayas / web3career) the sync services store the COMPANY NAME in
    // ownerUsername (see services/remotiveSync.js extractCompany()). For
    // user-posted jobs ownerUsername is the literal poster handle, so we
    // prefix it with "@" to disambiguate.
    const rawHiringName = (job.ownerUsername || '').trim();
    const hiringLine = (() => {
      if (!rawHiringName) return '';
      const isUserSource = !job.source || job.source === 'user';
      const display = isUserSource ? `@${rawHiringName}` : rawHiringName;
      // Cap at ~36 chars so it fits the 640px text column at 24px font.
      return display.length > 36 ? display.slice(0, 35) + '…' : display;
    })();

    // Top-right context line: arrangement + location (or just arrangement)
    const contextBits = [arrangementLabel.toUpperCase()];
    if (locationLabel && (arrangement === 'hybrid' || arrangement === 'onsite')) {
      contextBits.push(locationLabel.toUpperCase());
    }
    const contextLine = contextBits.join('  ·  ');
    const contextDisplay = contextLine.length > 56 ? contextLine.slice(0, 55) + '…' : contextLine;

    // Auto-fit the title — slightly tighter than the free-course staircase
    // because the job card carries an extra hiring-entity line above the
    // headline, leaving less vertical room before the pay/CTA row at Y≈465.
    const rawTitle = (job.title || '').trim();
    let titleFontSize, titleMaxChars, titleMaxLines, titleLineHeight;
    if (rawTitle.length <= 28) {
      titleFontSize = 52; titleMaxChars = 22; titleMaxLines = 2; titleLineHeight = 60;
    } else if (rawTitle.length <= 60) {
      titleFontSize = 42; titleMaxChars = 28; titleMaxLines = 3; titleLineHeight = 50;
    } else {
      titleFontSize = 34; titleMaxChars = 34; titleMaxLines = 3; titleLineHeight = 42;
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

    const payDisplay = formatJobPay(job);

    const fontCss = getEmbeddedFontFaceCss();

    // Title starts further down than the course OG to leave room for the
    // hiring-entity line at Y=248. titleStartY is the baseline of line 1.
    const titleStartY = 300;
    const titleSvg = titleLines
      .map(
        (line, i) =>
          `<text x="500" y="${titleStartY + i * titleLineHeight}" ${ogFontAttr()} font-size="${titleFontSize}" font-weight="bold" fill="#ffffff">${escapeXml(line)}</text>`
      )
      .join('\n  ');

    // Single-letter fallback for user postings (or syndicated rows with missing company strings).
    const placeholderLetter = ((
      job.source === 'remotive' ? 'R' :
      job.source === 'himalayas' ? 'H' :
      job.source === 'web3career' ? 'W' :
      job.source === 'jooble' ? 'J' :
      (job.ownerUsername || 'A').charAt(0)
    ) || 'A').toUpperCase();

    let avatarInnerContent = '';
    if (avatarBase64) {
      avatarInnerContent =
        `<image x="125" y="180" width="270" height="270" href="${avatarBase64}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`;
    } else if (isSyndicatedJobSource(job.source) && rawHiringName) {
      const companyPlaceholder = syndicatedLogoPlaceholderTexts(rawHiringName);
      avatarInnerContent =
        companyPlaceholder ||
        `<text x="260" y="345" ${ogFontAttr()} font-size="120" font-weight="bold" fill="${accent}" text-anchor="middle">${escapeXml(placeholderLetter)}</text>`;
    } else {
      avatarInnerContent =
        `<text x="260" y="345" ${ogFontAttr()} font-size="120" font-weight="bold" fill="${accent}" text-anchor="middle">${escapeXml(placeholderLetter)}</text>`;
    }

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
  ${avatarInnerContent}

  <!-- HIRING badge below avatar -->
  <rect x="170" y="475" width="180" height="42" rx="21" fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.5)" stroke-width="1"/>
  <circle cx="195" cy="496" r="5" fill="#22c55e"/>
  <text x="210" y="503" ${ogFontAttr()} font-size="18" font-weight="bold" fill="#86efac">HIRING NOW</text>

  <!-- Context line (arrangement · location) -->
  <text x="500" y="200" ${ogFontAttr()} font-size="18" font-weight="bold" fill="${accent}" letter-spacing="2">${escapeXml(contextDisplay)}</text>
  <rect x="500" y="215" width="60" height="3" rx="1.5" fill="${accent}" opacity="0.85"/>

  <!-- Hiring entity (company name for external boards, @username for user posts) -->
  ${hiringLine
    ? `<text x="500" y="248" ${ogFontAttr()} font-size="22" font-weight="bold" fill="rgba(255,255,255,0.78)">${escapeXml(hiringLine)}</text>`
    : ''}

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

router.get('/external-job', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) {
    return res.status(400).send('Missing token');
  }
  const parsed = verifyExternalShareToken(token);
  if (!parsed) {
    return res.status(404).send('Invalid share');
  }

  const ogv = (req.query.ogv || '1').toString();
  const cacheKey = `extjob:${crypto.createHash('sha256').update(token).digest('hex').slice(0, 48)}:ogv${ogv}`;
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  try {
    const arrangement = parsed.workArrangement || 'remote';
    const arrangementLabel = JOB_ARRANGEMENT_LABEL[arrangement] || 'Remote';
    const accent = JOB_ARRANGEMENT_ACCENT[arrangement] || '#34d399';
    const locLine = String(parsed.locationLine || '').trim();
    const sourceLabel = 'via Jooble';
    const rawHiringName = String(parsed.company || '').trim();

    const hiringLine = (() => {
      if (!rawHiringName) return '';
      const display =
        rawHiringName.length > 36 ? rawHiringName.slice(0, 35) + '…' : rawHiringName;
      return display;
    })();

    const contextBits = [arrangementLabel.toUpperCase()];
    if (
      locLine &&
      (arrangement === 'hybrid' ||
        arrangement === 'onsite' ||
        arrangement === 'remote')
    ) {
      contextBits.push(locLine.toUpperCase().slice(0, 56));
    }
    const contextLine = contextBits.join('  ·  ');
    const contextDisplay = contextLine.length > 56 ? contextLine.slice(0, 55) + '…' : contextLine;

    const payDisplay = stripHtmlSnippet(parsed.payHint || '').slice(0, 72);

    const rawTitle = (parsed.title || 'Job posting').trim();
    let titleFontSize;
    let titleMaxChars;
    let titleMaxLines;
    let titleLineHeight;
    if (rawTitle.length <= 28) {
      titleFontSize = 52;
      titleMaxChars = 22;
      titleMaxLines = 2;
      titleLineHeight = 60;
    } else if (rawTitle.length <= 60) {
      titleFontSize = 42;
      titleMaxChars = 28;
      titleMaxLines = 3;
      titleLineHeight = 50;
    } else {
      titleFontSize = 34;
      titleMaxChars = 34;
      titleMaxLines = 3;
      titleLineHeight = 42;
    }
    const titleLines = wrapTextToLines(rawTitle, titleMaxChars, titleMaxLines);
    const titleStartY = 300;
    const titleSvg = titleLines
      .map(
        (line, i) =>
          `<text x="500" y="${titleStartY + i * titleLineHeight}" ${ogFontAttr()} font-size="${titleFontSize}" font-weight="bold" fill="#ffffff">${escapeXml(
            line
          )}</text>`
      )
      .join('\n  ');

    const placeholderLetter = 'J';
    let avatarInnerContent = '';
    if (rawHiringName && isSyndicatedJobSource('jooble')) {
      const companyPlaceholder = syndicatedLogoPlaceholderTexts(rawHiringName);
      avatarInnerContent =
        companyPlaceholder ||
        `<text x="260" y="345" ${ogFontAttr()} font-size="120" font-weight="bold" fill="${accent}" text-anchor="middle">${escapeXml(placeholderLetter)}</text>`;
    } else {
      avatarInnerContent =
        `<text x="260" y="345" ${ogFontAttr()} font-size="120" font-weight="bold" fill="${accent}" text-anchor="middle">${escapeXml(placeholderLetter)}</text>`;
    }

    const fontCss = getEmbeddedFontFaceCss();

    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${fontCss ? `<style type="text/css"><![CDATA[${fontCss}]]></style>` : ''}
    <linearGradient id="bgGradX" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a12"/>
      <stop offset="55%" style="stop-color:#0d1124"/>
      <stop offset="100%" style="stop-color:#181030"/>
    </linearGradient>
    <linearGradient id="accentGradX" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent}"/>
      <stop offset="100%" style="stop-color:#8a2be2"/>
    </linearGradient>
    <linearGradient id="ctaGradX" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
    <linearGradient id="avatarBgGradX" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${accent};stop-opacity:0.22"/>
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.18"/>
    </linearGradient>
    <clipPath id="avatarClipX">
      <circle cx="260" cy="315" r="135"/>
    </clipPath>
    <filter id="ctaShadowX" x="-10%" y="-30%" width="120%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dy="4" result="offsetblur"/>
      <feFlood flood-color="#000" flood-opacity="0.4"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="avatarGlowX" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bgGradX)"/>
  <circle cx="100" cy="100" r="320" fill="rgba(99,102,241,0.05)"/>
  <circle cx="1100" cy="530" r="260" fill="rgba(139,92,246,0.05)"/>

  <rect x="40" y="40" width="1120" height="2" fill="url(#accentGradX)" opacity="0.7"/>
  <rect x="40" y="50" width="1120" height="540" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

  <text x="1120" y="100" ${ogFontAttr()} font-size="30" font-weight="bold" fill="url(#accentGradX)" text-anchor="end">AQUADS JOBS</text>
  <text x="1120" y="125" ${ogFontAttr()} font-size="15" fill="rgba(255,255,255,0.55)" text-anchor="end">Web3 &amp; Crypto Careers</text>

  <circle cx="260" cy="315" r="142" fill="url(#avatarBgGradX)" filter="url(#avatarGlowX)" opacity="0.85"/>
  <circle cx="260" cy="315" r="135" fill="#0d1124" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  ${avatarInnerContent}

  <rect x="170" y="475" width="180" height="42" rx="21" fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.5)" stroke-width="1"/>
  <circle cx="195" cy="496" r="5" fill="#22c55e"/>
  <text x="210" y="503" ${ogFontAttr()} font-size="18" font-weight="bold" fill="#86efac">HIRING NOW</text>

  <text x="500" y="200" ${ogFontAttr()} font-size="18" font-weight="bold" fill="${accent}" letter-spacing="2">${escapeXml(contextDisplay)}</text>
  <rect x="500" y="215" width="60" height="3" rx="1.5" fill="${accent}" opacity="0.85"/>

  ${hiringLine
    ? `<text x="500" y="248" ${ogFontAttr()} font-size="22" font-weight="bold" fill="rgba(255,255,255,0.78)">${escapeXml(hiringLine)}</text>`
    : ''}

  ${titleSvg}

  ${
    payDisplay
      ? `<text x="500" y="465" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="2">COMPENSATION</text>
       <text x="500" y="498" ${ogFontAttr()} font-size="32" font-weight="bold" fill="#4ade80">${escapeXml(payDisplay)}</text>`
      : `<text x="500" y="465" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="2">COMPENSATION</text>
       <text x="500" y="498" ${ogFontAttr()} font-size="28" font-weight="bold" fill="rgba(255,255,255,0.7)">Competitive</text>`
  }

  <g filter="url(#ctaShadowX)">
    <rect x="820" y="465" width="300" height="68" rx="16" fill="url(#ctaGradX)"/>
    <text x="850" y="509" ${ogFontAttr()} font-size="26" font-weight="bold" fill="#ffffff">Apply on Jooble</text>
    <text x="1095" y="509" ${ogFontAttr()} font-size="28" font-weight="bold" fill="#ffffff" text-anchor="end">→</text>
  </g>

  <text x="1120" y="562" ${ogFontAttr()} font-size="14" fill="rgba(255,255,255,0.45)" text-anchor="end">${escapeXml(sourceLabel)}</text>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    imageCache.set(cacheKey, { buffer: pngBuffer, timestamp: Date.now() });
    if (imageCache.size > 100) {
      const nowTs = Date.now();
      for (const [key, value] of imageCache.entries()) {
        if (nowTs - value.timestamp > CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=600');
    res.set('X-Cache', 'MISS');
    return res.send(pngBuffer);
  } catch (error) {
    console.error('OG external-job image error:', error);
    return res.status(500).send('Failed to generate image');
  }
});

module.exports = router;

