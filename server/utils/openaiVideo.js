/**
 * OpenAI Sora video generation (async job + poll + download).
 */

const {
  normalizeModel,
  normalizeSize,
  normalizeSeconds,
  planVideoSegments
} = require('./openaiVideoCost');

const OPENAI_VIDEOS_URL = 'https://api.openai.com/v1/videos';

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey && String(apiKey).trim() ? String(apiKey).trim() : null;
}

async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Video API request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Start a text-to-video render job.
 */
async function openaiCreateVideo(prompt, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Video generation is not configured on the server.');
    err.code = 'MISSING_OPENAI_KEY';
    throw err;
  }

  const model = normalizeModel(options.model || process.env.PROJECT_AGENT_VIDEO_MODEL || 'sora-2');
  const size = normalizeSize(options.size || process.env.PROJECT_AGENT_VIDEO_SIZE || '1280x720', model);
  const seconds = String(options.seconds ?? normalizeSeconds(options.targetSeconds));

  const form = new FormData();
  form.append('prompt', String(prompt).slice(0, 4000));
  form.append('model', model);
  form.append('size', size);
  form.append('seconds', seconds);

  const res = await fetch(OPENAI_VIDEOS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  const data = await parseJsonResponse(res);
  return {
    ...data,
    model: data.model || model,
    size: data.size || size,
    seconds: data.seconds || seconds
  };
}

/** Try create; on invalid seconds for 15s, use documented fallback plan. */
async function openaiCreateVideoWithPlan(prompt, options = {}) {
  const plan = options.plan || planVideoSegments(options.targetSeconds ?? options.seconds);

  try {
    const job = await openaiCreateVideo(prompt, { ...options, seconds: plan.initial });
    return { job, plan, usedFallback: false };
  } catch (err) {
    if (plan.fallback && /seconds|duration|invalid/i.test(String(err.message || ''))) {
      const job = await openaiCreateVideo(prompt, {
        ...options,
        seconds: plan.fallback.initial
      });
      return {
        job,
        plan: {
          initial: plan.fallback.initial,
          extensions: plan.fallback.extensions,
          billedSecondsMax: plan.billedSecondsMax
        },
        usedFallback: true
      };
    }
    throw err;
  }
}

async function openaiExtendVideo(sourceVideoId, prompt, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Video generation is not configured on the server.');
    err.code = 'MISSING_OPENAI_KEY';
    throw err;
  }

  const seconds = String(options.seconds ?? '8');
  const continuePrompt =
    String(options.extendPrompt || prompt || '').slice(0, 4000) ||
    'Continue the scene smoothly with the same style, camera motion, and subject.';

  const res = await fetch(`${OPENAI_VIDEOS_URL}/extensions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      video: { id: sourceVideoId },
      prompt: continuePrompt,
      seconds
    })
  });

  return parseJsonResponse(res);
}

async function openaiRetrieveVideo(videoId) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Video generation is not configured on the server.');
    err.code = 'MISSING_OPENAI_KEY';
    throw err;
  }

  const res = await fetch(`${OPENAI_VIDEOS_URL}/${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  return parseJsonResponse(res);
}

/**
 * Poll until completed, failed, or timeout.
 */
async function openaiPollVideoUntilDone(videoId, options = {}) {
  const segmentCount = Math.max(1, Number(options.segmentCount) || 1);
  const baseWaitMs = Number(process.env.PROJECT_AGENT_VIDEO_MAX_WAIT_MS) || 15 * 60 * 1000;
  const maxWaitMs = baseWaitMs * segmentCount;
  const intervalMs = Number(process.env.PROJECT_AGENT_VIDEO_POLL_MS) || 12_000;
  const started = Date.now();
  let last;

  while (Date.now() - started < maxWaitMs) {
    last = await openaiRetrieveVideo(videoId);
    const status = String(last.status || '').toLowerCase();

    if (status === 'completed') {
      return last;
    }
    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      const err = new Error(last?.error?.message || `Video generation ${status}`);
      err.code = 'VIDEO_FAILED';
      err.video = last;
      throw err;
    }

    if (options.onProgress) {
      options.onProgress(last);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  const err = new Error('Video generation timed out. Try again or use a shorter clip.');
  err.code = 'VIDEO_TIMEOUT';
  err.video = last;
  throw err;
}

/** Download completed MP4 bytes. */
async function openaiDownloadVideoContent(videoId) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('Video generation is not configured on the server.');
    err.code = 'MISSING_OPENAI_KEY';
    throw err;
  }

  const res = await fetch(`${OPENAI_VIDEOS_URL}/${encodeURIComponent(videoId)}/content`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data?.error?.message || 'Failed to download video');
    err.status = res.status;
    throw err;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const mime =
    res.headers.get('content-type')?.split(';')[0]?.trim() || 'video/mp4';
  return { buffer: buf, mimeType: mime };
}

module.exports = {
  openaiCreateVideo,
  openaiCreateVideoWithPlan,
  openaiExtendVideo,
  openaiRetrieveVideo,
  openaiPollVideoUntilDone,
  openaiDownloadVideoContent
};
