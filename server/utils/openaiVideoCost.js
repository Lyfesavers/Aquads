/**
 * OpenAI Sora video pricing (USD per second of output).
 * sora-2: https://developers.openai.com/api/docs/models/sora-2
 * sora-2-pro: https://developers.openai.com/api/docs/models/sora-2-pro
 */

const SORA_2_RATE_USD = 0.1;

/** @type {Record<string, number>} */
const SORA_2_PRO_RATE_BY_SIZE = {
  '1280x720': 0.3,
  '720x1280': 0.3,
  '1024x1792': 0.5,
  '1792x1024': 0.5,
  '1080x1920': 0.7,
  '1920x1080': 0.7
};

/** User-selectable clip lengths (seconds). */
const VIDEO_SECONDS_MIN = 20;
const VIDEO_SECONDS_MAX = 30;
const USER_VIDEO_SECONDS = [20, 30];

/** OpenAI single-segment create / extend increments. */
const API_SEGMENT_SECONDS = [4, 8, 12, 16, 20];

const SORA_2_SIZES = ['1280x720', '720x1280'];
const SORA_2_PRO_SIZES = Object.keys(SORA_2_PRO_RATE_BY_SIZE);

function normalizeModel(modelId) {
  const id = String(modelId || 'sora-2').trim();
  return id.includes('pro') ? 'sora-2-pro' : 'sora-2';
}

function normalizeSize(size, modelId) {
  const s = String(size || '1280x720').trim();
  const model = normalizeModel(modelId);
  const allowed = model === 'sora-2-pro' ? SORA_2_PRO_SIZES : SORA_2_SIZES;
  return allowed.includes(s) ? s : allowed[0];
}

/** Snap user request to 20–30s options shown in Skipper. */
function normalizeSeconds(seconds) {
  const n = parseInt(String(seconds || '20'), 10);
  if (USER_VIDEO_SECONDS.includes(n)) return n;
  const clamped = Math.min(VIDEO_SECONDS_MAX, Math.max(VIDEO_SECONDS_MIN, n));
  return USER_VIDEO_SECONDS.reduce((best, s) =>
    Math.abs(s - clamped) < Math.abs(best - clamped) ? s : best
  );
}

/**
 * Plan create + extension segments when a single POST cannot hit the target length.
 * @returns {{ initial: number, extensions: number[], billedSecondsMax: number }}
 */
function planVideoSegments(targetSeconds) {
  const target = normalizeSeconds(targetSeconds);

  if (target === 20) {
    return { initial: 20, extensions: [], billedSecondsMax: 20 };
  }
  if (target === 30) {
    return { initial: 20, extensions: [12], billedSecondsMax: 32 };
  }

  return { initial: 20, extensions: [], billedSecondsMax: 20 };
}

function parseJobSeconds(job = {}, opts = {}) {
  const raw = job.seconds ?? opts.seconds;
  const n = parseInt(String(raw), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return normalizeSeconds(opts.seconds);
}

function resolveVideoRateUsd(modelId, size) {
  const model = normalizeModel(modelId);
  const normalizedSize = normalizeSize(size, model);
  if (model === 'sora-2-pro') {
    return (
      Number(process.env[`OPENAI_SORA_PRO_RATE_${normalizedSize}`]) ||
      SORA_2_PRO_RATE_BY_SIZE[normalizedSize] ||
      0.3
    );
  }
  return Number(process.env.OPENAI_SORA_2_RATE_USD) || SORA_2_RATE_USD;
}

/**
 * @param {object} job - OpenAI video job object after completion
 * @param {object} opts - request options used for fallback
 */
function calculateVideoGenerationCost(job = {}, opts = {}) {
  const model = normalizeModel(job.model || opts.model);
  const size = normalizeSize(job.size || opts.size, model);
  const seconds = parseJobSeconds(job, opts);
  const rateUsd = resolveVideoRateUsd(model, size);

  const apiCost =
    job?.usage?.cost_usd ??
    job?.usage?.total_cost_usd ??
    job?.cost_usd ??
    job?.billing?.cost_usd;

  if (apiCost != null && Number.isFinite(Number(apiCost)) && Number(apiCost) >= 0) {
    return {
      costUsd: Number(apiCost),
      breakdown: {
        method: 'api_cost',
        model,
        size,
        seconds,
        rateUsd,
        apiCostUsd: Number(apiCost)
      },
      method: 'api_cost'
    };
  }

  const costUsd = seconds * rateUsd;
  return {
    costUsd,
    breakdown: {
      method: 'per_second',
      model,
      size,
      seconds,
      rateUsd,
      perSecondTotal: costUsd
    },
    method: 'per_second'
  };
}

/** Conservative hold (max billed seconds for plan × rate × buffer). */
function estimateVideoHoldUsd(modelId, size, seconds) {
  const model = normalizeModel(modelId);
  const normalizedSize = normalizeSize(size, model);
  const plan = planVideoSegments(seconds);
  const billedMax = plan.billedSecondsMax || plan.initial;
  const rateUsd = resolveVideoRateUsd(model, normalizedSize);
  const buffer = Number(process.env.PROJECT_AGENT_HOLD_BUFFER) || 1.1;
  return billedMax * rateUsd * buffer;
}

module.exports = {
  VIDEO_SECONDS_MIN,
  VIDEO_SECONDS_MAX,
  USER_VIDEO_SECONDS,
  API_SEGMENT_SECONDS,
  SORA_2_SIZES,
  SORA_2_PRO_SIZES,
  normalizeModel,
  normalizeSize,
  normalizeSeconds,
  planVideoSegments,
  parseJobSeconds,
  resolveVideoRateUsd,
  calculateVideoGenerationCost,
  estimateVideoHoldUsd
};
