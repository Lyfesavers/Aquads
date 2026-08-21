# Aquads platform guide (for Skipper Agent)

Aquads (aquads.xyz) is a crypto/Web3 launch stack: bubble map listings, community tools, payments, bounties, freelancer marketplace, and marketing. Primary Aquads reference — in Agent mode also use web search or fetch (e.g. aquads.xyz/docs, aquads.xyz/llms.txt) to verify or supplement.

## Core surfaces

- **Bubble map** (`/home`) — Interactive token listings with votes, bumps, AquaSwap
- **Dashboard** (`/dashboard/:tab?`) — Listing, bookings, link-in-bio, AquaPay, bounties, affiliates, admin
- **Bounties** (`/bounties`) — Paid task board with escrow-backed USDC rewards
- **Marketplace** (`/marketplace`) — Freelancer services, bookings, escrow, reviews
- **AquaPay** (`/aquapay`, `/pay/:slug`) — Multi-chain non-custodial payment links (50+ chains)
- **AquaSwap** (`/aquaswap`) — Cross-chain swap; Chromium extension + embed widget
- **Link in bio** (`/links/:username`) — One page for all links + banner ads
- **Skipper Agent** (`/project-agent`) — AI co-pilot (this agent)
- **Learn** (`/learn`) — Tutorials, blog, market news, skill tests, free courses
- **GameHub** (`/games`) — Aquads mini-games + community blockchain games
- **On-chain resume** (`/resume/:username`) — Freelancer credentials on Base via EAS (~$0.01 mint)
- **Telegram/Discord bot** (`/telegram-bot`) — Raid automation, bubble alerts, trending
- **HyperSpace** (`/hyperspace`) — Twitter Spaces audience boosting
- **AquaFi** (`/aquafi`) — DeFi savings/staking
- **Partner rewards** (`/partner-rewards`) — Affiliate/partner offers
- **Wallet analyzer** (`/wallet-analyzer`) — Wallet portfolio analysis
- **Docs** (`/docs`) — Official documentation
- **List token free** (`/list-token-free`) — Free Starter listing + paid Premium/PR packages

## After listing on the bubble map

1. **Complete the listing** — Logo, description, socials, pair URL.
2. **Votes & bump** — **100+ bullish votes** (organic + vote boosts) bumps the bubble. **Bump ≠ Premium upgrade** — visibility and raid caps only.
3. **Link in bio** — `aquads.xyz/links/username`
4. **Dashboard** — Manage listing, AquaPay, bounties, bookings, affiliates.
5. **Raids** — Twitter/X, Telegram, Facebook. Bumped projects: **Starter 5** / **Premium 10** free raids/day via Telegram bot.
6. **Banner ads** — Optional paid homepage/bubble banners.
7. **AquaSwap** — Swap from bubble (BexTools-style routing). Chrome extension available.
8. **AquaPay** — Crypto payment links; accept USDC to your wallet.
9. **Bounties** — Post paid tasks (dev, design, content, marketing, etc.) — see below.
10. **Marketplace** — Freelancer services and bookings (separate from bounties).
11. **Deep Dive Q&A** — Structured project Q&A (Dashboard).
12. **HyperSpace / GameHub / Learn** — Discovery and engagement.
13. **Skipper Agent** — Email-verified accounts; pay-as-you-go. **$5 starter credit** on paid **Premium** listings.

## Bounties (Web3 task board)

**URL:** `aquads.xyz/bounties`

Projects post **paid tasks** with reward in **Aquads escrow** until a winner is approved and paid via **AquaPay**.

### Posters (project owners)

- **Who:** Users with at least one **active/approved** bubble listing.
- **Flow:** Create bounty → fund escrow (USDC on Solana or EVM) → goes **open** on deposit confirm → hunters submit → poster **approves winner** → payout to hunter's AquaPay wallet.
- **Min reward:** 1 USDC. **Fee:** 1.25% on payout/refund.
- **Fields:** Title, description, deliverables, rules, category, optional deadline, linked project, resource links (HTTPS, up to 10).
- **Categories:** Development, Design, Content, Marketing, Community, Research, Other.
- **Editing:** Text/deadline editable while open; **amount locked** once escrowed. Scope edits after submissions flag "edited."
- **Cancel:** Refund minus fee. **Discussion:** Q&A comments (one reply level).

### Hunters

- **Submit:** One submission per bounty (deliverable link + description). Logged in required.
- **AquaPay required:** Activated + **Solana wallet** + **EVM wallet** (for payout).
- **Win:** Poster approves one winner; escrow auto-pays to winner's AquaPay wallet.

### Bounties vs Marketplace

- **Bounties** = fixed reward, competitive submissions, poster picks winner, escrow-backed.
- **Marketplace** = ongoing services, bookings, reviews, freelancer escrow, on-chain resume.

## Listing tiers

- **Starter (free)** — Map presence, votes, bumps, AquaSwap. Skipper: **$1** trial credit per wallet (top up via AquaPay).
- **Premium (~$99 USDC)** — **1-hour fast-track review**, **$5 Skipper credit** (tops up $1→$5 if trial used), PR/AMA bundle, ad credit, longer banner, higher pre-bump raid cap, **custom bot branding as soon as approved** (no bump).

**Important:** **Premium** = paid listing package, not vote bump. Bumped Starter keeps Starter benefits unless upgraded.

## Freelancer stack

- **Marketplace** — Free unlimited service listings, bookings, reviews.
- **Freelancer escrow** — Custodial escrow for bookings (`/custodial-pay/:escrowId`).
- **On-chain resume** — Trust score, badges, work history on Base via EAS. Public at `/resume/:username`.
- **Skipper (freelancer workspace)** — Proposals, portfolio copy, client messaging.

## Skipper Agent billing

- Prepaid **USD wallet** per listing/workspace (not affiliate points).
- **Access:** email-verified accounts (Starter, Premium, freelancer, account workspace).
- **$1 trial:** one-time per Skipper wallet. **$5 starter:** Premium listing wallets.
- **Agent mode — list project:** **CA or PA + logo URL** (+ website if DexScreener has none). **submit_starter_listing** → free Starter → **pending admin approval**.
- **Agent mode — images/videos:** **generate_image** / **generate_video** (20–30s) in Agent mode without switching modes.
- Modes: Instant, Thinking, **Agent** (web search, Python, URL fetch, image/video), Create image, Create video.
- **Agent tools:** ~$0.005/web search + model tokens. Image/video billed separately.
- Top-up via AquaPay (USDC); 5% load fee.

## Suggested first-week checklist

- [ ] Complete listing profile and links
- [ ] Share bubble map link; ask community to vote
- [ ] Set up link-in-bio and AquaPay
- [ ] Plan 1–2 raids; consider a bounty for a quick win
- [ ] Draft announcement copy (Skipper can help)
- [ ] Consider banner or vote boost if budget allows

## Boundaries

- Do not promise guaranteed returns, price targets, or financial advice.
- Aquads features and pricing change; if unsure, tell the user to confirm in Dashboard or `/docs`.
