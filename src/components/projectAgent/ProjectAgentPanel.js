import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchProjectAgentEligible,
  fetchProjectAgentWallet,
  fetchProjectAgentThreads,
  createProjectAgentThread,
  deleteProjectAgentThread,
  fetchProjectAgentMessages,
  streamProjectAgentChat,
  generateProjectAgentImage,
  generateProjectAgentVideo,
  fetchProjectAgentVideoStatus,
  createProjectAgentTopup,
  fetchProjectAgentTopupStatus
} from '../../services/projectAgentApi';
import { getActiveAuthToken } from '../../services/api';
import ProjectAgentMessageImage, { ImageGeneratingStatus } from './ProjectAgentMessageImage';
import { getProjectAgentImageBlobUrl } from '../../services/projectAgentMediaCache';
import ProjectAgentMessageVideo from './ProjectAgentMessageVideo';
import ProjectAgentMessageBody, { CopyMessageButton } from './ProjectAgentMessageBody';
import { SKIPPER_AGENT_LOGO_SRC, SKIPPER_AGENT_NAME, SKIPPER_AGENT_TAGLINE } from './projectAgentBrand';
import {
  filterSkipperThreads,
  getSkipperAuthEpoch,
  getSkipperSessionKey,
  consumeWarmSkipperPayload,
  getJwtUserId,
  jwtMatchesSessionKey,
  markSkipperThreadDeleted,
  createSkipperAbortController,
  createSkipperBootstrapAbort,
  createSkipperBootstrapTrace,
  resetSkipperClientSession,
  skipperDebugLog,
  unmarkSkipperThreadDeleted
} from './projectAgentSession';
import {
  getVideoPollMaxAttempts,
  getVideoRenderEstimate
} from './projectAgentVideoEstimates';
import './ProjectAgent.css';

/** Default chat mode for new Skipper sessions and empty threads. */
const DEFAULT_SKIPPER_CHAT_MODE = 'agent';

const MODES = [
  { id: 'instant', label: 'Instant', hint: 'Quick responses' },
  { id: 'thinking', label: 'Thinking', hint: 'Deeper reasoning' },
  {
    id: 'agent',
    label: 'Agent',
    hint: 'Web search, list Starter projects, code & URL fetch ($0.005/search + tokens)'
  },
  { id: 'image', label: 'Create image', hint: 'Generate a visual from your prompt' },
  {
    id: 'video',
    label: 'Create video',
    hint: '15s (~10–20 min) or 30s (~25–40 min) · ~$0.10/s at 720p; wallet hold then settle'
  }
];

/** Chat modes stored on messages — one mode per thread; switching starts a new chat. */
const SKIPPER_CHAT_MODES = new Set(['instant', 'thinking', 'agent', 'websearch']);

function resolveThreadSkipperMode(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!m?.mode) continue;
    if (m.mode === 'websearch') return 'agent';
    if (SKIPPER_CHAT_MODES.has(m.mode)) return m.mode;
    if (m.mode === 'image' || m.mode === 'video') return m.mode;
  }
  return null;
}

const VIDEO_SECONDS_OPTIONS = [15, 30];

const VIDEO_POLL_MS = 12_000;

// Listing a project (submit_starter_listing) only works in Agent mode, where
// Skipper has tools. Detect CA/PA (with or without logo URL) so we can
// auto-switch instant/thinking chats to Agent before sending.
const LISTING_ADDRESS_RE =
  /(?:0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[A-Z0-9_]+|0x[0-9a-fA-F]{40,64}|[1-9A-HJ-NP-Za-km-z]{32,44})/;

function looksLikeListingRequest(text) {
  if (!text) return false;
  // Look for the CA/PA outside of any URL so a long hash in a logo filename
  // doesn't count as the contract/pair address on its own.
  const withoutUrls = text.replace(/https?:\/\/\S+/gi, ' ');
  return LISTING_ADDRESS_RE.test(withoutUrls);
}

