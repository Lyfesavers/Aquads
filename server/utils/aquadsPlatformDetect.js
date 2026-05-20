/**
 * Detect Aquads product how-to questions so Agent mode can skip web_search
 * (SERP often fails on the React SPA; playbook in system prompt is authoritative).
 */

const AQUADS_SIGNALS = [
  /\baquads\b/i,
  /\bskipper\s*agent\b/i,
  /\bproject\s*agent\b/i,
  /\blisting\s*tier\b/i,
  /\bpremium\s*listing\b/i,
  /\bbubble\s*map\b/i,
  /\bvote\s*boost\b/i,
  /\bbump\s*(request|bot|ad)?\b/i,
  /\baquapay\b/i,
  /\baquafi\b/i,
  /\baquaswap\b/i,
  /\blink[\s-]?in[\s-]?bio\b/i,
  /\btwitter\s*raid\b/i,
  /\btelegram\s*raid\b/i,
  /\bpartner\s*store\b/i,
  /\blist[\s-]?token\b/i,
  /\bhow\s+(do|to)\s+(i|we)\s+(list|bump|pay|use)\b/i
];

/**
 * @param {string} text
 * @returns {boolean}
 */
function isAquadsPlatformQuestion(text) {
  const t = String(text || '').trim();
  if (!t || t.length < 8) return false;
  return AQUADS_SIGNALS.some((re) => re.test(t));
}

module.exports = {
  isAquadsPlatformQuestion
};
