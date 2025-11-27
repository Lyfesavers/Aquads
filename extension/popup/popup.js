// AquaSwap Extension - Popup Script
// Use global dbg function (defined in auth.js) - no-op to keep console clean
if (typeof window.dbg === 'undefined') {
  window.dbg = () => {}; // No-op function as fallback
}
dbg('🌊 AquaSwap Extension loaded');

// Socket.io connection for real-time points updates
let socket = null;

/**
 * Initialize socket connection for real-time points updates
 */
async function initSocket() {
  try {
    const storage = await chrome.storage.local.get(['authToken', 'user']);
    if (!storage.authToken || !storage.user) {
      dbg('No auth token or user, skipping socket connection');
      return;
    }

    // Connect to socket server
    socket = io('https://aquads.onrender.com', {
      auth: {
        token: storage.authToken
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      dbg('✅ Socket connected for real-time points updates');
    });

    socket.on('disconnect', () => {
      dbg('⚠️ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      dbg('Socket connection error:', error);
    });

    // Listen for real-time points updates
    socket.on('affiliateEarningUpdate', async (data) => {
      dbg('📊 Real-time points update received:', data);
      
      // Get current user to check if update is for them
      const currentStorage = await chrome.storage.local.get(['user']);
      const currentUser = currentStorage.user;
      
      if (!currentUser) return;
      
      // Check if this update is for the current user
      const currentUserId = currentUser.userId || currentUser.id;
      if (data.affiliateId && data.affiliateId.toString() === currentUserId?.toString()) {
        if (data.newTotalPoints !== undefined) {
          dbg('✅ Updating points display via socket (instant):', data.newTotalPoints);
          updatePointsDisplay(data.newTotalPoints);
          
          // Optional: Show a brief visual indicator that points were updated
          const pointsElement = document.getElementById('points-value');
          if (pointsElement && data.pointsAwarded) {
            // Brief highlight animation
            pointsElement.style.transition = 'all 0.3s ease';
            pointsElement.style.color = '#00ff00';
            setTimeout(() => {
              pointsElement.style.color = '';
            }, 500);
          }
        }
      }
    });

  } catch (error) {
    dbg('Error initializing socket:', error);
  }
}

/**
 * Update points display in UI
 */
function updatePointsDisplay(points) {
  const pointsElement = document.getElementById('points-value');
  if (pointsElement) {
    pointsElement.textContent = points.toLocaleString();
  }
}

/**
 * Disconnect socket when popup closes
 */
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    dbg('Socket disconnected');
  }
}

