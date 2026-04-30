// ThreadTalk - Content Script
// Runs on Reddit pages. Responsible for:
//   1. Showing a small floating launcher button on thread pages.
//   2. Injecting / toggling the side panel iframe.
//   3. Scraping visible comment text from the page on demand.
//   4. Bridging messages between the panel iframe and the page.

(function () {
  'use strict';

  if (window.__THREADTALK_LOADED__) return;
  window.__THREADTALK_LOADED__ = true;

  const PANEL_ID = 'threadtalk-panel-root';
  const LAUNCHER_ID = 'threadtalk-launcher';

  // ---------- Page detection ----------

  function isThreadPage() {
    // Reddit thread URLs look like /r/<sub>/comments/<id>/<slug>/...
    return /\/r\/[^/]+\/comments\//.test(location.pathname);
  }

  function getSubreddit() {
    const m = location.pathname.match(/\/r\/([^/]+)/);
    return m ? m[1] : '';
  }

  function getSortOrder() {
    // Try ?sort= query param first.
    try {
      const params = new URLSearchParams(location.search);
      const s = params.get('sort');
      if (s) return s;
    } catch (e) {}

    // shreddit-comment-tree exposes sort via attribute on new Reddit.
    const tree = document.querySelector('shreddit-comment-tree');
    if (tree) {
      const attr = tree.getAttribute('sort') || tree.getAttribute('comments-sort');
      if (attr) return attr;
    }

    // Old Reddit has a sort dropdown with .selected option.
    const oldSel = document.querySelector('.commentarea .menuarea .dropdown.lightdrop .selected');
    if (oldSel) return (oldSel.textContent || '').trim().toLowerCase();

    return 'unknown';
  }

  function getPostTitle() {
    // shreddit-post (newer Reddit Web UI)
    const shredditPost = document.querySelector('shreddit-post');
    if (shredditPost) {
      const attr = shredditPost.getAttribute('post-title');
      if (attr) return attr.trim();
      const h1 = shredditPost.querySelector('h1');
      if (h1 && h1.textContent) return h1.textContent.trim();
    }

    // Old Reddit
    const oldTitle = document.querySelector('#siteTable .thing.link a.title');
    if (oldTitle && oldTitle.textContent) return oldTitle.textContent.trim();

    // Generic fallback
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent) return h1.textContent.trim();

    return document.title || '';
  }

  // ---------- Comment extraction ----------

  function cleanText(s) {
    if (!s) return '';
    return s
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tryExtractFromShreddit() {
    const out = [];
    const nodes = document.querySelectorAll('shreddit-comment');
    nodes.forEach(el => {
      // Try the rich text body first; fall back to slot=comment text.
      let bodyText = '';
      const rt = el.querySelector('div[id$="-post-rtjson-content"]');
      if (rt) {
        bodyText = rt.innerText || rt.textContent || '';
      } else {
        const slot = el.querySelector('[slot="comment"]');
        if (slot) bodyText = slot.innerText || slot.textContent || '';
      }
      bodyText = cleanText(bodyText);
      if (bodyText && bodyText.length >= 3) out.push(bodyText);
    });
    return out;
  }

  function tryExtractFromOldReddit() {
    const out = [];
    document.querySelectorAll('.commentarea .comment').forEach(c => {
      // Skip deleted/removed
      if (c.classList.contains('deleted')) return;
      const md = c.querySelector('.entry .usertext-body .md');
      if (!md) return;
      const txt = cleanText(md.innerText || md.textContent || '');
      if (txt && txt.length >= 3) out.push(txt);
    });
    return out;
  }

  function tryExtractFromTestId() {
    // Older "new Reddit" before shreddit used data-testid="comment".
    const out = [];
    document.querySelectorAll('[data-testid="comment"]').forEach(el => {
      const txt = cleanText(el.innerText || el.textContent || '');
      if (txt && txt.length >= 3) out.push(txt);
    });
    return out;
  }

  function extractComments() {
    let comments = tryExtractFromShreddit();
    if (comments.length === 0) comments = tryExtractFromOldReddit();
    if (comments.length === 0) comments = tryExtractFromTestId();

    // De-duplicate while preserving order. Long threads can render the same
    // comment via multiple wrappers (e.g. shreddit + legacy fallback).
    const seen = new Set();
    const unique = [];
    for (const c of comments) {
      const key = c.slice(0, 200);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }
    return unique;
  }

  function buildScrapePayload() {
    const comments = extractComments();
    return {
      postTitle: getPostTitle(),
      postUrl: location.href,
      subreddit: getSubreddit(),
      sortOrder: getSortOrder(),
      isThreadPage: isThreadPage(),
      commentCount: comments.length,
      comments
    };
  }

  // ---------- Launcher button ----------

  function ensureLauncher() {
    if (!isThreadPage()) {
      const existing = document.getElementById(LAUNCHER_ID);
      if (existing) existing.remove();
      return;
    }
    if (document.getElementById(LAUNCHER_ID)) return;

    const btn = document.createElement('button');
    btn.id = LAUNCHER_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open ThreadTalk');
    btn.title = 'ThreadTalk – Summarize this thread';
    btn.innerHTML = `
      <span class="tt-launcher-dot"></span>
      <span class="tt-launcher-label">ThreadTalk</span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });
    document.documentElement.appendChild(btn);
  }

  // ---------- Panel injection ----------

  function injectPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const wrap = document.createElement('div');
    wrap.id = PANEL_ID;
    wrap.className = 'tt-panel-root tt-panel-open';

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('panel/panel.html');
    iframe.title = 'ThreadTalk panel';
    iframe.allow = '';
    iframe.setAttribute('aria-label', 'ThreadTalk side panel');

    wrap.appendChild(iframe);
    document.documentElement.appendChild(wrap);
  }

  function togglePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
      return;
    }
    injectPanel();
  }

  // ---------- Messaging bridge ----------

  function getPanelIframeWindow() {
    const root = document.getElementById(PANEL_ID);
    if (!root) return null;
    const ifr = root.querySelector('iframe');
    return ifr ? ifr.contentWindow : null;
  }

  function postToPanel(message) {
    const w = getPanelIframeWindow();
    if (w) {
      w.postMessage(message, '*');
    }
  }

  // From the panel iframe (postMessage on window).
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'threadtalk-panel') return;

    if (data.type === 'PANEL_READY') {
      // Send initial page snapshot so the panel can show context immediately.
      const snapshot = buildScrapePayload();
      postToPanel({ source: 'threadtalk-content', type: 'PAGE_SNAPSHOT', payload: snapshot });
      return;
    }

    if (data.type === 'REQUEST_SCRAPE') {
      const snapshot = buildScrapePayload();
      postToPanel({
        source: 'threadtalk-content',
        type: 'SCRAPE_RESULT',
        requestId: data.requestId,
        payload: snapshot
      });
      return;
    }

    if (data.type === 'CLOSE_PANEL') {
      const root = document.getElementById(PANEL_ID);
      if (root) root.remove();
      return;
    }
  });

  // From the background service worker (toolbar icon click).
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || !message.type) return;
    if (message.type === 'THREADTALK_TOGGLE_PANEL') {
      togglePanel();
    }
  });

  // ---------- Boot ----------

  ensureLauncher();

  // Reddit is a SPA on new.* / sh.* / www.* — re-check the launcher when
  // navigation happens without a full page reload.
  let lastPath = location.pathname;
  const navObserver = new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      ensureLauncher();
    }
  });
  navObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('popstate', ensureLauncher);
})();
