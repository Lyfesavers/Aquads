const sharp = require('sharp');
const ProjectAgentThread = require('../models/ProjectAgentThread');
const ProjectAgentMessage = require('../models/ProjectAgentMessage');
const { loadProjectAgentScope } = require('../utils/projectAgentScope');
const {
  buildProjectImagePrompt,
  buildProjectVideoPrompt
} = require('../utils/projectAgentContext');
const { openaiGenerateImage } = require('../utils/openaiImage');
const {
  calculateImageGenerationCost,
  estimateImageHoldUsd
} = require('../utils/openaiImageCost');
const { openaiCreateVideoWithPlan } = require('../utils/openaiVideo');
const {
  estimateVideoHoldUsd,
  normalizeModel,
  normalizeSize,
  normalizeSeconds,
  planVideoSegments
} = require('../utils/openaiVideoCost');
const { usdToCents, centsToUsd } = require('../utils/kimiCost');
const {
  grantStarterIfNeeded,
  reserveBalance,
  releaseHold,
  settleHold,
  walletResponse,
  getOrCreateWallet
} = require('./projectAgentWallet');

const MAX_MEDIA_PROMPT_CHARS = 4000;

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;
  return key && String(key).trim() ? String(key).trim() : null;
}

/**
 * Resolve the listing/freelancer/account scope and the active thread for a
 * media tool call. Mirrors the auth/ownership checks the HTTP routes perform.
 */
async function loadScopeAndThread({ userId, username, emailVerified, adId, threadId }) {
  const scope = await loadProjectAgentScope(adId, { userId, username, emailVerified });
  if (scope.error) {
    return { error: scope.error, code: scope.code || 'SCOPE_ERROR' };
  }
  const thread = await ProjectAgentThread.findOne({ _id: threadId, userId, adId });
  if (!thread) {
    return { error: 'Conversation not found.', code: 'THREAD_NOT_FOUND' };
  }
  return { ad: scope.ad, user: scope.user, thread };
}

/**
 * Generate an image from a prompt and attach it to the active thread as an
 * assistant message. Billed to the project's Skipper wallet (reserve → settle).
 * Used by Skipper Agent's generate_image tool.
 */
