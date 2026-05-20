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
 * Build system prompt from listing + mode.
 * @param {import('../models/Ad').Ad} ad
 * @param {'instant'|'thinking'|'agent'|'websearch'} mode — websearch kept for legacy messages
 */
function buildProjectAgentSystemPrompt(ad, mode) {
  const profile = ad.projectProfile || {};
  const tier = getListingTier(ad);

  const lines = [
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

  if (mode === 'agent' || mode === 'websearch') {
    lines.push(
      '',
      '## Mode: Agent',
      'You have tools: $web_search (live public info), and when available code_runner (Python) and fetch (URL to markdown).',
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

/** OpenAI image prompt with light project branding context */
function buildProjectImagePrompt(ad, userPrompt) {
  const profile = ad.projectProfile || {};
  const bits = [
    `Professional marketing visual for Web3/crypto project "${ad.title}".`,
    ad.blockchain ? `Blockchain/ecosystem: ${ad.blockchain}.` : '',
    profile.mission ? `Mission: ${trimBlock(profile.mission, 400)}.` : '',
    `User request: ${trimBlock(userPrompt, 2000)}`,
    'High quality, sharp, suitable for social or website. No stock watermarks.',
    'Do not depict guaranteed profits, price charts implying returns, or misleading financial claims unless the user explicitly asked for specific chart copy.'
  ];
  return bits.filter(Boolean).join(' ');
}

module.exports = {
  buildProjectAgentSystemPrompt,
  buildProjectImagePrompt,
  isPremiumListing,
  getMaxSystemChars
};
