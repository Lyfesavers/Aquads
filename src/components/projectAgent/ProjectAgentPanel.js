import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchProjectAgentEligible,
  fetchProjectAgentWallet,
  fetchProjectAgentThreads,
  createProjectAgentThread,
  fetchProjectAgentMessages,
  streamProjectAgentChat,
  generateProjectAgentImage,
  createProjectAgentTopup,
  fetchProjectAgentTopupStatus
} from '../../services/projectAgentApi';
import ProjectAgentMessageImage from './ProjectAgentMessageImage';
import ProjectAgentMessageBody, { CopyMessageButton } from './ProjectAgentMessageBody';
import { SKIPPER_AGENT_NAME } from './projectAgentBrand';
import './ProjectAgent.css';

const MODES = [
  { id: 'instant', label: 'Instant', hint: 'Quick responses' },
  { id: 'thinking', label: 'Thinking', hint: 'Deeper reasoning' },
  { id: 'agent', label: 'Agent', hint: 'Plans & deliverables' },
  {
    id: 'websearch',
    label: 'Web search',
    hint: 'Live web search ($0.005/search + tokens; thinking off)'
  },
  { id: 'image', label: 'Create image', hint: 'Generate a visual from your prompt' }
];

function normalizeAgentMessages(msgs, generateData) {
  const list = (msgs || []).map((m) => ({
    ...m,
    _id: m._id != null ? String(m._id) : m._id,
    hasImage: Boolean(
      m.hasImage || (m.role === 'assistant' && m.mode === 'image' && m._id)
    )
  }));

  const assistant = generateData?.assistantMessage;
  const messageId = generateData?.messageId || assistant?._id;
  if (!messageId) return list;

  const id = String(messageId);
  const enriched = {
    ...(assistant || {}),
    _id: id,
    role: 'assistant',
    mode: 'image',
    hasImage: true,
    content: assistant?.content || 'Generated image for your project.'
  };

  const idx = list.findIndex((m) => String(m._id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...enriched, hasImage: true };
  } else {
    list.push(enriched);
  }
  return list;
}

