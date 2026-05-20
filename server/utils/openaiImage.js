/**
 * OpenAI image generation (shared with PFP generator pattern).
 */

async function openaiGenerateImage(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    const err = new Error('Image generation is not configured on the server.');
    err.code = 'MISSING_OPENAI_KEY';
    throw err;
  }

  const size = options.size || '1024x1024';
  const model = options.model || process.env.PROJECT_AGENT_IMAGE_MODEL || 'gpt-image-1';
  const quality = options.quality || process.env.PROJECT_AGENT_IMAGE_QUALITY || 'medium';

  const payload = {
    model,
    prompt: String(prompt).slice(0, 4000),
    size,
    quality,
    n: 1
  };

  const isGptImage = /^gpt-image-/.test(model);
  if (isGptImage) {
    payload.response_format = 'b64_json';
  } else {
    payload.response_format = 'b64_json';
  }

  let res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload)
  });

  let data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || '';
    if (payload.response_format && /response_format|b64/i.test(msg)) {
      delete payload.response_format;
      res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Image generation failed');
    err.status = res.status;
    throw err;
  }

  const item = data?.data?.[0];
  const usage = data?.usage || null;

  if (item?.b64_json) {
    return { base64: item.b64_json, mimeType: 'image/png', usage, quality, size, model };
  }

  if (item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) {
      throw new Error('Failed to fetch generated image URL');
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const mime = imgRes.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    return { base64: buf.toString('base64'), mimeType: mime, usage, quality, size, model };
  }

  throw new Error('Invalid image response from OpenAI');
}

/** @deprecated Use calculateImageGenerationCost from openaiImageCost.js */
function getImageGenerationCostUsd() {
  const v = Number(process.env.PROJECT_AGENT_IMAGE_COST_USD);
  return Number.isFinite(v) && v > 0 ? v : 0.042;
}

module.exports = {
  openaiGenerateImage,
  getImageGenerationCostUsd
};
