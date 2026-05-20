/**
 * Skipper Agent capacity limits (pay-per-use: high defaults, wallet holds protect spend).
 * Override via env — see /api/project-agent/health limits block.
 *
 * Kimi K2.6 context ~256K tokens; output capped per mode below.
 */

const { approximateTokens } = require('./kimiCost');

/** Kimi K2.6 total context (tokens) — platform.kimi.ai docs */
const KIMI_CONTEXT_TOKENS = 256 * 1024;

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function getLimits() {
  return {
    kimiContextTokens: KIMI_CONTEXT_TOKENS,
    maxOutputTokensInstant: clampInt(
      process.env.PROJECT_AGENT_MAX_OUTPUT_INSTANT,
      256,
      65536,
      8192
    ),
    maxOutputTokensThinking: clampInt(
      process.env.PROJECT_AGENT_MAX_OUTPUT_THINKING,
      256,
      65536,
      16384
    ),
    maxOutputTokensAgent: clampInt(
      process.env.PROJECT_AGENT_MAX_OUTPUT_AGENT,
      256,
      131072,
      32768
    ),
    maxHistoryMessages: clampInt(process.env.PROJECT_AGENT_MAX_HISTORY_MESSAGES, 4, 200, 80),
    maxUserMessageChars: clampInt(
      process.env.PROJECT_AGENT_MAX_USER_MESSAGE_CHARS,
      1000,
      500000,
      100000
    ),
    maxAgentRounds: clampInt(process.env.PROJECT_AGENT_AGENT_MAX_ROUNDS, 2, 48, 24),
    maxSystemChars: clampInt(process.env.PROJECT_AGENT_MAX_SYSTEM_CHARS, 8000, 120000, 48000),
    /** Pre-hold: estimated web searches in a heavy agent run */
    agentHoldMaxSearchesEstimate: clampInt(
      process.env.PROJECT_AGENT_AGENT_MAX_SEARCHES_ESTIMATE,
      1,
      32,
      8
    ),
    chatRateLimitPerMinute: clampInt(
      process.env.PROJECT_AGENT_CHAT_RATE_LIMIT,
      10,
      200,
      process.env.NODE_ENV === 'production' ? 60 : 120
    )
  };
}

/**
 * @param {'instant'|'thinking'|'agent'|'websearch'} mode
 */
function maxOutputTokensForMode(mode) {
  const L = getLimits();
  if (mode === 'agent' || mode === 'websearch') return L.maxOutputTokensAgent;
  if (mode === 'thinking') return L.maxOutputTokensThinking;
  return L.maxOutputTokensInstant;
}

/**
 * Cap completion tokens so prompt + output stays within Kimi context.
 * @param {object} opts
 * @param {string} opts.mode
 * @param {string} [opts.systemPrompt]
 * @param {Array<{ role?: string, content?: string, reasoning_content?: string }>} [opts.messages]
 */
function resolveMaxOutputTokens(opts = {}) {
  const mode = opts.mode || 'instant';
  const modeCap = maxOutputTokensForMode(mode);
  let inputTokens = approximateTokens(opts.systemPrompt);
  for (const m of opts.messages || []) {
    inputTokens += approximateTokens(m.content);
    inputTokens += approximateTokens(m.reasoning_content);
  }
  const reserve = 4096;
  const room = KIMI_CONTEXT_TOKENS - inputTokens - reserve;
  return Math.max(256, Math.min(modeCap, room));
}

module.exports = {
  KIMI_CONTEXT_TOKENS,
  getLimits,
  maxOutputTokensForMode,
  resolveMaxOutputTokens
};
