// AquaSwap Extension - Popup Script
const DEBUG_LOGS = false;
const dbg = (...args) => { if (DEBUG_LOGS) console.log(...args); };
dbg('🌊 AquaSwap Extension loaded');

// Check authentication first
(async function checkAuth() {
  const isAuth = await AuthService.isAuthenticated();
  if (!isAuth) {
    console.log('❌ Not authenticated, redirecting to login...');
    window.location.href = 'login.html';
    return;
  }
  
  // Load and display username
  const user = await AuthService.getCurrentUser();
  if (user) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = user.username;
    }
    
    // Load and display affiliate points
    loadAffiliatePoints();
  }
  
  dbg('✅ User authenticated');
})();

// DOM Elements
const loading = document.getElementById('loading');
const mainContent = document.getElementById('main-content');
const errorScreen = document.getElementById('error-screen');
const iframe = document.getElementById('swap-iframe');
const retryBtn = document.getElementById('retry-btn');
const logoutBtn = document.getElementById('logout-btn');

// Configuration
const IFRAME_TIMEOUT = 10000; // 10 seconds
const AQUADS_URL = 'https://aquads.xyz/embed/aquaswap';

// Track if iframe has loaded
let iframeLoaded = false;
let loadTimeout = null;

/**
 * Initialize the extension
 */
function init() {
  dbg('Initializing AquaSwap extension...');
  
  // Set up iframe load timeout
  loadTimeout = setTimeout(() => {
    if (!iframeLoaded) {
      console.error('Iframe failed to load within timeout');
      showError();
    }
  }, IFRAME_TIMEOUT);

  // Listen for iframe load
  iframe.addEventListener('load', handleIframeLoad);
  iframe.addEventListener('error', handleIframeError);

  // Set up retry button
  if (retryBtn) {
    retryBtn.addEventListener('click', retryLoad);
  }

  // Load user preferences if any
  loadPreferences();

  // Track extension usage
  trackExtensionOpen();

  // Set up tabs
  setupTabs();
}

/**
 * Lightweight toast message
 */
function showToast(message) {
  try {
    const toast = document.getElementById('copy-toast');
    if (!toast) return;
    toast.textContent = message || 'Copied';
    toast.style.display = 'block';
    // trigger transition
    requestAnimationFrame(() => {
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.style.display = 'none'; }, 180);
      }, 1500);
    });
  } catch (_) {}
}
/**
 * Tabs logic
 */
function setupTabs() {
  const tabSwap = document.getElementById('tab-swap');
  const tabAdvisor = document.getElementById('tab-advisor');
  const swapContainer = document.getElementById('swap-container');
  const advisor = document.getElementById('token-advisor');

  // Expose a small controller so other handlers can switch tabs programmatically
  window.__AQUA_EXT__ = window.__AQUA_EXT__ || {};
  window.__AQUA_EXT__.activateTab = (name) => {
    if (name === 'swap') {
      tabSwap.classList.add('active');
      tabAdvisor.classList.remove('active');
      swapContainer.style.display = 'block';
      advisor.style.display = 'none';
    } else {
      tabAdvisor.classList.add('active');
      tabSwap.classList.remove('active');
      advisor.style.display = 'block';
      swapContainer.style.display = 'none';
      // When entering advisor tab, analyze current page
      advisor.querySelector('#advisor-loading').style.display = 'block';
      advisor.querySelector('#advisor-content').style.display = 'none';
      advisor.querySelector('#advisor-error').style.display = 'none';
      checkForTokenOnPage();
    }
  };

  if (tabSwap) tabSwap.onclick = () => window.__AQUA_EXT__.activateTab('swap');
  if (tabAdvisor) tabAdvisor.onclick = () => window.__AQUA_EXT__.activateTab('advisor');

  // Default to swap tab
  window.__AQUA_EXT__.activateTab('swap');
}


/**
 * Handle successful iframe load
 */
function handleIframeLoad() {
  dbg('✅ Iframe loaded successfully');
  iframeLoaded = true;
  
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }

  // Hide loading, show main content
  setTimeout(() => {
    loading.style.display = 'none';
    mainContent.style.display = 'flex';
    errorScreen.style.display = 'none';
  }, 500); // Small delay for smooth transition
}

/**
 * Handle iframe load error
 */
function handleIframeError() {
  console.error('❌ Iframe failed to load');
  showError();
}

/**
 * Show error screen
 */
function showError() {
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
  
  loading.style.display = 'none';
  mainContent.style.display = 'none';
  errorScreen.style.display = 'flex';
}

/**
 * Retry loading the iframe
 */