async function createImageViaAgent({
  userId,
  username,
  emailVerified,
  adId,
  threadId,
  prompt,
  persistAssistantMessage = true,
  agentContext = null
}) {
  if (!getOpenAiKey()) {
    return { success: false, error: 'Image generation is not configured on the server.', code: 'NOT_CONFIGURED' };
  }

  const userContent = String(prompt || '').trim();
  if (!userContent) {
    return { success: false, error: 'Describe the image you want to create.', code: 'INVALID_INPUT' };
  }
  if (userContent.length > MAX_MEDIA_PROMPT_CHARS) {
    return { success: false, error: `Image prompt is too long (max ${MAX_MEDIA_PROMPT_CHARS} characters).`, code: 'INVALID_INPUT' };
  }

  const loaded = await loadScopeAndThread({ userId, username, emailVerified, adId, threadId });
  if (loaded.error) {
    return { success: false, error: loaded.error, code: loaded.code };
  }
  const { ad, user, thread } = loaded;

  await grantStarterIfNeeded(userId, ad);

  const imageModel = process.env.PROJECT_AGENT_IMAGE_MODEL || 'gpt-image-1';
  const imageQuality = process.env.PROJECT_AGENT_IMAGE_QUALITY || 'high';
  const holdUsd = estimateImageHoldUsd(imageModel, imageQuality);
  const holdCents = usdToCents(holdUsd);
  const useSessionHold = Boolean(agentContext?.sessionBilling && agentContext?.sessionHoldCents > 0);

  let reservation = null;
  if (useSessionHold) {
    const spent = Math.max(0, Number(agentContext.sessionMediaSpendCents) || 0);
    const ceiling = Math.max(0, Number(agentContext.sessionHoldCents) || 0);
    if (spent + holdCents > ceiling) {
      const wallet = await getOrCreateWallet(userId, ad.id);
      const headroomUsd = centsToUsd(Math.max(0, ceiling - spent));
      return {
        success: false,
        error: `This Agent message has about $${headroomUsd} left in its prepaid hold; generating this image needs about $${holdUsd.toFixed(2)}. Add funds or start a new chat.`,
        code: 'INSUFFICIENT_BALANCE',
        balanceUsd: walletResponse(wallet).balanceUsd,
        requiredUsd: holdUsd.toFixed(2),
        sessionHoldUsd: centsToUsd(ceiling)
      };
    }
  } else {
    reservation = await reserveBalance(userId, ad.id, holdCents, {
      provider: 'openai',
      mode: 'image',
      model: imageModel,
      quality: imageQuality,
      threadId: String(thread._id),
      via: 'agent',
      estimatedHoldUsd: holdUsd.toFixed(4)
    });

    if (!reservation) {
      const wallet = await getOrCreateWallet(userId, ad.id);
      return {
        success: false,
        error: `Insufficient Skipper wallet balance. Image generation needs about $${holdUsd.toFixed(2)} available — ask the user to add funds.`,
        code: 'INSUFFICIENT_BALANCE',
        balanceUsd: walletResponse(wallet).balanceUsd,
        requiredUsd: holdUsd.toFixed(2)
      };
    }
  }

  let pngBase64;
  let usage;
  let quality;
  let model;
  try {
    ({ base64: pngBase64, usage, quality, model } = await openaiGenerateImage(
      buildProjectImagePrompt(ad, userContent, user),
      { model: imageModel, quality: imageQuality }
    ));
  } catch (genErr) {
    if (!useSessionHold) {
      await releaseHold(userId, ad.id, holdCents, { provider: 'openai', reason: 'openai_error', mode: 'image' });
    }
    return { success: false, error: genErr.message || 'Image generation failed.', code: 'GENERATION_FAILED' };
  }

  const { costUsd, breakdown, method } = calculateImageGenerationCost(usage, model || imageModel, quality);
  const imageCostCents = usdToCents(costUsd);

  let jpegBase64;
  try {
    const jpegBuffer = await sharp(Buffer.from(pngBase64, 'base64'))
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    jpegBase64 = jpegBuffer.toString('base64');
  } catch (encodeErr) {
    if (!useSessionHold) {
      await settleHold(userId, ad.id, holdCents, imageCostCents, {
        provider: 'openai',
        reason: 'encode_error',
        mode: 'image',
        via: 'agent'
      });
    }
    return { success: false, error: 'Failed to process the generated image.', code: 'ENCODE_FAILED' };
  }

  let balanceUsd;
  if (useSessionHold) {
    agentContext.sessionMediaSpendCents =
      (Number(agentContext.sessionMediaSpendCents) || 0) + imageCostCents;
    const wallet = await getOrCreateWallet(userId, ad.id);
    balanceUsd = walletResponse(wallet).balanceUsd;
  } else {
    const settleResult = await settleHold(userId, ad.id, holdCents, imageCostCents, {
      mode: 'image',
      provider: 'openai',
      model: model || imageModel,
      usage: usage || {},
      billingMethod: method,
      costBreakdown: breakdown,
      threadId: String(thread._id),
      via: 'agent'
    });

    if (!settleResult?.settled) {
      return { success: false, error: 'Insufficient balance for image generation.', code: 'INSUFFICIENT_BALANCE' };
    }
    balanceUsd = walletResponse(settleResult.wallet).balanceUsd;
  }

  const baseResult = {
    success: true,
    costUsd: costUsd.toFixed(6),
    costCents: imageCostCents,
    billingMethod: method,
    balanceUsd,
    message: 'Image created and shown to the user in the chat.',
    jpegBase64,
    imageMimeType: 'image/jpeg'
  };

  if (!persistAssistantMessage) {
    thread.updatedAt = new Date();
    await thread.save();
    return baseResult;
  }

  const assistantMsg = await ProjectAgentMessage.create({
    threadId: thread._id,
    role: 'assistant',
    content: 'Generated image for your project.',
    mode: 'image',
    hasImage: true,
    imageJpegBase64: jpegBase64,
    imageMimeType: 'image/jpeg',
    costCents: imageCostCents
  });

  thread.updatedAt = new Date();
  await thread.save();

  return {
    ...baseResult,
    messageId: String(assistantMsg._id)
  };
}

/**
 * Start a Sora text-to-video render for the active thread. Returns immediately
 * with a queued assistant message; the client polls /video-status for progress.
 * Used by Skipper Agent's generate_video tool.
 */
