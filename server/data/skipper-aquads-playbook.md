# Aquads platform guide (for Skipper Agent)

Aquads (aquads.xyz) is a crypto/Web3 launch stack: bubble map listings, community tools, payments, and marketing. You cannot browse the live site; use this guide for Aquads how-to questions.

## After listing on the bubble map

1. **Complete the listing** — Logo, description, socials, pair URL. Strong profiles get more clicks.
2. **Votes & bump** — Encourage bullish votes; **100+ bullish votes** (organic + vote boosts) bumps the bubble (larger, main row). **Bump is not a paid Premium upgrade** — it only affects visibility and raid caps.
3. **Link in bio** — `aquads.xyz/links/username` — one page for all project links.
4. **Dashboard** — Manage listing, bookings, link-in-bio, AquaPay, affiliate stats.
5. **Raids** — Twitter/X, Telegram, Facebook raids for community tasks and points.
6. **Banner ads** — Optional paid homepage banners.
7. **AquaSwap** — Swap handoff from the bubble (BexTools-style routing).
8. **AquaPay** — Crypto payment links; accept USDC etc. to your wallet.
9. **Marketplace** — Freelancer services and bookings for creative/dev work.
10. **HyperSpace / games / learn** — Extra discovery and engagement surfaces.
11. **Skipper Agent** — AI co-pilot for copy, plans, images (prepaid wallet). Available to **email-verified Aquads accounts**; pay-as-you-go. **$5 starter AI credit** on **paid Premium** listings only.

## Listing tiers

- **Starter (free base)** — Core map presence, votes, bumps, AquaSwap from bubble. **Skipper Agent** with a one-time **$1** trial credit per workspace/listing (top up via AquaPay after).
- **Premium (paid listing — ~$99 USDC)** — Adds **1-hour fast-track listing review** (after payment verified), **$5 Skipper Agent starter wallet credit** (tops up from $1 → $5 if trial was already granted on that listing), PR/AMA bundle, ad credit, longer homepage banner, higher pre-bump raid cap, and **custom bot branding when bumped**. Check the List Project modal for current USDC pricing.

**Important:** **Premium** means the **paid listing package**, not vote bump. A Starter project bumped at 100+ votes keeps Starter tier benefits unless they pay to upgrade.

## Skipper Agent billing

- Prepaid **USD wallet** per listing or workspace (not affiliate points).
- **Access:** email-verified Aquads accounts (Starter, Premium, freelancer, or account workspace).
- **$1 trial credit:** one-time per Skipper wallet (account workspace, Starter listing, or freelancer workspace).
- **$5 starter credit:** paid **Premium** listing wallets (top-up from $1 → $5 if they already used the trial on that listing).
- **Agent mode — list a project:** user provides **CA or PA + logo URL** (+ website if DexScreener has none). Use **submit_starter_listing** for a **free Starter** listing → **pending admin approval** before the bubble is live.
- **Agent mode — make images/videos:** in Agent mode Skipper can create images (**generate_image**) and short videos (**generate_video**, 20–30s) directly when asked, without the user switching modes. Same engines and wallet billing as Create image / Create video.
- Chat modes: Instant, Thinking, **Agent** (web search, Python code, URL fetch, image + video creation), Create image, Create video.
- **Agent** — Kimi official tools (web search, code_runner, fetch) plus token usage; ~$0.005 per web search call plus model tokens. Can also trigger image/video generation (billed like Create image/video).
- **Create image** — OpenAI image generation, separate cost.
- **Create video** — OpenAI Sora text-to-video, **20–30 seconds** (per-second billing; wallet hold then settle).
- Top-up via AquaPay (USDC); 5% load fee on top of credit amount.

## Suggested first-week checklist

- [ ] Profile and links complete on listing
- [ ] Share bubble map link; ask community to vote
- [ ] Set up link-in-bio
- [ ] Plan 1–2 raids for launch buzz
- [ ] Create AquaPay link if accepting payments
- [ ] Draft announcement copy (Skipper can help)
- [ ] Consider banner or vote boost if budget allows

## Boundaries

- Do not promise guaranteed returns, price targets, or financial advice.
- Aquads features and pricing change; if unsure, tell the user to confirm in Dashboard or site docs.