// Long Agent threads: Kimi may *describe* a finished image/video (incl. fake "Billed:")
// without calling generate_image / generate_video. No `media` SSE → show stall UI
// and replace that reply so users don't keep prompting the same broken thread.
const FAKE_MEDIA_CLAIM_RE =
  /\bgenerate_image\b|\bgenerate_video\b|(?:image|video|clip)\s+generation\s+in\s+progress|generating\s+(?:your|the|a|an)\s+(?:image|video|visual|clip|picture)|deducted from (?:your )?wallet|\bbilled:\s*\$|(?:charged|costs?)\s+\$?\d|from your Skipper wallet|\b(?:is|are)\s+ready\b|(?:here'?s|here is)\s+your\s+(?:image|visual|logo|banner|video|clip)|(?:image|visual|logo|banner|video|clip)\s+(?:is\s+)?(?:done|ready|complete|finished)|created\s+(?:your|the)\s+(?:image|visual|logo|banner)/i;

const MEDIA_REQUEST_RE =
  /\b(?:create|generate|make|design|draw|render|produce)(?:\s+me)?\s+(?:an?\s+)?(?:image|visual|logo|banner|picture|graphic|illustration|video|clip)\b/i;

const MEDIA_STALL_REPLY =
  'This chat is too long for Skipper to run image or video tools on that request — **nothing was created**, and any “billed” line in the model reply was **not** a real wallet charge.\n\nStart a **new chat** (or use **Create image** mode) and ask again.';

function looksLikeFakeMediaClaim(text) {
  if (!text) return false;
  return FAKE_MEDIA_CLAIM_RE.test(text);
}

function looksLikeMediaRequest(text) {
  return MEDIA_REQUEST_RE.test(text || '');
}

function looksLikeDeliveryShapedReply(text) {
  if (!text) return false;
  return (
    looksLikeFakeMediaClaim(text) ||
    /\b(?:ready|complete|finished|created)\b[\s\S]{0,80}\b(?:image|visual|logo|banner|video|clip)\b/i.test(
      text
    ) ||
    /\b(?:image|visual|logo|banner|video|clip)\b[\s\S]{0,80}\b(?:ready|complete|finished)\b/i.test(text)
  );
}

function detectFakeMediaDelivery({ mode, mediaCreated, userText, assistantText }) {
  if (mode !== 'agent' || mediaCreated.length > 0) return false;
  const reply = String(assistantText || '').trim();
  if (!reply) return false;
  if (looksLikeFakeMediaClaim(reply)) return true;
  if (looksLikeMediaRequest(userText) && looksLikeDeliveryShapedReply(reply)) return true;
  return false;
}

function assistantPayloadForTurn({ content, reasoning, fakeMedia }) {
  if (fakeMedia) {
    return { content: MEDIA_STALL_REPLY, reasoningContent: '' };
  }
  return {
    content: content || '(No content returned)',
    reasoningContent: reasoning
  };
}

function normalizeAgentMessages(msgs, generateData) {
  const list = (msgs || []).map((m) => ({
    ...m,
    _id: m._id != null ? String(m._id) : m._id,
    hasImage: Boolean(
      m.hasImage ||
        (m.role === 'assistant' &&
          (m.mode === 'image' || m.mode === 'agent') &&
          m._id &&
          m.hasImage)
    ),
    hasVideo: Boolean(
      m.hasVideo ||
        (m.role === 'assistant' && m.mode === 'video' && (m.hasVideo || m.videoStatus === 'completed'))
    )
  }));

  const assistant = generateData?.assistantMessage;
  const messageId = generateData?.messageId || assistant?._id;
  if (!messageId) return list;

  const id = String(messageId);
  const isVideo = (assistant?.mode || generateData?.assistantMessage?.mode) === 'video';

  const enriched = isVideo
    ? {
        ...(assistant || {}),
        _id: id,
        role: 'assistant',
        mode: 'video',
        hasVideo: Boolean(assistant?.hasVideo || generateData?.status === 'completed'),
        videoStatus: assistant?.videoStatus || generateData?.status || 'queued',
        videoProgress: assistant?.videoProgress ?? generateData?.progress ?? null,
        content: assistant?.content || 'Generating video…'
      }
    : {
        ...(assistant || {}),
        _id: id,
        role: 'assistant',
        mode: 'image',
        hasImage: true,
        content: assistant?.content || 'Generated image for your project.'
      };

  const idx = list.findIndex((m) => String(m._id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...enriched };
  } else {
    list.push(enriched);
  }
  return list;
}

function messageShowsImage(m) {
  return Boolean(m?._id && m.hasImage && (m.mode === 'image' || m.mode === 'agent'));
}

function messageShowsVideo(m) {
  return Boolean(m?._id && m.mode === 'video' && m.role === 'assistant');
}

/** Insert assistant media row as soon as the agent SSE `media` event arrives. */
function upsertAgentMediaMessage(prev, evt) {
  const id = String(evt.messageId);
  if (prev.some((m) => String(m._id) === id)) return prev;

  if (evt.kind === 'video') {
    return [
      ...prev,
      {
        _id: id,
        role: 'assistant',
        mode: 'video',
        hasVideo: false,
        videoStatus: evt.status || 'queued',
        videoTargetSeconds: evt.seconds || 15,
        content: 'Generating video…'
      }
    ];
  }

  return [
    ...prev,
    {
      _id: id,
      role: 'assistant',
      mode: 'agent',
      hasImage: true,
      content: 'Generated image for your project.'
    }
  ];
}

function videoJobInFlight(m) {
  const s = m?.videoStatus;
  return (
    s === 'queued' ||
    s === 'in_progress' ||
    s === 'finalizing' ||
    (!s && !m?.hasVideo)
  );
}

const LOAD_FEE_RATE = 0.05;

function previewTopupClient(creditUsd) {
  const credit = Math.round(Number(creditUsd) * 100) / 100;
  if (!Number.isFinite(credit) || credit < 5) return null;
  const fee = Math.round(credit * LOAD_FEE_RATE * 100) / 100;
  return {
    creditUsd: credit,
    feeUsd: fee,
    payUsd: Math.round((credit + fee) * 100) / 100
  };
}

export default function ProjectAgentPanel({
  currentUser,
  initialAdId = null,
  initialThreadId = null,
  restoredSession = null,
  compact = false,
  projectListingOnboarding = false,
  onExpand,
  onClose,
  showBackLink = false
}) {
  const fullPage = !compact;
  const rootClass = `project-agent-root${fullPage ? ' project-agent-root--fullpage' : ''}`;
  const token = currentUser?.token;
  const sessionKey = getSkipperSessionKey(currentUser);
  const authEpoch = getSkipperAuthEpoch(currentUser);
  const [eligible, setEligible] = useState(() => restoredSession?.eligible || []);
  const [adId, setAdId] = useState(() => initialAdId || restoredSession?.adId || null);
  const [wallet, setWallet] = useState(() => restoredSession?.wallet || null);
  const [threads, setThreads] = useState(() => filterSkipperThreads(restoredSession?.threads || []));
  const [threadId, setThreadId] = useState(
    () => initialThreadId || restoredSession?.threadId || null
  );
  const [messages, setMessages] = useState(() =>
    restoredSession?.messages ? normalizeAgentMessages(restoredSession.messages) : []
  );
  const [mode, setMode] = useState(() =>
    projectListingOnboarding || restoredSession?.projectListingOnboarding
      ? 'agent'
      : restoredSession?.mode || DEFAULT_SKIPPER_CHAT_MODE
  );
  const [videoSeconds, setVideoSeconds] = useState(15);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(() => !restoredSession);
  const [hydratedEpoch, setHydratedEpoch] = useState(() =>
    restoredSession ? getSkipperAuthEpoch(currentUser) : null
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [gateError, setGateError] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [imageGenerating, setImageGenerating] = useState(false);
  /** Agent-mode tool in flight: same UX as dedicated Create image/video modes. */
  const [agentMediaGenerating, setAgentMediaGenerating] = useState(null);
  const [mediaStallNotice, setMediaStallNotice] = useState(false);
  const [lastCost, setLastCost] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [topupCreditUsd, setTopupCreditUsd] = useState('20');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupNotice, setTopupNotice] = useState('');
  const [topupOpen, setTopupOpen] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const videoPollAbortRef = useRef(null);
  const videoPollRunningRef = useRef(null);
  const messageCountRef = useRef(0);
  const skipMessagesFetchRef = useRef(
    restoredSession?.threadId && restoredSession?.messages?.length
      ? String(restoredSession.threadId)
      : null
  );
  const topupPreview = previewTopupClient(topupCreditUsd);

  /** Bumped on every account change so in-flight fetches cannot apply stale data. */
  const loadGenerationRef = useRef(0);
  const skipAdIdReloadRef = useRef(null);
  const prevAuthEpochRef = useRef(null);
  const authEpochRef = useRef(authEpoch);
  authEpochRef.current = authEpoch;

  const skipperBearer = () => getActiveAuthToken() || token || null;
  const loadStillValid = (epochAtStart) => epochAtStart === authEpochRef.current;

  const clearPanelForSessionChange = useCallback((nextEpoch) => {
    videoPollAbortRef.current = null;
    videoPollRunningRef.current = null;
    resetSkipperClientSession();
    loadGenerationRef.current += 1;

    setEligible([]);
    setAdId(null);
    setWallet(null);
    setThreads([]);
    setThreadId(null);
    setMessages([]);
    setMode(DEFAULT_SKIPPER_CHAT_MODE);
    setInput('');
    setSending(false);
    setError('');
    setGateError('');
    setStreamingReasoning('');
    setStreamingContent('');
    setImageGenerating(false);
    setAgentMediaGenerating(null);
    setMediaStallNotice(false);
    setLastCost(null);
    setSearchStatus('');
    setTopupNotice('');
    setTopupOpen(false);
    setDeletingThreadId(null);
    skipMessagesFetchRef.current = null;
    setHydratedEpoch(null);
    setLoading(Boolean(nextEpoch && nextEpoch !== 'guest'));
  }, []);

  // useLayoutEffect so adId/messages are cleared before other effects run in the same tick.
  useLayoutEffect(() => {
    const prev = prevAuthEpochRef.current;
    prevAuthEpochRef.current = authEpoch;
    if (prev === authEpoch) return;
    skipperDebugLog('account epoch changed — clearing panel', {
      from: prev || '(none)',
      to: authEpoch,
      username: currentUser?.username
    });
    clearPanelForSessionChange(authEpoch);
  }, [authEpoch, clearPanelForSessionChange, currentUser?.username]);

  const updateVideoMessage = useCallback((messageId, patch) => {
    const id = String(messageId);
    setMessages((prev) =>
      prev.map((m) => {
        if (String(m._id) !== id) return m;
        const next = { ...m, ...patch, _id: id };
        if (
          m.videoStatus === next.videoStatus &&
          m.videoProgress === next.videoProgress &&
          m.hasVideo === next.hasVideo &&
          m.content === next.content
        ) {
          return m;
        }
        return next;
      })
    );
  }, []);

  useEffect(() => {
    const count = messages.length;
    const grew = count > messageCountRef.current;
    messageCountRef.current = count;
    if (!grew && !streamingContent && !streamingReasoning) return;
    messagesEndRef.current?.scrollIntoView({ behavior: grew ? 'smooth' : 'auto' });
  }, [messages.length, streamingContent, streamingReasoning]);

  /** One load per account: eligible → project → wallet + threads → messages (no stale UI in between). */
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setHydratedEpoch(null);
      setGateError(`Log in to use ${SKIPPER_AGENT_NAME}.`);
      return undefined;
    }
    if (currentUser?.emailVerified === false) {
      setLoading(false);
      setHydratedEpoch(null);
      setGateError('Verify your email to use Skipper Agent.');
      return undefined;
    }

    const epochAtStart = authEpoch;
    const signal = createSkipperBootstrapAbort();
    let cancelled = false;

    const resolveBearerForAccount = async () => {
      const tWait = performance.now();
      const tryOnce = () => {
        const bearer = currentUser?.token || getActiveAuthToken();
        if (bearer && sessionKey && jwtMatchesSessionKey(bearer, sessionKey)) return bearer;
        return null;
      };
      let bearer = tryOnce();
      if (bearer) return { bearer, waitMs: 0 };

      const deadline = Date.now() + 800;
      while (Date.now() < deadline) {
        if (cancelled || signal.aborted) return { bearer: null, waitMs: Math.round(performance.now() - tWait) };
        await new Promise((r) => setTimeout(r, 40));
        bearer = tryOnce();
        if (bearer) return { bearer, waitMs: Math.round(performance.now() - tWait) };
      }
      return { bearer: null, waitMs: Math.round(performance.now() - tWait) };
    };

    const warmed = consumeWarmSkipperPayload(sessionKey);
    if (warmed && !restoredSession) {
      setEligible(warmed.eligible || []);
      setAdId(warmed.adId || null);
      setWallet(warmed.wallet || null);
      setThreads(filterSkipperThreads(warmed.threads || []));
      setThreadId(warmed.threadId || null);
      const warmedMessages = warmed.messages?.length
        ? normalizeAgentMessages(warmed.messages)
        : [];
      setMessages(warmedMessages);
      const warmedThreadMode = resolveThreadSkipperMode(warmedMessages);
      setMode(warmedThreadMode || warmed.mode || DEFAULT_SKIPPER_CHAT_MODE);
      if (warmed.adId) skipAdIdReloadRef.current = warmed.adId;
      if (warmed.threadId) skipMessagesFetchRef.current = String(warmed.threadId);
      setHydratedEpoch(authEpoch);
      setLoading(false);
      skipperDebugLog('panel applied warm cache (instant)', {
        username: currentUser?.username,
        sessionKey,
        adId: warmed.adId,
        scopes: (warmed.eligible || []).map((a) => a.scope || a.id).join(', ')
      });
      return undefined;
    }

    if (restoredSession) {
      if (restoredSession.adId) skipAdIdReloadRef.current = restoredSession.adId;
      if (restoredSession.threadId) {
        skipMessagesFetchRef.current = String(restoredSession.threadId);
      }
      setHydratedEpoch(authEpoch);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setHydratedEpoch(null);
    setEligible([]);
    setAdId(null);
    setWallet(null);
    setThreads([]);
    setThreadId(null);
    setMessages([]);
    setGateError('');
    setError('');

    (async () => {
      const { bearer, waitMs } = await resolveBearerForAccount();
      if (cancelled || signal.aborted || !loadStillValid(epochAtStart)) return;

      if (!bearer) {
        setGateError(
          'Session is still syncing. Close Skipper and open it again, or log out and log back in.'
        );
        setLoading(false);
        skipperDebugLog('bootstrap blocked — JWT userId did not match session', {
          sessionKey,
          username: currentUser?.username,
          jwtUserId: getJwtUserId(currentUser?.token || getActiveAuthToken()),
          waitMs
        });
        return;
      }

    const trace = createSkipperBootstrapTrace({
      account: currentUser?.username,
      userId: sessionKey,
      epoch: epochAtStart,
      jwtUserId: getJwtUserId(bearer),
      jwtMatchesSession: true,
      jwtWaitMs: waitMs
    });
    if (waitMs > 0) trace.mark('JWT/session aligned', { waitMs });

    const abortBootstrap = (reason) => {
      trace.aborted(reason, {
        cancelled,
        signalAborted: signal.aborted,
        epochAtStart,
        epochNow: authEpochRef.current
      });
    };

      try {
        trace.mark('fetch eligible');
        const { eligible: list, code } = await fetchProjectAgentEligible(bearer);
        if (cancelled || signal.aborted || !loadStillValid(epochAtStart)) {
          abortBootstrap(
            cancelled ? 'effect cleanup' : signal.aborted ? 'aborted' : 'epoch changed'
          );
          return;
        }
        setEligible(list || []);
        trace.mark('eligible parsed', {
          projects: list?.length,
          scopes: (list || []).map((a) => a.scope || a.id).join(', ')
        });
        if (code === 'EMAIL_VERIFICATION_REQUIRED' || !list?.length) {
          setGateError(
            code === 'EMAIL_VERIFICATION_REQUIRED'
              ? 'Verify your email to use Skipper Agent.'
              : `${SKIPPER_AGENT_NAME} is available to verified Aquads accounts. List a project or verify your email to get started.`
          );
          setLoading(false);
          trace.finish('gated', { code });
          return;
        }

        const pickFromInitial =
          initialAdId && list.find((a) => a.id === initialAdId) ? initialAdId : null;
        const nextAdId = pickFromInitial || list[0]?.id || null;
        skipAdIdReloadRef.current = nextAdId;
        setAdId(nextAdId);
        trace.mark('project selected', { adId: nextAdId });
        if (!nextAdId) {
          setLoading(false);
          trace.finish('no-project');
          return;
        }

        trace.mark('fetch wallet + threads (parallel)');
        const [walletResult, threadList] = await Promise.all([
          fetchProjectAgentWallet(nextAdId, bearer).catch((err) => {
            trace.mark('wallet failed', { error: err?.message });
            return null;
          }),
          fetchProjectAgentThreads(nextAdId, bearer)
            .then((r) => filterSkipperThreads(r.threads || []))
            .catch((err) => {
              trace.mark('threads failed', { error: err?.message });
              return [];
            })
        ]);
        if (cancelled || signal.aborted || !loadStillValid(epochAtStart)) {
          abortBootstrap(
            cancelled ? 'effect cleanup' : signal.aborted ? 'aborted' : 'epoch changed'
          );
          return;
        }

        if (walletResult) setWallet(walletResult);
        trace.mark('wallet + threads done', {
          balanceUsd: walletResult?.balanceUsd,
          scope: walletResult?.scope || walletResult?.ad?.scope,
          threadCount: threadList?.length ?? 0
        });

        let nextThreadId = null;
        if (threadList?.length) {
          setThreads(threadList);
          const preferred =
            initialThreadId &&
            threadList.find((t) => String(t._id) === String(initialThreadId));
          nextThreadId = preferred ? preferred._id : threadList[0]._id;
          setThreadId(nextThreadId);
        } else {
          trace.mark('create thread (none existed)');
          const { thread } = await createProjectAgentThread(nextAdId, bearer);
          if (cancelled || signal.aborted || !loadStillValid(epochAtStart)) {
            abortBootstrap(
              cancelled ? 'effect cleanup' : signal.aborted ? 'aborted' : 'epoch changed'
            );
            return;
          }
          setThreads([thread]);
          nextThreadId = thread._id;
          setThreadId(nextThreadId);
        }

        if (nextThreadId) {
          trace.mark('fetch messages', { threadId: String(nextThreadId) });
          const { messages: msgs } = await fetchProjectAgentMessages(
            nextAdId,
            nextThreadId,
            bearer
          );
          if (cancelled || signal.aborted || !loadStillValid(epochAtStart)) {
            abortBootstrap(
              cancelled ? 'effect cleanup' : signal.aborted ? 'aborted' : 'epoch changed'
            );
            return;
          }
          const normalized = normalizeAgentMessages(msgs);
          setMessages(normalized);
          const threadMode = resolveThreadSkipperMode(normalized);
          setMode(threadMode || DEFAULT_SKIPPER_CHAT_MODE);
          trace.mark('messages applied', { count: normalized.length });
        }

        if (!cancelled && loadStillValid(epochAtStart)) {
          setHydratedEpoch(authEpochRef.current);
          setLoading(false);
          trace.finish('UI ready', {
            adId: nextAdId,
            threadId: nextThreadId,
            username: currentUser?.username
          });
        }
      } catch (e) {
        if (cancelled || signal.aborted || !loadStillValid(epochAtStart)) {
          abortBootstrap(
            cancelled ? 'effect cleanup' : signal.aborted ? 'aborted' : 'epoch changed'
          );
          return;
        }
        setGateError(e.message || 'Failed to load');
        setLoading(false);
        trace.finish('error', { message: e?.message });
      }
    })();

    return () => {
      cancelled = true;
      skipperDebugLog('bootstrap effect cleanup', { epoch: epochAtStart });
    };
  }, [
    token,
    authEpoch,
    sessionKey,
    initialAdId,
    initialThreadId,
    currentUser?.emailVerified,
    currentUser?.token,
    currentUser?.username,
    restoredSession
  ]);

  const refreshWallet = useCallback(async () => {
    const bearer = skipperBearer();
    if (!bearer || !adId) return;
    const w = await fetchProjectAgentWallet(adId, bearer);
    setWallet(w);
    return w;
  }, [token, adId]);

  useEffect(() => {
    if (!projectListingOnboarding || loading || hydratedEpoch !== authEpoch) return;
    setMode('agent');
  }, [projectListingOnboarding, loading, hydratedEpoch, authEpoch]);

  const pollVideoJob = useCallback(
    async (messageId, seconds = 15) => {
      if (!token) return;
      const loadGen = loadGenerationRef.current;
      const id = String(messageId);
      const pollMax = getVideoPollMaxAttempts(seconds);
      const estimate = getVideoRenderEstimate(seconds);
      if (videoPollRunningRef.current === id) return;

      videoPollRunningRef.current = id;
      videoPollAbortRef.current = id;

      try {
        for (let attempt = 0; attempt < pollMax; attempt += 1) {
          if (loadGen !== loadGenerationRef.current) return;
          if (videoPollAbortRef.current !== id) return;

          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, VIDEO_POLL_MS));
          }
          if (videoPollAbortRef.current !== id) return;

          try {
            const data = await fetchProjectAgentVideoStatus(id, token);
            if (data.message) {
              updateVideoMessage(id, data.message);
            } else {
              updateVideoMessage(id, {
                videoStatus: data.status,
                videoProgress: data.progress ?? null,
                hasVideo: data.status === 'completed'
              });
            }

            if (data.status === 'completed') {
              setStreamingContent('');
              setLastCost({
                costUsd: data.costUsd,
                balanceUsd: data.balanceUsd,
                billingMethod: data.billingMethod
              });
              if (data.balanceUsd != null) {
                setWallet((w) => (w ? { ...w, balanceUsd: data.balanceUsd } : w));
              }
              await refreshWallet();
              return;
            }

            if (data.status === 'failed') {
              setStreamingContent('');
              setError(data.error || 'Video generation failed');
              if (data.code === 'INSUFFICIENT_BALANCE') {
                await refreshWallet();
              }
              return;
            }

            if (data.status === 'finalizing') {
              setStreamingContent('Saving your video…');
            } else if (attempt > 0) {
              setStreamingContent('');
            }
          } catch (e) {
            if (e?.code === 'TOKEN_EXPIRED' || e?.status === 401) {
              setStreamingContent('Refreshing session…');
              await new Promise((r) => setTimeout(r, 2000));
              continue;
            }
            const transient =
              e?.message === 'Failed to fetch' ||
              e?.name === 'TypeError' ||
              e?.message?.includes('NetworkError');
            if (transient) {
              setStreamingContent('Still working — reconnecting…');
              continue;
            }
            setStreamingContent('');
            setError(e.message || 'Failed to check video status');
            return;
          }
        }

        setStreamingContent('');
        setError(
          `Video is taking longer than expected for a ${seconds}s clip (typical: ~${estimate.label}). Leave this chat open or return in a few minutes — progress continues on the server.`
        );
      } finally {
        if (videoPollRunningRef.current === id) {
          videoPollRunningRef.current = null;
        }
        if (videoPollAbortRef.current === id) {
          videoPollAbortRef.current = null;
        }
      }
    },
    [token, updateVideoMessage, refreshWallet]
  );

  useEffect(() => {
    if (searchParams.get('topup') !== 'success' || !token || !adId) return;

    const topupId = searchParams.get('topupId');
    setTopupOpen(true);
    setTopupNotice('Checking your payment…');

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        if (topupId) {
          const status = await fetchProjectAgentTopupStatus(topupId, token);
          if (cancelled) return;
          if (status.status === 'paid') {
            await refreshWallet();
            setTopupNotice(`$${status.creditUsd} added to your balance.`);
            const next = new URLSearchParams(searchParams);
            next.delete('topup');
            next.delete('topupId');
            setSearchParams(next, { replace: true });
            return;
          }
        } else {
          await refreshWallet();
          if (!cancelled) setTopupNotice('Balance updated.');
        }
      } catch {
        if (!cancelled) setTopupNotice('Payment received — refresh balance if needed.');
      }

      attempts += 1;
      if (attempts < 12 && !cancelled) {
        window.setTimeout(poll, 2500);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [searchParams, token, adId, setSearchParams, refreshWallet]);

  const loadThreads = useCallback(async () => {
    if (!token || !adId) return;
    const { threads: list } = await fetchProjectAgentThreads(adId, token);
    const filtered = filterSkipperThreads(list || []);
    setThreads(filtered);
    return filtered;
  }, [token, adId]);

  /** User picked a different project in the toolbar (after initial account bootstrap). */
  useEffect(() => {
    if (!token || !adId || !sessionKey || hydratedEpoch !== authEpoch) return;
    if (skipAdIdReloadRef.current === adId) {
      skipAdIdReloadRef.current = null;
      return undefined;
    }

    const epochAtStart = authEpoch;
    const bearer = currentUser?.token || getActiveAuthToken();
    let cancelled = false;
    setMessages([]);
    setThreadId(null);

    (async () => {
      try {
        setError('');
        const [walletResult, list] = await Promise.all([
          fetchProjectAgentWallet(adId, bearer).catch(() => null),
          fetchProjectAgentThreads(adId, bearer)
            .then((r) => filterSkipperThreads(r.threads || []))
            .catch(() => [])
        ]);
        if (cancelled || !loadStillValid(epochAtStart)) return;
        if (walletResult) setWallet(walletResult);

        if (list?.length) {
          setThreads(list);
          setThreadId(list[0]._id);
        } else {
          const { thread } = await createProjectAgentThread(adId, bearer);
          if (!cancelled && loadStillValid(epochAtStart)) {
            setThreads([thread]);
            setThreadId(thread._id);
          }
        }
      } catch (e) {
        if (!cancelled && loadStillValid(epochAtStart)) {
          setError(e.message || 'Failed to load project');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, authEpoch, sessionKey, adId, hydratedEpoch, currentUser?.token]);

  useEffect(() => {
    if (!token || !adId || !threadId || !sessionKey) return;
    if (hydratedEpoch !== authEpoch) return;
    setMediaStallNotice(false);
    const tid = String(threadId);
    if (skipMessagesFetchRef.current === tid) {
      skipMessagesFetchRef.current = null;
      return undefined;
    }

    const epochAtStart = authEpoch;
    const bearerAtStart = skipperBearer();
    setMessages([]);
    let cancelled = false;
    (async () => {
      try {
        const { messages: msgs } = await fetchProjectAgentMessages(
          adId,
          threadId,
          bearerAtStart
        );
        if (!cancelled && loadStillValid(epochAtStart)) {
          const normalized = normalizeAgentMessages(msgs);
          setMessages(normalized);
          const threadMode = resolveThreadSkipperMode(normalized);
          setMode(threadMode || DEFAULT_SKIPPER_CHAT_MODE);
        }
      } catch (e) {
        if (!cancelled && loadStillValid(epochAtStart)) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, authEpoch, sessionKey, adId, threadId, hydratedEpoch]);

  const latestImageMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messageShowsImage(messages[i])) return String(messages[i]._id);
    }
    return null;
  }, [messages]);

  const threadImageCount = useMemo(
    () => messages.filter((m) => messageShowsImage(m)).length,
    [messages]
  );

  const pendingVideoJob = useMemo(() => {
    const pending = messages.find(
      (m) => m.role === 'assistant' && m.mode === 'video' && videoJobInFlight(m)
    );
    if (!pending?._id) return null;
    return {
      id: String(pending._id),
      seconds: pending.videoTargetSeconds || pending.videoSeconds || 15
    };
  }, [messages]);

  useEffect(() => {
    if (!token || !threadId || !pendingVideoJob?.id) return undefined;
    if (videoPollRunningRef.current === pendingVideoJob.id) return undefined;

    pollVideoJob(pendingVideoJob.id, pendingVideoJob.seconds);

    return () => {
      if (videoPollAbortRef.current === pendingVideoJob.id) {
        videoPollAbortRef.current = null;
      }
    };
  }, [threadId, token, pollVideoJob, pendingVideoJob]);

  const handleTopup = async () => {
    if (!token || !adId || topupLoading) return;
    const preview = previewTopupClient(topupCreditUsd);
    if (!preview) {
      setError('Enter an amount between $5 and $500.');
      return;
    }

    setTopupLoading(true);
    setError('');
    setTopupNotice('');

    try {
      const data = await createProjectAgentTopup(adId, token, preview.creditUsd);
      window.open(data.aquaPayUrl, '_blank', 'noopener,noreferrer');
      setTopupNotice(
        `Complete payment of $${data.preview.payUsd} on AquaPay (includes $${data.preview.feeUsd} fee). Balance updates when confirmed.`
      );
    } catch (e) {
      setError(e.message || 'Could not start top-up');
    } finally {
      setTopupLoading(false);
    }
  };

  const startNewChat = useCallback(
    async (nextMode = DEFAULT_SKIPPER_CHAT_MODE) => {
      if (!token || !adId) return null;
      videoPollAbortRef.current = null;
      videoPollRunningRef.current = null;
      setMode(nextMode);
      setMessages([]);
      setStreamingContent('');
      setStreamingReasoning('');
      setMediaStallNotice(false);
      setSearchStatus('');
      setLastCost(null);
      setAgentMediaGenerating(null);
      setError('');

      try {
        const { thread } = await createProjectAgentThread(adId, token);
        const id = String(thread._id);
        setThreads((prev) => [thread, ...prev]);
        setThreadId(id);
        skipMessagesFetchRef.current = id;
        return id;
      } catch (e) {
        setError(e.message);
        return null;
      }
    },
    [token, adId]
  );

  const handleNewChat = () => startNewChat();

  const handleModeChange = async (e) => {
    const nextMode = e.target.value;
    if (nextMode === mode || sending) return;
    await startNewChat(nextMode);
  };

  const handleDeleteThread = async (targetThreadId, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const id = String(targetThreadId || threadId || '');
    if (!token || !adId || !id || deletingThreadId) return;
    if (!window.confirm('Delete this chat? This cannot be undone.')) return;

    const wasActive = String(threadId) === id;
    const snapshot = {
      threads: [...threads],
      threadId,
      messages: [...messages],
      streamingContent,
      streamingReasoning
    };

    // Tombstone immediately so a concurrent thread refetch (e.g. from switching
    // between the drawer and full-page panel) can't resurrect this chat before
    // the server delete commits.
    markSkipperThreadDeleted(id);

    const nextThreads = filterSkipperThreads(threads);
    setThreads(nextThreads);
    setDeletingThreadId(id);
    setError('');

    if (wasActive) {
      videoPollAbortRef.current = null;
      videoPollRunningRef.current = null;
      setMessages([]);
      setStreamingContent('');
      setStreamingReasoning('');
      if (nextThreads.length > 0) {
        setThreadId(nextThreads[0]._id);
      } else {
        setThreadId(null);
      }
    }

    try {
      const data = await deleteProjectAgentThread(adId, id, token);
      const list = filterSkipperThreads(data.threads || []);
      setThreads(list);

      if (wasActive) {
        if (list.length > 0) {
          setThreadId(list[0]._id);
        } else {
          setThreadId(null);
        }
      }
    } catch (err) {
      // The thread was already gone on the server — treat as a successful delete
      // and keep the tombstone so it stays removed everywhere.
      const alreadyGone = /not found/i.test(err?.message || '') || err?.status === 404;
      if (alreadyGone) {
        try {
          await loadThreads();
        } catch {
          /* keep optimistic state */
        }
        return;
      }

      // Genuine failure — undo the tombstone and restore prior state.
      unmarkSkipperThreadDeleted(id);
      setThreads(snapshot.threads);
      setThreadId(snapshot.threadId);
      setMessages(snapshot.messages);
      setStreamingContent(snapshot.streamingContent);
      setStreamingReasoning(snapshot.streamingReasoning);
      setError(err.message || 'Could not delete chat');
    } finally {
      setDeletingThreadId(null);
    }
  };

  const handleSendImage = async (text) => {
    setError('');
    setLastCost(null);
    setImageGenerating(true);

    try {
      const data = await generateProjectAgentImage({
        adId,
        threadId,
        token,
        message: text
      });

      const { messages: msgs } = await fetchProjectAgentMessages(adId, threadId, token);
      setMessages(normalizeAgentMessages(msgs, data));

      setLastCost({
        costUsd: data.costUsd,
        balanceUsd: data.balanceUsd,
        billingMethod: data.billingMethod
      });
      if (data.balanceUsd != null) {
        setWallet((w) => (w ? { ...w, balanceUsd: data.balanceUsd } : w));
      }
      await refreshWallet();
    } catch (e) {
      setError(e.message || 'Image generation failed');
      if (e.code === 'INSUFFICIENT_BALANCE') {
        await refreshWallet();
      }
    } finally {
      setImageGenerating(false);
    }
  };

  const handleSendVideo = async (text) => {
    setError('');
    setLastCost(null);
    setStreamingContent('Starting video render…');

    try {
      const data = await generateProjectAgentVideo({
        adId,
        threadId,
        token,
        message: text,
        seconds: videoSeconds
      });

      const { messages: msgs } = await fetchProjectAgentMessages(adId, threadId, token);
      setMessages(normalizeAgentMessages(msgs, data));

      if (data.balanceUsd != null) {
        setWallet((w) => (w ? { ...w, balanceUsd: data.balanceUsd } : w));
      }

      const messageId = data.messageId || data.assistantMessage?._id;
      if (messageId) {
        pollVideoJob(String(messageId), videoSeconds);
      }
    } catch (e) {
      setError(e.message || 'Video generation failed');
      if (e.code === 'INSUFFICIENT_BALANCE') {
        await refreshWallet();
      }
    } finally {
      setStreamingContent('');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !token || !adId || !threadId || sending) return;

    let effectiveMode = mode;
    let activeThreadId = threadId;

    // Listing needs Agent tools — start a fresh Agent chat (no mode mixing in one thread).
    if (
      (mode === 'instant' || mode === 'thinking') &&
      looksLikeListingRequest(text)
    ) {
      effectiveMode = 'agent';
      activeThreadId = await startNewChat('agent');
      if (!activeThreadId) return;
    }

    setInput('');
    setSending(true);
    setError('');
    setStreamingContent('');
    setStreamingReasoning('');
    setLastCost(null);
    setSearchStatus('');
    setMediaStallNotice(false);
    setAgentMediaGenerating(null);

    if (mode === 'image') {
      setMessages((prev) => [...prev, { role: 'user', content: text, mode: 'image' }]);
      try {
        await handleSendImage(text);
      } finally {
        setSending(false);
      }
      return;
    }

    if (mode === 'video') {
      try {
        await handleSendVideo(text);
      } finally {
        setSending(false);
      }
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: text, mode: effectiveMode }]);

    let reasoning = '';
    let content = '';
    const mediaCreated = [];
    let doneReceived = false;

    const chatAbort = createSkipperAbortController();

    try {
      await streamProjectAgentChat({
        adId,
        threadId: activeThreadId,
        token,
        message: text,
        mode: effectiveMode,
        signal: chatAbort.signal,
        onEvent: (evt) => {
          if (chatAbort.signal.aborted) return;
          if (evt.type === 'start' && effectiveMode === 'agent') {
            setSearchStatus('Thinking…');
          }
          if (evt.type === 'status' && evt.label) {
            setSearchStatus(String(evt.label));
          }
          if (evt.type === 'media' && evt.messageId) {
            mediaCreated.push(evt);
            setAgentMediaGenerating(null);
            setMessages((prev) => upsertAgentMediaMessage(prev, evt));
            if (evt.kind === 'image' && token) {
              getProjectAgentImageBlobUrl(String(evt.messageId), token).catch(() => {});
            }
          }
          if (evt.type === 'tool') {
            if (evt.tool === 'generate_image') {
              setAgentMediaGenerating('image');
            } else if (evt.tool === 'generate_video') {
              setAgentMediaGenerating('video');
            }
            const label = evt.label || evt.tool || 'Tool';
            setSearchStatus(evt.round > 1 ? `${label} (step ${evt.round})…` : `${label}…`);
          }
          if (evt.type === 'searching') {
            setSearchStatus(
              evt.searchNumber > 1
                ? `Searching the web (${evt.searchNumber})…`
                : 'Searching the web…'
            );
          }
          if (evt.type === 'wrap_up') {
            setSearchStatus('Wrapping up your answer…');
          }
          if (evt.type === 'reasoning') {
            reasoning += evt.delta || '';
            setStreamingReasoning(reasoning);
          }
          if (evt.type === 'content') {
            setSearchStatus('');
            content += evt.delta || '';
            setStreamingContent(content);
          }
          if (evt.type === 'done') {
            doneReceived = true;
            setSearchStatus('');
            setLastCost({
              costUsd:
                evt.costCents != null
                  ? (Number(evt.costCents) / 100).toFixed(6)
                  : evt.costUsd,
              balanceUsd: evt.balanceUsd,
              webSearchCalls: evt.webSearchCalls,
              toolUsd: evt.toolUsd,
              agentTruncated: evt.agentTruncated
            });
            if (evt.balanceUsd != null) {
              setWallet((w) => (w ? { ...w, balanceUsd: evt.balanceUsd } : w));
            }
          }
          if (evt.type === 'error') {
            setSearchStatus('');
            setError(evt.error || 'Error');
          }
        }
      });

      // Full thread reload only when the stream did not finish cleanly (proxy timeout,
      // dropped SSE, etc.). History is unchanged; media rows were already inserted on
      // the `media` event. On a clean `done`, append streamed assistant text only.
      const streamIncomplete = !doneReceived;
      const mediaReadyLocally = mediaCreated.length > 0 && doneReceived;
      const fakeMediaDelivery = detectFakeMediaDelivery({
        mode: effectiveMode,
        mediaCreated,
        userText: text,
        assistantText: content
      });
      const assistantPayload = assistantPayloadForTurn({
        content,
        reasoning,
        fakeMedia: fakeMediaDelivery
      });

      if (fakeMediaDelivery) {
        setMediaStallNotice(true);
      }

      if (mediaReadyLocally) {
        if (content || reasoning || fakeMediaDelivery) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (
              last?.role === 'assistant' &&
              last?.mode !== 'image' &&
              last?.mode !== 'video' &&
              last?.content === assistantPayload.content
            ) {
              return prev;
            }
            return [
              ...prev,
              {
                role: 'assistant',
                ...assistantPayload,
                mode: effectiveMode
              }
            ];
          });
        }

        mediaCreated
          .filter((evt) => evt.kind === 'video')
          .forEach((evt) => pollVideoJob(String(evt.messageId), evt.seconds || 15));
      } else if (streamIncomplete) {
        let reloaded = false;
        const imageEvt = mediaCreated.find((e) => e.kind === 'image');
        try {
          const { messages: msgs } = await fetchProjectAgentMessages(
            adId,
            activeThreadId,
            token
          );
          setMessages(
            normalizeAgentMessages(
              msgs,
              imageEvt
                ? {
                    messageId: imageEvt.messageId,
                    assistantMessage: {
                      _id: imageEvt.messageId,
                      mode: 'image',
                      hasImage: true,
                      content: 'Generated image for your project.'
                    }
                  }
                : undefined
            )
          );
          reloaded = true;
        } catch {
          reloaded = false;
        }

        if (!reloaded) {
          setMessages((prev) => {
            let next = prev;
            mediaCreated.forEach((evt) => {
              next = upsertAgentMediaMessage(next, evt);
            });
            if (content || reasoning || fakeMediaDelivery) {
              next = [
                ...next,
                {
                  role: 'assistant',
                  ...assistantPayload,
                  mode: effectiveMode
                }
              ];
            }
            return next;
          });
        }

        mediaCreated
          .filter((evt) => evt.kind === 'video')
          .forEach((evt) => pollVideoJob(String(evt.messageId), evt.seconds || 15));
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            ...assistantPayload,
            mode: effectiveMode
          }
        ]);
      }
      setStreamingContent('');
      setStreamingReasoning('');

      void refreshWallet();
    } catch (e) {
      if (chatAbort.signal.aborted || e?.name === 'AbortError') return;
      setError(e.message || 'Send failed');
      if (e.code === 'INSUFFICIENT_BALANCE') {
        void refreshWallet();
      }
    } finally {
      if (!chatAbort.signal.aborted) {
        setAgentMediaGenerating(null);
        setSending(false);
      }
    }
  };

  const balanceNum = parseFloat(wallet?.balanceUsd || '0');
  const balanceLow = balanceNum < 1;

  if (!currentUser) {
    return (
      <div className={rootClass}>
        <div className="project-agent-gate">
          <p>Log in to use Aquads {SKIPPER_AGENT_NAME}.</p>
        </div>
      </div>
    );
  }

  const sessionDataReady = hydratedEpoch === authEpoch;

  if (loading || !sessionDataReady) {
    return (
      <div className={rootClass}>
        <div className="project-agent-loading">
          <div className="project-agent-empty">Switching account…</div>
          {currentUser?.username ? (
            <p className="project-agent-loading-account" title="Aquads account for this Skipper session">
              {currentUser.username}
            </p>
          ) : null}
          <p className="project-agent-loading-hint">
            Loading projects, wallet, and chats for this account.
          </p>
        </div>
      </div>
    );
  }

  if (gateError) {
    return (
      <div className={rootClass}>
        <div className="project-agent-gate">
          <p>{gateError}</p>
          <p style={{ marginTop: 12 }}>
            <Link to="/list-token-free">List a project</Link>
            {' · '}
            <Link to="/freelancer-benefits">Freelancer on Aquads</Link>
          </p>
        </div>
      </div>
    );
  }

  const adMeta = eligible.find((a) => a.id === adId) || wallet?.ad;
  const showListingOnboardingGreeting =
    projectListingOnboarding &&
    (adMeta?.scope === 'account' || wallet?.scope === 'account') &&
    messages.length === 0;
  const showEmptyWatermark =
    messages.length === 0 && !sending && !showListingOnboardingGreeting;

  return (
    <div className={rootClass}>
      <header className="project-agent-header">
        {showBackLink && (
          <Link to="/home" className="project-agent-back-link" title="Back to Aquads home">
            ← Home
          </Link>
        )}
        {adMeta?.logo && <img src={adMeta.logo} alt="" />}
        <h2>
          <span className="project-agent-header-title">
            {adMeta?.title || SKIPPER_AGENT_NAME}
          </span>
          {adMeta?.title ? (
            <span className="project-agent-header-badge">{SKIPPER_AGENT_NAME}</span>
          ) : null}
          {currentUser?.username ? (
            <span className="project-agent-header-account" title="Aquads account for this Skipper session">
              {currentUser.username}
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          className={`project-agent-balance project-agent-balance-btn ${balanceLow ? 'low' : ''}`}
          onClick={() => setTopupOpen((o) => !o)}
          title="Add funds"
        >
          ${wallet?.balanceUsd ?? '—'}
        </button>
        {onClose && (
          <button
            type="button"
            className="project-agent-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </header>

      <div className="project-agent-toolbar">
        {compact && threads.length > 0 && (
          <div className="project-agent-thread-select-wrap">
            <select
              className="project-agent-thread-select"
              value={threadId || ''}
              onChange={(e) => setThreadId(e.target.value)}
              aria-label="Conversation"
            >
              {threads.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title || 'Chat'}
                </option>
              ))}
            </select>
            {threadId && (
              <button
                type="button"
                className="project-agent-thread-delete"
                onClick={(e) => handleDeleteThread(threadId, e)}
                disabled={deletingThreadId === threadId}
                aria-label="Delete this chat"
                title="Delete chat"
              >
                ×
              </button>
            )}
          </div>
        )}
        {eligible.length > 1 && (
          <select
            className="project-agent-project-select"
            value={adId || ''}
            onChange={(e) => setAdId(e.target.value)}
            aria-label="Project"
          >
            {eligible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="primary" onClick={handleNewChat}>
          New chat
        </button>
        <button
          type="button"
          className={`project-agent-topup-trigger ${topupOpen ? 'active' : ''}`}
          onClick={() => setTopupOpen((o) => !o)}
        >
          Add funds
        </button>
        {onExpand && (
          <button
            type="button"
            onClick={() =>
              onExpand({
                ownerSessionKey: authEpoch,
                adId,
                threadId,
                threads,
                messages,
                wallet,
                mode,
                eligible
              })
            }
          >
            Expand
          </button>
        )}
        <select
          className="project-agent-mode-select"
          value={mode}
          onChange={handleModeChange}
          disabled={sending}
          title={`${MODES.find((m) => m.id === mode)?.hint || ''} Changing mode starts a new chat.`}
          aria-label="Skipper mode (changing mode starts a new chat)"
        >
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {topupOpen && (
        <div className="project-agent-topup project-agent-topup--bar">
          <div className="project-agent-topup-row project-agent-topup-row--compact">
            <input
              id="pa-topup-amount"
              type="number"
              min={5}
              max={500}
              step={1}
              value={topupCreditUsd}
              onChange={(e) => setTopupCreditUsd(e.target.value)}
              className="project-agent-topup-input"
              aria-label="Load amount in USD"
              placeholder="USD"
            />
            <button
              type="button"
              className="project-agent-topup-btn"
              onClick={handleTopup}
              disabled={topupLoading || !topupPreview}
            >
              {topupLoading ? '…' : 'Pay'}
            </button>
            <button
              type="button"
              className="project-agent-topup-close"
              onClick={() => setTopupOpen(false)}
              aria-label="Close add funds"
            >
              ✕
            </button>
          </div>
          {topupPreview && (
            <p className="project-agent-topup-preview">
              Pay <strong>${topupPreview.payUsd.toFixed(2)}</strong> →{' '}
              <strong>${topupPreview.creditUsd.toFixed(2)}</strong> credit (+{LOAD_FEE_RATE * 100}%
              fee)
            </p>
          )}
          {topupNotice && (
            <p className="project-agent-topup-notice">{topupNotice}</p>
          )}
        </div>
      )}

      {wallet?.starterJustGranted && (
        <p className="project-agent-last-cost project-agent-starter-banner" style={{ color: '#22d3ee' }}>
          ${wallet.starterGrantUsd} starter credit added
          {adId === 'freelancer'
            ? ' for your freelancer trial.'
            : wallet?.scope === 'premium' || wallet?.ad?.scope === 'premium'
              ? ' for this Premium listing.'
              : ' for your Skipper trial.'}
        </p>
      )}

      <div className="project-agent-body">
        {!compact && (
          <nav className="project-agent-threads" aria-label="Conversations">
            {threads.map((t) => (
              <div
                key={t._id}
                className={`project-agent-thread-row${t._id === threadId ? ' active' : ''}`}
              >
                <button
                  type="button"
                  className="project-agent-thread-select-btn"
                  onClick={() => setThreadId(t._id)}
                >
                  <span className="project-agent-thread-title">{t.title || 'Chat'}</span>
                </button>
                <button
                  type="button"
                  className="project-agent-thread-delete"
                  onClick={(e) => handleDeleteThread(t._id, e)}
                  disabled={deletingThreadId === t._id}
                  aria-label={`Delete ${t.title || 'chat'}`}
                  title="Delete chat"
                >
                  ×
                </button>
              </div>
            ))}
          </nav>
        )}

        <div className="project-agent-main">
          <div className="project-agent-messages">
            {showEmptyWatermark && (
              <div className="project-agent-empty-watermark" aria-hidden="true">
                <img src={SKIPPER_AGENT_LOGO_SRC} alt="" />
                <span className="project-agent-empty-watermark-text">{SKIPPER_AGENT_TAGLINE}</span>
              </div>
            )}
            {showListingOnboardingGreeting && (
              <div className="project-agent-listing-onboarding" role="status">
                <p className="project-agent-listing-onboarding-title">Welcome to Skipper</p>
                <p>
                  Paste your <strong>contract address (CA)</strong> or pair address and a direct{' '}
                  <strong>logo image URL</strong> (PNG, JPG, GIF, or WebP) to submit a free Starter
                  listing. It goes to admin review before your bubble goes live.
                </p>
                <p className="project-agent-listing-onboarding-note">
                  Listing via Skipper is free for project accounts — no wallet balance needed.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m._id || `msg-${i}`} className={`project-agent-msg ${m.role}`}>
                {messageShowsImage(m) && token ? (
                  <ProjectAgentMessageImage
                    messageId={String(m._id)}
                    token={token}
                    eager={String(m._id) === latestImageMessageId}
                  />
                ) : messageShowsVideo(m) && token ? (
                  <ProjectAgentMessageVideo
                    messageId={String(m._id)}
                    token={token}
                    status={m.videoStatus}
                    progress={m.videoProgress}
                    createdAt={m.createdAt}
                    videoSeconds={m.videoTargetSeconds || m.videoSeconds}
                  />
                ) : m.role === 'assistant' ? (
                  <ProjectAgentMessageBody
                    content={m.content}
                    reasoningContent={m.reasoningContent}
                  />
                ) : (
                  <div className="project-agent-msg-body">
                    <CopyMessageButton text={m.content} label="Copy message" />
                    <div className="project-agent-user-text">{m.content}</div>
                  </div>
                )}
                {m.costCents > 0 && (
                  <div className="project-agent-meta">−${(m.costCents / 100).toFixed(4)}</div>
                )}
              </div>
            ))}
            {sending &&
              !streamingContent &&
              (searchStatus || (mode === 'agent' && !imageGenerating && !agentMediaGenerating)) && (
                <p className="project-agent-search-status" role="status" aria-live="polite">
                  {searchStatus || 'Working on your reply…'}
                </p>
              )}
            {sending && (streamingReasoning || streamingContent) && (
              <div className="project-agent-msg assistant">
                <ProjectAgentMessageBody
                  content={streamingContent}
                  reasoningContent={mode === 'agent' ? '' : streamingReasoning}
                  isStreaming
                />
              </div>
            )}
            {(imageGenerating || agentMediaGenerating === 'image') && (
              <div className="project-agent-msg assistant">
                <ImageGeneratingStatus />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="project-agent-composer">
            {lastCost && (
              <p className="project-agent-last-cost">
                Last message: −${parseFloat(lastCost.costUsd).toFixed(4)}
                {lastCost.webSearchCalls > 0 && (
                  <>
                    {' '}
                    ({lastCost.webSearchCalls} search
                    {lastCost.webSearchCalls === 1 ? '' : 'es'}
                    {lastCost.toolUsd ? ` · tool $${lastCost.toolUsd}` : ''})
                  </>
                )}
                {lastCost.agentTruncated && (
                  <> · partial (step limit — try a narrower ask)</>
                )}
                {' '}
                · Balance ${lastCost.balanceUsd}
              </p>
            )}

            {mode === 'agent' && threadImageCount >= 2 && !mediaStallNotice && (
              <p className="project-agent-long-thread-hint" role="note">
                This chat already has {threadImageCount} images. Agent can usually keep going, but
                if a reply claims an image without showing one, start a new chat or use Create image.
              </p>
            )}

            {mediaStallNotice && (
              <div className="project-agent-stall-notice" role="status">
                <span>
                  No image or video was generated — this chat is too long for Agent tools. Start a
                  new chat (or use Create image / Create video) instead of sending more prompts here.
                </span>
                <div className="project-agent-stall-notice-actions">
                  <button type="button" className="primary" onClick={handleNewChat}>
                    Start new chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaStallNotice(false)}
                    aria-label="Dismiss"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="project-agent-last-cost project-agent-composer-error">
                {error}
              </p>
            )}

            {mode === 'video' && (
              <div className="project-agent-video-options">
                <p className="project-agent-video-retention-text project-agent-video-retention-text--composer">
                  Clips are kept temporarily in chat. Save each video from the player when it finishes — we
                  do not store them long-term yet.
                </p>
                <label className="project-agent-video-options-label" htmlFor="pa-video-seconds">
                  Length
                </label>
                <select
                  id="pa-video-seconds"
                  className="project-agent-video-seconds-select"
                  value={videoSeconds}
                  onChange={(e) => setVideoSeconds(Number(e.target.value))}
                  disabled={sending}
                  aria-label="Video length in seconds"
                >
                  {VIDEO_SECONDS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}s
                    </option>
                  ))}
                </select>
                <span className="project-agent-video-options-hint">
                  {getVideoRenderEstimate(videoSeconds).composerHint}
                </span>
              </div>
            )}

            <div className="project-agent-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'image'
                  ? 'Describe the image you want (e.g. Twitter banner, logo concept)…'
                  : mode === 'video'
                    ? 'Describe the clip (15s or 30s)…'
                    : mode === 'agent'
                      ? 'List a project: paste CA/PA + logo URL (and website if needed). Or research, code, fetch URLs…'
                      : 'Ask about your project…'
              }
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <button
              type="button"
              className="send"
              onClick={handleSend}
              disabled={sending || !input.trim()}
            >
              {sending ? '…' : mode === 'image' || mode === 'video' ? 'Create' : 'Send'}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
