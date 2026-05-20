/**
 * OpenAI GPT Image token pricing (USD per 1M tokens).
 * gpt-image-1: https://developers.openai.com/api/docs/pricing#image-generation
 * Per-image fallback: https://developers.openai.com/api/docs/guides/image-generation
 */

/** @type {Record<string, { textIn: number, textCached: number, imageIn: number, imageInCached: number, imageOut: number }>} */
const MODEL_TOKEN_PRICING_PER_M = {
  'gpt-image-1': {
    textIn: 5.0,
    textCached: 1.25,
    imageIn: 10.0,
    imageInCached: 2.5,
    imageOut: 40.0
  },
  'gpt-image-1-mini': {
    textIn: 2.0,
    textCached: 0.2,
    imageIn: 2.5,
    imageInCached: 0.25,
    imageOut: 8.0
  },
  'gpt-image-1.5': {
    textIn: 5.0,
    textCached: 1.25,
    imageIn: 10.0,
    imageInCached: 2.5,
    imageOut: 40.0
  }
};

/** Per-image fallback (1024x1024) when usage block is missing — gpt-image-1 */
const GPT_IMAGE_1_PER_IMAGE_USD = {
  low: 0.011,
  medium: 0.042,
  high: 0.167,
  auto: 0.042
};

function resolveImageModelPricing(modelId) {
  const id = String(modelId || 'gpt-image-1').trim();
  if (MODEL_TOKEN_PRICING_PER_M[id]) {
    return { ...MODEL_TOKEN_PRICING_PER_M[id], model: id };
  }
  if (id.includes('mini')) {
    return { ...MODEL_TOKEN_PRICING_PER_M['gpt-image-1-mini'], model: 'gpt-image-1-mini' };
  }
  if (id.includes('1.5')) {
    return { ...MODEL_TOKEN_PRICING_PER_M['gpt-image-1.5'], model: 'gpt-image-1.5' };
  }
  return {
    ...MODEL_TOKEN_PRICING_PER_M['gpt-image-1'],
    model: 'gpt-image-1',
    textIn: Number(process.env.OPENAI_IMAGE_TEXT_IN_PER_M) || MODEL_TOKEN_PRICING_PER_M['gpt-image-1'].textIn,
    imageIn: Number(process.env.OPENAI_IMAGE_IMAGE_IN_PER_M) || MODEL_TOKEN_PRICING_PER_M['gpt-image-1'].imageIn,
    imageOut: Number(process.env.OPENAI_IMAGE_IMAGE_OUT_PER_M) || MODEL_TOKEN_PRICING_PER_M['gpt-image-1'].imageOut
  };
}

/**
 * @param {object} usage - OpenAI ImagesResponse.usage
 * @param {string} modelId
 * @returns {{ costUsd: number, breakdown: object }}
 */
function openaiImageUsageToUsd(usage = {}, modelId = 'gpt-image-1') {
  const rates = resolveImageModelPricing(modelId);

  const inputTokens = Math.max(0, Number(usage.input_tokens) || 0);
  const outputTokens = Math.max(0, Number(usage.output_tokens) || 0);
  const details = usage.input_tokens_details || {};
  const textTokens = Math.max(0, Number(details.text_tokens) || inputTokens);
  const imageInTokens = Math.max(0, Number(details.image_tokens) || 0);
  const outputDetails = usage.output_tokens_details || {};
  const outputImageTokens = Math.max(0, Number(outputDetails.image_tokens) || outputTokens);
  const outputTextTokens = Math.max(0, Number(outputDetails.text_tokens) || 0);

  const textInCost = (textTokens * rates.textIn) / 1_000_000;
  const imageInCost = (imageInTokens * rates.imageIn) / 1_000_000;
  const imageOutCost = (outputImageTokens * rates.imageOut) / 1_000_000;
  const outputTextCost = (outputTextTokens * rates.textIn) / 1_000_000;

  const costUsd = textInCost + imageInCost + imageOutCost + outputTextCost;

  return {
    costUsd,
    breakdown: {
      model: rates.model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      text_tokens: textTokens,
      image_input_tokens: imageInTokens,
      output_image_tokens: outputImageTokens,
      textInCost,
      imageInCost,
      imageOutCost,
      outputTextCost
    }
  };
}

function perImageFallbackUsd(quality = 'medium', modelId = 'gpt-image-1') {
  const q = String(quality || 'medium').toLowerCase();
  if (modelId.includes('mini')) {
    const mini = { low: 0.005, medium: 0.011, high: 0.036, auto: 0.011 };
    return mini[q] ?? mini.medium;
  }
  return GPT_IMAGE_1_PER_IMAGE_USD[q] ?? GPT_IMAGE_1_PER_IMAGE_USD.medium;
}

/**
 * Prefer token usage from API; fallback to quality-based per-image table.
 */
/** Conservative hold before calling OpenAI (high-quality ceiling + buffer). */
function estimateImageHoldUsd(modelId = 'gpt-image-1', quality = 'medium') {
  const configured = calculateImageGenerationCost(null, modelId, quality).costUsd;
  const highCeiling = perImageFallbackUsd('high', modelId);
  const buffer = Number(process.env.PROJECT_AGENT_HOLD_BUFFER) || 1.1;
  return Math.max(configured, highCeiling) * buffer;
}

function calculateImageGenerationCost(usage, modelId, quality) {
  if (usage && (usage.input_tokens > 0 || usage.output_tokens > 0 || usage.total_tokens > 0)) {
    const { costUsd, breakdown } = openaiImageUsageToUsd(usage, modelId);
    return { costUsd, breakdown, method: 'usage' };
  }
  const costUsd = perImageFallbackUsd(quality, modelId);
  return {
    costUsd,
    breakdown: { method: 'per_image_fallback', quality, model: modelId },
    method: 'fallback'
  };
}

module.exports = {
  MODEL_TOKEN_PRICING_PER_M,
  GPT_IMAGE_1_PER_IMAGE_USD,
  resolveImageModelPricing,
  openaiImageUsageToUsd,
  perImageFallbackUsd,
  estimateImageHoldUsd,
  calculateImageGenerationCost
};