function retryLoad() {
  dbg('🔄 Retrying iframe load...');
  
  // Reset state
  iframeLoaded = false;
  loading.style.display = 'flex';
  errorScreen.style.display = 'none';
  
  // Reload iframe
  iframe.src = iframe.src;
  
  // Set new timeout
  loadTimeout = setTimeout(() => {
    if (!iframeLoaded) {
      showError();
    }
  }, IFRAME_TIMEOUT);
}

/**
 * Load user preferences from storage
 */
async function loadPreferences() {
  try {
    const result = await chrome.storage.local.get(['theme', 'lastUsed']);
    
    if (result.theme) {
      dbg('Theme preference:', result.theme);
      // Can pass theme to iframe via URL parameter if needed
      // iframe.src = `${AQUADS_URL}?theme=${result.theme}`;
    }
    
    if (result.lastUsed) {
      dbg('Last used:', new Date(result.lastUsed));
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

/**
 * Track extension usage for analytics
 */
async function trackExtensionOpen() {
  try {
    const now = Date.now();
    
    // Get current stats
    const result = await chrome.storage.local.get(['openCount', 'lastUsed', 'firstUsed']);
    
    const openCount = (result.openCount || 0) + 1;
    const firstUsed = result.firstUsed || now;
    
    // Save updated stats
    await chrome.storage.local.set({
      openCount,
      lastUsed: now,
      firstUsed
    });
    
    dbg(`Extension opened ${openCount} times`);
  } catch (error) {
    console.error('Error tracking usage:', error);
  }
}

/**
 * Listen for messages from iframe (swap completion for points)
 */
window.addEventListener('message', (event) => {
  // Verify origin - allow both www and non-www versions
  const allowedOrigins = ['https://aquads.xyz', 'https://www.aquads.xyz'];
  if (!allowedOrigins.includes(event.origin)) {
    dbg('Message from unauthorized origin:', event.origin);
    return;
  }
  
  dbg('Message from iframe:', event.data);
  
  // Handle swap completion - award 5 affiliate points
  if (event.data.type === 'swap-completed' || event.data.type === 'AQUASWAP_SWAP_COMPLETED') {
    console.log('✅ Swap completed! Awarding 5 affiliate points...');
    (async () => {
      try {
        // Helper function to make API call with automatic token refresh
        const awardPointsWithRetry = async (retryCount = 0) => {
          const storage = await chrome.storage.local.get(['authToken', 'isLoggedIn', 'user', 'refreshToken']);
          
          if (!storage.authToken) {
            console.warn('⚠️ No auth token present; cannot award points. User may need to log in again.');
            return;
          }

          console.log('Making API call to award swap points...');
          const res = await fetch('https://aquads.onrender.com/api/points/swap-completed', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${storage.authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await res.json().catch(() => ({}));
          
          if (res.ok) {
            console.log('✅ Points awarded successfully!', data);
            await loadAffiliatePoints(); // Refresh points display
            return;
          }
          
          // If 401 and we have a refresh token, try to refresh and retry
          if (res.status === 401 && storage.refreshToken && retryCount === 0) {
            console.log('🔄 Access token expired, refreshing token...');
            const refreshResult = await AuthService.refreshToken();
            
            if (refreshResult.success) {
              console.log('✅ Token refreshed, retrying points award...');
              // Retry the request with new token (only once)
              return awardPointsWithRetry(1);
            } else {
              console.error('❌ Token refresh failed:', refreshResult.error);
              console.warn('⚠️ Please log out and log back in to continue earning points.');
            }
          } else {
            console.error('❌ Swap points award failed:', {
              status: res.status,
              statusText: res.statusText,
              error: data.error || data.message || 'Unknown error',
              data: data
            });
          }
        };

        await awardPointsWithRetry();
      } catch (e) {
        console.error('❌ Error awarding swap points from extension:', e);
      }
    })();
  }
  
  if (event.data.type === 'wallet-connected' || event.data.type === 'AQUASWAP_WALLET_CONNECTED') {
    dbg('👛 Wallet connected:', event.data.wallet?.address || event.data.address);
  }
});

/**
 * Handle logout
 */
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      await AuthService.logout();
      window.location.href = 'login.html';
    }
  });
}

/**
 * Load and display affiliate points (with automatic token refresh)
 */
async function loadAffiliatePoints(retryCount = 0) {
  try {
    const result = await chrome.storage.local.get(['authToken', 'refreshToken']);
    if (!result.authToken) {
      console.log('No auth token found');
      return;
    }

    const response = await fetch('https://aquads.onrender.com/api/points/my-points', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${result.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // If 401 and we have a refresh token, try to refresh and retry
      if (response.status === 401 && result.refreshToken && retryCount === 0) {
        console.log('🔄 Access token expired while loading points, refreshing token...');
        const refreshResult = await AuthService.refreshToken();
        
        if (refreshResult.success) {
          console.log('✅ Token refreshed, retrying points load...');
          // Retry the request with new token (only once)
          return loadAffiliatePoints(1);
        }
      }
      
      throw new Error('Failed to fetch points');
    }

    const data = await response.json();
    const pointsElement = document.getElementById('points-value');
    if (pointsElement) {
      const points = data.points || 0;
      pointsElement.textContent = points.toLocaleString();
    }
  } catch (error) {
    console.error('Error loading affiliate points:', error);
    const pointsElement = document.getElementById('points-value');
    if (pointsElement) {
      pointsElement.textContent = '0';
    }
  }
}

/**
 * Check for token on current page
 */
async function checkForTokenOnPage() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
  dbg('🌊 AquaSwap: No active tab found');
      return;
    }

  dbg('🌊 AquaSwap: Checking tab:', tab.url);

    // Check if we're on a token detail page (not homepage/search)
    // DexScreener token pages: dexscreener.com/chain/0x...
    // Uniswap token pages: app.uniswap.org/tokens/0x... or /swap?inputCurrency=0x...
    // PancakeSwap token pages: pancakeswap.finance/swap?inputCurrency=0x...
    
    const url = tab.url || '';
    const isTokenDetailPage = 
      // DexScreener: must have chain and address in path (EVM 0x... or Solana base58)
      /dexscreener\.com\/[^\/]+\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i.test(url) ||
      // Uniswap: token detail page or swap with token selected
      /app\.uniswap\.org\/tokens\/0x/i.test(url) ||
      /app\.uniswap\.org\/swap.*[input|output]Currency=0x/i.test(url) ||
      // PancakeSwap: swap with token selected
      /pancakeswap\.finance\/swap.*[input|output]Currency=0x/i.test(url) ||
      // Generic: token in URL
      /token.*=.*0x[a-fA-F0-9]{40}/i.test(url);
    
    if (!isTokenDetailPage) {
      dbg('🌊 AquaSwap: Not on a token detail page');
      return;
    }

    dbg('🌊 AquaSwap: Token detail page detected, checking for token...');

    // Send message to content script to detect token
    chrome.tabs.sendMessage(tab.id, { action: 'detectToken' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('🌊 AquaSwap: Content script error:', chrome.runtime.lastError.message);
        // Fallback: parse directly from URL and analyze
        const parsed = parseTokenFromUrl(url);
        if (parsed && parsed.token) {
          analyzeToken(parsed);
        } else {
          // Content script might not be loaded yet, try again
          setTimeout(() => checkForTokenOnPage(), 500);
        }
        return;
      }

      dbg('🌊 AquaSwap: Response from content script:', response);

      if (response && response.success && response.data && response.data.token) {
        dbg('🌊 AquaSwap: Token detected:', response.data);
        analyzeToken(response.data);
      } else {
        dbg('🌊 AquaSwap: No token detected on this token page');
      }
    });
  } catch (error) {
    console.error('🌊 AquaSwap: Error checking for token:', error);
  }
}

