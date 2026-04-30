# ThreadTalk – Reddit Thread Sentiment

A Chrome extension that summarizes the dominant sentiment, themes and quoted highlights of a Reddit comment thread based on the comments **currently visible on the page**. The user controls coverage by expanding "view more comments" and re-running the analysis.

> **Made by Aquads.** Independent product.

---

## What it does

When you open a Reddit post (`/r/<sub>/comments/...`):

1. A small **ThreadTalk** launcher appears bottom-right of the page (or click the extension's toolbar icon).
2. Clicking it slides in a **side panel** with the post context (subreddit, sort, visible comment count).
3. Press **Analyze** and ThreadTalk scrapes the comments visible in the DOM and sends them to the Aquads server, which runs an OpenAI-backed analysis and returns:
   - a **headline tone** (positive / negative / mixed / neutral) with confidence,
   - a **coverage note** (how many comments were used and which sort),
   - a 1–3 sentence **summary**,
   - **theme cards** with approximate share, description, and 1–3 short representative quotes,
   - any **caveats** (small sample, sarcasm likely, etc.).

The extension never calls Reddit's API. It only reads what is already rendered on the page after the user (logged in or logged out) loaded it normally.

---

## How it works

```
Chrome extension (this folder)
  ├─ content-script.js   → scrapes visible comments from Reddit DOM
  ├─ panel/              → the side panel UI (iframe)
  └─ background.js       → toolbar icon → toggle panel

       │ POST {postTitle, subreddit, sortOrder, comments[]}
       ▼
Aquads backend  →  server/routes/threadtalk.js
       │
       │ OpenAI Chat Completions (gpt-4o-mini by default)
       ▼
   Sentiment / theme / quotes JSON  →  rendered in the panel
```

The OpenAI key never ships with the extension. It lives only on the Aquads server (`OPENAI_API_KEY`, same key reused from the existing PFP generator route).

---

## Local testing (load unpacked)

1. **Make sure the backend is reachable.** The extension is configured by default to talk to the production Aquads server:
   - `https://aquads-production.up.railway.app/api/threadtalk/analyze`
   
   To point at a local server during development, edit `panel/panel.js` (`API_ORIGIN`) and `manifest.json` (`content_security_policy.connect-src`) to include `http://localhost:5000`, then reload the extension. (`config.js` is also there for content-script side use.)

2. **Open** `chrome://extensions` and enable **Developer mode** (top-right toggle).

3. Click **Load unpacked** and select the `threadtalk-extension/` folder. The extension should load without errors.

4. Open a Reddit thread, e.g.:
   `https://www.reddit.com/r/buildapc/comments/...`

5. Click the floating **ThreadTalk** button (bottom-right) **or** the extension's toolbar icon. The side panel slides in.

6. Press **Analyze visible comments**. The panel shows the headline tone, summary, themes and quotes.

7. To widen coverage, expand more comments / "view more replies" on the page, then click **Re-analyze**.

After code changes, hit **Reload** on the extension's card in `chrome://extensions`.

---

## Server side

A new Express route is mounted at:

```
POST /api/threadtalk/analyze
GET  /api/threadtalk/health
```

Defined in `server/routes/threadtalk.js` and mounted in `server/index.js`. It expects:

```json
{
  "postTitle": "string",
  "postUrl": "string",
  "subreddit": "string",
  "sortOrder": "top|new|controversial|...",
  "comments": ["string", "..."]
}
```

It returns:

```json
{
  "analysis": { "headline": "...", "tone": "...", "themes": [...], ... },
  "meta": { "analyzedCount": 123, "model": "gpt-4o-mini", ... }
}
```

The route enforces:

- Requires `OPENAI_API_KEY` to be set in env.
- Per-IP rate limit (12 req/min) on `/analyze`.
- Hard caps: 400 comments, 1200 chars per comment, 60k chars total.

---

## Publishing to the Chrome Web Store (later)

When ready to publish:

1. Bump `version` in `manifest.json`.
2. Make a fresh copy of the folder, **excluding** dev-only files (`generate-icons.js`, `README.md` is fine to keep, `.git*`).
3. Zip the folder so `manifest.json` is at the **root** of the zip.
4. Upload via the Chrome Web Store Developer Dashboard.

In the listing, make it clear:
- **Made by Aquads. Independent product.**
- ThreadTalk only analyzes comments visible on the page; it does not access the Reddit API.

---

## Files

```
threadtalk-extension/
├── manifest.json          MV3 manifest
├── background.js          Service worker (toolbar click handler)
├── config.js              API origin shared with content scripts
├── content-script.js      Page launcher + scraping + iframe bridge
├── content-style.css      Launcher button + panel container styles
├── panel/
│   ├── panel.html         Side panel markup
│   ├── panel.css          Side panel styles (dark, gradient accents)
│   └── panel.js           Side panel logic + API call
└── icons/
    ├── icon16.png
    ├── icon48.png
    ├── icon128.png
    └── generate-icons.js  One-shot regen helper (uses `sharp`)
```
