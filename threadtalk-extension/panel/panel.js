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
    shareBtn: document.getElementById('tt-share-btn'),
    closeBtn: document.getElementById('tt-close'),
    results: document.getElementById('tt-results')
  };

  let lastSnapshot = null;
  let scrapeWaiters = new Map();
  let nextRequestId = 1;
  let hasAutoRun = false;
  let lastAnalysis = null;
  let lastMeta = null;
  let toastTimer = null;

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

  // ---------- Toast ----------

  function showToast(text, kind) {
    let toast = document.getElementById('tt-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tt-toast';
      toast.className = 'tt-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.remove('is-error', 'is-success');
    if (kind === 'error') toast.classList.add('is-error');
    if (kind === 'success') toast.classList.add('is-success');
    requestAnimationFrame(function () {
      toast.classList.add('is-show');
    });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-show');
    }, 2400);
  }

  // ---------- Share card (canvas) ----------

  function pickRepresentativeQuotes(analysis, max) {
    const out = [];
    const themes = Array.isArray(analysis && analysis.themes) ? analysis.themes : [];
    for (let i = 0; i < themes.length && out.length < max; i++) {
      const qs = Array.isArray(themes[i].quotes) ? themes[i].quotes : [];
      for (let j = 0; j < qs.length; j++) {
        const q = typeof qs[j] === 'string' ? qs[j].trim() : '';
        if (q.length >= 8 && q.length <= 240) {
          out.push(q);
          break;
        }
      }
    }
    return out;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function clampLines(lines, max) {
    if (lines.length <= max) return lines;
    const clipped = lines.slice(0, max);
    const last = clipped[max - 1];
    clipped[max - 1] = last.replace(/\s+\S+$/, '') + '…';
    return clipped;
  }

  async function generateShareCardBlob() {
    const analysis = lastAnalysis;
    const snapshot = lastSnapshot;
    if (!analysis) return null;

    // ===== Landscape 1920×1080, 2-column body =====
    const W = 1920;
    const H = 1080;
    const M = 80;             // outer margin
    const GAP = 40;           // gap between left/right body columns
    const innerW = W - M * 2;
    const colW = (innerW - GAP) / 2;  // 880
    const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');

    // ---- Background ----
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1226');
    bg.addColorStop(1, '#10172e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow1 = ctx.createRadialGradient(W * 0.92, H * 0.1, 0, W * 0.92, H * 0.1, 800);
    glow1.addColorStop(0, 'rgba(124, 58, 237, 0.30)');
    glow1.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W * 0.05, H * 0.95, 0, W * 0.05, H * 0.95, 760);
    glow2.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
    glow2.addColorStop(1, 'rgba(14, 165, 233, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // ---- Helpers ----

    function wrapInto(text, font, maxW, maxLines) {
      ctx.font = font;
      let lines = wrapText(ctx, text || '', maxW);
      return clampLines(lines, maxLines);
    }

    function drawCard(x, yTop, w, h, accent) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRectPath(ctx, x, yTop, w, h, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, x, yTop, w, h, 22);
      ctx.stroke();
      if (accent) {
        ctx.fillStyle = accent;
        roundRectPath(ctx, x, yTop, 6, h, 3);
        ctx.fill();
      }
    }

    function drawSectionTitle(text, x, yTop, color) {
      ctx.font = '800 18px ' + fontStack;
      ctx.fillStyle = color || '#94a3b8';
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, yTop);
    }

    function drawBulletDot(cx, cy, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawText(text, x, y, font, color, baseline) {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = baseline || 'top';
      ctx.fillText(text, x, y);
    }

    function ellipsizeOneLine(text, font, maxW) {
      ctx.font = font;
      let s = String(text || '');
      if (ctx.measureText(s).width <= maxW) return s;
      while (s.length > 0 && ctx.measureText(s + '\u2026').width > maxW) {
        s = s.slice(0, -1);
      }
      return s.replace(/[\s,;:.\-]+$/, '') + '\u2026';
    }

    const sentimentColors = {
      positive: '#22c55e',
      negative: '#ef4444',
      mixed:    '#f59e0b',
      neutral:  '#94a3b8'
    };

    // =====================================================
    // HEADER  (logo + brand on left, chips on right)
    // =====================================================
    {
      const hy = 90;

      // Logo bubbles
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(M + 22, hy, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath(); ctx.arc(M + 54, hy + 12, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(M + 38, hy + 36, 11, 0, Math.PI * 2); ctx.fill();

      drawText('ThreadTalk', M + 100, hy - 10, '700 38px ' + fontStack, '#f1f5f9');
      drawText('by Aquads',  M + 100, hy + 28, '500 22px ' + fontStack, '#94a3b8');

      // Tone + confidence chips on the right
      const tone = String(analysis.tone || 'neutral').toLowerCase();
      const conf = String(analysis.confidence || 'medium').toLowerCase();
      const toneColors = {
        positive: { bg: '#22c55e', text: '#052e16' },
        negative: { bg: '#ef4444', text: '#450a0a' },
        mixed:    { bg: '#f59e0b', text: '#451a03' },
        neutral:  { bg: '#94a3b8', text: '#0f172a' }
      };
      const tc = toneColors[tone] || toneColors.neutral;
      const chipY = 78;

      ctx.font = '600 22px ' + fontStack;
      const confLabel = 'confidence: ' + conf;
      const confW = ctx.measureText(confLabel).width + 36;

      ctx.font = '800 24px ' + fontStack;
      const toneLabel = tone.toUpperCase();
      const toneW = ctx.measureText(toneLabel).width + 40;

      const totalChipW = toneW + 12 + confW;
      const chipsRight = W - M;
      const toneX = chipsRight - totalChipW;
      const confX = toneX + toneW + 12;

      ctx.fillStyle = tc.bg;
      roundRectPath(ctx, toneX, chipY, toneW, 50, 25);
      ctx.fill();
      drawText(toneLabel, toneX + 20, chipY + 25, '800 24px ' + fontStack, tc.text, 'middle');

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRectPath(ctx, confX, chipY, confW, 50, 25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      roundRectPath(ctx, confX, chipY, confW, 50, 25);
      ctx.stroke();
      drawText(confLabel, confX + 18, chipY + 25, '600 22px ' + fontStack, '#cbd5e1', 'middle');
    }

    // =====================================================
    // CAPTION (subreddit + post title)
    // =====================================================
    {
      const cy = 178;
      let cx = M;
      const sub = snapshot && snapshot.subreddit ? 'r/' + snapshot.subreddit : '';
      const title = snapshot && snapshot.postTitle ? snapshot.postTitle : '';

      if (sub) {
        drawText(sub, cx, cy, '700 22px ' + fontStack, '#38bdf8');
        ctx.font = '700 22px ' + fontStack;
        cx += ctx.measureText(sub).width + 14;
      }
      if (title) {
        const remaining = (W - M) - cx;
        const truncated = ellipsizeOneLine(title, '500 22px ' + fontStack, remaining);
        drawText('· ' + truncated, cx, cy, '500 22px ' + fontStack, '#cbd5e1');
      }
    }

    // =====================================================
    // VERDICT (full-width prominent card)
    // =====================================================
    {
      const vy = 230;
      const vh = 200;
      drawCard(M, vy, innerW, vh);

      // Highlight gradient overlay
      const vGrad = ctx.createLinearGradient(M, vy, M + innerW, vy + vh);
      vGrad.addColorStop(0, 'rgba(56, 189, 248, 0.10)');
      vGrad.addColorStop(1, 'rgba(124, 58, 237, 0.10)');
      ctx.fillStyle = vGrad;
      roundRectPath(ctx, M, vy, innerW, vh, 22);
      ctx.fill();

      drawSectionTitle('VERDICT', M + 32, vy + 22, '#94a3b8');

      const verdictText = String(analysis.verdict || analysis.headline || 'Thread summarized').trim();
      const vLines = wrapInto(verdictText, '800 56px ' + fontStack, innerW - 64, 2);
      let ly = vy + 64;
      for (let i = 0; i < vLines.length; i++) {
        drawText(vLines[i], M + 32, ly, '800 56px ' + fontStack, '#f8fafc');
        ly += 70;
      }
    }

    // =====================================================
    // BODY — two columns
    // =====================================================
    const BODY_TOP = 460;
    const BODY_BOTTOM = 1010;
    const leftX = M;
    const rightX = M + colW + GAP;

    // ---- LEFT COLUMN: Summary (top) + Themes (bottom) ----
    {
      // Summary card
      const summaryText = String(analysis.summary || '').trim();
      const sCardH = 270;
      drawCard(leftX, BODY_TOP, colW, sCardH);
      drawSectionTitle('SUMMARY', leftX + 32, BODY_TOP + 24, '#94a3b8');
      if (summaryText) {
        const sLines = wrapInto(summaryText, '500 26px ' + fontStack, colW - 64, 6);
        let ly = BODY_TOP + 70;
        for (let i = 0; i < sLines.length; i++) {
          drawText(sLines[i], leftX + 32, ly, '500 26px ' + fontStack, '#e2e8f0');
          ly += 34;
        }
      } else {
        drawText('No summary available.', leftX + 32, BODY_TOP + 70, '500 24px ' + fontStack, '#64748b');
      }

      // Themes block below summary
      const themesY = BODY_TOP + sCardH + 20;
      const themesH = BODY_BOTTOM - themesY;
      const themes = (Array.isArray(analysis.themes) ? analysis.themes : []).slice(0, 2);
      if (themes.length > 0) {
        drawSectionTitle('THEMES', leftX, themesY, '#94a3b8');
        const blockH = (themesH - 32) / themes.length - 12;
        let ty = themesY + 32;
        for (let i = 0; i < themes.length; i++) {
          const t = themes[i] || {};
          const sent = String(t.sentiment || 'neutral').toLowerCase();
          const accent = sentimentColors[sent] || sentimentColors.neutral;
          drawCard(leftX, ty, colW, blockH, accent);

          const label = String(t.label || 'Theme').trim();
          const labelLine = ellipsizeOneLine(label, '700 26px ' + fontStack, colW - 80);
          drawText(labelLine, leftX + 32, ty + 22, '700 26px ' + fontStack, '#f1f5f9');

          const qs = Array.isArray(t.quotes) ? t.quotes : [];
          const firstQuote = (qs.find(function (q) { return typeof q === 'string' && q.trim().length >= 8; }) || '').trim();
          if (firstQuote) {
            const qLines = wrapInto('\u201C' + firstQuote + '\u201D', 'italic 500 22px ' + fontStack, colW - 90, 3);
            let qy = ty + 60;
            // Quote bar
            const barH = qLines.length * 30;
            const barGrad = ctx.createLinearGradient(leftX + 32, qy, leftX + 32, qy + barH);
            barGrad.addColorStop(0, '#38bdf8');
            barGrad.addColorStop(1, '#7c3aed');
            ctx.fillStyle = barGrad;
            roundRectPath(ctx, leftX + 32, qy, 4, barH, 2);
            ctx.fill();
            for (let li = 0; li < qLines.length; li++) {
              drawText(qLines[li], leftX + 50, qy, 'italic 500 22px ' + fontStack, '#e2e8f0');
              qy += 30;
            }
          }
          ty += blockH + 12;
        }
      }
    }

    // ---- RIGHT COLUMN: Pros + Cons + Watch-outs stacked ----
    {
      const palette = {
        pros:  { accent: '#22c55e', title: '#86efac', label: 'PROS' },
        cons:  { accent: '#ef4444', title: '#fca5a5', label: 'CONS' },
        watch: { accent: '#f59e0b', title: '#fcd34d', label: 'WATCH-OUTS' }
      };
      const pros = cleanBullets(analysis.pros).slice(0, 4);
      const cons = cleanBullets(analysis.cons).slice(0, 4);
      const watch = cleanBullets(analysis.watch_outs || analysis.watchOuts).slice(0, 3);

      const blocks = [];
      if (pros.length)  blocks.push({ key: 'pros',  items: pros });
      if (cons.length)  blocks.push({ key: 'cons',  items: cons });
      if (watch.length) blocks.push({ key: 'watch', items: watch });

      if (blocks.length === 0) {
        // If model returned nothing for the 3 bucket types, still render an empty card so
        // the right column isn't blank.
        drawCard(rightX, BODY_TOP, colW, BODY_BOTTOM - BODY_TOP);
        drawSectionTitle('PROS · CONS · WATCH-OUTS', rightX + 32, BODY_TOP + 24, '#94a3b8');
        drawText('No bullet-style takeaways from this thread.', rightX + 32, BODY_TOP + 70, '500 24px ' + fontStack, '#64748b');
      } else {
        const totalGap = 16 * (blocks.length - 1);
        const eachH = (BODY_BOTTOM - BODY_TOP - totalGap) / blocks.length;
        let ry = BODY_TOP;
        for (let bi = 0; bi < blocks.length; bi++) {
          const blk = blocks[bi];
          const p = palette[blk.key];
          drawCard(rightX, ry, colW, eachH, p.accent);
          drawSectionTitle(p.label, rightX + 32, ry + 22, p.title);

          const itemFont = '500 24px ' + fontStack;
          const innerListW = colW - 100;
          let ly = ry + 64;
          for (let ii = 0; ii < blk.items.length; ii++) {
            const lines = wrapInto(blk.items[ii], itemFont, innerListW, 2);
            drawBulletDot(rightX + 44, ly + 16, p.accent);
            for (let li = 0; li < lines.length; li++) {
              drawText(lines[li], rightX + 70, ly, itemFont, '#e2e8f0');
              ly += 32;
            }
            ly += 8;
          }
          ry += eachH + 16;
        }
      }
    }

    // =====================================================
    // FOOTER
    // =====================================================
    {
      const fy = 1030;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(M, fy - 10, innerW, 1);

      drawText('aquads.xyz · summarized by ThreadTalk', M, fy + 14, '600 20px ' + fontStack, '#94a3b8', 'middle');

      const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      ctx.font = '600 20px ' + fontStack;
      const dateW = ctx.measureText(dateStr).width;
      drawText(dateStr, W - M - dateW, fy + 14, '600 20px ' + fontStack, '#94a3b8', 'middle');
    }

    return await new Promise(function (resolve) {
      c.toBlob(function (blob) { resolve(blob); }, 'image/png', 0.95);
    });
  }

  async function handleShareClick(button) {
    if (!lastAnalysis) return;
    button.disabled = true;
    const labelEl = button.querySelector('.tt-share-label');
    const prevText = labelEl ? labelEl.textContent : '';
    const prevTitle = button.title || '';
    if (labelEl) labelEl.textContent = 'Preparing…';
    button.title = 'Preparing image…';

    try {
      const blob = await generateShareCardBlob();
      if (!blob) throw new Error('Could not render the card');

      const subForName = (lastSnapshot && lastSnapshot.subreddit) ? lastSnapshot.subreddit : 'thread';
      const filename = 'threadtalk-' + subForName.toLowerCase().replace(/[^a-z0-9_-]/g, '') + '.png';
      const file = new File([blob], filename, { type: 'image/png' });

      const verdictForShare = String(lastAnalysis.verdict || lastAnalysis.headline || 'Thread summary').trim();
      const shareText = 'ThreadTalk — ' + verdictForShare + '\nSummarized with aquads.xyz';

      // Path 1: Web Share API with files — opens the OS share sheet (mobile + Mac Safari).
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], text: shareText });
          showToast('Shared!', 'success');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
          // fall through to clipboard / download
        }
      }

      // Path 2: copy image to clipboard (desktop Chrome / Edge / modern Safari).
      // User can paste straight into Twitter / Discord / Slack compose.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('Image copied — paste it into your post (Ctrl/Cmd+V).', 'success');
          return;
        } catch (err) {
          // fall through to download
        }
      }

      // Path 3: download fallback.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      showToast('Image downloaded — ready to post.', 'success');
    } catch (err) {
      showToast('Could not prepare image. Please try again.', 'error');
    } finally {
      button.disabled = !lastAnalysis;
      if (labelEl) labelEl.textContent = prevText || 'Share as image';
      button.title = prevTitle || 'Share as image';
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

    if (summary) {
      html += '<div class="tt-summary">';
      html += '<h4>Summary</h4>';
      html += '<p>' + escapeHtml(summary) + '</p>';
      html += '</div>';
    }

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
    if (els.shareBtn) els.shareBtn.disabled = true;
    els.analyzeLabel.textContent = 'Analyzing…';
    els.analyzeBtn.title = 'Analyzing visible comments…';
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

      lastAnalysis = (data && data.analysis) || null;
      lastMeta = (data && data.meta) || null;
      renderAnalysis(lastAnalysis, lastMeta);
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
    els.analyzeLabel.textContent = lastAnalysis ? 'Re-analyze' : 'Analyze';
    els.analyzeBtn.title = lastAnalysis
      ? 'Re-analyze after expanding more comments'
      : 'Analyze visible comments';
    if (els.shareBtn) {
      els.shareBtn.disabled = !lastAnalysis;
      els.shareBtn.title = lastAnalysis
        ? 'Share as image'
        : 'Share as image (run an analysis first)';
    }
  }

  // Wire up UI
  els.analyzeBtn.addEventListener('click', analyze);
  els.closeBtn.addEventListener('click', function () {
    postToHost({ type: 'CLOSE_PANEL' });
  });
  if (els.shareBtn) {
    els.shareBtn.addEventListener('click', function () {
      handleShareClick(els.shareBtn);
    });
  }

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
