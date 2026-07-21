/**
 * Server-side Sora video orchestration: poll OpenAI, chain extensions, download MP4.
 * Runs from /video-status and from the background worker so jobs finish without an open browser tab.
 */

const path = require('path');
const fs = require('fs');
const ProjectAgentMessage = require('../models/ProjectAgentMessage');
const ProjectAgentThread = require('../models/ProjectAgentThread');
const {
  openaiExtendVideo,
  openaiRetrieveVideo,
  openaiDownloadVideoContent
} = require('../utils/openaiVideo');
const { calculateVideoGenerationCost } = require('../utils/openaiVideoCost');
const { usdToCents } = require('../utils/kimiCost');
const { releaseHold, settleHold, walletResponse } = require('./projectAgentWallet');

const PROJECT_AGENT_VIDEO_DIR = path.join(__dirname, '../data/project-agent-videos');
const VIDEO_MAX_BYTES =
  Number(process.env.PROJECT_AGENT_VIDEO_MAX_BYTES) || 80 * 1024 * 1024;

/** Min ms between OpenAI retrieve calls per message (shared by HTTP poll + worker). */
const videoOpenAiPollMinMs =
  Number(process.env.PROJECT_AGENT_VIDEO_OPENAI_POLL_MS) || 10_000;

/** Re-schedule download if finalizing with no file for this long (e.g. after deploy). */
const FINALIZE_STUCK_MS =
  Number(process.env.PROJECT_AGENT_VIDEO_FINALIZE_STUCK_MS) || 5 * 60 * 1000;

const WORKER_BATCH_LIMIT = Math.max(1, Number(process.env.PROJECT_AGENT_VIDEO_WORKER_BATCH) || 25);

const videoFinalizeInFlight = new Set();
const videoOpenAiLastPoll = new Map();
let workerRunning = false;

function ensureVideoDir() {
  if (!fs.existsSync(PROJECT_AGENT_VIDEO_DIR)) {
    fs.mkdirSync(PROJECT_AGENT_VIDEO_DIR, { recursive: true });
  }
}

function videoFilePath(storageKey) {
  const safe = path.basename(String(storageKey || ''));
  return path.join(PROJECT_AGENT_VIDEO_DIR, safe);
}

function wrapResult(partial, assistantMsg, serializeMessage) {
  const doc = assistantMsg.toObject ? assistantMsg.toObject() : assistantMsg;
  if (typeof serializeMessage === 'function') {
    return { ...partial, message: serializeMessage(doc) };
  }
  return partial;
}

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

    try {
      const { emitProjectAgentVideoCompleted } = require('../socket');
      emitProjectAgentVideoCompleted({
        userId: String(userId),
        adId: String(adId),
        threadId: String(claim.threadId),
        messageId: String(claim._id),
        costUsd: (videoCostCents / 100).toFixed(6),
        costCents: videoCostCents,
        balanceUsd: walletResponse(settleResult.wallet).balanceUsd,
        videoSeconds: claim.videoSeconds,
        videoTargetSeconds: claim.videoTargetSeconds || claim.videoSeconds
      });
    } catch (emitErr) {
      console.warn('[project-agent] video completed socket emit failed:', emitErr.message);
    }
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
  if (!openaiVideoId) return;
  setImmediate(() => {
    finalizeVideoAssetInBackground(messageId, adId, userId, openaiVideoId).catch((err) => {
      console.error('[project-agent] unhandled video finalize:', err);
    });
  });
}

function maybeRecoverStuckFinalizing(assistantMsg, adId, userId) {
  if (assistantMsg.hasVideo && assistantMsg.videoStorageKey) return false;
  const id = String(assistantMsg._id);
  if (videoFinalizeInFlight.has(id)) return false;

  const storageKey = `${id}.mp4`;
  const filePath = videoFilePath(storageKey);
  if (fs.existsSync(filePath)) {
    scheduleVideoFinalize(assistantMsg._id, adId, userId, assistantMsg.videoOpenaiId);
    return true;
  }

  const touched = assistantMsg.updatedAt || assistantMsg.createdAt;
  const touchedMs = touched ? new Date(touched).getTime() : 0;
  if (!touchedMs || Date.now() - touchedMs < FINALIZE_STUCK_MS) return false;

  if (assistantMsg.videoOpenaiId) {
    scheduleVideoFinalize(assistantMsg._id, adId, userId, assistantMsg.videoOpenaiId);
    return true;
  }
  return false;
}

/**
 * Poll OpenAI; heavy download/billing runs in background. Idempotent when already completed.
 * @param {import('../models/ProjectAgentMessage')} assistantMsg
 * @param {string|number} adId
 * @param {string|number} userId
 * @param {{ serializeMessage?: Function, forceOpenAiPoll?: boolean }} [options]
 */
