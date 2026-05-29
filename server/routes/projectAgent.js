const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const requireEmailVerification = require('../middleware/emailVerification');
const Ad = require('../models/Ad');
const ProjectAgentThread = require('../models/ProjectAgentThread');
const ProjectAgentMessage = require('../models/ProjectAgentMessage');
const ProjectAgentLedger = require('../models/ProjectAgentLedger');
const sharp = require('sharp');
const {
  buildProjectAgentSystemPrompt,
  buildProjectImagePrompt,
  buildProjectVideoPrompt
} = require('../utils/projectAgentContext');
const {
  FREELANCER_SCOPE_AD_ID,
  ACCOUNT_SCOPE_AD_ID,
  TRIAL_STARTER_CENTS,
  userHasFreelancerAccess,
  resolveAgentScopeLabel,
  loadProjectAgentScope
} = require('../utils/projectAgentScope');
const User = require('../models/User');
const { getListingTier, LISTING_TIER_PREMIUM } = require('../utils/listingTier');
const {
  kimiUsageToUsd,
  usdToCents,
  centsToUsd,
  resolveModelPricing,
  estimateKimiChatHoldCents,
  estimateKimiChatHoldUsd,
  estimateKimiAgentHoldCents,
  estimateKimiAgentHoldUsd,
  kimiChatCostUsd,
  getWebSearchCallUsd
} = require('../utils/kimiCost');
const { runKimiAgentChat } = require('../utils/kimiAgentTools');
const {
  getLimits,
  resolveMaxOutputTokens,
  maxOutputTokensForMode
} = require('../utils/projectAgentLimits');
const { openaiGenerateImage } = require('../utils/openaiImage');
const {
  calculateImageGenerationCost,
  resolveImageModelPricing,
  estimateImageHoldUsd
} = require('../utils/openaiImageCost');
const {
  openaiCreateVideoWithPlan,
  openaiExtendVideo,
  openaiRetrieveVideo,
  openaiDownloadVideoContent
} = require('../utils/openaiVideo');
const {
  calculateVideoGenerationCost,
  estimateVideoHoldUsd,
  normalizeModel,
  normalizeSize,
  normalizeSeconds,
  planVideoSegments,
  USER_VIDEO_SECONDS
} = require('../utils/openaiVideoCost');
const ProjectAgentTopup = require('../models/ProjectAgentTopup');
const {
  grantStarterIfNeeded,
  reserveBalance,
  releaseHold,
  settleHold,
  walletResponse,
  getOrCreateWallet,
  computeTopupPricing,
  LOAD_FEE_RATE
} = require('../services/projectAgentWallet');

const AQUADS_PUBLIC_ORIGIN = (process.env.AQUADS_PUBLIC_URL || 'https://www.aquads.xyz').replace(
  /\/$/,
  ''
);

function buildAquaPayTopupUrl(topup) {
  const returnUrl = topup.returnPath.startsWith('http')
    ? topup.returnPath
    : `${AQUADS_PUBLIC_ORIGIN}${topup.returnPath}`;
  const params = new URLSearchParams({
    amount: String(topup.payUsd),
    projectAgentTopupId: topup.topupId,
    returnUrl
  });
  return `${AQUADS_PUBLIC_ORIGIN}/pay/aquads?${params.toString()}`;
}

const router = express.Router();

const PROJECT_AGENT_VIDEO_DIR = path.join(__dirname, '../data/project-agent-videos');
const VIDEO_MAX_BYTES =
  Number(process.env.PROJECT_AGENT_VIDEO_MAX_BYTES) || 80 * 1024 * 1024;
/** Prevent duplicate background finalize runs for the same message */
const videoFinalizeInFlight = new Set();
/** Throttle OpenAI status polls (frontend may retry; avoid hammering Sora API) */
const videoOpenAiPollMinMs = Number(process.env.PROJECT_AGENT_VIDEO_OPENAI_POLL_MS) || 10_000;
const videoOpenAiLastPoll = new Map();

function ensureVideoDir() {
  if (!fs.existsSync(PROJECT_AGENT_VIDEO_DIR)) {
    fs.mkdirSync(PROJECT_AGENT_VIDEO_DIR, { recursive: true });
  }
}

function videoFilePath(storageKey) {
  const safe = path.basename(String(storageKey || ''));
  return path.join(PROJECT_AGENT_VIDEO_DIR, safe);
}

const KIMI_BASE = (process.env.KIMI_API_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/$/, '');
const KIMI_MODEL = process.env.PROJECT_AGENT_MODEL || process.env.KIMI_MODEL || 'kimi-k2.6';
const CHAT_MODES = ['instant', 'thinking', 'agent'];
const LEGACY_CHAT_MODES = ['websearch'];

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: getLimits().chatRateLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many agent requests. Please wait a moment.' }
});

function getKimiKey() {
  const key = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  return key && String(key).trim() ? String(key).trim() : null;
}

function getOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;
  return key && String(key).trim() ? String(key).trim() : null;
}

function messageHasImage(m) {
  if (m?.hasImage === true) return true;
  const b64 = m?.imageJpegBase64;
  return typeof b64 === 'string' && b64.length > 100;
}

function messageHasVideo(m) {
  if (m?.hasVideo === true) return true;
  return Boolean(m?.videoStorageKey && m?.videoStatus === 'completed');
}

function serializeMessage(m) {
  return {
    _id: m._id != null ? String(m._id) : m._id,
    role: m.role,
    content: m.content,
    reasoningContent: m.reasoningContent,
    mode: m.mode,
    usage: m.usage,
    costCents: m.costCents,
    createdAt: m.createdAt,
    hasImage: messageHasImage(m),
    hasVideo: messageHasVideo(m),
    videoStatus: m.videoStatus || '',
    videoProgress: m.videoProgress ?? null,
    videoModel: m.videoModel || '',
    videoSize: m.videoSize || '',
    videoSeconds: m.videoSeconds || 0,
    videoTargetSeconds: m.videoTargetSeconds || m.videoSeconds || 0
  };
}

