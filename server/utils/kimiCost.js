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
  const maxTokens = Math.max(256, Math.min(8192, Number(opts.maxTokens) || 8192));
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

module.exports = {
  MODEL_PRICING_PER_M,
  resolveModelPricing,
  kimiUsageToUsd,
  usdToCents,
  centsToUsd,
  approximateTokens,
  estimateKimiChatHoldUsd,
  estimateKimiChatHoldCents
};
