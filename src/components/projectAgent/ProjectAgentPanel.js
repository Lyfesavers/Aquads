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
import ProjectAgentMessageImage, { ImageGeneratingStatus } from './ProjectAgentMessageImage';
import { getProjectAgentImageBlobUrl } from '../../services/projectAgentMediaCache';
import ProjectAgentMessageVideo from './ProjectAgentMessageVideo';
import ProjectAgentMessageBody, { CopyMessageButton } from './ProjectAgentMessageBody';
import { SKIPPER_AGENT_NAME } from './projectAgentBrand';
import {
  filterSkipperThreads,
  getSkipperAuthEpoch,
  getSkipperSessionKey,
  markSkipperThreadDeleted,
  createSkipperAbortController,
  resetSkipperClientSession,
  unmarkSkipperThreadDeleted
} from './projectAgentSession';
import {
  getVideoPollMaxAttempts,
  getVideoRenderEstimate
} from './projectAgentVideoEstimates';
import './ProjectAgent.css';

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
// Skipper has tools. These detect a contract/pair address + a logo image URL
// so we can auto-switch instant/thinking chats to Agent before sending.
const LISTING_ADDRESS_RE =
  /(?:0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[A-Z0-9_]+|0x[0-9a-fA-F]{40,64}|[1-9A-HJ-NP-Za-km-z]{32,44})/;
const LISTING_LOGO_URL_RE = /https?:\/\/\S+\.(?:png|jpe?g|gif|webp)(?:[?#]\S*)?/i;

function looksLikeListingRequest(text) {
  if (!text) return false;
  const hasLogo = LISTING_LOGO_URL_RE.test(text);
  if (!hasLogo) return false;
  // Look for the CA/PA outside of any URL so a long hash in the logo filename
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
  const [mode, setMode] = useState(() => restoredSession?.mode || 'instant');
  const [videoSeconds, setVideoSeconds] = useState(15);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(() => !restoredSession);
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
  const prevAuthEpochRef = useRef(null);

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
    setMode('instant');
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
    setLoading(Boolean(nextEpoch && nextEpoch !== 'guest'));
  }, []);

  // useLayoutEffect so adId/messages are cleared before other effects run in the same tick.
  useLayoutEffect(() => {
    const prev = prevAuthEpochRef.current;
    prevAuthEpochRef.current = authEpoch;
    if (prev === authEpoch) return;
    clearPanelForSessionChange(authEpoch);
  }, [authEpoch, clearPanelForSessionChange]);

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

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setGateError(`Log in to use ${SKIPPER_AGENT_NAME}.`);
      return;
    }
    if (currentUser?.emailVerified === false) {
      setLoading(false);
      setGateError('Verify your email to use Skipper Agent.');
      return;
    }

    const loadGen = loadGenerationRef.current;
    let cancelled = false;
    (async () => {
      try {
        if (!restoredSession) setLoading(true);
        setGateError('');
        const { eligible: list, code } = await fetchProjectAgentEligible(token);
        if (cancelled || loadGen !== loadGenerationRef.current) return;
        setEligible(list || []);
        if (code === 'EMAIL_VERIFICATION_REQUIRED' || !list?.length) {
          if (loadGen !== loadGenerationRef.current) return;
          setGateError(
            code === 'EMAIL_VERIFICATION_REQUIRED'
              ? 'Verify your email to use Skipper Agent.'
              : `${SKIPPER_AGENT_NAME} is available to verified Aquads accounts. List a project or verify your email to get started.`
          );
          setLoading(false);
          return;
        }
        const pickFromInitial =
          initialAdId && list.find((a) => a.id === initialAdId) ? initialAdId : null;
        setAdId((current) => {
          if (current && list.some((a) => a.id === current)) return current;
          return pickFromInitial || list[0].id;
        });
      } catch (e) {
        if (!cancelled && loadGen === loadGenerationRef.current) {
          setGateError(e.message || 'Failed to load');
        }
      } finally {
        if (!cancelled && loadGen === loadGenerationRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, sessionKey, initialAdId, currentUser?.emailVerified, restoredSession]);

  const refreshWallet = useCallback(async () => {
    if (!token || !adId) return;
    const w = await fetchProjectAgentWallet(adId, token);
    setWallet(w);
    return w;
  }, [token, adId]);

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

  useEffect(() => {
    if (!token || !adId || !sessionKey) return;
    const loadGen = loadGenerationRef.current;
    let cancelled = false;

    (async () => {
      try {
        setError('');
        const [walletResult, list] = await Promise.all([
          fetchProjectAgentWallet(adId, token).catch(() => null),
          fetchProjectAgentThreads(adId, token)
            .then((r) => filterSkipperThreads(r.threads || []))
            .catch(() => [])
        ]);
        if (cancelled || loadGen !== loadGenerationRef.current) return;
        if (walletResult) setWallet(walletResult);

        if (list?.length) {
          setThreads(list);
          setThreadId((current) => {
            if (current && list.some((t) => String(t._id) === String(current))) {
              return current;
            }
            const preferred =
              initialThreadId && list.find((t) => String(t._id) === String(initialThreadId));
            return preferred ? preferred._id : list[0]._id;
          });
        } else {
          const { thread } = await createProjectAgentThread(adId, token);
          if (!cancelled && loadGen === loadGenerationRef.current) {
            setThreads([thread]);
            setThreadId(thread._id);
          }
        }
      } catch (e) {
        if (!cancelled && loadGen === loadGenerationRef.current) {
          setError(e.message || 'Failed to load project');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionKey, adId, initialThreadId]);

  useEffect(() => {
    if (!token || !adId || !threadId || !sessionKey) return;
    setMediaStallNotice(false);
    const tid = String(threadId);
    if (skipMessagesFetchRef.current === tid) {
      skipMessagesFetchRef.current = null;
      return undefined;
    }

    const loadGen = loadGenerationRef.current;
    let cancelled = false;
    (async () => {
      try {
        const { messages: msgs } = await fetchProjectAgentMessages(adId, threadId, token);
        if (!cancelled && loadGen === loadGenerationRef.current) {
          const normalized = normalizeAgentMessages(msgs);
          setMessages(normalized);
          const threadMode = resolveThreadSkipperMode(normalized);
          if (threadMode) setMode(threadMode);
        }
      } catch (e) {
        if (!cancelled && loadGen === loadGenerationRef.current) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionKey, adId, threadId]);

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
    async (nextMode) => {
      if (!token || !adId) return null;
      videoPollAbortRef.current = null;
      videoPollRunningRef.current = null;
      if (nextMode) setMode(nextMode);
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

  if (loading) {
    return (
      <div className={rootClass}>
        <div className="project-agent-loading">
          <div className="project-agent-empty">Loading {SKIPPER_AGENT_NAME}…</div>
          {currentUser?.username ? (
            <p className="project-agent-loading-account" title="Aquads account for this Skipper session">
              {currentUser.username}
            </p>
          ) : null}
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
