// AquaSwap Extension - Background Service Worker
console.log('🌊 AquaSwap background service worker started');

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('First time installation');
    
    // Set default preferences
    chrome.storage.local.set({
      version: '1.0.0',
      installedAt: Date.now(),
      openCount: 0,
      theme: 'dark'
    });
    
    // Open welcome page (optional)
    chrome.tabs.create({
      url: 'https://aquads.xyz/swap?extension=installed'
    });
  } else if (details.reason === 'update') {
    // Extension updated
    const previousVersion = details.previousVersion;
    console.log(`Updated from version ${previousVersion} to 1.0.0`);
    
    // Could show update notes
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, extension active');
});

/**
 * Handle messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'getStats') {
    // Return usage statistics
    chrome.storage.local.get(['openCount', 'lastUsed', 'installedAt'], (result) => {
      sendResponse({
        success: true,
        data: result
      });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'openFullSite') {
    // Open full Aquads website
    chrome.tabs.create({
      url: 'https://aquads.xyz/swap'
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'trackSwap') {
    // Track when a swap is completed
    console.log('Swap tracked:', request.data);
    
    chrome.storage.local.get(['swapCount'], (result) => {
      const swapCount = (result.swapCount || 0) + 1;
      chrome.storage.local.set({ swapCount, lastSwap: Date.now() });
      
      // Update badge to show swap count
      updateBadge(swapCount);
    });
    
    sendResponse({ success: true });
    return true;
  }
});

/**
 * Update extension badge
 */
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  }
}

/**
 * Handle browser action click (when extension icon is clicked)
 */
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
  // Popup will open automatically, but we can track the click
  
  chrome.storage.local.get(['clickCount'], (result) => {
    const clickCount = (result.clickCount || 0) + 1;
    chrome.storage.local.set({ clickCount, lastClick: Date.now() });
  });
});

/**
 * Context menu integration (right-click menus)
 */
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item
  chrome.contextMenus.create({
    id: 'aquaswap-open',
    title: 'Swap with AquaSwap',
    contexts: ['selection', 'page'],
    documentUrlPatterns: ['https://*/*', 'http://*/*']
  });
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'aquaswap-open') {
    console.log('Context menu clicked:', info);
    
    // Could detect if selection is a token address and pre-fill
    const selectedText = info.selectionText;
    
    if (selectedText && selectedText.startsWith('0x') && selectedText.length === 42) {
      // Looks like an Ethereum address
      console.log('Detected potential token address:', selectedText);
      
      // Open popup with pre-filled address (would need popup communication)
      chrome.action.openPopup();
    } else {
      // Just open the swap interface
      chrome.action.openPopup();
    }
  }
});

/**
 * Monitor for updates and notify users
 */
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log('Update available:', details);
  
  // Could show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'AquaSwap Update Available',
    message: 'A new version of AquaSwap is ready to install.',
    priority: 1
  });
});

/**
 * Clean up old data periodically
 */
chrome.alarms.create('cleanup', { periodInMinutes: 1440 }); // Once per day

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    console.log('Running daily cleanup...');
    // Could clean up old cached data if needed
  }
});

/**
 * Error handling
 */
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('🌊 AquaSwap background service worker ready');

