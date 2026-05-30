/**
 * Kimi wholesale token pricing (USD per 1M tokens).
 * Sources:
 * - K2.6: https://platform.kimi.ai/docs/pricing/chat-k26
 * - K2.5: https://platform.kimi.ai/docs/pricing/chat-k25
 *
 * Override via env (applies when model has no table entry): KIMI_INPUT_PRICE_PER_M, etc.
 */

/** @type {Record<string, { input: number, output: number, cached: number }>} */
const MODEL_PRICING_PER_M = {
  'kimi-k2.6': { input: 0.95, output: 4.0, cached: 0.16 },
  'kimi-k2.5': { input: 0.6, output: 3.0, cached: 0.1 }
};

function resolveModelPricing(modelId) {
  const id = String(modelId || '').trim();
  if (MODEL_PRICING_PER_M[id]) {
    return { ...MODEL_PRICING_PER_M[id], model: id };
  }
  if (id.includes('k2.6')) {
    return { ...MODEL_PRICING_PER_M['kimi-k2.6'], model: 'kimi-k2.6' };
  }
  if (id.includes('k2.5')) {
    return { ...MODEL_PRICING_PER_M['kimi-k2.5'], model: 'kimi-k2.5' };
  }

  return {
    model: id || 'kimi-k2.6',
    input: Number(process.env.KIMI_INPUT_PRICE_PER_M) || MODEL_PRICING_PER_M['kimi-k2.6'].input,
    output: Number(process.env.KIMI_OUTPUT_PRICE_PER_M) || MODEL_PRICING_PER_M['kimi-k2.6'].output,
    cached: Number(process.env.KIMI_CACHED_PRICE_PER_M) || MODEL_PRICING_PER_M['kimi-k2.6'].cached
  };
}

/**
 * @param {{ prompt_tokens?: number, completion_tokens?: number, cached_tokens?: number }} usage
 * @param {string} [modelId] e.g. kimi-k2.6
 * @returns {number} Cost in USD
 */
function kimiUsageToUsd(usage = {}, modelId = 'kimi-k2.6') {
  const { input, output, cached: cachedRate } = resolveModelPricing(modelId);
  const prompt = Math.max(0, Number(usage.prompt_tokens) || 0);
  const completion = Math.max(0, Number(usage.completion_tokens) || 0);
  const cached = Math.min(Math.max(0, Number(usage.cached_tokens) || 0), prompt);
  const inputBillable = Math.max(0, prompt - cached);

  return (
    (inputBillable * input + cached * cachedRate + completion * output) / 1_000_000
  );
}

/** USD → integer cents (round half up) */
function usdToCents(usd) {
  return Math.max(0, Math.round(Number(usd) * 100));
}

/** Bill actual usage: never round sub-cent API cost down to $0 when totalUsd > 0. */
function usdToBillCents(usd) {
  const n = Math.max(0, Number(usd) || 0);
  if (n <= 0) return 0;
  const rounded = Math.round(n * 100);
  return rounded > 0 ? rounded : 1;
}

/** Cents → USD display */
function centsToUsd(cents) {
  return (Math.max(0, Number(cents) || 0) / 100).toFixed(2);
}

/** Rough token count (~4 chars per token) for pre-flight holds */
function approximateTokens(text) {
  const len = String(text || '').length;
  if (!len) return 0;
  return Math.ceil(len / 4);
}

/**
 * Worst-case hold for a Kimi chat request (input + max completion tokens).
 * @param {{ systemPrompt?: string, messages?: Array<{ role?: string, content?: string, reasoning_content?: string }>, maxTokens?: number, modelId?: string, mode?: string }} opts
 */
function estimateKimiChatHoldUsd(opts = {}) {
  const { input, output } = resolveModelPricing(opts.modelId || 'kimi-k2.6');
  const maxTokens = Math.max(256, Number(opts.maxTokens) || 8192);
  const mode = opts.mode || 'instant';

  let inputTokens = approximateTokens(opts.systemPrompt);
  for (const m of opts.messages || []) {
    inputTokens += approximateTokens(m.content);
    inputTokens += approximateTokens(m.reasoning_content);
  }

  const outputMultiplier = mode === 'thinking' || mode === 'agent' ? 1.25 : 1;
  const outputTokens = Math.ceil(maxTokens * outputMultiplier);
  const buffer = Number(process.env.PROJECT_AGENT_HOLD_BUFFER) || 1.15;

  return ((inputTokens * input + outputTokens * output) / 1_000_000) * buffer;
}

function estimateKimiChatHoldCents(opts = {}) {
  return usdToCents(estimateKimiChatHoldUsd(opts));
}

/** Kimi $web_search per successful call — https://platform.kimi.ai/docs/pricing/tools */
function getWebSearchCallUsd() {
  const n = Number(process.env.PROJECT_AGENT_WEB_SEARCH_CALL_USD);
  return Number.isFinite(n) && n >= 0 ? n : 0.005;
}

/** Normalize Kimi/Moonshot usage shapes (top-level or choice-level). */
function normalizeKimiUsage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const prompt = Math.max(
    0,
    Number(raw.prompt_tokens ?? raw.input_tokens ?? raw.prompt_tokens_total) || 0
  );
  const completion = Math.max(
    0,
    Number(raw.completion_tokens ?? raw.output_tokens ?? raw.completion_tokens_total) || 0
  );
  const cached = Math.max(0, Number(raw.cached_tokens) || 0);
  const total = Math.max(0, Number(raw.total_tokens) || prompt + completion);
  if (!prompt && !completion && !total) return null;
  return {
    prompt_tokens: prompt || Math.max(0, total - completion),
    completion_tokens: completion || Math.max(0, total - prompt),
    cached_tokens: cached,
    total_tokens: total
  };
}

