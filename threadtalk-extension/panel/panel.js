// ThreadTalk - Side panel logic.
// Runs inside the extension iframe. Talks to the host page via
// window.parent.postMessage (the content script owns the bridge).
// Talks to the Aquads backend via fetch.

(function () {
  'use strict';

  // API origin is injected by ./panel-config.js (loaded inline below).
  // We can't rely on the host page's window.THREADTALK_API_ORIGIN, so the
  // panel reads it from a small inline constant set on this iframe page.
  const API_ORIGIN = 'https://aquads-production.up.railway.app';
  const API_URL = API_ORIGIN + '/api/threadtalk/analyze';

  const els = {
    pillSub: document.getElementById('tt-pill-sub'),
    pillSort: document.getElementById('tt-pill-sort'),
    pillCount: document.getElementById('tt-pill-count'),
    contextTitle: document.getElementById('tt-context-title'),
    analyzeBtn: document.getElementById('tt-analyze'),
    analyzeLabel: document.getElementById('tt-analyze-label'),
    closeBtn: document.getElementById('tt-close'),
    results: document.getElementById('tt-results')
  };

  let lastSnapshot = null;
  let scrapeWaiters = new Map();
  let nextRequestId = 1;
  let hasAutoRun = false;

  function postToHost(message) {
    window.parent.postMessage(
      Object.assign({ source: 'threadtalk-panel' }, message),
      '*'
    );
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeStr(v) {
    return typeof v === 'string' ? v : '';
  }

  function setContext(snapshot) {
    if (!snapshot) return;
    lastSnapshot = snapshot;

    if (snapshot.subreddit) {
      els.pillSub.textContent = 'r/' + snapshot.subreddit;
    } else {
      els.pillSub.textContent = 'r/—';
    }

    els.pillSort.textContent = 'sort: ' + (snapshot.sortOrder || 'unknown');
    els.pillCount.textContent = (snapshot.commentCount || 0) + ' visible';

    if (snapshot.isThreadPage) {
      els.contextTitle.textContent =
        snapshot.postTitle || 'Reddit thread';
      els.analyzeBtn.disabled = false;
    } else {
      els.contextTitle.textContent =
        'Open a Reddit thread (a post with comments) to use ThreadTalk.';
      els.analyzeBtn.disabled = true;
    }
  }

  function requestScrape() {
    return new Promise((resolve) => {
      const id = nextRequestId++;
      scrapeWaiters.set(id, resolve);
      postToHost({ type: 'REQUEST_SCRAPE', requestId: id });
      // Safety timeout — if the host doesn't respond within 4s, give up.
      setTimeout(() => {
        if (scrapeWaiters.has(id)) {
          scrapeWaiters.delete(id);
          resolve(null);
        }
      }, 4000);
    });
  }

  function showLoading(text) {
    els.results.innerHTML =
      '<div class="tt-loading">' +
      '<div class="tt-spinner" aria-hidden="true"></div>' +
      '<div>' + escapeHtml(text || 'Analyzing visible comments…') + '</div>' +
      '</div>';
  }

  function showError(title, detail) {
    els.results.innerHTML =
      '<div class="tt-error">' +
      '<strong>' + escapeHtml(title) + '</strong>' +
      escapeHtml(detail || '') +
      '</div>';
  }

  function toneClass(tone) {
    switch (tone) {
      case 'positive': return 'tt-tone-positive';
      case 'negative': return 'tt-tone-negative';
      case 'mixed':    return 'tt-tone-mixed';
      default:         return 'tt-tone-neutral';
    }
  }

  function sentimentDotClass(s) {
    switch (s) {
      case 'positive': return 'tt-sd-positive';
      case 'negative': return 'tt-sd-negative';
      case 'mixed':    return 'tt-sd-mixed';
      default:         return 'tt-sd-neutral';
    }
  }

  function cleanBullets(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(function (s) { return typeof s === 'string'; })
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; })
      .slice(0, 8);
  }

  function renderBulletSection(variant, title, items) {
    if (!items || items.length === 0) return '';
    const labelMap = { pros: '+', cons: '\u2212', watch: '!' };
    const icon = labelMap[variant] || '\u2022';
    let h = '';
    h += '<div class="tt-bullets tt-bullets-' + variant + '">';
    h += '<div class="tt-bullets-head">';
    h += '<span class="tt-bullets-icon">' + escapeHtml(icon) + '</span>';
    h += '<span class="tt-bullets-title">' + escapeHtml(title) + '</span>';
    h += '<span class="tt-bullets-count">' + items.length + '</span>';
    h += '</div>';
    h += '<ul class="tt-bullets-list">';
    items.forEach(function (item) {
      h += '<li>' + escapeHtml(item) + '</li>';
    });
    h += '</ul>';
    h += '</div>';
    return h;
  }

  function renderAnalysis(analysis, meta) {
    if (!analysis || typeof analysis !== 'object') {
      showError('Could not parse analysis', 'The server returned an unexpected response.');
      return;
    }

    const tone = safeStr(analysis.tone) || 'neutral';
    const conf = safeStr(analysis.confidence) || 'medium';
    // Accept legacy `headline` as a fallback for older server responses.
    const verdict = safeStr(analysis.verdict) || safeStr(analysis.headline) || 'Thread summarized';
    const coverage = safeStr(analysis.coverage_note) ||
      (meta && meta.analyzedCount
        ? 'Based on ' + meta.analyzedCount + ' visible comment' + (meta.analyzedCount === 1 ? '' : 's') + '.'
        : '');
    const pros = cleanBullets(analysis.pros);
    const cons = cleanBullets(analysis.cons);
    const watchOuts = cleanBullets(analysis.watch_outs || analysis.watchOuts);
    const summary = safeStr(analysis.summary);
    const themes = Array.isArray(analysis.themes) ? analysis.themes : [];
    const caveats = Array.isArray(analysis.caveats) ? analysis.caveats : [];

    let html = '';

    html += '<div class="tt-verdict">';
    html += '<div class="tt-verdict-row">';
    html += '<span class="tt-tone-chip ' + toneClass(tone) + '">' + escapeHtml(tone) + '</span>';
    html += '<span class="tt-conf-chip">confidence: ' + escapeHtml(conf) + '</span>';
    html += '</div>';
    html += '<p class="tt-verdict-text">' + escapeHtml(verdict) + '</p>';
    if (coverage) {
      html += '<p class="tt-coverage-note">' + escapeHtml(coverage) + '</p>';
    }
    html += '</div>';

    html += renderBulletSection('pros', 'Pros', pros);
    html += renderBulletSection('cons', 'Cons', cons);
    html += renderBulletSection('watch', 'Watch-outs', watchOuts);

    if (summary) {
      html += '<div class="tt-summary">';
      html += '<h4>Summary</h4>';
      html += '<p>' + escapeHtml(summary) + '</p>';
      html += '</div>';
    }

    if (themes.length > 0) {
      html += '<div class="tt-themes">';
      html += '<h4>Themes</h4>';
      themes.forEach(function (t) {
        if (!t || typeof t !== 'object') return;
        const label = safeStr(t.label) || 'Theme';
        const share = safeStr(t.share);
        const sent  = safeStr(t.sentiment) || 'neutral';
        const desc  = safeStr(t.description);
        const quotes = Array.isArray(t.quotes) ? t.quotes.filter(function (q) { return typeof q === 'string' && q.length > 0; }) : [];

        html += '<div class="tt-theme-card">';
        html += '<div class="tt-theme-head">';
        html += '<div class="tt-theme-label">';
        html += '<span class="tt-sentiment-dot ' + sentimentDotClass(sent) + '" aria-hidden="true"></span>';
        html += escapeHtml(label);
        html += '</div>';
        if (share) {
          html += '<div class="tt-theme-share">' + escapeHtml(share) + '</div>';
        }
        html += '</div>';
        if (desc) {
          html += '<div class="tt-theme-desc">' + escapeHtml(desc) + '</div>';
        }
        if (quotes.length > 0) {
          html += '<ul class="tt-quotes">';
          quotes.slice(0, 3).forEach(function (q) {
            html += '<li class="tt-quote">' + escapeHtml(q) + '</li>';
          });
          html += '</ul>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    if (caveats.length > 0) {
      html += '<div class="tt-caveats">';
      html += '<h4>Worth knowing</h4>';
      html += '<ul>';
      caveats.forEach(function (c) {
        if (typeof c === 'string' && c.trim()) {
          html += '<li>' + escapeHtml(c) + '</li>';
        }
      });
      html += '</ul>';
      html += '</div>';
    }

    els.results.innerHTML = html;
  }

  async function analyze() {
    if (els.analyzeBtn.disabled) return;
    els.analyzeBtn.disabled = true;
    els.analyzeLabel.textContent = 'Analyzing…';
    showLoading('Reading visible comments…');

    let snapshot = await requestScrape();
    if (!snapshot) snapshot = lastSnapshot;

    if (!snapshot || !snapshot.isThreadPage) {
      showError(
        'Not a Reddit thread',
        'Open a Reddit post that has a comments section, then try again.'
      );
      resetButton();
      return;
    }

    const comments = Array.isArray(snapshot.comments) ? snapshot.comments : [];

    if (comments.length === 0) {
      showError(
        'No comments visible',
        'Scroll down or click "View more comments" on the page, then re-run ThreadTalk.'
      );
      resetButton();
      return;
    }

    showLoading('Crunching ' + comments.length + ' comment' + (comments.length === 1 ? '' : 's') + ' for sentiment & themes…');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postTitle: snapshot.postTitle || '',
          postUrl: snapshot.postUrl || '',
          subreddit: snapshot.subreddit || '',
          sortOrder: snapshot.sortOrder || 'unknown',
          comments: comments
        })
      });

      let data = null;
      try { data = await res.json(); } catch (e) {}

      if (!res.ok) {
        const msg = (data && data.error) ? data.error : ('Request failed (' + res.status + ').');
        showError('ThreadTalk could not analyze this thread', msg);
        resetButton();
        return;
      }

      renderAnalysis(data && data.analysis, data && data.meta);
    } catch (err) {
      showError(
        'Network error',
        'Could not reach the ThreadTalk server. Check your connection and try again.'
      );
    } finally {
      resetButton();
    }
  }

  function resetButton() {
    els.analyzeBtn.disabled = !(lastSnapshot && lastSnapshot.isThreadPage);
    els.analyzeLabel.textContent = 'Re-analyze visible comments';
  }

  // Wire up UI
  els.analyzeBtn.addEventListener('click', analyze);
  els.closeBtn.addEventListener('click', function () {
    postToHost({ type: 'CLOSE_PANEL' });
  });

  // Listen for messages from the content script.
  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || data.source !== 'threadtalk-content') return;

    if (data.type === 'PAGE_SNAPSHOT') {
      setContext(data.payload);
      // Auto-run analysis the first time we see a valid thread page.
      // The user controls coverage by expanding more comments and clicking
      // "Re-analyze" afterward — only the very first open is automatic.
      if (
        !hasAutoRun &&
        data.payload &&
        data.payload.isThreadPage &&
        Array.isArray(data.payload.comments) &&
        data.payload.comments.length > 0
      ) {
        hasAutoRun = true;
        analyze();
      }
      return;
    }

    if (data.type === 'SCRAPE_RESULT') {
      const id = data.requestId;
      const waiter = scrapeWaiters.get(id);
      if (waiter) {
        scrapeWaiters.delete(id);
        if (data.payload) setContext(data.payload);
        waiter(data.payload || null);
      }
      return;
    }
  });

  // Tell host we're ready and request the initial snapshot.
  postToHost({ type: 'PANEL_READY' });
})();