/**
 * Fallback URL parser (no content script)
 */
function parseTokenFromUrl(url) {
  try {
    if (!url) return null;
    // DexScreener: /chain/address (EVM 40-64 or Solana base58)
    const m = url.match(/dexscreener\.com\/([^\/]+)\/(0x[a-fA-F0-9]{40,64}|[1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (m) {
      return {
        token: m[2],
        address: m[2],
        chain: m[1].toLowerCase(),
        symbolHint: null,
        url,
        timestamp: Date.now()
      };
    }
    // Uniswap: tokens/0x... or swap?inputCurrency=0x...
    const uniToken = url.match(/tokens\/(0x[a-fA-F0-9]{40})/i) || url.match(/[?&](?:inputCurrency|outputCurrency)=(0x[a-fA-F0-9]{40})/i);
    if (uniToken) {
      return { token: uniToken[1], address: uniToken[1], chain: 'ethereum', symbolHint: null, url, timestamp: Date.now() };
    }
    // PancakeSwap: swap?inputCurrency=0x...
    const pcsToken = url.match(/pancakeswap\.finance\/swap.*[?&](?:inputCurrency|outputCurrency)=(0x[a-fA-F0-9]{40})/i);
    if (pcsToken) {
      return { token: pcsToken[1], address: pcsToken[1], chain: 'bsc', symbolHint: null, url, timestamp: Date.now() };
    }
    return null;
  } catch (_) {
    return null;
  }
}
/**
 * Analyze token and show advisor
 */
async function analyzeToken(detected) {
  const tokenIdentifier = detected.token;
  const chain = detected.chain;
  const symbolHint = detected.symbolHint;
  const detectedAddress = detected.address || null;
  const advisor = document.getElementById('token-advisor');
  const advisorLoading = document.getElementById('advisor-loading');
  const advisorContent = document.getElementById('advisor-content');
  const advisorError = document.getElementById('advisor-error');
  const swapContainer = document.getElementById('swap-container');

  if (!advisor) return;

  // Show advisor (tab will handle visibility)
  advisor.style.display = 'block';
  advisorLoading.style.display = 'block';
  advisorContent.style.display = 'none';
  advisorError.style.display = 'none';

  try {
    // PRIMARY SOURCE: DexScreener API based on the detected address/symbol
    const dsPrimary = await fetchDexScreenerPrimary(tokenIdentifier, chain, symbolHint);

    // Fallback: our DB (symbol/name driven)
    let token = null;
    if (!dsPrimary) {
      const tryQueries = [];
      if (symbolHint) tryQueries.push(symbolHint);
      tryQueries.push(tokenIdentifier);

      for (const q of tryQueries) {
        const searchQuery = encodeURIComponent(q);
        const tokenResponse = await fetch(`https://aquads.onrender.com/api/tokens?search=${searchQuery}`);
      
        if (!tokenResponse.ok) {
          continue;
        }

        const tokens = await tokenResponse.json();
        if (Array.isArray(tokens) && tokens.length > 0) {
          token = tokens.find(t => 
            (symbolHint && t.symbol?.toLowerCase() === symbolHint.toLowerCase()) ||
            t.symbol?.toLowerCase() === tokenIdentifier.toLowerCase() ||
            t.id?.toLowerCase() === tokenIdentifier.toLowerCase() ||
            t.name?.toLowerCase() === tokenIdentifier.toLowerCase()
          ) || tokens[0];
        }
        if (token) break;
      }
    }

    if (!dsPrimary && !token) {
      throw new Error('Token not found');
    }

    // Normalize from DexScreener primary if available
    if (dsPrimary) {
      token = {
        symbol: dsPrimary.symbol || symbolHint || tokenIdentifier,
        name: dsPrimary.name || dsPrimary.symbol || '',
        currentPrice: Number(dsPrimary.priceUsd) || 0,
        marketCap: Number(dsPrimary.marketCap || dsPrimary.fdv) || 0,
        priceChangePercentage24h: Number(dsPrimary.priceChange24h) || 0,
        ath: null
      };
    }

    // Fetch reviews for token (optional)
    let reviews = [];
    let avgRating = 0;
    try {
      const reviewsResponse = await fetch(`https://aquads.onrender.com/api/reviews/${token.symbol}`);
      if (reviewsResponse.ok) {
        reviews = await reviewsResponse.json();
        if (reviews && reviews.length > 0) {
          avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
        }
      }
    } catch (error) {
      console.log('No reviews found for token');
    }

    // Calculate data-driven verdict using DexScreener metrics
    const verdictInfo = computeDexScreenerVerdict({
      token,
      avgRating,
      ds: dsPrimary
    });
    const verdict = verdictInfo.verdict;

    // Update UI
    document.getElementById('advisor-token-symbol').textContent = token.symbol || tokenIdentifier;
    const dsAddr = dsPrimary && dsPrimary.address ? dsPrimary.address : null;
    const addrToShow = (detectedAddress || dsAddr || tokenIdentifier);
    document.getElementById('advisor-token-name').textContent = token.name ? `${token.name} • ${addrToShow}` : addrToShow;

    // Update rating
    const ratingElement = document.getElementById('advisor-rating');
    const ratingCountElement = document.getElementById('advisor-rating-count');
    const ratingContainer = document.getElementById('stat-rating');
    if (avgRating > 0) {
      if (ratingContainer) ratingContainer.style.display = 'flex';
      ratingElement.textContent = '⭐'.repeat(Math.round(avgRating));
      ratingCountElement.textContent = `(${avgRating.toFixed(1)}/5 from ${reviews.length} reviews)`;
    } else {
      if (ratingContainer) ratingContainer.style.display = 'none';
    }

    // Update 24h change
    const change24h = token.priceChangePercentage24h;
    const changeElement = document.getElementById('advisor-24h-change');
    const changeContainer = document.getElementById('stat-change');
    if (change24h == null) {
      if (changeContainer) changeContainer.style.display = 'none';
    } else {
      if (changeContainer) changeContainer.style.display = 'flex';
      changeElement.textContent = `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
      changeElement.className = `stat-value change-value ${change24h >= 0 ? 'positive' : 'negative'}`;
    }

    // Update 1h change
    const change1h = dsPrimary && dsPrimary.priceChange1h != null ? Number(dsPrimary.priceChange1h) : null;
    const change1hEl = document.getElementById('advisor-1h-change');
    const change1hContainer = document.getElementById('stat-change1h');
    if (change1h == null) {
      if (change1hContainer) change1hContainer.style.display = 'none';
    } else {
      if (change1hContainer) change1hContainer.style.display = 'flex';
      change1hEl.textContent = `${change1h >= 0 ? '+' : ''}${change1h.toFixed(2)}%`;
      change1hEl.className = `stat-value change-value ${change1h >= 0 ? 'positive' : 'negative'}`;
    }

    // Update market cap
    const marketCap = token.marketCap;
    const mcContainer = document.getElementById('stat-marketcap');
    if (!marketCap || marketCap <= 0) {
      if (mcContainer) mcContainer.style.display = 'none';
    } else {
      if (mcContainer) mcContainer.style.display = 'flex';
      document.getElementById('advisor-market-cap').textContent = formatMarketCap(marketCap);
    }

    // Update price
    const price = token.currentPrice;
    const priceContainer = document.getElementById('stat-price');
    if (!price || price <= 0) {
      if (priceContainer) priceContainer.style.display = 'none';
    } else {
      if (priceContainer) priceContainer.style.display = 'flex';
      document.getElementById('advisor-price').textContent = formatPrice(price);
    }

    // Liquidity
    const liqUsd = dsPrimary ? dsPrimary.liquidityUsd : null;
    const liqContainer = document.getElementById('stat-liquidity');
    const liqEl = document.getElementById('advisor-liquidity');
    if (liqUsd == null || liqUsd <= 0) {
      if (liqContainer) liqContainer.style.display = 'none';
    } else {
      if (liqContainer) liqContainer.style.display = 'flex';
      liqEl.textContent = formatMarketCap(liqUsd);
    }

    // FDV
    const fdv = dsPrimary ? dsPrimary.fdv : null;
    const fdvContainer = document.getElementById('stat-fdv');
    const fdvEl = document.getElementById('advisor-fdv');
    if (fdv == null || fdv <= 0) {
      if (fdvContainer) fdvContainer.style.display = 'none';
    } else {
      if (fdvContainer) fdvContainer.style.display = 'flex';
      fdvEl.textContent = formatMarketCap(fdv);
    }

    // Volume 24h
    const vol24 = dsPrimary ? dsPrimary.volume24hUsd : null;
    const volContainer = document.getElementById('stat-volume');
    const volEl = document.getElementById('advisor-volume');
    if (vol24 == null || vol24 <= 0) {
      if (volContainer) volContainer.style.display = 'none';
    } else {
      if (volContainer) volContainer.style.display = 'flex';
      volEl.textContent = formatMarketCap(vol24);
    }

    // Pair age
    const ageContainer = document.getElementById('stat-age');
    const ageEl = document.getElementById('advisor-age');
    if (dsPrimary && dsPrimary.pairCreatedAt) {
      const ageDays = Math.max(0, Math.floor((Date.now() - Number(dsPrimary.pairCreatedAt)) / (1000 * 60 * 60 * 24)));
      if (ageContainer) ageContainer.style.display = 'flex';
      ageEl.textContent = `${ageDays}d`;
    } else {
      if (ageContainer) ageContainer.style.display = 'none';
    }

    // Update verdict
    const verdictElement = document.getElementById('advisor-verdict');
    const verdictTextElement = document.getElementById('verdict-text');
    verdictElement.className = `advisor-verdict ${verdict.class}`;
    verdictTextElement.textContent = verdict.text;

    // Reasons + meta
    const reasonsEl = document.getElementById('advisor-reasons');
    if (reasonsEl) {
      if (verdictInfo.reasons.length) {
        reasonsEl.style.display = 'block';
        reasonsEl.textContent = verdictInfo.reasons.slice(0, 4).join(' • ');
      } else {
        reasonsEl.style.display = 'none';
      }
    }
    const metaEl = document.getElementById('advisor-meta');
    if (metaEl) {
      const source = dsPrimary ? 'DexScreener API' : 'Aquads DB';
      const conf = verdictInfo.confidence;
      metaEl.style.display = 'block';
      metaEl.textContent = `Confidence: ${conf} • Data source: ${source}`;
    }

    // Legacy summary removed (reasons already set above)

    // Hide Boost and Security rows if not available from API
    const boostContainer = document.getElementById('stat-boost');
    if (boostContainer) boostContainer.style.display = 'none';
    const secContainer = document.getElementById('stat-security');
    if (secContainer) secContainer.style.display = 'none';

    // Set up action buttons
    const swapBtn = document.getElementById('swap-token-btn');
    const viewBtn = document.getElementById('view-details-btn');
    
    if (swapBtn) {
      swapBtn.onclick = () => {
        // Switch to Swap tab inside extension
        const addr = dsAddr || detectedAddress || tokenIdentifier;
        if (window.__AQUA_EXT__ && window.__AQUA_EXT__.activateTab) {
          window.__AQUA_EXT__.activateTab('swap');
        }
        // Copy contract address for user to paste in swap
        if (addr && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr)
            .then(() => showToast('Contract address copied'))
            .catch(() => showToast('Copy failed - please paste manually'));
        } else {
          showToast('Contract address ready to paste');
        }
      };
    }

    if (viewBtn) {
      viewBtn.onclick = () => {
        // Open token details page
        window.open(`https://aquads.xyz/tokens/${token.symbol}`, '_blank');
      };
    }

    // Show content
    advisorLoading.style.display = 'none';
    advisorContent.style.display = 'block';

  } catch (error) {
    console.error('Error analyzing token:', error);
    advisorLoading.style.display = 'none';
    advisorError.style.display = 'block';
    const msg = (symbolHint && symbolHint !== tokenIdentifier)
      ? `Could not resolve "${symbolHint}" (${tokenIdentifier}) from DexScreener.`
      : `Token "${tokenIdentifier}" not found from DexScreener.`;
    document.getElementById('error-message').textContent = msg;
  }
}

/**
 * DexScreener Primary API (address/symbol)
 */
async function fetchDexScreenerPrimary(tokenIdentifier, chain, symbolHint) {
  try {
    let url = '';
    const isEvm40 = /^0x[a-fA-F0-9]{40}$/.test(tokenIdentifier);
    const isEvmLong = /^0x[a-fA-F0-9]{41,64}$/.test(tokenIdentifier);
    const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenIdentifier);

    if (isEvm40 || isSol) {
      url = `https://api.dexscreener.com/latest/dex/tokens/${tokenIdentifier}`;
    } else if (isEvmLong && chain) {
      // Likely a pair address: use pairs endpoint with chain
      url = `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${tokenIdentifier}`;
    } else if (symbolHint) {
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbolHint)}`;
    } else {
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(tokenIdentifier)}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    let arr = Array.isArray(json.pairs) ? json.pairs
      : Array.isArray(json.pools) ? json.pools
      : Array.isArray(json.data) ? json.data : [];

    // If lookup returned nothing, try pairs endpoint with chain (covers EVM pair and Solana mints routed as pairs)
    if (!arr.length && (isEvmLong || isEvm40 || isSol) && chain) {
      const res2 = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${tokenIdentifier}`);
      if (res2.ok) {
        const j2 = await res2.json();
        arr = Array.isArray(j2.pairs) ? j2.pairs : [];
      }
    }

    if (!arr.length) return null;

    // Select best pair by chain and highest liquidity
    const normalizedChain = (chain || '').toLowerCase();
    // For Solana, some entries may have chain 'solana' or 'SOL'; normalize includes check
    const byChain = normalizedChain ? arr.filter(p => ((p.chainId || p.chain || '') + '').toLowerCase().includes(normalizedChain)) : arr;
    const best = byChain.sort((a,b) => (Number(b.liquidity?.usd)||0) - (Number(a.liquidity?.usd)||0))[0];

    const base = best.baseToken || best.base || {};
    return {
      symbol: (base.symbol || '').toUpperCase(),
      name: base.name || base.symbol || '',
      priceUsd: best.priceUsd || best.price || 0,
      marketCap: best.marketCap || 0,
      fdv: best.fdv || 0,
      liquidityUsd: Number(best.liquidity?.usd) || 0,
      priceChange1h: best.priceChange?.h1 ?? null,
      priceChange24h: best.priceChange?.h24 ?? (best.priceChange24h ?? null),
      pairCreatedAt: best.pairCreatedAt || null,
      address: base.address || null,
      volume24hUsd: (best.volume?.h24 != null ? Number(best.volume.h24) : (best.volume24h || null)),
      txns24h: (best.txns?.h24 != null ? Number(best.txns.h24) : (best.txns24h || null))
    };
  } catch (e) {
    console.warn('DexScreener primary failed:', e);
    return null;
  }
}

