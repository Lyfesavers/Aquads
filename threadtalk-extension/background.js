// ThreadTalk - Background Service Worker
// Toolbar icon click forwards to the active tab's content script, which
// owns the panel UI. This avoids needing a popup and keeps the side
// panel pinned in-page where the comments are.

const REDDIT_HOSTS = [
  'www.reddit.com',
  'old.reddit.com',
  'new.reddit.com',
  'sh.reddit.com',
  'reddit.com'
];

function isRedditTab(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return REDDIT_HOSTS.includes(u.hostname);
  } catch (e) {
    return false;
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local
      .set({
        version: '0.1.0',
        installedAt: Date.now()
      })
      .catch(() => {});
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;

  if (!isRedditTab(tab.url)) {
    // Not on Reddit: open Reddit so the user has a thread to analyze.
    chrome.tabs.create({ url: 'https://www.reddit.com/' });
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'THREADTALK_TOGGLE_PANEL' });
  } catch (e) {
    // Content script may not be loaded yet (e.g. fresh install). Inject and retry once.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['config.js', 'content-script.js']
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'THREADTALK_TOGGLE_PANEL' });
    } catch (err) {
      console.error('[ThreadTalk] Failed to open panel:', err);
    }
  }
});