async function assertMessageImageAccess(messageId, userId) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return { error: 'Invalid message id.', status: 400 };
  }
  const msg = await ProjectAgentMessage.findById(messageId).select('threadId imageJpegBase64 imageMimeType');
  if (!msg?.imageJpegBase64) {
    return { error: 'Image not found.', status: 404 };
  }
  const thread = await ProjectAgentThread.findById(msg.threadId).select('userId adId');
  if (!thread || String(thread.userId) !== String(userId)) {
    return { error: 'Not found.', status: 404 };
  }
  return { msg, thread };
}

async function assertMessageVideoAccess(messageId, userId) {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return { error: 'Invalid message id.', status: 400 };
  }
  const msg = await ProjectAgentMessage.findById(messageId).select(
    'threadId hasVideo videoStorageKey videoStatus videoMimeType'
  );
  if (!msg?.videoStorageKey || msg.videoStatus !== 'completed') {
    return { error: 'Video not found.', status: 404 };
  }
  const thread = await ProjectAgentThread.findById(msg.threadId).select('userId adId');
  if (!thread || String(thread.userId) !== String(userId)) {
    return { error: 'Not found.', status: 404 };
  }
  const filePath = videoFilePath(msg.videoStorageKey);
  if (!fs.existsSync(filePath)) {
    return { error: 'Video file missing.', status: 404 };
  }
  return { msg, thread, filePath };
}

/**
 * Download MP4, save to disk, settle wallet — runs outside the HTTP poll (Railway timeouts).
 */
async function finalizeVideoAssetInBackground(messageId, adId, userId, openaiVideoId) {
  const id = String(messageId);
  if (videoFinalizeInFlight.has(id)) return;
  videoFinalizeInFlight.add(id);

  try {
    const claim = await ProjectAgentMessage.findById(messageId);
    if (!claim || claim.hasVideo || claim.videoStatus === 'failed') return;

    const holdCents = claim.videoHoldCents || 0;
    const job = await openaiRetrieveVideo(openaiVideoId);

    const { buffer, mimeType } = await openaiDownloadVideoContent(openaiVideoId);
    if (buffer.length > VIDEO_MAX_BYTES) {
      throw new Error('Generated video exceeds size limit.');
    }

    ensureVideoDir();
    const storageKey = `${id}.mp4`;
    const filePath = videoFilePath(storageKey);
    fs.writeFileSync(filePath, buffer);

    const { costUsd, breakdown, method } = calculateVideoGenerationCost(job, {
      model: claim.videoModel,
      size: claim.videoSize,
      seconds: claim.videoSeconds
    });
    const videoCostCents = usdToCents(costUsd);

    const settleResult = await settleHold(userId, adId, holdCents, videoCostCents, {
      mode: 'video',
      provider: 'openai',
      model: job.model || claim.videoModel,
      videoOpenaiId: openaiVideoId,
      billingMethod: method,
      costBreakdown: breakdown,
      threadId: String(claim.threadId)
    });

    if (!settleResult?.settled) {
      fs.unlink(filePath, () => {});
      if (holdCents > 0) {
        await releaseHold(userId, adId, holdCents, {
          provider: 'openai',
          mode: 'video',
          reason: 'insufficient_balance'
        });
      }
      claim.videoStatus = 'failed';
      claim.videoHoldCents = 0;
      claim.content = 'Insufficient balance to complete video billing.';
      await claim.save();
      return;
    }

    claim.hasVideo = true;
    claim.videoStatus = 'completed';
    claim.videoProgress = 100;
    claim.videoStorageKey = storageKey;
    claim.videoMimeType = mimeType || 'video/mp4';
    claim.videoHoldCents = 0;
    claim.costCents = videoCostCents;
    claim.content = 'Generated video for your project.';
    await claim.save();
  } catch (err) {
    console.error('[project-agent] video background finalize error:', err);
    const claim = await ProjectAgentMessage.findById(messageId);
    if (!claim) return;
    const holdCents = claim.videoHoldCents || 0;
    if (holdCents > 0) {
      await releaseHold(userId, adId, holdCents, {
        provider: 'openai',
        mode: 'video',
        reason: 'finalize_error'
      });
    }
    claim.videoStatus = 'failed';
    claim.videoHoldCents = 0;
    claim.content = err.message || 'Video download failed.';
    await claim.save();
  } finally {
    videoFinalizeInFlight.delete(id);
  }
}

function scheduleVideoFinalize(messageId, adId, userId, openaiVideoId) {
  setImmediate(() => {
    finalizeVideoAssetInBackground(messageId, adId, userId, openaiVideoId).catch((err) => {
      console.error('[project-agent] unhandled video finalize:', err);
    });
  });
}

/**
 * Poll OpenAI; heavy download/billing runs in background. Idempotent when already completed.
 */