/**
 * Compute verdict with clear rules using DexScreener metrics
 */
function computeDexScreenerVerdict({ token, avgRating, ds }) {
  const reasons = [];

  const marketCap = token.marketCap || 0;
  const price24 = token.priceChangePercentage24h;
  const liq = ds ? (ds.liquidityUsd || 0) : 0;
  const h1 = ds && ds.priceChange1h != null ? Number(ds.priceChange1h) : null;
  const fdv = ds ? (ds.fdv || 0) : 0;
  const vol24 = ds ? (ds.volume24hUsd || 0) : 0;
  const ageMs = ds && ds.pairCreatedAt ? (Date.now() - Number(ds.pairCreatedAt)) : null;
  const ageDays = ageMs != null ? Math.max(0, Math.floor(ageMs / (1000*60*60*24))) : null;

  // Score (0-100), center at 50
  let score = 50;

  // Liquidity
  if (liq >= 1_000_000) score += 30;
  else if (liq >= 500_000) score += 25;
  else if (liq >= 200_000) score += 15;
  else if (liq >= 100_000) score += 8;
  else if (liq < 50_000) score -= 25;
  else score -= 10;

  // Volume 24h
  if (vol24 >= 2_000_000) score += 20;
  else if (vol24 >= 1_000_000) score += 15;
  else if (vol24 >= 250_000) score += 8;
  else if (vol24 < 25_000) score -= 15;
  else score -= 5;

  // Size (MCAP/FDV)
  const size = Math.max(marketCap, fdv);
  if (size >= 100_000_000) score += 10;
  else if (size >= 10_000_000) score += 8;
  else if (size >= 3_000_000) score += 4;
  else if (size < 1_000_000) score -= 5;

  // Momentum
  if (h1 != null && h1 >= 0) score += 5;
  if (price24 != null) {
    if (price24 >= 0 && price24 <= 15) score += 10;
    else if (price24 > 15 && price24 <= 30) score += 5;
    else if (price24 < 0 && price24 >= -10) score -= 5;
    else if (price24 < -25) score -= 20;
  }

  // Age
  if (ageDays != null) {
    if (ageDays >= 90) score += 10;
    else if (ageDays >= 30) score += 6;
    else if (ageDays < 2 && price24 != null && price24 > 25) score -= 10;
  }

  // Build reasons from the biggest drivers
  if (liq >= 500_000) reasons.push('Deep liquidity');
  if (vol24 >= 250_000) reasons.push('Strong 24h volume');
  if (h1 != null && h1 >= 0) reasons.push('Positive 1h momentum');
  if (price24 != null && price24 >= 0 && price24 <= 15) reasons.push('Healthy 24h trend');
  if (size >= 100_000_000) reasons.push('Large cap stability');
  if (ageDays != null && ageDays >= 30) reasons.push('Established pair');
  if (price24 != null && price24 < -25) reasons.push('Severe 24h drawdown');
  if (ageDays != null && ageDays < 2 && price24 != null && price24 > 25) reasons.push('New + rapid pump');

  score = Math.max(0, Math.min(100, Math.round(score)));
  const klass = score >= 70 ? 'good' : (score >= 40 ? 'caution' : 'warning');
  return { verdict: { text: `Degen Score: ${score}/100`, class: klass }, reasons, confidence: (score >= 70 ? 'Medium' : 'Low') };
}
/**
 * Fetch minimal token data from DexScreener for fallback
 */
