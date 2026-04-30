const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.THREADTALK_MODEL || 'gpt-4o-mini';

// Hard caps so a viral / huge thread can't blow up our token bill.
const MAX_COMMENTS = 400;
const MAX_COMMENT_CHARS = 1200;
const MAX_TOTAL_CHARS = 60000;

// Per-IP rate limiter scoped to ThreadTalk so abusive clients can't drain
// the OpenAI key on this single feature.
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ThreadTalk requests. Please wait a minute and try again.' }
});

function sanitizeComment(text) {
  if (!text) return '';
  return String(text).replace(/\s+/g, ' ').trim().slice(0, MAX_COMMENT_CHARS);
}

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'threadtalk',
    configured: !!(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim()),
    model: MODEL
  });
});

router.post('/analyze', analyzeLimiter, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    return res.status(500).json({ error: 'ThreadTalk analysis is not configured on the server.' });
  }

  try {
    const { postTitle, postUrl, subreddit, sortOrder, comments } = req.body || {};

    if (!Array.isArray(comments) || comments.length === 0) {
      return res.status(400).json({
        error: 'No comments to analyze. Try expanding more comments on the page and click ThreadTalk again.'
      });
    }

    const sanitized = comments
      .map(sanitizeComment)
      .filter(c => c.length >= 3)
      .slice(0, MAX_COMMENTS);

    if (sanitized.length === 0) {
      return res.status(400).json({ error: 'No usable comment text found on the page.' });
    }

    // Build the comment block, truncating to a global character budget so
    // we stay well under the model context window even when comments are long.
    const lines = [];
    let total = 0;
    for (let i = 0; i < sanitized.length; i++) {
      const line = `[${i + 1}] ${sanitized[i]}`;
      if (total + line.length > MAX_TOTAL_CHARS) break;
      lines.push(line);
      total += line.length;
    }
    const usedCount = lines.length;
    const commentBlock = lines.join('\n');

    const safeTitle = (postTitle || '').slice(0, 300);
    const safeSub = (subreddit || '').slice(0, 80);
    const safeSort = (sortOrder || 'unknown').slice(0, 30);

    const system = `You are ThreadTalk, an analyst that summarizes the dominant tone and themes of a Reddit comment thread based ONLY on the comments provided.

Rules:
- Base output strictly on the provided comments. Do not invent comments or facts.
- Preserve quoted snippets verbatim (you may shorten with "..." but never paraphrase a quoted string).
- Be honest about uncertainty. If the sample is small or mixed, say so.
- Detect obvious sarcasm only when clearly indicated; otherwise interpret literally.
- Never include usernames, emails, phone numbers, or addresses inside quotes; redact with [redacted] if present.
- Avoid hate, harassment, or doxxing content in your output.
- Output STRICT JSON matching the schema. No prose outside the JSON.

JSON schema:
{
  "headline": string,
  "tone": "positive" | "negative" | "mixed" | "neutral",
  "confidence": "high" | "medium" | "low",
  "coverage_note": string,
  "summary": string,
  "themes": [
    {
      "label": string,
      "sentiment": "positive" | "negative" | "mixed" | "neutral",
      "share": string,
      "description": string,
      "quotes": [string]
    }
  ],
  "caveats": [string]
}`;

    const user = `Post title: ${safeTitle || '(unknown)'}
Subreddit: ${safeSub || '(unknown)'}
Sort order shown: ${safeSort}
Comments analyzed: ${usedCount} (visible on page)

Comments:
${commentBlock}

Return only the JSON.`;

    const aiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    const aiData = await aiRes.json().catch(() => ({}));

    if (!aiRes.ok) {
      const msg = aiData?.error?.message || 'Analysis failed';
      const status = aiRes.status >= 400 && aiRes.status < 600 ? aiRes.status : 500;
      console.error('[threadtalk] OpenAI error:', status, msg);
      return res.status(status).json({ error: msg });
    }

    const content = aiData?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: 'Empty response from analyzer.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[threadtalk] Bad JSON from model:', content?.slice(0, 200));
      return res.status(502).json({ error: 'Analyzer returned invalid JSON.' });
    }

    return res.json({
      analysis: parsed,
      meta: {
        analyzedCount: usedCount,
        receivedCount: comments.length,
        sortOrder: safeSort,
        subreddit: safeSub,
        postTitle: safeTitle,
        postUrl: postUrl ? String(postUrl).slice(0, 500) : '',
        model: MODEL,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[threadtalk] analyze error:', err);
    return res.status(500).json({ error: 'Server error during analysis.' });
  }
});

module.exports = router;