async function syncProjectAgentVideoJob(assistantMsg, adId, userId) {
  if (assistantMsg.hasVideo && assistantMsg.videoStorageKey) {
    return {
      status: 'completed',
      progress: 100,
      costCents: assistantMsg.costCents || 0,
      costUsd: assistantMsg.costCents
        ? (assistantMsg.costCents / 100).toFixed(6)
        : undefined,
      message: serializeMessage(assistantMsg.toObject ? assistantMsg.toObject() : assistantMsg)
    };
  }

  if (assistantMsg.videoStatus === 'failed') {
    return {
      status: 'failed',
      error: assistantMsg.content || 'Video generation failed.',
      message: serializeMessage(assistantMsg.toObject ? assistantMsg.toObject() : assistantMsg)
    };
  }

  if (assistantMsg.videoStatus === 'finalizing') {
    return {
      status: 'finalizing',
      progress: assistantMsg.videoProgress ?? 100,
      message: serializeMessage(assistantMsg.toObject ? assistantMsg.toObject() : assistantMsg)
    };
  }

  const videoId = assistantMsg.videoOpenaiId;
  if (!videoId) {
    return { status: 'failed', error: 'Missing video job id.' };
  }

  const msgKey = String(assistantMsg._id);
  const lastPoll = videoOpenAiLastPoll.get(msgKey) || 0;
  const now = Date.now();
  if (now - lastPoll < videoOpenAiPollMinMs) {
    const cachedStatus =
      assistantMsg.videoStatus === 'in_progress' ? 'in_progress' : 'queued';
    return {
      status: cachedStatus,
      progress: assistantMsg.videoProgress ?? 0,
      message: serializeMessage(assistantMsg.toObject ? assistantMsg.toObject() : assistantMsg)
    };
  }
  videoOpenAiLastPoll.set(msgKey, now);

  const job = await openaiRetrieveVideo(videoId);
  const status = String(job.status || 'queued').toLowerCase();
  const progress = Number(job.progress) || 0;

  if (status === 'failed' || status === 'cancelled' || status === 'expired') {
    const holdCents = assistantMsg.videoHoldCents || 0;
    if (holdCents > 0) {
      await releaseHold(userId, adId, holdCents, {
        provider: 'openai',
        mode: 'video',
        reason: status,
        videoOpenaiId: videoId
      });
    }
    assistantMsg.videoStatus = 'failed';
    assistantMsg.videoProgress = progress;
    assistantMsg.videoHoldCents = 0;
    assistantMsg.content = job?.error?.message || `Video generation ${status}.`;
    await assistantMsg.save();
    return {
      status: 'failed',
      progress,
      error: assistantMsg.content,
      message: serializeMessage(assistantMsg.toObject())
    };
  }

  if (status !== 'completed') {
    const mappedStatus = status === 'in_progress' ? 'in_progress' : 'queued';
    assistantMsg.videoStatus = mappedStatus;
    assistantMsg.videoProgress = progress;
    await assistantMsg.save();
    return {
      status: mappedStatus,
      progress,
      message: serializeMessage(assistantMsg.toObject())
    };
  }

  const pendingExtensions = Array.isArray(assistantMsg.videoExtensionQueue)
    ? assistantMsg.videoExtensionQueue.filter((n) => n > 0)
    : [];
  if (pendingExtensions.length > 0) {
    const nextSecs = pendingExtensions[0];
    try {
      const extJob = await openaiExtendVideo(assistantMsg.videoOpenaiId, assistantMsg.videoPrompt, {
        seconds: nextSecs,
        extendPrompt: `${assistantMsg.videoPrompt || ''} Continue the scene seamlessly with matching motion and style.`
      });
      assistantMsg.videoOpenaiId = extJob.id;
      assistantMsg.videoExtensionQueue = pendingExtensions.slice(1);
      assistantMsg.videoStatus = String(extJob.status || 'queued').toLowerCase();
      assistantMsg.videoProgress = Number(extJob.progress) || 0;
      await assistantMsg.save();
      return {
        status: assistantMsg.videoStatus,
        progress: assistantMsg.videoProgress,
        message: serializeMessage(assistantMsg.toObject())
      };
    } catch (extErr) {
      console.error('[project-agent] video extension error:', extErr);
      const holdCents = assistantMsg.videoHoldCents || 0;
      if (holdCents > 0) {
        await releaseHold(userId, adId, holdCents, {
          provider: 'openai',
          mode: 'video',
          reason: 'extension_error'
        });
      }
      assistantMsg.videoStatus = 'failed';
      assistantMsg.videoHoldCents = 0;
      assistantMsg.content = extErr.message || 'Video extension failed.';
      await assistantMsg.save();
      return {
        status: 'failed',
        error: assistantMsg.content,
        message: serializeMessage(assistantMsg.toObject())
      };
    }
  }

  const claim = await ProjectAgentMessage.findOneAndUpdate(
    {
      _id: assistantMsg._id,
      hasVideo: false,
      videoStatus: { $nin: ['failed', 'completed', 'finalizing'] }
    },
    { $set: { videoStatus: 'finalizing', videoProgress: 100 } },
    { new: true }
  );

  if (!claim) {
    const fresh = await ProjectAgentMessage.findById(assistantMsg._id);
    if (fresh?.hasVideo) {
      return {
        status: 'completed',
        progress: 100,
        message: serializeMessage(fresh.toObject())
      };
    }
    if (fresh?.videoStatus === 'finalizing') {
      scheduleVideoFinalize(fresh._id, adId, userId, fresh.videoOpenaiId || videoId);
      return {
        status: 'finalizing',
        progress: fresh.videoProgress ?? 100,
        message: serializeMessage(fresh.toObject())
      };
    }
    return { status: 'in_progress', progress };
  }

  scheduleVideoFinalize(claim._id, adId, userId, videoId);

  return {
    status: 'finalizing',
    progress: 100,
    message: serializeMessage(claim.toObject())
  };
}

async function loadThread(threadId, userId, adId) {
  const thread = await ProjectAgentThread.findOne({
    _id: threadId,
    userId,
    adId
  });
  if (!thread) {
    return { error: 'Conversation not found.', status: 404 };
  }
  return { thread };
}

async function listProjectAgentThreads(userId, adId) {
  return ProjectAgentThread.find({
    userId,
    adId
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .select('title createdAt updatedAt')
    .lean();
}

function modeToThinking(mode) {
  return mode === 'instant' ? { type: 'disabled' } : { type: 'enabled' };
}

function isAgentToolsMode(mode) {
  return mode === 'agent' || mode === 'websearch';
}

function normalizeChatMode(mode) {
  if (mode === 'websearch') return 'agent';
  return mode;
}

function buildKimiMessages(systemPrompt, history, userContent) {
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const m of history) {
    if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      const msg = { role: 'assistant', content: m.content || '' };
      if (m.reasoningContent) {
        msg.reasoning_content = m.reasoningContent;
      }
      messages.push(msg);
    }
  }
  messages.push({ role: 'user', content: userContent });
  return messages;
}

