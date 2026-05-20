const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Ad = require('../models/Ad');
const ProjectAgentThread = require('../models/ProjectAgentThread');
const ProjectAgentMessage = require('../models/ProjectAgentMessage');
const ProjectAgentLedger = require('../models/ProjectAgentLedger');
const sharp = require('sharp');
const {
  buildProjectAgentSystemPrompt,
  buildProjectImagePrompt,
  isPremiumListing
} = require('../utils/projectAgentContext');
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
    hasImage: messageHasImage(m)
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

async function loadOwnedPremiumAd(adId, username) {
  const ad = await Ad.findOne({
    id: adId,
    owner: username,
    status: { $in: ['active', 'approved'] }
  }).lean();

  if (!ad) {
    return { error: 'Listing not found or you do not own this project.', status: 404 };
  }
  if (!isPremiumListing(ad)) {
    return {
      error: 'Skipper Agent is included with Premium listings. Upgrade this project to Premium to unlock.',
      status: 403,
      code: 'PREMIUM_REQUIRED'
    };
  }
  return { ad };
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
      optionalFormulas: (
        process.env.PROJECT_AGENT_AGENT_FORMULAS || 'moonshot/code_runner:latest,moonshot/fetch:latest'
      )
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    },
    limits: getLimits()
  });
});

router.get('/eligible', auth, async (req, res) => {
  try {
    const ads = await Ad.find({
      owner: req.user.username,
      status: { $in: ['active', 'approved'] }
    })
      .select('id title logo listingTier blockchain')
      .lean();

    const eligible = ads
      .filter((a) => isPremiumListing(a))
      .map((a) => ({
        id: a.id,
        title: a.title,
        logo: a.logo,
        blockchain: a.blockchain
      }));

    res.json({ eligible, hasAccess: eligible.length > 0 });
  } catch (err) {
    console.error('[project-agent] eligible error:', err);
    res.status(500).json({ error: 'Failed to load eligible projects.' });
  }
});

router.get('/wallet/:adId', auth, async (req, res) => {
  try {
    const { ad, error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
    if (error) return res.status(status).json({ error, code });

    const { wallet, granted, grantCents } = await grantStarterIfNeeded(req.user.userId, ad.id);

    res.json({
      ad: { id: ad.id, title: ad.title, logo: ad.logo },
      ...walletResponse(wallet),
      starterJustGranted: granted,
      grantCents: granted ? grantCents : 0,
      loadFeeRate: LOAD_FEE_RATE
    });
  } catch (err) {
    console.error('[project-agent] wallet error:', err);
    res.status(500).json({ error: 'Failed to load wallet.' });
  }
});

router.get('/ledger/:adId', auth, async (req, res) => {
  try {
    const { error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
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

router.get('/threads/:adId', auth, async (req, res) => {
  try {
    const { error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
    if (error) return res.status(status).json({ error, code });

    const threads = await ProjectAgentThread.find({
      userId: req.user.userId,
      adId: req.params.adId
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('title createdAt updatedAt')
      .lean();

    res.json({ threads });
  } catch (err) {
    console.error('[project-agent] threads error:', err);
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

router.post('/threads/:adId', auth, async (req, res) => {
  try {
    const { ad, error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
    if (error) return res.status(status).json({ error, code });

    await grantStarterIfNeeded(req.user.userId, ad.id);

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

router.get('/threads/:adId/:threadId/messages', auth, async (req, res) => {
  try {
    const { error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
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
          }
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

router.post('/chat/:adId/:threadId', auth, chatLimiter, async (req, res) => {
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
    const { ad, error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      ad.id
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    await grantStarterIfNeeded(req.user.userId, ad.id);

    const history = await ProjectAgentMessage.find({ threadId: thread._id })
      .sort({ createdAt: -1 })
      .limit(limits.maxHistoryMessages)
      .select('role content reasoningContent')
      .lean();
    history.reverse();

    const systemPrompt = buildProjectAgentSystemPrompt(ad, storedMode);
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

    const send = (obj) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    send({ type: 'start', mode: storedMode });

    if (isAgentToolsMode(storedMode)) {
      try {
        const agentResult = await runKimiAgentChat({
          apiKey,
          baseUrl: KIMI_BASE,
          model: KIMI_MODEL,
          messages: kimiMessages,
          maxTokens,
          userMessage: userContent,
          send
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
      balanceUsd: settleResult
        ? walletResponse(settleResult.wallet).balanceUsd
        : undefined
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (holdCents > 0) {
      try {
        const { ad } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
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
router.post('/generate-image/:adId/:threadId', auth, imageLimiter, async (req, res) => {
  if (!getOpenAiKey()) {
    return res.status(503).json({ error: 'Image generation is not configured on the server.' });
  }

  const userContent = String(req.body?.message || '').trim();
  if (!userContent || userContent.length > 4000) {
    return res.status(400).json({ error: 'Describe the image you want (max 4000 characters).' });
  }

  const imageModel = process.env.PROJECT_AGENT_IMAGE_MODEL || 'gpt-image-1';
  const imageQuality = process.env.PROJECT_AGENT_IMAGE_QUALITY || 'medium';
  const holdUsd = estimateImageHoldUsd(imageModel, imageQuality);
  const holdCents = usdToCents(holdUsd);

  try {
    const { ad, error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
    if (error) return res.status(status).json({ error, code });

    const { thread, error: tErr, status: tStatus } = await loadThread(
      req.params.threadId,
      req.user.userId,
      ad.id
    );
    if (tErr) return res.status(tStatus).json({ error: tErr });

    await grantStarterIfNeeded(req.user.userId, ad.id);

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

    const prompt = buildProjectImagePrompt(ad, userContent);
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
router.get('/image/:messageId', auth, async (req, res) => {
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

/** Download generated image as attachment (auth — reliable save on mobile) */
router.get('/download/:messageId', auth, async (req, res) => {
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
router.post('/topup/:adId', auth, async (req, res) => {
  try {
    const { ad, error, status, code } = await loadOwnedPremiumAd(req.params.adId, req.user.username);
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
router.get('/topup-status/:topupId', auth, async (req, res) => {
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