// Check authentication first
(async function checkAuth() {
  const isAuth = await AuthService.isAuthenticated();
  if (!isAuth) {
    dbg('❌ Not authenticated, redirecting to login...');
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
    
    // Initialize socket for real-time points updates
    initSocket();
    
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
      dbg('Iframe failed to load within timeout');
      showError();
    }
  }, IFRAME_TIMEOUT);

  // Listen for iframe load BEFORE setting src
  iframe.addEventListener('load', handleIframeLoad);
  iframe.addEventListener('error', handleIframeError);

  // Set src AFTER listeners are attached to prevent race condition
  if (iframe && !iframe.src) {
    iframe.src = AQUADS_URL;
  }

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
  dbg('❌ Iframe failed to load');
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
  mainContent.style.display = 'none';
  
  // Clear existing timeout
  if (loadTimeout) {
    clearTimeout(loadTimeout);
  }
  
  // Reload iframe by setting src to empty then back to URL
  iframe.src = '';
  setTimeout(() => {
    iframe.src = AQUADS_URL;
  }, 100);
  
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
      dbg('Error loading preferences:', error);
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
    dbg('Error tracking usage:', error);
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
    dbg('✅ Swap completed! Awarding 5 affiliate points...');
    (async () => {
      try {
        const storage = await chrome.storage.local.get(['authToken', 'isLoggedIn', 'user']);
        
        if (!storage.authToken) {
          dbg('⚠️ No auth token present; cannot award points. User may need to log in again.');
          return;
        }

        dbg('Making API call to award swap points...');
        const res = await fetch('https://aquads.onrender.com/api/points/swap-completed', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${storage.authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (res.ok) {
          dbg('✅ Points awarded successfully! Points will update via socket in real-time.');
          // Points update via socket - no API refresh needed to avoid race conditions
          // Socket update is instant and reliable
        } else if (res.status === 401) {
          // Token expired - log user out and redirect to login
          dbg('🔒 Session expired, logging out...');
          await AuthService.logout();
          alert('Your session has expired. Please log in again to continue earning points.');
          window.location.href = 'login.html';
        } else {
          dbg('❌ Swap points award failed:', {
            status: res.status,
            statusText: res.statusText,
            error: data.error || data.message || 'Unknown error',
            data: data
          });
        }
      } catch (e) {
        dbg('❌ Error awarding swap points from extension:', e);
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
 * Load and display affiliate points
 */
async function loadAffiliatePoints() {
  try {
    const result = await chrome.storage.local.get(['authToken']);
    if (!result.authToken) {
      dbg('No auth token found');
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
      // If 401, token expired - log user out
      if (response.status === 401) {
        dbg('🔒 Session expired, logging out...');
        await AuthService.logout();
        alert('Your session has expired. Please log in again.');
        window.location.href = 'login.html';
        return;
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
    dbg('Error loading affiliate points:', error);
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
    // Dextools token pages: dextools.io/app/chain/pair-explorer/address
    // Uniswap token pages: app.uniswap.org/tokens/0x... or /swap?inputCurrency=0x...
    // PancakeSwap token pages: pancakeswap.finance/swap?inputCurrency=0x...
    
    const url = tab.url || '';
    let isAquaswapPage = false;
    try {
      const parsedUrl = new URL(url);
      const host = (parsedUrl.hostname || '').toLowerCase();
      const path = (parsedUrl.pathname || '').toLowerCase();
      const hostMatch = host.includes('aquads') || host.includes('aquaswap') || host === 'localhost' || host === '127.0.0.1';
      const pathMatch = path.includes('/swap') || path.includes('/aquaswap');
      isAquaswapPage = hostMatch && pathMatch;
    } catch (_) {
      isAquaswapPage = false;
    }
    const isTokenDetailPage = 
      isAquaswapPage ||
      // DexScreener: must have chain and address in path (EVM 0x... or Solana base58)
      /dexscreener\.com\/[^\/]+\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i.test(url) ||
      // Dextools: must have /pair-explorer/address in path
      /dextools\.io\/.*\/pair-explorer\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i.test(url) ||
      // Uniswap: token detail page or swap with token selected
      /app\.uniswap\.org\/tokens\/0x/i.test(url) ||
      /app\.uniswap\.org\/swap.*[input|output]Currency=0x/i.test(url) ||
      // PancakeSwap: swap with token selected
      /pancakeswap\.finance\/swap.*[input|output]Currency=0x/i.test(url) ||
      // Generic: token in URL
      /token.*=.*0x[a-fA-F0-9]{40}/i.test(url);
    
    if (!isTokenDetailPage) {
      dbg('🌊 AquaSwap: Not on a token detail page');
      // Don't show any error - just silently return
      return;
    }

    dbg('🌊 AquaSwap: Token detail page detected, checking for token...');

    // For Dextools pages, use URL parsing directly (content script not reliable)
    // For other pages, try content script first, then fallback to URL parsing
    const isDextools = url.includes('dextools.io');
    
    if (isDextools) {
      // Dextools: Parse URL directly (no content script needed)
      const parsed = parseTokenFromUrl(url);
      if (parsed && parsed.token) {
        dbg('🌊 AquaSwap: Token detected from URL (Dextools):', parsed);
        analyzeToken(parsed);
      } else {
        dbg('🌊 AquaSwap: No token found in Dextools URL');
      }
    } else {
      // Other sites: Try content script first, then fallback to URL parsing
      chrome.tabs.sendMessage(tab.id, { action: 'detectToken' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not available - use URL fallback
          dbg('🌊 AquaSwap: Content script not available, using URL fallback');
          const parsed = parseTokenFromUrl(url);
          if (parsed && parsed.token) {
            analyzeToken(parsed);
          }
          return;
        }

        dbg('🌊 AquaSwap: Response from content script:', response);

        if (response && response.success && response.data && response.data.token) {
          dbg('🌊 AquaSwap: Token detected:', response.data);
          analyzeToken(response.data);
        } else {
          // Fallback to URL parsing if content script didn't find token
          const parsed = parseTokenFromUrl(url);
          if (parsed && parsed.token) {
            dbg('🌊 AquaSwap: Token detected from URL fallback:', parsed);
            analyzeToken(parsed);
          } else {
            dbg('🌊 AquaSwap: No token detected on this token page');
            // Don't call analyzeToken - just silently return
            return;
          }
        }
      });
    }
  } catch (error) {
    // Don't log errors to console (affects Chrome Web Store review)
    dbg('🌊 AquaSwap: Error checking for token:', error);
  }
}

/**
 * Fallback URL parser (no content script)
 */
const URL_CHAIN_MAP = {
  'ether': 'ethereum',
  'eth': 'ethereum',
  'ethereum': 'ethereum',
  'bsc': 'bsc',
  'bnb': 'bsc',
  'binance': 'bsc',
  'polygon': 'polygon',
  'matic': 'polygon',
  'solana': 'solana',
  'sol': 'solana',
  'avalanche': 'avalanche',
  'avax': 'avalanche',
  'arbitrum': 'arbitrum',
  'arb': 'arbitrum',
  'optimism': 'optimism',
  'op': 'optimism',
  'base': 'base',
  'fantom': 'fantom',
  'ftm': 'fantom',
  'cronos': 'cronos',
  'celo': 'celo',
  'harmony': 'harmony',
  'near': 'near',
  'sui': 'sui',
  'aptos': 'aptos',
  'ton': 'ton',
  'stellar': 'stellar',
  'algorand': 'algorand',
  'hedera': 'hedera',
  'icp': 'icp',
  'elrond': 'elrond',
  'multiversx': 'elrond',
  'terra': 'terra',
  'xrp': 'xrp',
  'litecoin': 'litecoin',
  'bitcoin': 'bitcoin',
  'tron': 'tron',
  'tezos': 'tezos',
  'zilliqa': 'zilliqa',
  'oasis': 'oasis',
  'stacks': 'stacks',
  'kadena': 'kadena',
  'injective': 'injective',
  'kava': 'kava',
  'moonriver': 'moonriver',
  'moonbeam': 'moonbeam',
  'flow': 'flow',
  'cardano': 'cardano',
  'polkadot': 'polkadot',
  'cosmos': 'cosmos',
  'kaspa': 'kaspa'
};

function normalizeChainFromUrl(chainCandidate) {
  if (!chainCandidate) return null;
  const normalized = decodeURIComponent(chainCandidate).toLowerCase().trim();
  return URL_CHAIN_MAP[normalized] || normalized || null;
}

function sanitizeTokenFromUrl(tokenCandidate) {
  if (!tokenCandidate) return null;
  const cleaned = decodeURIComponent(tokenCandidate).trim();
  if (!cleaned) return null;
  if (/^0x[a-fA-F0-9]{40,64}$/.test(cleaned)) return cleaned;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleaned)) return cleaned;
  if (/^[A-Za-z0-9\-_]{15,100}$/.test(cleaned)) return cleaned;
  return null;
}

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
    // Dextools: /app/[lang/]chain/pair-explorer/address
    const dextoolsMatch = url.match(/dextools\.io\/app\/(?:[^\/]+\/)?([^\/]+)\/pair-explorer\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/i);
    if (dextoolsMatch) {
      const chainName = dextoolsMatch[1].toLowerCase().trim();
      // Comprehensive chain mapping: Dextools chain names -> DexScreener standard names
      // Handles all common variations and edge cases
      const chainMap = {
        // Ethereum variations
        'eth': 'ethereum', 'ethereum': 'ethereum', 'ether': 'ethereum', 'mainnet': 'ethereum',
        // BSC variations
        'bsc': 'bsc', 'binance': 'bsc', 'bnb': 'bsc', 'binance-smart-chain': 'bsc', 'binancesmartchain': 'bsc',
        // Polygon variations
        'polygon': 'polygon', 'matic': 'polygon', 'polygon-pos': 'polygon', 'polygonpos': 'polygon',
        // Arbitrum variations
        'arbitrum': 'arbitrum', 'arb': 'arbitrum', 'arbitrum-one': 'arbitrum', 'arbitrumone': 'arbitrum',
        // Optimism variations
        'optimism': 'optimism', 'op': 'optimism', 'optimistic-ethereum': 'optimism', 'optimisticethereum': 'optimism',
        // Base
        'base': 'base', 'base-mainnet': 'base', 'basemainnet': 'base',
        // Avalanche variations
        'avalanche': 'avalanche', 'avax': 'avalanche', 'avalanche-c': 'avalanche', 'avalanchec': 'avalanche', 'c-chain': 'avalanche', 'cchain': 'avalanche',
        // Fantom variations
        'fantom': 'fantom', 'ftm': 'fantom', 'fantom-opera': 'fantom', 'fantomopera': 'fantom',
        // Solana variations
        'solana': 'solana', 'sol': 'solana', 'sol-mainnet': 'solana', 'solmainnet': 'solana',
        // Sui
        'sui': 'sui', 'sui-mainnet': 'sui', 'suimainnet': 'sui',
        // zkSync variations
        'zksync': 'zksync', 'zksync-era': 'zksync', 'zksyncera': 'zksync', 'zksync-era-mainnet': 'zksync', 'zksynceramainnet': 'zksync',
        // Celo
        'celo': 'celo', 'celo-mainnet': 'celo', 'celomainnet': 'celo',
        // Scroll
        'scroll': 'scroll', 'scroll-mainnet': 'scroll', 'scrollmainnet': 'scroll',
        // Moonbeam
        'moonbeam': 'moonbeam', 'moonbeam-mainnet': 'moonbeam', 'moonbeammainnet': 'moonbeam',
        // Moonriver
        'moonriver': 'moonriver', 'moonriver-mainnet': 'moonriver', 'moonrivermainnet': 'moonriver',
        // Cronos
        'cronos': 'cronos', 'cronos-mainnet': 'cronos', 'cronosmainnet': 'cronos',
        // Harmony
        'harmony': 'harmony', 'harmony-one': 'harmony', 'harmonyone': 'harmony', 'harmony-mainnet': 'harmony', 'harmonymainnet': 'harmony',
        // Near
        'near': 'near', 'near-mainnet': 'near', 'nearmainnet': 'near',
        // Aptos
        'aptos': 'aptos', 'aptos-mainnet': 'aptos', 'aptosmainnet': 'aptos',
        // Additional chains
        'fantom': 'fantom', 'ftm': 'fantom',
        'gnosis': 'gnosis', 'xdai': 'gnosis', 'gnosis-chain': 'gnosis', 'gnosischain': 'gnosis',
        'metis': 'metis', 'metis-andromeda': 'metis', 'metisandromeda': 'metis',
        'boba': 'boba', 'boba-network': 'boba', 'bobanetwork': 'boba',
        'aurora': 'aurora', 'aurora-mainnet': 'aurora', 'auroramainnet': 'aurora',
        'klaytn': 'klaytn', 'klaytn-mainnet': 'klaytn', 'klaytnmainnet': 'klaytn',
        'linea': 'linea', 'linea-mainnet': 'linea', 'lineamainnet': 'linea',
        'mantle': 'mantle', 'mantle-mainnet': 'mantle', 'mantlemainnet': 'mantle',
        'blast': 'blast', 'blast-mainnet': 'blast', 'blastmainnet': 'blast'
      };
      
      // Normalize chain name: remove hyphens, underscores, convert to lowercase
      const normalizedChainName = chainName.replace(/[-_]/g, '').toLowerCase();
      
      // Try exact match first
      let mappedChain = chainMap[chainName] || chainMap[normalizedChainName];
      
      // If no match, try partial matching for common patterns
      if (!mappedChain) {
        // Check for common suffixes/prefixes
        if (chainName.includes('eth') || chainName.includes('ethereum')) mappedChain = 'ethereum';
        else if (chainName.includes('bsc') || chainName.includes('binance')) mappedChain = 'bsc';
        else if (chainName.includes('polygon') || chainName.includes('matic')) mappedChain = 'polygon';
        else if (chainName.includes('arbitrum') || chainName.includes('arb')) mappedChain = 'arbitrum';
        else if (chainName.includes('optimism') || chainName.includes('op')) mappedChain = 'optimism';
        else if (chainName.includes('base')) mappedChain = 'base';
        else if (chainName.includes('avalanche') || chainName.includes('avax')) mappedChain = 'avalanche';
        else if (chainName.includes('fantom') || chainName.includes('ftm')) mappedChain = 'fantom';
        else if (chainName.includes('solana') || chainName.includes('sol')) mappedChain = 'solana';
        else if (chainName.includes('sui')) mappedChain = 'sui';
        else if (chainName.includes('zksync')) mappedChain = 'zksync';
        else if (chainName.includes('celo')) mappedChain = 'celo';
        else if (chainName.includes('scroll')) mappedChain = 'scroll';
        else if (chainName.includes('moonbeam')) mappedChain = 'moonbeam';
        else if (chainName.includes('moonriver')) mappedChain = 'moonriver';
        else if (chainName.includes('cronos')) mappedChain = 'cronos';
        else if (chainName.includes('harmony')) mappedChain = 'harmony';
        else if (chainName.includes('near')) mappedChain = 'near';
        else if (chainName.includes('aptos')) mappedChain = 'aptos';
      }
      
      // Final fallback: use original chain name (DexScreener API is flexible)
      const finalChain = mappedChain || chainName;
      
      return {
        token: dextoolsMatch[2],
        address: dextoolsMatch[2],
        chain: finalChain,
        symbolHint: null,
        url,
        timestamp: Date.now()
      };
    }
    // AquaSwap hosted token pages with explicit query params
    const aquaswapMatch = url.match(/aquads\.xyz\/.*?(?:swap|aquaswap)[^?]*[?&](?:token|pair|address)=([^&#]+)/i);
    if (aquaswapMatch) {
      const tokenValue = sanitizeTokenFromUrl(aquaswapMatch[1]);
      if (tokenValue) {
        const chainMatch = url.match(/(?:blockchain|chain)=([^&#]+)/i);
        const chainValue = normalizeChainFromUrl(chainMatch ? chainMatch[1] : '');
        return {
          token: tokenValue,
          address: tokenValue,
          chain: chainValue || 'ethereum',
          symbolHint: null,
          url,
          timestamp: Date.now()
        };
      }
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
  // Validate input - don't proceed if no token data
  if (!detected || !detected.token) {
    dbg('🌊 AquaSwap: analyzeToken called without valid token data');
    return;
  }

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
    // Use DexScreener API for all sites (works for both DexScreener and Dextools pages)
    const dsPrimary = await fetchDexScreenerPrimary(tokenIdentifier, chain, symbolHint);
    const dataSource = dsPrimary ? 'DexScreener' : null;

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
      dbg('No reviews found for token');
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
    
    // Update recommendation if available
    if (verdictInfo.verdict.recommendation) {
      const recommendationEl = document.getElementById('advisor-recommendation');
      if (recommendationEl) {
        recommendationEl.textContent = verdictInfo.verdict.recommendation;
        recommendationEl.style.display = 'block';
      }
    }

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
      const source = dataSource || (dsPrimary ? 'DexScreener API' : 'Aquads DB');
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
    // Silently handle errors - don't log to console (affects Chrome Web Store review)
    // Only show user-friendly message in UI if we have a valid token identifier
    if (!tokenIdentifier) {
      // No token to analyze - just hide loading and return
      advisorLoading.style.display = 'none';
      return;
    }
    
    // Show user-friendly message in UI instead of throwing errors
    advisorLoading.style.display = 'none';
    advisorContent.style.display = 'block';
    advisorError.style.display = 'none';
    
    // Show token not found message in the advisor content area
    const tokenSymbolEl = document.getElementById('advisor-token-symbol');
    const tokenNameEl = document.getElementById('advisor-token-name');
    const verdictEl = document.getElementById('advisor-verdict');
    const verdictTextEl = document.getElementById('verdict-text');
    const recommendationEl = document.getElementById('advisor-recommendation');
    const reasonsEl = document.getElementById('advisor-reasons');
    const metaEl = document.getElementById('advisor-meta');
    
    // Display token identifier
    if (tokenSymbolEl) tokenSymbolEl.textContent = tokenIdentifier || 'Unknown';
    if (tokenNameEl) {
      const addrToShow = detectedAddress || tokenIdentifier || 'N/A';
      tokenNameEl.textContent = addrToShow;
    }
    
    // Show "Not Found" verdict
    if (verdictEl) {
      verdictEl.className = 'advisor-verdict caution';
      if (verdictTextEl) {
        verdictTextEl.textContent = 'TOKEN NOT FOUND';
      }
    }
    
    // Show helpful message
    if (recommendationEl) {
      recommendationEl.textContent = 'This token may not be listed on DexScreener yet, or the data is unavailable. Please verify the token address and try again.';
      recommendationEl.style.display = 'block';
    }
    
    if (reasonsEl) {
      reasonsEl.textContent = 'Token data not available from DexScreener API';
      reasonsEl.style.display = 'block';
    }
    
    if (metaEl) {
      metaEl.textContent = 'Data source: DexScreener API • Status: Not found';
      metaEl.style.display = 'block';
    }
    
    // Hide all stats since we don't have data
    const statContainers = ['stat-rating', 'stat-change', 'stat-change1h', 'stat-marketcap', 
                           'stat-fdv', 'stat-price', 'stat-liquidity', 'stat-volume', 
                           'stat-age', 'stat-boost', 'stat-security'];
    statContainers.forEach(statId => {
      const container = document.getElementById(statId);
      if (container) container.style.display = 'none';
    });
    
    // Hide action buttons or show message
    const swapBtn = document.getElementById('swap-token-btn');
    const viewBtn = document.getElementById('view-details-btn');
    if (swapBtn) swapBtn.style.display = 'none';
    if (viewBtn) viewBtn.style.display = 'none';
  }
}

/**
 * DexScreener Primary API (address/symbol)
 * Used for both DexScreener and Dextools pages
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
      priceChange6h: best.priceChange?.h6 ?? null,
      priceChange24h: best.priceChange?.h24 ?? (best.priceChange24h ?? null),
      pairCreatedAt: best.pairCreatedAt || null,
      address: base.address || null,
      volume24hUsd: (best.volume?.h24 != null ? Number(best.volume.h24) : (best.volume24h || null)),
      txns24h: (best.txns?.h24 != null ? Number(best.txns.h24) : (best.txns24h || null)),
      buyCount24h: best.buys?.h24 ?? null,
      sellCount24h: best.sells?.h24 ?? null,
      priceChange: best.priceChange || null
    };
  } catch (e) {
    dbg('DexScreener primary failed:', e);
    return null;
  }
}

/**
 * Comprehensive degen score calculation using all available DexScreener data
 * This provides investment risk assessment based on multiple factors
 */
function computeDexScreenerVerdict({ token, avgRating, ds }) {
  const reasons = [];
  const riskFactors = [];
  const positiveFactors = [];

  // Extract all available data
  const marketCap = token.marketCap || 0;
  const price24 = token.priceChangePercentage24h;
  const liq = ds ? (ds.liquidityUsd || 0) : 0;
  const h1 = ds && ds.priceChange1h != null ? Number(ds.priceChange1h) : null;
  const h6 = ds && ds.priceChange6h != null ? Number(ds.priceChange6h) : null;
  const fdv = ds ? (ds.fdv || 0) : 0;
  const vol24 = ds ? (ds.volume24hUsd || 0) : 0;
  const txns24h = ds ? (ds.txns24h || 0) : 0;
  const buyCount = ds ? (ds.buyCount24h || 0) : 0;
  const sellCount = ds ? (ds.sellCount24h || 0) : 0;
  const ageMs = ds && ds.pairCreatedAt ? (Date.now() - Number(ds.pairCreatedAt)) : null;
  const ageDays = ageMs != null ? Math.max(0, Math.floor(ageMs / (1000*60*60*24))) : null;

  // Start with neutral score (50/100)
  let score = 50;
  let riskScore = 0; // Lower is better (0-100, where 0 = no risk, 100 = extreme risk)

  // ========== LIQUIDITY ANALYSIS (Critical for exit ability) ==========
  const liquidityScore = calculateLiquidityScore(liq, marketCap, vol24);
  score += liquidityScore.points;
  riskScore += liquidityScore.risk;
  if (liquidityScore.reason) {
    if (liquidityScore.points > 0) positiveFactors.push(liquidityScore.reason);
    else riskFactors.push(liquidityScore.reason);
  }

  // ========== VOLUME & TRADING ACTIVITY ==========
  const volumeScore = calculateVolumeScore(vol24, marketCap, liq, txns24h);
  score += volumeScore.points;
  riskScore += volumeScore.risk;
  if (volumeScore.reason) {
    if (volumeScore.points > 0) positiveFactors.push(volumeScore.reason);
    else riskFactors.push(volumeScore.reason);
  }

  // ========== MARKET CAP & VALUATION ==========
  const size = Math.max(marketCap, fdv);
  const mcapScore = calculateMarketCapScore(size, fdv, marketCap);
  score += mcapScore.points;
  riskScore += mcapScore.risk;
  if (mcapScore.reason) {
    if (mcapScore.points > 0) positiveFactors.push(mcapScore.reason);
    else riskFactors.push(mcapScore.reason);
  }

  // ========== PRICE MOMENTUM & VOLATILITY ==========
  const momentumScore = calculateMomentumScore(h1, h6, price24);
  score += momentumScore.points;
  riskScore += momentumScore.risk;
  if (momentumScore.reason) {
    if (momentumScore.points > 0) positiveFactors.push(momentumScore.reason);
    else riskFactors.push(momentumScore.reason);
  }

  // ========== BUY/SELL PRESSURE ==========
  const buySellScore = calculateBuySellScore(buyCount, sellCount, txns24h);
  score += buySellScore.points;
  riskScore += buySellScore.risk;
  if (buySellScore.reason) {
    if (buySellScore.points > 0) positiveFactors.push(buySellScore.reason);
    else riskFactors.push(buySellScore.reason);
  }

  // ========== PAIR AGE & ESTABLISHMENT ==========
  const ageScore = calculateAgeScore(ageDays, price24, h1);
  score += ageScore.points;
  riskScore += ageScore.risk;
  if (ageScore.reason) {
    if (ageScore.points > 0) positiveFactors.push(ageScore.reason);
    else riskFactors.push(ageScore.reason);
  }

  // ========== COMMUNITY RATING (if available) ==========
  if (avgRating > 0) {
    const ratingPoints = (avgRating / 5) * 10; // Max 10 points
    score += ratingPoints;
    if (avgRating >= 4) positiveFactors.push(`Strong community rating (${avgRating.toFixed(1)}/5)`);
    else if (avgRating < 2.5) riskFactors.push(`Low community rating (${avgRating.toFixed(1)}/5)`);
  }

  // ========== VOLUME/LIQUIDITY RATIO (Critical risk indicator) ==========
  const volLiqRatio = liq > 0 ? vol24 / liq : 0;
  if (volLiqRatio > 5) {
    riskScore += 15;
    riskFactors.push('Very high volume/liquidity ratio (potential rug risk)');
  } else if (volLiqRatio > 2) {
    riskScore += 8;
    riskFactors.push('High volume/liquidity ratio');
  } else if (volLiqRatio < 0.1 && vol24 > 0) {
    score += 5;
    positiveFactors.push('Healthy volume/liquidity ratio');
  }

  // ========== FINAL SCORE CALCULATION ==========
  score = Math.max(0, Math.min(100, Math.round(score)));
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  // Determine verdict based on score and risk
  let verdict;
  let recommendation;
  let confidence;

  if (riskScore >= 70) {
    // Extreme risk - always avoid
    verdict = { text: 'AVOID - Extreme Risk', class: 'danger' };
    recommendation = 'DO NOT INVEST';
    confidence = 'High';
    reasons.push(...riskFactors.slice(0, 3));
  } else if (score >= 75 && riskScore < 30) {
    // Strong buy signal
    verdict = { text: 'STRONG BUY', class: 'good' };
    recommendation = 'Favorable investment opportunity';
    confidence = 'Medium-High';
    reasons.push(...positiveFactors.slice(0, 4));
  } else if (score >= 60 && riskScore < 40) {
    // Buy signal
    verdict = { text: 'BUY', class: 'good' };
    recommendation = 'Consider investing';
    confidence = 'Medium';
    reasons.push(...positiveFactors.slice(0, 3));
    if (riskFactors.length > 0) reasons.push(`⚠️ ${riskFactors[0]}`);
  } else if (score >= 45 && riskScore < 50) {
    // Caution
    verdict = { text: 'CAUTION', class: 'caution' };
    recommendation = 'Research thoroughly before investing';
    confidence = 'Low-Medium';
    reasons.push(...positiveFactors.slice(0, 2));
    reasons.push(...riskFactors.slice(0, 2));
  } else if (score >= 30) {
    // High risk
    verdict = { text: 'HIGH RISK', class: 'warning' };
    recommendation = 'Not recommended - high risk';
    confidence = 'Medium';
    reasons.push(...riskFactors.slice(0, 3));
    if (positiveFactors.length > 0) reasons.push(positiveFactors[0]);
  } else {
    // Very high risk
    verdict = { text: 'AVOID', class: 'danger' };
    recommendation = 'DO NOT INVEST - Multiple red flags';
    confidence = 'High';
    reasons.push(...riskFactors.slice(0, 4));
  }

  return {
    verdict: { 
      text: `${verdict.text} (${score}/100)`, 
      class: verdict.class,
      recommendation: recommendation
    },
    reasons: reasons.length > 0 ? reasons : ['Insufficient data for analysis'],
    confidence: confidence,
    riskScore: riskScore,
    score: score
  };
}

// Helper functions for scoring components

function calculateLiquidityScore(liq, marketCap, vol24) {
  let points = 0;
  let risk = 0;
  let reason = null;

  // Absolute liquidity thresholds
  if (liq >= 1_000_000) {
    points += 25;
    reason = 'Excellent liquidity ($1M+)';
  } else if (liq >= 500_000) {
    points += 20;
    reason = 'Strong liquidity ($500K+)';
  } else if (liq >= 200_000) {
    points += 12;
    reason = 'Good liquidity ($200K+)';
  } else if (liq >= 100_000) {
    points += 6;
    reason = 'Moderate liquidity ($100K+)';
  } else if (liq >= 50_000) {
    points -= 5;
    risk += 10;
    reason = 'Low liquidity - exit risk';
  } else if (liq > 0) {
    points -= 15;
    risk += 25;
    reason = 'Very low liquidity - high exit risk';
  } else {
    points -= 30;
    risk += 40;
    reason = 'No liquidity data - extreme risk';
  }

  // Liquidity relative to market cap (should be at least 5-10%)
  if (marketCap > 0 && liq > 0) {
    const liqRatio = (liq / marketCap) * 100;
    if (liqRatio >= 10) {
      points += 5;
    } else if (liqRatio < 2) {
      risk += 15;
      if (!reason) reason = 'Liquidity too low relative to market cap';
    }
  }

  return { points, risk, reason };
}

function calculateVolumeScore(vol24, marketCap, liq, txns24h) {
  let points = 0;
  let risk = 0;
  let reason = null;

  // Absolute volume
  if (vol24 >= 2_000_000) {
    points += 18;
    reason = 'Very high trading volume';
  } else if (vol24 >= 1_000_000) {
    points += 14;
    reason = 'High trading volume';
  } else if (vol24 >= 250_000) {
    points += 8;
    reason = 'Moderate trading volume';
  } else if (vol24 >= 50_000) {
    points += 3;
  } else if (vol24 > 0 && vol24 < 10_000) {
    points -= 10;
    risk += 15;
    reason = 'Very low trading volume';
  } else if (vol24 === 0) {
    points -= 20;
    risk += 25;
    reason = 'No trading volume - dead token';
  }

  // Transaction count (indicates real trading vs wash trading)
  if (txns24h > 0) {
    const avgTxSize = vol24 / txns24h;
    if (txns24h >= 1000 && avgTxSize < 5000) {
      points += 5;
      reason = reason || 'Healthy transaction distribution';
    } else if (txns24h < 50 && vol24 > 100_000) {
      risk += 10;
      reason = reason || 'Suspicious: high volume, few transactions';
    }
  }

  return { points, risk, reason };
}

function calculateMarketCapScore(size, fdv, marketCap) {
  let points = 0;
  let risk = 0;
  let reason = null;

  // Market cap size
  if (size >= 100_000_000) {
    points += 12;
    reason = 'Large cap - more established';
  } else if (size >= 10_000_000) {
    points += 8;
    reason = 'Mid cap';
  } else if (size >= 3_000_000) {
    points += 4;
  } else if (size >= 1_000_000) {
    points += 1;
  } else if (size > 0) {
    points -= 5;
    risk += 10;
    reason = 'Micro cap - high volatility risk';
  } else {
    risk += 15;
    reason = 'No market cap data';
  }

  // FDV vs Market Cap (high FDV relative to MC = low circulating supply = potential dump risk)
  if (marketCap > 0 && fdv > 0) {
    const fdvRatio = fdv / marketCap;
    if (fdvRatio > 10) {
      risk += 12;
      reason = reason || 'Very high FDV/MC ratio - unlock risk';
    } else if (fdvRatio > 5) {
      risk += 6;
    }
  }

  return { points, risk, reason };
}

function calculateMomentumScore(h1, h6, price24) {
  let points = 0;
  let risk = 0;
  let reason = null;

  // 24h momentum (most important)
  if (price24 != null) {
    if (price24 >= 0 && price24 <= 15) {
      points += 12;
      reason = 'Healthy 24h price trend';
    } else if (price24 > 15 && price24 <= 30) {
      points += 6;
      reason = 'Strong 24h gains';
    } else if (price24 > 30 && price24 <= 50) {
      points += 2;
      risk += 8;
      reason = 'Very high 24h gains - potential pump';
    } else if (price24 > 50) {
      points -= 10;
      risk += 20;
      reason = 'Extreme pump - likely unsustainable';
    } else if (price24 < 0 && price24 >= -10) {
      points -= 3;
      risk += 5;
    } else if (price24 < -10 && price24 >= -25) {
      points -= 8;
      risk += 12;
      reason = 'Significant 24h decline';
    } else if (price24 < -25) {
      points -= 15;
      risk += 25;
      reason = 'Severe 24h crash';
    }
  }

  // 1h momentum (short-term trend)
  if (h1 != null) {
    if (h1 > 20) {
      risk += 8;
      reason = reason || 'Extreme 1h pump';
    } else if (h1 < -20) {
      risk += 10;
      reason = reason || 'Sharp 1h decline';
    } else if (h1 >= 0 && h1 <= 10) {
      points += 3;
    }
  }

  // 6h momentum (medium-term trend)
  if (h6 != null) {
    if (h6 > 30) {
      risk += 5;
    } else if (h6 < -30) {
      risk += 8;
    }
  }

  // Volatility check (large swings = risk)
  if (h1 != null && price24 != null) {
    const volatility = Math.abs(h1 - price24);
    if (volatility > 30) {
      risk += 10;
      reason = reason || 'High price volatility';
    }
  }

  return { points, risk, reason };
}

function calculateBuySellScore(buyCount, sellCount, txns24h) {
  let points = 0;
  let risk = 0;
  let reason = null;

  if (buyCount > 0 && sellCount > 0) {
    const buyRatio = buyCount / (buyCount + sellCount);
    
    if (buyRatio >= 0.6) {
      points += 5;
      reason = 'Buy pressure exceeds sells';
    } else if (buyRatio <= 0.3) {
      points -= 8;
      risk += 10;
      reason = 'Heavy sell pressure';
    }
  } else if (txns24h > 0 && (buyCount === 0 || sellCount === 0)) {
    risk += 5;
    reason = 'Unbalanced buy/sell activity';
  }

  return { points, risk, reason };
}

function calculateAgeScore(ageDays, price24, h1) {
  let points = 0;
  let risk = 0;
  let reason = null;

  if (ageDays != null) {
    if (ageDays >= 180) {
      points += 12;
      reason = 'Well-established pair (6+ months)';
    } else if (ageDays >= 90) {
      points += 8;
      reason = 'Established pair (3+ months)';
    } else if (ageDays >= 30) {
      points += 5;
      reason = 'Mature pair (1+ month)';
    } else if (ageDays >= 7) {
      points += 2;
    } else if (ageDays >= 2) {
      points -= 3;
      risk += 5;
    } else if (ageDays < 2) {
      points -= 10;
      risk += 15;
      reason = 'Very new pair - high risk';
      
      // New pair + extreme pump = major red flag
      if (price24 != null && price24 > 25) {
        risk += 20;
        reason = 'NEW + PUMP - Likely scam/rug';
      } else if (h1 != null && h1 > 30) {
        risk += 15;
        reason = 'NEW + Extreme pump - high risk';
      }
    }
  } else {
    risk += 5;
    reason = 'Unknown pair age';
  }

  return { points, risk, reason };
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
    dbg('DexScreener fallback failed:', e);
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
  dbg('🌊 AquaSwap extension closing');
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