router.get('/health', (req, res) => {
  const pricing = resolveModelPricing(KIMI_MODEL);
  res.json({
    ok: true,
    service: 'project-agent',
    configured: !!getKimiKey(),
    imageGenerationConfigured: !!getOpenAiKey(),
    videoGenerationConfigured: !!getOpenAiKey(),
    videoModel: process.env.PROJECT_AGENT_VIDEO_MODEL || 'sora-2',
    videoSecondsOptions: USER_VIDEO_SECONDS,
    videoSecondsDefault: normalizeSeconds(process.env.PROJECT_AGENT_VIDEO_SECONDS || 15),
    videoPricingPerSecondUsd: {
      'sora-2': 0.1,
      'sora-2-pro_720p': 0.3,
      'sora-2-pro_1024p': 0.5,
      'sora-2-pro_1080p': 0.7
    },
    model: KIMI_MODEL,
    baseUrl: KIMI_BASE,
    imageModel: process.env.PROJECT_AGENT_IMAGE_MODEL || 'gpt-image-1',
    imagePricingPerM: resolveImageModelPricing(process.env.PROJECT_AGENT_IMAGE_MODEL || 'gpt-image-1'),
    pricingPerM: {
      inputUsd: pricing.input,
      outputUsd: pricing.output,
      cachedUsd: pricing.cached
    },
    webSearchCallUsd: getWebSearchCallUsd(),
    agentTools: {
      webSearch: 'builtin:$web_search',
      optionalFormulas:
        process.env.PROJECT_AGENT_AGENT_FORMULAS !== undefined
          ? process.env.PROJECT_AGENT_AGENT_FORMULAS.split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      optionalFormulasHint:
        'Set PROJECT_AGENT_AGENT_FORMULAS=moonshot/fetch:latest (comma-separated) if your Kimi key supports Formula tools'
    },
    limits: getLimits(),
    starterGrants: {
      premiumUsd: ((Number(process.env.PROJECT_AGENT_STARTER_CENTS) || 500) / 100).toFixed(2),
      trialUsd: (TRIAL_STARTER_CENTS / 100).toFixed(2),
      freelancerUsd: (TRIAL_STARTER_CENTS / 100).toFixed(2),
      freelancerScopeAdId: FREELANCER_SCOPE_AD_ID,
      accountScopeAdId: ACCOUNT_SCOPE_AD_ID
    }
  });
});

router.use(auth, requireEmailVerification);