function extractKimiUsageFromCompletion(data) {
  if (!data || typeof data !== 'object') return null;
  return (
    normalizeKimiUsage(data.usage) ||
    normalizeKimiUsage(data.choices?.[0]?.usage) ||
    normalizeKimiUsage(data.choices?.[0]?.message?.usage)
  );
}

function messageTokensForBilling(message = {}) {
  let n = 0;
  n += approximateTokens(message.content);
  n += approximateTokens(message.reasoning_content);
  if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
    try {
      n += approximateTokens(JSON.stringify(message.tool_calls));
    } catch {
      n += 64;
    }
  }
  if (message.role === 'tool') {
    n += approximateTokens(message.name);
  }
  return n;
}

/** When API omits usage (common on some Agent legs), estimate from messages + reply. */
function estimateKimiUsageFromMessages(messages = [], assistantContent = '') {
  let prompt = 0;
  for (const m of messages) {
    prompt += messageTokensForBilling(m);
  }
  const completion = approximateTokens(assistantContent);
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    cached_tokens: 0,
    total_tokens: prompt + completion,
    estimated: true
  };
}

function mergeKimiUsage(usages = []) {
  const merged = { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, total_tokens: 0 };
  for (const u of usages) {
    const norm = normalizeKimiUsage(u);
    if (!norm) continue;
    merged.prompt_tokens += norm.prompt_tokens;
    merged.completion_tokens += norm.completion_tokens;
    merged.cached_tokens += norm.cached_tokens;
    merged.total_tokens += norm.total_tokens;
  }
  if (!merged.total_tokens) {
    merged.total_tokens = merged.prompt_tokens + merged.completion_tokens;
  }
  return merged;
}

/**
 * Total chat cost: summed token usage across tool-loop legs + $web_search call fees.
 * @param {{ usages?: object[], webSearchCalls?: number, modelId?: string, fallbackMessages?: object[], assistantContent?: string }} opts
 */
function kimiChatCostUsd({
  usages = [],
  webSearchCalls = 0,
  modelId = 'kimi-k2.6',
  fallbackMessages = null,
  assistantContent = ''
}) {
  let usage = mergeKimiUsage(usages);
  let billingMethod = 'usage';
  let tokenUsd = kimiUsageToUsd(usage, modelId);

  if (tokenUsd <= 0 && fallbackMessages?.length) {
    usage = estimateKimiUsageFromMessages(fallbackMessages, assistantContent);
    tokenUsd = kimiUsageToUsd(usage, modelId);
    billingMethod = 'estimated';
  }

  const calls = Math.max(0, Number(webSearchCalls) || 0);
  const toolUsd = calls * getWebSearchCallUsd();
  return {
    usage,
    tokenUsd,
    toolUsd,
    webSearchCalls: calls,
    totalUsd: tokenUsd + toolUsd,
    billingMethod
  };
}

/**
 * Pre-flight hold for web search mode (multi-round + large search context + tool fees).
 */
function estimateKimiWebSearchHoldUsd(opts = {}) {
  const { input, output } = resolveModelPricing(opts.modelId || 'kimi-k2.6');
  const baseHold = estimateKimiChatHoldUsd({ ...opts, mode: 'instant' });
  const searchTokens =
    Number(process.env.PROJECT_AGENT_WEB_SEARCH_TOKEN_ESTIMATE) || 12000;
  const maxSearches = Math.max(
    1,
    Number(process.env.PROJECT_AGENT_AGENT_MAX_SEARCHES_ESTIMATE) ||
      Number(process.env.PROJECT_AGENT_WEB_SEARCH_MAX_CALLS) ||
      3
  );
  const searchInputUsd = (searchTokens * input) / 1_000_000;
  const toolFees = maxSearches * getWebSearchCallUsd();
  const buffer = Number(process.env.PROJECT_AGENT_WEB_SEARCH_HOLD_BUFFER) || 1.15;
  return (baseHold * 1.75 + searchInputUsd + toolFees) * buffer;
}

function estimateKimiWebSearchHoldCents(opts = {}) {
  return usdToCents(estimateKimiWebSearchHoldUsd(opts));
}

/** Agent mode (web_search + code_runner + fetch tool loop) */
function estimateKimiAgentHoldUsd(opts = {}) {
  const base = estimateKimiWebSearchHoldUsd(opts);
  const rounds =
    Number(opts.agentHoldRoundEstimate) ||
    Number(process.env.PROJECT_AGENT_AGENT_HOLD_ROUND_ESTIMATE) ||
    6;
  const roundFactor = 1 + Math.min(Math.max(1, rounds), 12) * 0.12;
  const extra = Number(process.env.PROJECT_AGENT_AGENT_HOLD_EXTRA_USD) || 0.05;
  const buffer = Number(process.env.PROJECT_AGENT_AGENT_HOLD_BUFFER) || 1.10;
  return base * buffer * roundFactor + extra;
}

function estimateKimiAgentHoldCents(opts = {}) {
  return usdToCents(estimateKimiAgentHoldUsd(opts));
}

module.exports = {
  MODEL_PRICING_PER_M,
  resolveModelPricing,
  kimiUsageToUsd,
  usdToCents,
  usdToBillCents,
  centsToUsd,
  approximateTokens,
  normalizeKimiUsage,
  extractKimiUsageFromCompletion,
  estimateKimiUsageFromMessages,
  estimateKimiChatHoldUsd,
  estimateKimiChatHoldCents,
  getWebSearchCallUsd,
  mergeKimiUsage,
  kimiChatCostUsd,
  estimateKimiWebSearchHoldUsd,
  estimateKimiWebSearchHoldCents,
  estimateKimiAgentHoldUsd,
  estimateKimiAgentHoldCents
};
