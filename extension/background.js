// AquaSwap Extension - Background Service Worker
console.log('🌊 AquaSwap background service worker started');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default preferences
    chrome.storage.local.set({
      version: '1.4.1',
      installedAt: Date.now(),
      openCount: 0
    }).then(() => {
      console.log('Preferences saved');
      
      // Open welcome page
      chrome.tabs.create({
        url: 'https://aquads.xyz/swap?extension=installed'
      });
    }).catch(err => {
      console.error('Error saving preferences:', err);
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.local.get(['openCount', 'lastUsed', 'installedAt']).then(result => {
      sendResponse({ success: true, data: result });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'openFullSite') {
    chrome.tabs.create({ url: 'https://aquads.xyz/swap' });
    sendResponse({ success: true });
    return true;
  }
  
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

console.log('✅ AquaSwap background service worker ready');
