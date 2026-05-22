const { getListingTier, LISTING_TIER_PREMIUM } = require('./listingTier');
const { loadAquadsPlaybook } = require('./aquadsPlaybook');

const { getLimits } = require('./projectAgentLimits');

function getMaxSystemChars() {
  return getLimits().maxSystemChars;
}

function trimBlock(text, max = 4000) {
  if (!text) return '';
  const s = String(text).trim();
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/**
 * Build system prompt from listing or freelancer workspace + mode.
 * @param {object} ad
 * @param {'instant'|'thinking'|'agent'|'websearch'} mode
 * @param {object} [user] — required for freelancer scope (cv context)
 */
function buildProjectAgentSystemPrompt(ad, mode, user = null) {
  const profile = ad.projectProfile || {};
  const isFreelancer = Boolean(ad.isFreelancerScope);
  const isAccount = Boolean(ad.isAccountScope);

  const lines = isFreelancer
    ? [
        'You are Skipper Agent, the Aquads AI co-pilot for Web3 freelancers.',
        'Help with proposals, client messaging, portfolio copy, skill positioning, and marketplace presence on Aquads.',
        'Ground answers in the freelancer profile below. If information is missing, say so.',
        'You cannot browse aquads.xyz directly; use the Aquads platform guide below for product how-to.',
        'Do not provide financial advice or guarantees. Outputs are drafts for human review.',
        ''
      ]
    : isAccount
      ? [
          'You are Skipper Agent, the Aquads AI co-pilot for verified Aquads users.',
          'Help with project marketing, launch planning, listing copy, and Web3 messaging.',
          'The user may not have a live bubble listing yet — suggest listing on Aquads when relevant.',
          'You cannot browse aquads.xyz directly; use the Aquads platform guide below for product how-to.',
          'Do not provide financial advice or guarantees. Outputs are drafts for human review.',
          ''
        ]
      : [
        'You are Skipper Agent, the Aquads AI co-pilot for crypto/Web3 project teams.',
        'You help with marketing copy, documentation drafts, launch checklists, and project messaging.',
        'Ground answers in the project context below. If information is missing, say so.',
        'You cannot browse aquads.xyz directly; use the Aquads platform guide below for product how-to.',
        'Do not provide financial advice, price predictions, or guarantees. Outputs are drafts for human review.',
        ''
      ];

  const playbook = loadAquadsPlaybook();
  if (playbook) {
    lines.push('## Aquads platform guide', playbook, '');
  }

  if (isFreelancer && user) {
    const cv = user.cv || {};
    lines.push('## Freelancer profile', `Username: ${trimBlock(user.username, 80)}`);
    if (cv.fullName) lines.push(`Name: ${trimBlock(cv.fullName, 120)}`);
    if (cv.summary) lines.push('', '### Summary', trimBlock(cv.summary));
    if (Array.isArray(cv.skills) && cv.skills.length) {
      lines.push('', '### Skills', cv.skills.slice(0, 24).map((s) => trimBlock(s, 80)).join(', '));
    }
    if (Array.isArray(cv.experience) && cv.experience.length) {
      lines.push('', '### Experience');
      cv.experience.slice(0, 8).forEach((e) => {
        lines.push(
          `- ${trimBlock(e.position, 80)} at ${trimBlock(e.company, 80)}: ${trimBlock(e.description, 300)}`
        );
      });
    }
    if (Array.isArray(cv.education) && cv.education.length) {
      lines.push('', '### Education');
      cv.education.slice(0, 6).forEach((e) => {
        lines.push(`- ${trimBlock(e.degree, 80)} — ${trimBlock(e.institution, 120)} (${trimBlock(e.field, 80)})`);
      });
    }
  } else if (isAccount && user) {
    lines.push('## Account', `Username: ${trimBlock(user.username, 80)}`);
  } else {
    const tier = getListingTier(ad);
    lines.push(
      '## Project',
      `Name: ${trimBlock(ad.title, 200)}`,
      `Blockchain: ${trimBlock(ad.blockchain || 'unknown', 80)}`,
      `Listing tier: ${tier}`,
      `URL: ${trimBlock(ad.url, 500)}`,
      `Pair: ${trimBlock(ad.pairAddress, 200)}`
    );

    if (profile.about) lines.push('', '### About', trimBlock(profile.about));
    if (profile.mission) lines.push('', '### Mission', trimBlock(profile.mission));
    if (profile.recentUpdate) lines.push('', '### Recent update', trimBlock(profile.recentUpdate));

    if (Array.isArray(profile.milestones) && profile.milestones.length) {
      lines.push('', '### Milestones');
      profile.milestones.slice(0, 12).forEach((m) => {
        lines.push(
          `- ${trimBlock(m.title, 120)} (${trimBlock(m.status, 40)}): ${trimBlock(m.summary, 300)}`
        );
      });
    }

    if (Array.isArray(profile.team) && profile.team.length) {
      lines.push('', '### Team');
      profile.team.slice(0, 10).forEach((m) => {
        lines.push(`- ${trimBlock(m.name, 80)} — ${trimBlock(m.role, 80)}: ${trimBlock(m.bio, 200)}`);
      });
    }
  }

  if (mode === 'agent' || mode === 'websearch') {
    lines.push(
      '',
      '## Mode: Agent',
      'You have tools: $web_search (live public info), lookup_token_for_listing, submit_starter_listing, and when available code_runner (Python) and fetch (URL to markdown).',
      '### Starter listing via chat',
      'When the user wants to list their project on Aquads, collect:',
      '1. **token_or_pair_address** — contract address (CA) or pair address (PA)',
      '2. **logo_url** — direct HTTPS image URL (png/jpg/gif/webp)',
      '3. **website_url** — project website (required if DexScreener has none; ask once)',
      'Then call **submit_starter_listing** — it creates a **free Starter** listing only (never Premium). Status is **pending admin approval** before the bubble goes live.',
      'If only CA/PA is given, use lookup_token_for_listing first to preview symbol/chain/pair, then submit once logo (and website if needed) are provided.',
      'Do not invent logo or website URLs. Vote bump does not replace paid Premium.',
      'Choose tools autonomously when they help; do not name tools in the reply unless the user asks.',
      'For Aquads product how-to (listing, bumps, raids, AquaPay, Premium, Skipper), use only the Aquads platform guide above — do not web-search aquads.xyz.',
      'Break complex requests into clear steps. Propose concrete deliverables (posts, doc sections, checklists, code outputs).',
      'Cite sources briefly when search or fetch was used. Thinking is disabled while tools run.'
    );
  } else if (mode === 'instant') {
    lines.push('', '## Mode: Instant', 'Be concise and practical.');
  } else {
    lines.push('', '## Mode: Thinking', 'Reason carefully for quality before answering.');
  }

  let system = lines.join('\n');
  const maxSystem = getMaxSystemChars();
  if (system.length > maxSystem) {
    system = `${system.slice(0, maxSystem)}\n…[context truncated]`;
  }
  return system;
}

function isPremiumListing(ad) {
  return getListingTier(ad) === LISTING_TIER_PREMIUM;
}

/** User asked for branded/promo output — otherwise pass their prompt through as-is. */
function wantsProjectBranding(userPrompt) {
  const s = String(userPrompt || '').toLowerCase();
  return /\b(banner|promo(?:tional?)?|launch|branded|brand(?:ing)?|marketing|announcement|advert(?:isement)?|our\s+(?:token|project|coin|brand)|for\s+(?:my|our)\s+(?:project|token|brand|listing)|project\s+(?:name|logo|promo))\b/.test(
    s
  );
}

function buildOptionalBrandingContext(ad, user, userPrompt) {
  if (!wantsProjectBranding(userPrompt)) return [];

  const profile = ad.projectProfile || {};
  if (ad.isFreelancerScope) {
    return [
      `Optional branding context: freelancer "${user?.username || ad.title}".`,
      user?.cv?.summary ? `Profile: ${trimBlock(user.cv.summary, 400)}.` : ''
    ];
  }

  return [
    `Optional branding context: project "${ad.title}".`,
    ad.blockchain ? `Blockchain/ecosystem: ${ad.blockchain}.` : '',
    profile.mission ? `Mission: ${trimBlock(profile.mission, 400)}.` : ''
  ];
}

/** OpenAI Sora prompt — user request first; project context only when they ask for branding */
function buildProjectVideoPrompt(ad, userPrompt, user = null) {
  const bits = [
    trimBlock(userPrompt, 2000),
    ...buildOptionalBrandingContext(ad, user, userPrompt),
    'Cinematic motion, clear subject. Follow the user request closely; do not add unrelated project names, logos, or promo overlays unless they asked for them.',
    'No logos of other brands, no real public figures, no stock watermarks.',
    'Do not depict guaranteed profits or misleading financial claims unless explicitly requested.'
  ];
  return bits.filter(Boolean).join(' ');
}

/** OpenAI image prompt — user request first; project context only when they ask for branding */
function buildProjectImagePrompt(ad, userPrompt, user = null) {
  const bits = [
    trimBlock(userPrompt, 2000),
    ...buildOptionalBrandingContext(ad, user, userPrompt),
    'High quality, sharp. Follow the user request closely; do not add unrelated project names, logos, or marketing overlays unless they asked for them.',
    'No stock watermarks.',
    'Do not depict guaranteed profits, price charts implying returns, or misleading financial claims unless the user explicitly asked for specific chart copy.'
  ];
  return bits.filter(Boolean).join(' ');
}

module.exports = {
  buildProjectAgentSystemPrompt,
  buildProjectImagePrompt,
  buildProjectVideoPrompt,
  isPremiumListing,
  getMaxSystemChars
};