async function fetchDexScreenerData(tokenIdentifier, chain, symbolHint) {
  try {
    let url = '';
    // Prefer address-based lookup when possible
    if (/^0x[a-fA-F0-9]{40}$/.test(tokenIdentifier) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenIdentifier)) {
      url = `https://api.dexscreener.com/latest/dex/tokens/${tokenIdentifier}`;
    } else if (symbolHint) {
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbolHint)}`;
    } else {
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(tokenIdentifier)}`;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();

    // DexScreener returns an object with pools array
    const pools = json.pairs || json.pools || json.data || json.pairs || json?.pairs;
    const arr = Array.isArray(json.pairs) ? json.pairs
      : Array.isArray(json.pools) ? json.pools
      : Array.isArray(json.data) ? json.data
      : Array.isArray(pools) ? pools : [];

    if (!arr.length) return null;

    // Choose the most relevant pool: prefer same chain if provided, otherwise highest liquidity
    const normalizedChain = (chain || '').toLowerCase();
    let best = arr[0];
    if (normalizedChain) {
      const byChain = arr.filter(p => (p.chainId || p.chain || '').toLowerCase().includes(normalizedChain));
      if (byChain.length) {
        best = byChain.sort((a,b) => (Number(b.liquidity?.usd)||0) - (Number(a.liquidity?.usd)||0))[0];
      } else {
        best = arr.sort((a,b) => (Number(b.liquidity?.usd)||0) - (Number(a.liquidity?.usd)||0))[0];
      }
    }

    const base = best.baseToken || best.base || {};
    const stats = {
      symbol: (base.symbol || '').toUpperCase(),
      name: base.name || base.symbol || '',
      priceUsd: best.priceUsd || best.price || 0,
      marketCap: best.marketCap || (best.fdv || 0),
      fdv: best.fdv || 0,
      priceChange24h: (best.priceChange?.h24 !== undefined ? best.priceChange.h24 : (best.priceChange24h || 0))
    };
    return stats;
  } catch (e) {
    console.warn('DexScreener fallback failed:', e);
    return null;
  }
}