async function startVideoViaAgent({ userId, username, emailVerified, adId, threadId, prompt, seconds }) {
  if (!getOpenAiKey()) {
    return { success: false, error: 'Video generation is not configured on the server.', code: 'NOT_CONFIGURED' };
  }

  const userContent = String(prompt || '').trim();
  if (!userContent) {
    return { success: false, error: 'Describe the video you want to create.', code: 'INVALID_INPUT' };
  }
  if (userContent.length > MAX_MEDIA_PROMPT_CHARS) {
    return { success: false, error: `Video prompt is too long (max ${MAX_MEDIA_PROMPT_CHARS} characters).`, code: 'INVALID_INPUT' };
  }

  const loaded = await loadScopeAndThread({ userId, username, emailVerified, adId, threadId });
  if (loaded.error) {
    return { success: false, error: loaded.error, code: loaded.code };
  }
  const { ad, user, thread } = loaded;

  await grantStarterIfNeeded(userId, ad);

  const videoModel = normalizeModel(process.env.PROJECT_AGENT_VIDEO_MODEL || 'sora-2');
  const videoSize = normalizeSize(process.env.PROJECT_AGENT_VIDEO_SIZE || '1280x720', videoModel);
  const videoSeconds = normalizeSeconds(seconds || process.env.PROJECT_AGENT_VIDEO_SECONDS || 20);
  const segmentPlan = planVideoSegments(videoSeconds);
  const holdUsd = estimateVideoHoldUsd(videoModel, videoSize, videoSeconds);
  const holdCents = usdToCents(holdUsd);

  const reservation = await reserveBalance(userId, ad.id, holdCents, {
    provider: 'openai',
    mode: 'video',
    model: videoModel,
    size: videoSize,
    seconds: videoSeconds,
    threadId: String(thread._id),
    via: 'agent',
    estimatedHoldUsd: holdUsd.toFixed(4)
  });

  if (!reservation) {
    const wallet = await getOrCreateWallet(userId, ad.id);
    return {
      success: false,
      error: `Insufficient Skipper wallet balance. A ${videoSeconds}s video needs about $${holdUsd.toFixed(2)} available — ask the user to add funds.`,
      code: 'INSUFFICIENT_BALANCE',
      balanceUsd: walletResponse(wallet).balanceUsd,
      requiredUsd: holdUsd.toFixed(2)
    };
  }

  const videoPrompt = buildProjectVideoPrompt(ad, userContent, user);
  let openaiJob;
  let extensionQueue = segmentPlan.extensions;
  try {
    const created = await openaiCreateVideoWithPlan(videoPrompt, {
      model: videoModel,
      size: videoSize,
      targetSeconds: videoSeconds,
      plan: segmentPlan
    });
    openaiJob = created.job;
    if (created.usedFallback && created.plan?.extensions) {
      extensionQueue = created.plan.extensions;
    }
  } catch (genErr) {
    await releaseHold(userId, ad.id, holdCents, { provider: 'openai', reason: 'openai_error', mode: 'video' });
    return { success: false, error: genErr.message || 'Video generation failed.', code: 'GENERATION_FAILED' };
  }

  const assistantMsg = await ProjectAgentMessage.create({
    threadId: thread._id,
    role: 'assistant',
    content: 'Generating video…',
    mode: 'video',
    videoStatus: String(openaiJob.status || 'queued').toLowerCase(),
    videoOpenaiId: openaiJob.id,
    videoProgress: Number(openaiJob.progress) || 0,
    videoModel,
    videoSize,
    videoSeconds,
    videoTargetSeconds: videoSeconds,
    videoExtensionQueue: extensionQueue,
    videoPrompt,
    videoHoldCents: holdCents
  });

  thread.updatedAt = new Date();
  await thread.save();

  return {
    success: true,
    messageId: String(assistantMsg._id),
    status: assistantMsg.videoStatus,
    progress: assistantMsg.videoProgress,
    seconds: videoSeconds,
    estimatedHoldUsd: holdUsd.toFixed(4),
    balanceUsd: walletResponse(reservation.wallet).balanceUsd,
    message:
      'Video render started. It takes a few minutes and will appear in the chat automatically when ready.'
  };
}

module.exports = {
  createImageViaAgent,
  startVideoViaAgent
};
