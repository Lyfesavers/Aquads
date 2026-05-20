import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchProjectAgentEligible,
  fetchProjectAgentWallet,
  fetchProjectAgentThreads,
  createProjectAgentThread,
  fetchProjectAgentMessages,
  streamProjectAgentChat,
  generateProjectAgentImage
} from '../../services/projectAgentApi';
import ProjectAgentMessageImage from './ProjectAgentMessageImage';
import ProjectAgentMessageBody, { CopyMessageButton } from './ProjectAgentMessageBody';
import './ProjectAgent.css';

const MODES = [
  { id: 'instant', label: 'Instant', hint: 'Quick responses' },
  { id: 'thinking', label: 'Thinking', hint: 'Deeper reasoning' },
  { id: 'agent', label: 'Agent', hint: 'Plans & deliverables' },
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

export default function ProjectAgentPanel({
  currentUser,
  initialAdId = null,
  compact = false,
  onExpand,
  onClose
}) {
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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, streamingReasoning]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setGateError('Log in to use Project Agent.');
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
            'Project Agent is included with Premium listings. Upgrade a project to Premium to unlock.'
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
          if (evt.type === 'reasoning') {
            reasoning += evt.delta || '';
            setStreamingReasoning(reasoning);
          }
          if (evt.type === 'content') {
            content += evt.delta || '';
            setStreamingContent(content);
          }
          if (evt.type === 'done') {
            setLastCost({ costUsd: evt.costUsd, balanceUsd: evt.balanceUsd });
            if (evt.balanceUsd != null) {
              setWallet((w) => (w ? { ...w, balanceUsd: evt.balanceUsd } : w));
            }
          }
          if (evt.type === 'error') {
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
      <div className="project-agent-root">
        <div className="project-agent-gate">
          <p>Log in to use Aquads Project Agent.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="project-agent-root">
        <div className="project-agent-empty">Loading Project Agent…</div>
      </div>
    );
  }

  if (gateError) {
    return (
      <div className="project-agent-root">
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
    <div className="project-agent-root">
      <header className="project-agent-header">
        {adMeta?.logo && <img src={adMeta.logo} alt="" />}
        <h2>{adMeta?.title || 'Project Agent'}</h2>
        <span className={`project-agent-balance ${balanceLow ? 'low' : ''}`}>
          ${wallet?.balanceUsd ?? '—'}
        </span>
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

      {wallet?.starterJustGranted && (
        <p className="project-agent-last-cost" style={{ color: '#22d3ee' }}>
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
            {sending && (streamingReasoning || streamingContent) && (
              <div className="project-agent-msg assistant">
                <ProjectAgentMessageBody
                  content={streamingContent}
                  reasoningContent={streamingReasoning}
                  isStreaming
                />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {lastCost && (
            <p className="project-agent-last-cost">
              Last message: −${parseFloat(lastCost.costUsd).toFixed(4)} · Balance $
              {lastCost.balanceUsd}
            </p>
          )}

          {error && (
            <p className="project-agent-last-cost" style={{ color: '#f87171' }}>
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
              {sending ? '…' : mode === 'image' ? 'Create' : 'Send'}
            </button>
          </div>

          <p className="project-agent-last-cost project-agent-footer-hint">
            Balance top-up via AquaPay — coming soon (5% load fee).{' '}
            <Link to="/dashboard">Dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