/**
 * Calculate verdict score (0-100)
 */
function calculateVerdictScore(token, avgRating) {
  let score = 0;

  // Rating component (0-30 points)
  if (avgRating > 0) {
    score += (avgRating / 5) * 30;
  } else {
    score += 15; // Neutral if no reviews
  }

  // Price momentum (0-20 points)
  const priceChange24h = token.priceChangePercentage24h || 0;
  if (priceChange24h > 5) {
    score += 20;
  } else if (priceChange24h > 0) {
    score += 10;
  } else if (priceChange24h > -5) {
    score += 5;
  }

  // ATH distance (0-20 points)
  if (token.ath && token.currentPrice) {
    const athDistance = ((token.currentPrice / token.ath) - 1) * 100;
    if (athDistance > -20 && athDistance < 0) {
      score += 20; // Good distance from ATH
    } else if (athDistance >= 0) {
      score += 5; // At or above ATH (might be overbought)
    } else {
      score += 10; // Far from ATH
    }
  }

  // Market cap (0-20 points)
  const marketCap = token.marketCap || 0;
  if (marketCap > 100000000) { // > $100M
    score += 20;
  } else if (marketCap > 10000000) { // > $10M
    score += 15;
  } else if (marketCap > 1000000) { // > $1M
    score += 10;
  } else {
    score += 5; // Low market cap (higher risk)
  }

  // Boost votes (0-15 points) - requires scraped stats
  try {
    const boostEl = document.getElementById('advisor-boost');
    const boostVal = boostEl ? parseInt((boostEl.textContent || '0').replace(/,/g,''),10) : 0;
    if (boostVal >= 5000) score += 15;
    else if (boostVal >= 1000) score += 10;
    else if (boostVal >= 200) score += 6;
    else if (boostVal >= 50) score += 3;
  } catch (_) {}

  // Security (0-15 points) - simple heuristics based on text
  try {
    const secEl = document.getElementById('advisor-security');
    const sec = (secEl ? secEl.textContent : '') || '';
    if (/no honeypot/i.test(sec)) score += 7;
    if (/liquidity locked/i.test(sec)) score += 5;
    if (/tax\s+(0%|1%|2%)/i.test(sec)) score += 3;
    if (/ownership not renounced/i.test(sec)) score -= 3;
    if (/honeypot risk/i.test(sec)) score -= 8;
    if (/liquidity unlocked/i.test(sec)) score -= 5;
  } catch (_) {}

  return Math.min(100, Math.max(0, score));
}