function messageShowsImage(m) {
  return Boolean(m?._id && (m.hasImage || (m.role === 'assistant' && m.mode === 'image')));
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
  compact = false,
  onExpand,
  onClose,
  showBackLink = false
}) {
  const fullPage = !compact;
  const rootClass = `project-agent-root${fullPage ? ' project-agent-root--fullpage' : ''}`;
  const token = currentUser?.token;
  const [eligible, setEligible] = useState([]);
  const [adId, setAdId] = useState(initialAdId);
  const [wallet, setWallet] = useState(null);
  const [threads, setThreads] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('instant');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [gateError, setGateError] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [lastCost, setLastCost] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');
  const [topupCreditUsd, setTopupCreditUsd] = useState('20');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupNotice, setTopupNotice] = useState('');
  const [topupOpen, setTopupOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const topupPreview = previewTopupClient(topupCreditUsd);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, streamingReasoning]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setGateError(`Log in to use ${SKIPPER_AGENT_NAME}.`);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setGateError('');
        const { eligible: list } = await fetchProjectAgentEligible(token);
        if (cancelled) return;
        setEligible(list || []);
        if (!list?.length) {
          setGateError(
            `${SKIPPER_AGENT_NAME} is included with Premium listings. Upgrade a project to Premium to unlock.`
          );
          setLoading(false);
          return;
        }
        const pick =
          initialAdId && list.find((a) => a.id === initialAdId) ? initialAdId : list[0].id;
        setAdId(pick);
      } catch (e) {
        if (!cancelled) setGateError(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, initialAdId]);

  const refreshWallet = useCallback(async () => {
    if (!token || !adId) return;
    const w = await fetchProjectAgentWallet(adId, token);
    setWallet(w);
    return w;
  }, [token, adId]);

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
    setThreads(list || []);
    return list;
  }, [token, adId]);

  useEffect(() => {
    if (!token || !adId) return;
    let cancelled = false;
    (async () => {
      try {
        setError('');
        await refreshWallet();
        const list = await loadThreads();
        if (cancelled) return;
        if (list?.length) {
          setThreadId(list[0]._id);
        } else {
          const { thread } = await createProjectAgentThread(adId, token);
          if (!cancelled) {
            setThreads([thread]);
            setThreadId(thread._id);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load project');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, adId, refreshWallet, loadThreads]);

  useEffect(() => {
    if (!token || !adId || !threadId) return;
    let cancelled = false;
    (async () => {
      try {
        const { messages: msgs } = await fetchProjectAgentMessages(adId, threadId, token);
        if (!cancelled) setMessages(normalizeAgentMessages(msgs));
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, adId, threadId]);

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

  const handleNewChat = async () => {
    if (!token || !adId) return;
    try {
      const { thread } = await createProjectAgentThread(adId, token);
      setThreads((prev) => [thread, ...prev]);
      setThreadId(thread._id);
      setMessages([]);
      setStreamingContent('');
      setStreamingReasoning('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSendImage = async (text) => {
    setError('');
    setLastCost(null);
    setStreamingContent('Generating image…');

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
      setStreamingContent('');
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !token || !adId || !threadId || sending) return;

    setInput('');
    setSending(true);
    setError('');
    setStreamingContent('');
    setStreamingReasoning('');
    setLastCost(null);
    setSearchStatus('');

    if (mode === 'image') {
      try {
        await handleSendImage(text);
      } finally {
        setSending(false);
      }
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: text, mode }]);

    let reasoning = '';
    let content = '';

    try {
      await streamProjectAgentChat({
        adId,
        threadId,
        token,
        message: text,
        mode,
        onEvent: (evt) => {
          if (evt.type === 'searching') {
            setSearchStatus(
              evt.searchNumber > 1
                ? `Searching the web (${evt.searchNumber})…`
                : 'Searching the web…'
            );
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
            setSearchStatus('');
            setLastCost({
              costUsd: evt.costUsd,
              balanceUsd: evt.balanceUsd,
              webSearchCalls: evt.webSearchCalls,
              toolUsd: evt.toolUsd
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

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: content || '(No content returned)',
          reasoningContent: reasoning,
          mode
        }
      ]);
      setStreamingContent('');
      setStreamingReasoning('');
      await refreshWallet();
    } catch (e) {
      setError(e.message || 'Send failed');
      if (e.code === 'INSUFFICIENT_BALANCE') {
        await refreshWallet();
      }
    } finally {
      setSending(false);
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
        <div className="project-agent-empty">Loading {SKIPPER_AGENT_NAME}…</div>
      </div>
    );
  }

  if (gateError) {
    return (
      <div className={rootClass}>
        <div className="project-agent-gate">
          <p>{gateError}</p>
          <p style={{ marginTop: 12 }}>
            <Link to="/list-token-free">List or upgrade your project</Link>
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
          <button type="button" onClick={onExpand}>
            Expand
          </button>
        )}
        <select
          className="project-agent-mode-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          title={MODES.find((m) => m.id === mode)?.hint}
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
          ${wallet.starterGrantUsd} starter credit added for this Premium listing.
        </p>
      )}

      <div className="project-agent-body">
        {!compact && (
          <nav className="project-agent-threads" aria-label="Conversations">
            {threads.map((t) => (
              <button
                key={t._id}
                type="button"
                className={t._id === threadId ? 'active' : ''}
                onClick={() => setThreadId(t._id)}
              >
                {t.title || 'Chat'}
              </button>
            ))}
          </nav>
        )}

        <div className="project-agent-main">
          <div className="project-agent-messages">
            {messages.map((m, i) => (
              <div key={m._id || `msg-${i}`} className={`project-agent-msg ${m.role}`}>
                {messageShowsImage(m) && token ? (
                  <ProjectAgentMessageImage messageId={String(m._id)} token={token} />
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
            {sending && searchStatus && !streamingContent && (
              <p className="project-agent-search-status">{searchStatus}</p>
            )}
            {sending && (streamingReasoning || streamingContent) && (
              <div className="project-agent-msg assistant">
                <ProjectAgentMessageBody
                  content={streamingContent}
                  reasoningContent={mode === 'websearch' ? '' : streamingReasoning}
                  isStreaming
                />
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
                {' '}
                · Balance ${lastCost.balanceUsd}
              </p>
            )}

            {error && (
              <p className="project-agent-last-cost project-agent-composer-error">
                {error}
              </p>
            )}

            <div className="project-agent-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'image'
                  ? 'Describe the image you want (e.g. Twitter banner, logo concept)…'
                  : mode === 'websearch'
                    ? 'Ask anything (live web + Aquads guide). e.g. What should I do after listing?'
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
              {sending ? '…' : mode === 'image' ? 'Create' : mode === 'websearch' ? 'Search' : 'Send'}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
