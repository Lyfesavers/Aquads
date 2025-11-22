// AquaSwap Extension - Content Script for Token Detection
// Detects tokens on DEX pages and sends info to popup

(function() {
  'use strict';

  const API_URL = 'https://aquads.onrender.com/api';
  // No-op debug function to keep console clean
  const dbg = () => {};

  /**
   * Detect token from URL patterns
   */
  function detectTokenFromURL() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    dbg('🌊 AquaSwap: Checking URL:', url);
    dbg('🌊 AquaSwap: Pathname:', pathname);
    
    // DexScreener patterns (most common - check first)
    // Format: dexscreener.com/chain/address (token or pair) or /chain/solanaBase58
    // EVM token or pair can be 40-64 hex chars depending on source
    const dexscreenerMatch = pathname.match(/^\/(ethereum|bsc|polygon|arbitrum|optimism|base|avalanche|fantom|solana|sui|celo|zksync|scroll|moonbeam|moonriver|cronos|harmony|near|aptos|ton|stellar|algorand|hedera|icp|elrond|terra|xrp|litecoin|bitcoin|tron|tezos|zilliqa|oasis|stacks|kadena|injective|kava|flow|cardano|polkadot|cosmos|kaspa|multiversx)\/(0x[a-fA-F0-9]{40,64}|[1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (dexscreenerMatch && dexscreenerMatch[2]) {
      dbg('🌊 AquaSwap: DexScreener token detected:', dexscreenerMatch[2]);
      return dexscreenerMatch[2];
    }
    
    // Dextools patterns
    // Format: dextools.io/app/en/chain/pair-explorer/address or /app/chain/pair-explorer/address
    // Also supports: dextools.io/app/chain/pair-explorer/address
    if (hostname.includes('dextools.io')) {
      // Dextools URL pattern: /app/[lang/]chain/pair-explorer/address
      const dextoolsMatch = pathname.match(/\/app\/(?:[^\/]+\/)?([^\/]+)\/pair-explorer\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i);
      if (dextoolsMatch && dextoolsMatch[2]) {
        dbg('🌊 AquaSwap: Dextools token detected:', dextoolsMatch[2]);
        return dextoolsMatch[2];
      }
      // Alternative pattern: /app/pair-explorer/address (chain might be in query params)
      const dextoolsAltMatch = pathname.match(/\/app\/pair-explorer\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i);
      if (dextoolsAltMatch && dextoolsAltMatch[1]) {
        dbg('🌊 AquaSwap: Dextools token detected (alt pattern):', dextoolsAltMatch[1]);
        return dextoolsAltMatch[1];
      }
    }
    
    // Common DEX URL patterns
    const patterns = [
      // Uniswap patterns
      { regex: /\/swap\?.*inputCurrency=(0x[a-fA-F0-9]{40}|[A-Z]{2,10})/i, param: 'inputCurrency' },
      { regex: /\/swap\?.*outputCurrency=(0x[a-fA-F0-9]{40}|[A-Z]{2,10})/i, param: 'outputCurrency' },
      { regex: /\/tokens\/(0x[a-fA-F0-9]{40})/i },
      // PancakeSwap patterns
      { regex: /\/swap\?.*inputCurrency=(0x[a-fA-F0-9]{40}|[A-Z]{2,10})/i, param: 'inputCurrency' },
      // Generic patterns
      { regex: /token[=:](0x[a-fA-F0-9]{40}|[A-Z]{2,10})/i },
      { regex: /address[=:](0x[a-fA-F0-9]{40})/i },
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern.regex);
      if (match) {
        if (pattern.param) {
          const value = urlParams.get(pattern.param);
          if (value) {
            dbg('🌊 AquaSwap: Token detected from param:', value);
            return value;
          }
        }
        dbg('🌊 AquaSwap: Token detected from regex:', match[1]);
        return match[1];
      }
    }

    // Check URL params directly
    const tokenParam = urlParams.get('token') || urlParams.get('address') || 
                      urlParams.get('inputCurrency') || urlParams.get('outputCurrency');
    if (tokenParam) {
      dbg('🌊 AquaSwap: Token detected from URL param:', tokenParam);
      return tokenParam;
    }

    dbg('🌊 AquaSwap: No token found in URL');
    return null;
  }

  /**
   * Detect token from page content
   */
  function detectTokenFromContent() {
    const hostname = window.location.hostname;
    
    // For DexScreener, look for token address in specific elements
    if (hostname.includes('dexscreener.com')) {
      // Try to find token address in common DexScreener elements
      const addressSelectors = [
        '[data-testid*="address"]',
        '[href*="/0x"]',
        '.token-address',
        '[class*="address"]',
        'a[href*="0x"]',
        'a[href*="/solana/"]'
      ];
      
      for (const selector of addressSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent || el.href || '';
          // Try EVM first
          let addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
          if (addressMatch) {
            dbg('🌊 AquaSwap: Token detected from content element (EVM):', addressMatch[0]);
            return addressMatch[0];
          }
          // Try Solana base58 pattern
          addressMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
          if (addressMatch) {
            dbg('🌊 AquaSwap: Token detected from content element (Solana):', addressMatch[0]);
            return addressMatch[0];
          }
        }
      }
    }
    
    // For Dextools, look for token address in specific elements
    if (hostname.includes('dextools.io')) {
      const addressSelectors = [
        '[data-address]',
        '[data-contract-address]',
        '[class*="address"]',
        '[class*="contract"]',
        'a[href*="0x"]',
        'a[href*="/pair-explorer/"]',
        'code',
        '[data-testid*="address"]'
      ];
      
      for (const selector of addressSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent || el.getAttribute('data-address') || el.getAttribute('data-contract-address') || el.href || '';
          // Try EVM first
          let addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
          if (addressMatch) {
            dbg('🌊 AquaSwap: Token detected from content element (EVM):', addressMatch[0]);
            return addressMatch[0];
          }
          // Try Solana base58 pattern
          addressMatch = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
          if (addressMatch) {
            dbg('🌊 AquaSwap: Token detected from content element (Solana):', addressMatch[0]);
            return addressMatch[0];
          }
        }
      }
    }
    
    // Look for token addresses in page text (fallback)
    const evmAddressPattern = /0x[a-fA-F0-9]{40}/g;
    const text = document.body.innerText || '';
    const addresses = text.match(evmAddressPattern);
    
    if (addresses && addresses.length > 0) {
      // For DexScreener, prefer addresses that appear in the URL path context
      const urlAddress = window.location.pathname.match(/0x[a-fA-F0-9]{40}/);
      if (urlAddress && addresses.includes(urlAddress[0])) {
        dbg('🌊 AquaSwap: Token detected from page content (URL context):', urlAddress[0]);
        return urlAddress[0];
      }
      // Return the first unique address found
      dbg('🌊 AquaSwap: Token detected from page content:', addresses[0]);
      return addresses[0];
    }
    // Try Solana base58 in page text as last resort
    const solMatches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
    if (solMatches && solMatches.length > 0) {
      dbg('🌊 AquaSwap: Token detected from page content (Solana):', solMatches[0]);
      return solMatches[0];
    }

    // Look for token symbols (common patterns)
    const symbolPatterns = [
      /\$([A-Z]{2,10})\b/g,  // $BTC, $ETH
      /\b([A-Z]{2,10})\/(USDT|USDC|ETH|BTC|BNB)\b/g,  // BTC/USDT
    ];

    for (const pattern of symbolPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const symbol = matches[1] || matches[0].split('/')[0];
        dbg('🌊 AquaSwap: Token symbol detected from content:', symbol);
        return symbol;
      }
    }

    dbg('🌊 AquaSwap: No token found in page content');
    return null;
  }

  /**
   * Detect chain from URL/domain
   */
  function detectChain() {
    const hostname = window.location.hostname;
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // For DexScreener, extract chain from pathname
    if (hostname.includes('dexscreener.com')) {
      const chainMatch = pathname.match(/^\/(ethereum|bsc|polygon|arbitrum|optimism|base|avalanche|fantom|solana|sui|celo|zksync|scroll|moonbeam|moonriver|cronos|harmony|near|aptos|ton|stellar|algorand|hedera|icp|elrond|terra|xrp|litecoin|bitcoin|tron|tezos|zilliqa|oasis|stacks|kadena|injective|kava|flow|cardano|polkadot|cosmos|kaspa|multiversx)/);
      if (chainMatch) {
        return chainMatch[1];
      }
    }
    
    // For Dextools, extract chain from pathname
    // Format: /app/[lang/]chain/pair-explorer/address
    if (hostname.includes('dextools.io')) {
      const dextoolsChainMatch = pathname.match(/\/app\/(?:[^\/]+\/)?([^\/]+)\/pair-explorer\//i);
      if (dextoolsChainMatch) {
        const chainName = dextoolsChainMatch[1].toLowerCase();
        // Map Dextools chain names to standard names
        const chainMap = {
          'eth': 'ethereum', 'ethereum': 'ethereum',
          'bsc': 'bsc', 'binance': 'bsc', 'bnb': 'bsc',
          'polygon': 'polygon', 'matic': 'polygon',
          'arbitrum': 'arbitrum', 'arb': 'arbitrum',
          'optimism': 'optimism', 'op': 'optimism',
          'base': 'base',
          'avalanche': 'avalanche', 'avax': 'avalanche',
          'fantom': 'fantom', 'ftm': 'fantom',
          'solana': 'solana', 'sol': 'solana',
          'sui': 'sui',
          'zksync': 'zksync', 'zksync-era': 'zksync',
          'celo': 'celo',
          'scroll': 'scroll',
          'moonbeam': 'moonbeam',
          'moonriver': 'moonriver',
          'cronos': 'cronos',
          'harmony': 'harmony',
          'near': 'near',
          'aptos': 'aptos'
        };
        return chainMap[chainName] || chainName;
      }
      // Check URL params for chain
      const urlParams = new URLSearchParams(window.location.search);
      const chainParam = urlParams.get('chain');
      if (chainParam) {
        return chainParam.toLowerCase();
      }
    }

    if (hostname.includes('pancakeswap') || url.includes('bsc') || url.includes('binance')) {
      return 'bsc';
    }
    if (hostname.includes('polygon') || url.includes('matic')) {
      return 'polygon';
    }
    if (hostname.includes('arbitrum') || url.includes('arbitrum')) {
      return 'arbitrum';
    }
    if (hostname.includes('optimism') || url.includes('optimism')) {
      return 'optimism';
    }
    if (hostname.includes('base') || url.includes('base')) {
      return 'base';
    }
    if (hostname.includes('solana') || url.includes('solana') || hostname.includes('raydium')) {
      return 'solana';
    }
    if (hostname.includes('sui') || url.includes('sui')) {
      return 'sui';
    }
    
    // Default to Ethereum
    return 'ethereum';
  }

  /**
   * Main detection function
   * Only detects when on a token detail page (not homepage/search)
   */
  function detectToken() {
    // First check if we're actually on a token detail page
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    const hostname = window.location.hostname;
    
    // DexScreener: must have /chain/address pattern (supports EVM 40-64 or Solana base58)
    if (hostname.includes('dexscreener.com')) {
      const isTokenPage = /^\/[^\/]+\/(0x[a-fA-F0-9]{40,64}|[1-9A-HJ-NP-Za-km-z]{32,44})/i.test(pathname);
      if (!isTokenPage) {
        dbg('🌊 AquaSwap: On DexScreener but not a token detail page');
        return null;
      }
    }
    
    // Dextools: must have /pair-explorer/address pattern
    if (hostname.includes('dextools.io')) {
      const isTokenPage = /\/pair-explorer\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i.test(pathname);
      if (!isTokenPage) {
        dbg('🌊 AquaSwap: On Dextools but not a token detail page');
        return null;
      }
    }
    
    // Uniswap/PancakeSwap: check if token is in URL params or path
    // If on homepage (/), don't detect
    if (pathname === '/' && !url.includes('inputCurrency') && !url.includes('outputCurrency') && !url.includes('/tokens/')) {
      dbg('🌊 AquaSwap: On DEX homepage, not a token detail page');
      return null;
    }

    let token = detectTokenFromURL();
    // Try to derive a symbol hint from page title like "HYPER/WETH on Uniswap - dexscreener"
    let symbolHint = null;
    try {
      const title = document.title || '';
      const titleMatch = title.match(/^([A-Z0-9\-]+)\//);
      if (titleMatch && titleMatch[1]) {
        symbolHint = titleMatch[1].replace(/[^A-Z0-9\-]/g, '').slice(0, 12);
      }
      // Fallback: header text like "<SYMBOL>/WETH on Uniswap - dexscreener.com"
      if (!symbolHint) {
        const header = document.querySelector('h1,h2,[class*="pair"],[class*="title"]');
        const headerText = header ? (header.textContent || '') : '';
        const headerMatch = headerText.match(/^([A-Z0-9\-]+)\//);
        if (headerMatch && headerMatch[1]) {
          symbolHint = headerMatch[1].replace(/[^A-Z0-9\-]/g, '').slice(0, 12);
        }
      }
    } catch (_) {}
    if (!token) {
      token = detectTokenFromContent();
    }

    if (token) {
      const chain = detectChain();
      dbg('🌊 AquaSwap: Token detail page confirmed, token:', token);
      return {
        token: token.trim(),
        address: token.trim(),
        chain: chain,
        symbolHint,
        url: window.location.href,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * Listen for messages from popup
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    dbg('🌊 AquaSwap: Message received:', request);
    if (request.action === 'detectToken') {
      const tokenInfo = detectToken();
      dbg('🌊 AquaSwap: Sending response:', { success: true, data: tokenInfo });
      sendResponse({ success: true, data: tokenInfo });
      return true; // Keep channel open for async response
    }
    return false;
  });

  // Auto-detect on page load (optional - can be triggered on demand)
  // Store detected token for quick access
  let detectedToken = null;
  
  // Detect token when page loads
  setTimeout(() => {
    detectedToken = detectToken();
    if (detectedToken) {
      dbg('🌊 AquaSwap: Token detected', detectedToken);
    }
  }, 1000);

})();