/**
 * Get verdict based on score
 */
function getVerdict(score) {
  if (score >= 70) {
    return { text: 'Good Buy', class: 'good' };
  } else if (score >= 50) {
    return { text: 'Caution', class: 'caution' };
  } else if (score >= 30) {
    return { text: 'Research More', class: 'warning' };
  } else {
    return { text: 'High Risk', class: 'warning' };
  }
}

/**
 * Format market cap
 */
function formatMarketCap(value) {
  if (!value || value === 0) return 'N/A';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format price
 */
function formatPrice(value) {
  if (!value || value === 0) return 'N/A';
  // Very small prices: show up to 8 decimals, trim trailing zeros
  if (value < 0.01) {
    const s = value.toFixed(8);
    return `$${s.replace(/0+$/,'').replace(/\.$/,'')}`;
  }
  if (value < 1) return `$${value.toFixed(4)}`;
  if (value < 1000) return `$${value.toFixed(2)}`;
  // Add thousand separators for large prices
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Close advisor and show swap
 */
function closeAdvisor() {
  const advisor = document.getElementById('token-advisor');
  const swapContainer = document.getElementById('swap-container');
  
  if (advisor) advisor.style.display = 'none';
  if (swapContainer) swapContainer.style.display = 'block';
}

/**
 * Handle extension unload
 */
window.addEventListener('beforeunload', () => {
  console.log('🌊 AquaSwap extension closing');
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    // Set up close button after DOM is ready
    const closeAdvisorBtn = document.getElementById('close-advisor');
    if (closeAdvisorBtn) {
      closeAdvisorBtn.addEventListener('click', closeAdvisor);
    }
  });
} else {
  init();
  // Set up close button
  const closeAdvisorBtn = document.getElementById('close-advisor');
  if (closeAdvisorBtn) {
    closeAdvisorBtn.addEventListener('click', closeAdvisor);
  }
}

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { init, handleIframeLoad, showError };
}