async function syncProjectAgentVideoJob(assistantMsg, adId, userId, options = {}) {
  const { serializeMessage, forceOpenAiPoll = false } = options;

  if (assistantMsg.hasVideo && assistantMsg.videoStorageKey) {
    return wrapResult(
      {
        status: 'completed',
        progress: 100,
        costCents: assistantMsg.costCents || 0,
        costUsd: assistantMsg.costCents
          ? (assistantMsg.costCents / 100).toFixed(6)
          : undefined
      },
      assistantMsg,
      serializeMessage
    );
  }

  if (assistantMsg.videoStatus === 'failed') {
    return wrapResult(
      {
        status: 'failed',
        error: assistantMsg.content || 'Video generation failed.'
      },
      assistantMsg,
      serializeMessage
    );
  }

  if (assistantMsg.videoStatus === 'finalizing') {
    maybeRecoverStuckFinalizing(assistantMsg, adId, userId);
    return wrapResult(
      {
        status: 'finalizing',
        progress: assistantMsg.videoProgress ?? 100
      },
      assistantMsg,
      serializeMessage
    );
  }

  const videoId = assistantMsg.videoOpenaiId;
  if (!videoId) {
    return { status: 'failed', error: 'Missing video job id.' };
  }

  const msgKey = String(assistantMsg._id);
  const lastPoll = videoOpenAiLastPoll.get(msgKey) || 0;
  const now = Date.now();
  if (!forceOpenAiPoll && now - lastPoll < videoOpenAiPollMinMs) {
    const cachedStatus =
      assistantMsg.videoStatus === 'in_progress' ? 'in_progress' : 'queued';
    return wrapResult(
      {
        status: cachedStatus,
        progress: assistantMsg.videoProgress ?? 0
      },
      assistantMsg,
      serializeMessage
    );
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
    return wrapResult(
      {
        status: 'failed',
        progress,
        error: assistantMsg.content
      },
      assistantMsg,
      serializeMessage
    );
  }

  if (status !== 'completed') {
    const mappedStatus = status === 'in_progress' ? 'in_progress' : 'queued';
    assistantMsg.videoStatus = mappedStatus;
    assistantMsg.videoProgress = progress;
    await assistantMsg.save();
    return wrapResult(
      {
        status: mappedStatus,
        progress
      },
      assistantMsg,
      serializeMessage
    );
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
      return wrapResult(
        {
          status: assistantMsg.videoStatus,
          progress: assistantMsg.videoProgress
        },
        assistantMsg,
        serializeMessage
      );
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
      return wrapResult(
        {
          status: 'failed',
          error: assistantMsg.content
        },
        assistantMsg,
        serializeMessage
      );
    }
  }

  const openaiVideoId = assistantMsg.videoOpenaiId || videoId;
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
      return wrapResult(
        {
          status: 'completed',
          progress: 100
        },
        fresh,
        serializeMessage
      );
    }
    if (fresh?.videoStatus === 'finalizing') {
      maybeRecoverStuckFinalizing(fresh, adId, userId);
      scheduleVideoFinalize(fresh._id, adId, userId, fresh.videoOpenaiId || openaiVideoId);
      return wrapResult(
        {
          status: 'finalizing',
          progress: fresh.videoProgress ?? 100
        },
        fresh,
        serializeMessage
      );
    }
    return { status: 'in_progress', progress };
  }

  scheduleVideoFinalize(claim._id, adId, userId, openaiVideoId);

  return wrapResult(
    {
      status: 'finalizing',
      progress: 100
    },
    claim,
    serializeMessage
  );
}

/** Background worker: advance all in-flight Skipper video jobs (no browser required). */
async function processPendingProjectAgentVideos() {
  if (workerRunning) return { skipped: true };
  workerRunning = true;

  let processed = 0;
  let errors = 0;

  try {
    const pending = await ProjectAgentMessage.find({
      mode: 'video',
      role: 'assistant',
      hasVideo: { $ne: true },
      videoStatus: { $in: ['queued', 'in_progress', 'finalizing'] },
      videoOpenaiId: { $exists: true, $nin: ['', null] }
    })
      .sort({ updatedAt: 1 })
      .limit(WORKER_BATCH_LIMIT)
      .select('_id threadId videoOpenaiId videoStatus');

    if (!pending.length) return { processed: 0, errors: 0 };

    const threadIds = [...new Set(pending.map((m) => String(m.threadId)))];
    const threads = await ProjectAgentThread.find({ _id: { $in: threadIds } }).select(
      '_id userId adId'
    );
    const threadById = new Map(threads.map((t) => [String(t._id), t]));

    for (const row of pending) {
      const thread = threadById.get(String(row.threadId));
      if (!thread?.userId || !thread?.adId) continue;

      try {
        const msg = await ProjectAgentMessage.findById(row._id);
        if (!msg) continue;
        await syncProjectAgentVideoJob(msg, thread.adId, thread.userId, {
          forceOpenAiPoll: false
        });
        processed += 1;
      } catch (err) {
        errors += 1;
        console.error('[project-agent] video worker sync error:', row._id, err.message);
      }
    }
  } finally {
    workerRunning = false;
  }

  return { processed, errors };
}

function startProjectAgentVideoWorker() {
  const enabled =
    process.env.PROJECT_AGENT_VIDEO_WORKER_ENABLED !== '0' &&
    process.env.PROJECT_AGENT_VIDEO_WORKER_ENABLED !== 'false';
  if (!enabled) {
    console.log('[ProjectAgent Video Worker] Disabled via PROJECT_AGENT_VIDEO_WORKER_ENABLED');
    return;
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('[ProjectAgent Video Worker] Skipped — OPENAI_API_KEY not set');
    return;
  }

  const intervalMs = Math.max(
    15_000,
    Number(process.env.PROJECT_AGENT_VIDEO_WORKER_INTERVAL_MS) || 30_000
  );

  const tick = () => {
    processPendingProjectAgentVideos().catch((err) => {
      console.error('[ProjectAgent Video Worker] tick error:', err.message);
    });
  };

  setTimeout(tick, 10_000);
  setInterval(tick, intervalMs);
  console.log(`[ProjectAgent Video Worker] Started (every ${intervalMs / 1000}s)`);
}

module.exports = {
  PROJECT_AGENT_VIDEO_DIR,
  ensureVideoDir,
  videoFilePath,
  syncProjectAgentVideoJob,
  processPendingProjectAgentVideos,
  startProjectAgentVideoWorker
};