router.get('/eligible', async (req, res) => {
  try {
    if (!req.user.emailVerified) {
      return res.json({
        eligible: [],
        hasAccess: false,
        code: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }

    const dbUser = await User.findById(req.user.userId).select('userType image username').lean();

    const ads = await Ad.find({
      owner: req.user.username,
      status: { $in: ['active', 'approved'] }
    })
      .select('id title logo listingTier blockchain')
      .lean();

    const eligible = ads.map((a) => ({
      id: a.id,
      title: a.title,
      logo: a.logo,
      blockchain: a.blockchain,
      scope: getListingTier(a) === LISTING_TIER_PREMIUM ? 'premium' : 'starter',
      starterUsd: getListingTier(a) === LISTING_TIER_PREMIUM ? '5.00' : '1.00'
    }));

    if (userHasFreelancerAccess(dbUser?.userType)) {
      eligible.unshift({
        id: FREELANCER_SCOPE_AD_ID,
        title: 'My freelancer workspace',
        logo: dbUser?.image || '',
        blockchain: '',
        scope: 'freelancer',
        starterUsd: '1.00'
      });
    }

    if (eligible.length === 0) {
      eligible.push({
        id: ACCOUNT_SCOPE_AD_ID,
        title: 'My workspace',
        logo: dbUser?.image || '',
        blockchain: '',
        scope: 'account',
        starterUsd: '1.00'
      });
    }

    res.json({ eligible, hasAccess: true });
  } catch (err) {
    console.error('[project-agent] eligible error:', err);
    res.status(500).json({ error: 'Failed to load eligible projects.' });
  }
});

router.get('/wallet/:adId', async (req, res) => {
  try {
    const { ad, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const { wallet, granted, grantCents } = await grantStarterIfNeeded(req.user.userId, ad);

    const scope = resolveAgentScopeLabel(ad);
    res.json({
      ad: { id: ad.id, title: ad.title, logo: ad.logo, scope },
      ...walletResponse(wallet, { starterGrantCents: grantCents || undefined, scope, ad }),
      starterJustGranted: granted,
      grantCents: granted ? grantCents : 0,
      loadFeeRate: LOAD_FEE_RATE
    });
  } catch (err) {
    console.error('[project-agent] wallet error:', err);
    res.status(500).json({ error: 'Failed to load wallet.' });
  }
});

router.get('/ledger/:adId', async (req, res) => {
  try {
    const { error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const entries = await ProjectAgentLedger.find({
      userId: req.user.userId,
      adId: req.params.adId
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ entries });
  } catch (err) {
    console.error('[project-agent] ledger error:', err);
    res.status(500).json({ error: 'Failed to load ledger.' });
  }
});

router.get('/threads/:adId', async (req, res) => {
  try {
    const { error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const threads = await listProjectAgentThreads(req.user.userId, req.params.adId);

    res.json({ threads });
  } catch (err) {
    console.error('[project-agent] threads error:', err);
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

router.post('/threads/:adId', async (req, res) => {
  try {
    const { ad, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    await grantStarterIfNeeded(req.user.userId, ad);

    const title = String(req.body?.title || 'New chat').trim().slice(0, 200) || 'New chat';
    const thread = await ProjectAgentThread.create({
      userId: req.user.userId,
      adId: ad.id,
      title
    });

    res.status(201).json({ thread });
  } catch (err) {
    console.error('[project-agent] create thread error:', err);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

/** Delete a conversation and its messages (auth — owner only) */
router.delete('/threads/:adId/:threadId', async (req, res) => {
  try {
    const { ad, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      req.params.adId
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    const msgs = await ProjectAgentMessage.find({ threadId: thread._id })
      .select('videoStorageKey')
      .lean();

    for (const m of msgs) {
      if (!m.videoStorageKey) continue;
      const filePath = videoFilePath(m.videoStorageKey);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('[project-agent] video file unlink failed:', unlinkErr.message);
      }
    }

    await ProjectAgentMessage.deleteMany({ threadId: thread._id });
    await ProjectAgentThread.deleteOne({ _id: thread._id, userId: req.user.userId });

    let threads = await listProjectAgentThreads(req.user.userId, req.params.adId);

    if (threads.length === 0) {
      await grantStarterIfNeeded(req.user.userId, ad);
      const replacement = await ProjectAgentThread.create({
        userId: req.user.userId,
        adId: ad.id,
        title: 'New chat'
      });
      threads = [
        {
          _id: replacement._id,
          title: replacement.title,
          createdAt: replacement.createdAt,
          updatedAt: replacement.updatedAt
        }
      ];
    }

    res.json({
      ok: true,
      deletedId: String(thread._id),
      threads
    });
  } catch (err) {
    console.error('[project-agent] delete thread error:', err);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

router.get('/threads/:adId/:threadId/messages', async (req, res) => {
  try {
    const { error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      req.params.adId
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    const messages = await ProjectAgentMessage.aggregate([
      { $match: { threadId: thread._id } },
      { $sort: { createdAt: 1 } },
      {
        $project: {
          role: 1,
          content: 1,
          reasoningContent: 1,
          mode: 1,
          usage: 1,
          costCents: 1,
          createdAt: 1,
          hasImage: {
            $cond: {
              if: { $eq: ['$hasImage', true] },
              then: true,
              else: {
                $gt: [{ $strLenCP: { $ifNull: ['$imageJpegBase64', ''] } }, 100]
              }
            }
          },
          hasVideo: {
            $cond: {
              if: { $eq: ['$hasVideo', true] },
              then: true,
              else: {
                $and: [
                  { $gt: [{ $strLenCP: { $ifNull: ['$videoStorageKey', ''] } }, 0] },
                  { $eq: ['$videoStatus', 'completed'] }
                ]
              }
            }
          },
          videoStatus: 1,
          videoProgress: 1,
          videoModel: 1,
          videoSize: 1,
          videoSeconds: 1,
          videoTargetSeconds: 1
        }
      }
    ]);

    res.json({
      thread,
      messages: messages.map((m) => serializeMessage(m))
    });
  } catch (err) {
    console.error('[project-agent] messages error:', err);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

router.post('/chat/:adId/:threadId', chatLimiter, async (req, res) => {
  const apiKey = getKimiKey();
  if (!apiKey) {
    return res.status(503).json({ error: 'Skipper Agent is not configured on the server.' });
  }

  const rawMode = req.body?.mode;
  const mode = CHAT_MODES.includes(rawMode)
    ? rawMode
    : LEGACY_CHAT_MODES.includes(rawMode)
      ? 'agent'
      : 'instant';
  const storedMode = normalizeChatMode(mode);
  const userContent = String(req.body?.message || '').trim();
  const limits = getLimits();
  if (!userContent || userContent.length > limits.maxUserMessageChars) {
    return res.status(400).json({
      error: `Message is required (max ${limits.maxUserMessageChars.toLocaleString()} characters).`
    });
  }

  let holdCents = 0;

  try {
    const { ad, user, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      ad.id
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    await grantStarterIfNeeded(req.user.userId, ad);

    const history = await ProjectAgentMessage.find({ threadId: thread._id })
      .sort({ createdAt: -1 })
      .limit(limits.maxHistoryMessages)
      .select('role content reasoningContent')
      .lean();
    history.reverse();

    const systemPrompt = buildProjectAgentSystemPrompt(ad, storedMode, user);
    const kimiMessages = buildKimiMessages(systemPrompt, history, userContent);
    const maxTokens = resolveMaxOutputTokens({
      mode: storedMode,
      systemPrompt,
      messages: kimiMessages
    });

    const holdOpts = {
      systemPrompt,
      messages: kimiMessages,
      maxTokens,
      modelId: KIMI_MODEL,
      mode: isAgentToolsMode(storedMode) ? 'instant' : storedMode,
      agentMaxRounds: isAgentToolsMode(storedMode) ? limits.maxAgentRounds : undefined
    };

    holdCents = isAgentToolsMode(storedMode)
      ? estimateKimiAgentHoldCents(holdOpts)
      : estimateKimiChatHoldCents({ ...holdOpts, mode: storedMode });

    const estimatedHoldUsd = isAgentToolsMode(storedMode)
      ? estimateKimiAgentHoldUsd(holdOpts)
      : estimateKimiChatHoldUsd({ ...holdOpts, mode: storedMode });

    const reservation = await reserveBalance(req.user.userId, ad.id, holdCents, {
      provider: 'kimi',
      mode: storedMode,
      model: KIMI_MODEL,
      threadId: String(thread._id),
      estimatedHoldUsd: estimatedHoldUsd.toFixed(4)
    });

    if (!reservation) {
      const wallet = await getOrCreateWallet(req.user.userId, ad.id);
      return res.status(402).json({
        error: 'Insufficient balance for this message. Add funds or try a shorter conversation.',
        code: 'INSUFFICIENT_BALANCE',
        balanceUsd: walletResponse(wallet).balanceUsd,
        requiredUsd: centsToUsd(holdCents)
      });
    }

    await ProjectAgentMessage.create({
      threadId: thread._id,
      role: 'user',
      content: userContent,
      mode: storedMode
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let fullContent = '';
    let fullReasoning = '';
    let usage = null;
    let webSearchCalls = 0;
    let costUsd = 0;
    let costCents = 0;
    let costBreakdown = null;
    let agentResult = null;

    const send = (obj) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    send({ type: 'start', mode: storedMode });

    if (isAgentToolsMode(storedMode)) {
      try {
        agentResult = await runKimiAgentChat({
          apiKey,
          baseUrl: KIMI_BASE,
          model: KIMI_MODEL,
          messages: kimiMessages,
          maxTokens,
          userMessage: userContent,
          send,
          agentContext: {
            userId: req.user.userId,
            username: req.user.username,
            emailVerified: req.user.emailVerified,
            adId: ad.id,
            threadId: String(thread._id)
          }
        });
        fullContent = agentResult.content || '';
        webSearchCalls = agentResult.webSearchCalls || 0;
        costBreakdown = kimiChatCostUsd({
          usages: agentResult.usages,
          webSearchCalls,
          modelId: KIMI_MODEL
        });
        usage = {
          ...costBreakdown.usage,
          web_search_calls: webSearchCalls
        };
        costUsd = costBreakdown.totalUsd;
        costCents = usdToCents(costUsd);
      } catch (agentErr) {
        await releaseHold(req.user.userId, ad.id, holdCents, {
          provider: 'kimi',
          reason: 'kimi_agent_error'
        });
        holdCents = 0;
        if (!res.headersSent) {
          return res.status(agentErr.status >= 400 && agentErr.status < 600 ? agentErr.status : 502).json({
            error: agentErr.message || 'Agent request failed'
          });
        }
        send({ type: 'error', error: agentErr.message || 'Agent request failed' });
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } else {
      const kimiBody = {
        model: KIMI_MODEL,
        messages: kimiMessages,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: maxTokens,
        thinking: modeToThinking(storedMode)
      };

      const kimiRes = await fetch(`${KIMI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(kimiBody)
      });

      if (!kimiRes.ok) {
        await releaseHold(req.user.userId, ad.id, holdCents, {
          provider: 'kimi',
          reason: 'kimi_error'
        });
        holdCents = 0;
        const errData = await kimiRes.json().catch(() => ({}));
        const msg = errData?.error?.message || 'AI request failed';
        console.error('[project-agent] Kimi error:', kimiRes.status, msg);
        send({ type: 'error', error: msg });
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      let buffer = '';
      const reader = kimiRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;

          let parsed;
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue;
          }

          if (parsed.usage) {
            usage = parsed.usage;
          }

          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.reasoning_content) {
            fullReasoning += delta.reasoning_content;
            send({ type: 'reasoning', delta: delta.reasoning_content });
          }
          if (delta.content) {
            fullContent += delta.content;
            send({ type: 'content', delta: delta.content });
          }
        }
      }

      costUsd = kimiUsageToUsd(usage || {}, KIMI_MODEL);
      costCents = usdToCents(costUsd);
    }

    const settleResult = await settleHold(req.user.userId, ad.id, holdCents, costCents, {
      mode: storedMode,
      model: KIMI_MODEL,
      usage: usage || {},
      threadId: String(thread._id),
      provider: 'kimi',
      webSearchCalls
    });
    holdCents = 0;

    if (!settleResult?.settled && costCents > 0) {
      send({
        type: 'error',
        error: 'Could not settle full usage cost. Please add funds.'
      });
    }

    await ProjectAgentMessage.create({
      threadId: thread._id,
      role: 'assistant',
      content: fullContent,
      reasoningContent: fullReasoning,
      mode: storedMode,
      usage: usage || {},
      costCents
    });

    if (thread.title === 'New chat' && fullContent) {
      thread.title = userContent.slice(0, 80) || 'Chat';
      await thread.save();
    } else {
      thread.updatedAt = new Date();
      await thread.save();
    }

    send({
      type: 'done',
      usage: usage || {},
      costUsd: costUsd.toFixed(6),
      costCents,
      webSearchCalls: isAgentToolsMode(storedMode) ? webSearchCalls : undefined,
      toolUsd: costBreakdown ? costBreakdown.toolUsd.toFixed(6) : undefined,
      tokenUsd: costBreakdown ? costBreakdown.tokenUsd.toFixed(6) : undefined,
      agentTruncated: agentResult?.truncated || false,
      agentTruncateReason: agentResult?.truncateReason,
      balanceUsd: settleResult
        ? walletResponse(settleResult.wallet).balanceUsd
        : undefined
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (holdCents > 0) {
      try {
        const { ad } = await loadProjectAgentScope(req.params.adId, req.user);
        if (ad) {
          await releaseHold(req.user.userId, ad.id, holdCents, {
            provider: 'kimi',
            reason: 'server_error'
          });
        }
      } catch (releaseErr) {
        console.error('[project-agent] hold release failed:', releaseErr);
      }
    }
    console.error('[project-agent] chat error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server error during chat.' });
    }
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Server error' })}\n\n`);
      res.end();
    } catch {
      /* ignore */
    }
  }
});

const imageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 8 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many image requests. Please wait a moment.' }
});

/** Generate image via OpenAI (Create image mode) — billed from project wallet */
router.post('/generate-image/:adId/:threadId', imageLimiter, async (req, res) => {
  if (!getOpenAiKey()) {
    return res.status(503).json({ error: 'Image generation is not configured on the server.' });
  }

  const userContent = String(req.body?.message || '').trim();
  if (!userContent || userContent.length > 4000) {
    return res.status(400).json({ error: 'Describe the image you want (max 4000 characters).' });
  }

  const imageModel = process.env.PROJECT_AGENT_IMAGE_MODEL || 'gpt-image-1';
  const imageQuality = process.env.PROJECT_AGENT_IMAGE_QUALITY || 'high';
  const holdUsd = estimateImageHoldUsd(imageModel, imageQuality);
  const holdCents = usdToCents(holdUsd);

  try {
    const { ad, user, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      ad.id
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    await grantStarterIfNeeded(req.user.userId, ad);

    const reservation = await reserveBalance(req.user.userId, ad.id, holdCents, {
      provider: 'openai',
      mode: 'image',
      model: imageModel,
      quality: imageQuality,
      threadId: String(thread._id),
      estimatedHoldUsd: holdUsd.toFixed(4)
    });

    if (!reservation) {
      const wallet = await getOrCreateWallet(req.user.userId, ad.id);
      return res.status(402).json({
        error: `Insufficient balance. Image generation requires about $${holdUsd.toFixed(2)} available.`,
        code: 'INSUFFICIENT_BALANCE',
        balanceUsd: walletResponse(wallet).balanceUsd,
        requiredUsd: holdUsd.toFixed(2)
      });
    }

    await ProjectAgentMessage.create({
      threadId: thread._id,
      role: 'user',
      content: userContent,
      mode: 'image'
    });

    const prompt = buildProjectImagePrompt(ad, userContent, user);
    let pngBase64;
    let usage;
    let quality;
    let model;
    try {
      ({ base64: pngBase64, usage, quality, model } = await openaiGenerateImage(prompt, {
        model: imageModel,
        quality: imageQuality
      }));
    } catch (genErr) {
      await releaseHold(req.user.userId, ad.id, holdCents, {
        provider: 'openai',
        reason: 'openai_error'
      });
      throw genErr;
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
      console.error('[project-agent] image encode failed', encodeErr);
      await settleHold(req.user.userId, ad.id, holdCents, imageCostCents, {
        provider: 'openai',
        reason: 'encode_error',
        mode: 'image'
      });
      return res.status(500).json({ error: 'Failed to process generated image.' });
    }

    const settleResult = await settleHold(req.user.userId, ad.id, holdCents, imageCostCents, {
      mode: 'image',
      provider: 'openai',
      model: model || imageModel,
      usage: usage || {},
      billingMethod: method,
      costBreakdown: breakdown,
      threadId: String(thread._id)
    });

    if (!settleResult?.settled) {
      return res.status(402).json({
        error: 'Insufficient balance for image generation.',
        code: 'INSUFFICIENT_BALANCE'
      });
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

    if (thread.title === 'New chat') {
      thread.title = userContent.slice(0, 80) || 'Image';
      await thread.save();
    } else {
      thread.updatedAt = new Date();
      await thread.save();
    }

    res.json({
      userMessage: { role: 'user', content: userContent, mode: 'image' },
      assistantMessage: serializeMessage(assistantMsg.toObject()),
      messageId: String(assistantMsg._id),
      costUsd: costUsd.toFixed(6),
      costCents: imageCostCents,
      billingMethod: method,
      usage: usage || {},
      costBreakdown: breakdown,
      balanceUsd: walletResponse(settleResult.wallet).balanceUsd
    });
  } catch (err) {
    console.error('[project-agent] generate-image error:', err);
    const status = err.status && Number(err.status) >= 400 ? Number(err.status) : 500;
    res.status(status).json({
      error: err.message || 'Image generation failed.'
    });
  }
});

/** Serve generated image (auth — user must own thread) */
router.get('/image/:messageId', async (req, res) => {
  try {
    const access = await assertMessageImageAccess(req.params.messageId, req.user.userId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const buf = Buffer.from(access.msg.imageJpegBase64, 'base64');
    const mime = access.msg.imageMimeType || 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.end(buf);
  } catch (err) {
    console.error('[project-agent] image serve error:', err);
    res.status(500).json({ error: 'Failed to load image.' });
  }
});

const videoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 4 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many video requests. Please wait a moment.' }
});

/** Start Sora text-to-video (hold wallet, poll /video-status/:messageId for completion) */
router.post('/generate-video/:adId/:threadId', videoLimiter, async (req, res) => {
  if (!getOpenAiKey()) {
    return res.status(503).json({ error: 'Video generation is not configured on the server.' });
  }

  const userContent = String(req.body?.message || '').trim();
  if (!userContent || userContent.length > 4000) {
    return res.status(400).json({ error: 'Describe the video you want (max 4000 characters).' });
  }

  const videoModel = normalizeModel(
    req.body?.model || process.env.PROJECT_AGENT_VIDEO_MODEL || 'sora-2'
  );
  const videoSize = normalizeSize(
    req.body?.size || process.env.PROJECT_AGENT_VIDEO_SIZE || '1280x720',
    videoModel
  );
  const videoSeconds = normalizeSeconds(
    req.body?.seconds || process.env.PROJECT_AGENT_VIDEO_SECONDS || 15
  );
  const segmentPlan = planVideoSegments(videoSeconds);
  const holdUsd = estimateVideoHoldUsd(videoModel, videoSize, videoSeconds);
  const holdCents = usdToCents(holdUsd);

  try {
    const { ad, user, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      ad.id
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    await grantStarterIfNeeded(req.user.userId, ad);

    const reservation = await reserveBalance(req.user.userId, ad.id, holdCents, {
      provider: 'openai',
      mode: 'video',
      model: videoModel,
      size: videoSize,
      seconds: videoSeconds,
      threadId: String(thread._id),
      estimatedHoldUsd: holdUsd.toFixed(4)
    });

    if (!reservation) {
      const wallet = await getOrCreateWallet(req.user.userId, ad.id);
      return res.status(402).json({
        error: `Insufficient balance. Video requires about $${holdUsd.toFixed(2)} available (${videoSeconds}s × ${videoModel}).`,
        code: 'INSUFFICIENT_BALANCE',
        balanceUsd: walletResponse(wallet).balanceUsd,
        requiredUsd: holdUsd.toFixed(2)
      });
    }

    await ProjectAgentMessage.create({
      threadId: thread._id,
      role: 'user',
      content: userContent,
      mode: 'video'
    });

    const prompt = buildProjectVideoPrompt(ad, userContent, user);
    let openaiJob;
    let extensionQueue = segmentPlan.extensions;
    try {
      const created = await openaiCreateVideoWithPlan(prompt, {
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
      await releaseHold(req.user.userId, ad.id, holdCents, {
        provider: 'openai',
        reason: 'openai_error',
        mode: 'video'
      });
      throw genErr;
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
      videoPrompt: prompt,
      videoHoldCents: holdCents
    });

    if (thread.title === 'New chat') {
      thread.title = userContent.slice(0, 80) || 'Video';
      await thread.save();
    } else {
      thread.updatedAt = new Date();
      await thread.save();
    }

    res.json({
      userMessage: { role: 'user', content: userContent, mode: 'video' },
      assistantMessage: serializeMessage(assistantMsg.toObject()),
      messageId: String(assistantMsg._id),
      videoOpenaiId: openaiJob.id,
      status: assistantMsg.videoStatus,
      progress: assistantMsg.videoProgress,
      estimatedHoldUsd: holdUsd.toFixed(4),
      videoModel,
      videoSize,
      videoSeconds,
      balanceUsd: walletResponse(reservation.wallet).balanceUsd
    });
  } catch (err) {
    console.error('[project-agent] generate-video error:', err);
    const httpStatus = err.status && Number(err.status) >= 400 ? Number(err.status) : 500;
    res.status(httpStatus).json({
      error: err.message || 'Video generation failed.'
    });
  }
});

/** Poll video job, finalize billing when OpenAI completes */
router.get('/video-status/:messageId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.messageId)) {
      return res.status(400).json({ error: 'Invalid message id.' });
    }

    const msg = await ProjectAgentMessage.findById(req.params.messageId);
    if (!msg || msg.mode !== 'video' || msg.role !== 'assistant') {
      return res.status(404).json({ error: 'Video job not found.' });
    }

    const thread = await ProjectAgentThread.findById(msg.threadId).select('userId adId');
    if (!thread || String(thread.userId) !== String(req.user.userId)) {
      return res.status(404).json({ error: 'Not found.' });
    }

    const result = await syncProjectAgentVideoJob(msg, thread.adId, req.user.userId);
    const httpStatus = result.code === 'INSUFFICIENT_BALANCE' ? 402 : 200;
    res.status(httpStatus).json(result);
  } catch (err) {
    console.error('[project-agent] video-status error:', err);
    res.status(500).json({ error: 'Failed to check video status.' });
  }
});

/** Stream generated video (auth) */
router.get('/video/:messageId', async (req, res) => {
  try {
    const access = await assertMessageVideoAccess(req.params.messageId, req.user.userId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const stat = fs.statSync(access.filePath);
    const mime = access.msg.videoMimeType || 'video/mp4';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return fs.createReadStream(access.filePath).pipe(res);
  } catch (err) {
    console.error('[project-agent] video serve error:', err);
    res.status(500).json({ error: 'Failed to load video.' });
  }
});

/** Download generated video as attachment */
router.get('/download-video/:messageId', async (req, res) => {
  try {
    const access = await assertMessageVideoAccess(req.params.messageId, req.user.userId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const meta = await ProjectAgentMessage.findById(req.params.messageId)
      .select('createdAt')
      .lean();
    const stamp = meta?.createdAt
      ? new Date(meta.createdAt).toISOString().replace(/[:.]/g, '-')
      : Date.now().toString();
    const filename = `aquads-skipper-video-${stamp}.mp4`;
    const stat = fs.statSync(access.filePath);
    const mime = access.msg.videoMimeType || 'video/mp4';

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-cache');
    return fs.createReadStream(access.filePath).pipe(res);
  } catch (err) {
    console.error('[project-agent] video download error:', err);
    res.status(500).json({ error: 'Failed to download video.' });
  }
});

/** Download generated image as attachment (auth — reliable save on mobile) */
router.get('/download/:messageId', async (req, res) => {
  try {
    const access = await assertMessageImageAccess(req.params.messageId, req.user.userId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const msg = await ProjectAgentMessage.findById(req.params.messageId)
      .select('createdAt')
      .lean();
    const buf = Buffer.from(access.msg.imageJpegBase64, 'base64');
    const mime = access.msg.imageMimeType || 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : 'jpg';
    const stamp = msg?.createdAt
      ? new Date(msg.createdAt).toISOString().replace(/[:.]/g, '-')
      : Date.now().toString();
    const filename = `aquads-project-agent-${stamp}.${ext}`;

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'private, no-cache');
    return res.end(buf);
  } catch (err) {
    console.error('[project-agent] image download error:', err);
    res.status(500).json({ error: 'Failed to download image.' });
  }
});

/** Create AquaPay checkout for wallet top-up (credit + 5% fee on top) */
router.post('/topup/:adId', async (req, res) => {
  try {
    const { ad, error, status, code } = await loadProjectAgentScope(req.params.adId, req.user);
    if (error) return res.status(status).json({ error, code });

    const creditUsd = Number(req.body?.amountUsd);
    if (!Number.isFinite(creditUsd) || creditUsd < 5 || creditUsd > 500) {
      return res.status(400).json({
        error: 'Load amount must be between $5 and $500.',
        loadFeeRate: LOAD_FEE_RATE
      });
    }

    const pricing = computeTopupPricing(creditUsd);
    const topupId = `pat_${new mongoose.Types.ObjectId().toString()}`;
    const returnPath = `/project-agent/${encodeURIComponent(ad.id)}?topup=success&topupId=${encodeURIComponent(topupId)}`;

    const topup = await ProjectAgentTopup.create({
      topupId,
      userId: req.user.userId,
      username: req.user.username,
      adId: ad.id,
      status: 'pending',
      creditUsd: pricing.creditUsd,
      creditCents: pricing.creditCents,
      feeUsd: pricing.feeUsd,
      feeCents: pricing.feeCents,
      payUsd: pricing.payUsd,
      payCents: pricing.payCents,
      returnPath
    });

    const aquaPayUrl = buildAquaPayTopupUrl(topup);

    res.json({
      topupId: topup.topupId,
      aquaPayUrl,
      returnPath: topup.returnPath,
      loadFeeRate: LOAD_FEE_RATE,
      preview: {
        creditUsd: pricing.creditUsd,
        feeUsd: pricing.feeUsd,
        payUsd: pricing.payUsd
      }
    });
  } catch (err) {
    console.error('[project-agent] topup error:', err);
    res.status(500).json({ error: 'Top-up failed.' });
  }
});

/** Poll top-up status after AquaPay (optional) */
router.get('/topup-status/:topupId', async (req, res) => {
  try {
    const topup = await ProjectAgentTopup.findOne({
      topupId: req.params.topupId,
      userId: req.user.userId
    }).lean();

    if (!topup) {
      return res.status(404).json({ error: 'Top-up not found.' });
    }

    let balanceUsd = null;
    if (topup.status === 'paid') {
      const wallet = await getOrCreateWallet(topup.userId, topup.adId);
      balanceUsd = walletResponse(wallet).balanceUsd;
    }

    res.json({
      topupId: topup.topupId,
      status: topup.status,
      creditUsd: topup.creditUsd,
      payUsd: topup.payUsd,
      feeUsd: topup.feeUsd,
      balanceUsd
    });
  } catch (err) {
    console.error('[project-agent] topup-status error:', err);
    res.status(500).json({ error: 'Failed to load top-up status.' });
  }
});

module.exports = router;
