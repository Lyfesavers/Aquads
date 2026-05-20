import React, { useMemo, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import { FaCopy, FaCheck } from 'react-icons/fa';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

function renderMarkdown(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const html = md.render(raw);
  const safe = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel']
  });
  return safe.replace(
    /<a /g,
    '<a target="_blank" rel="noopener noreferrer" '
  );
}

export function CopyMessageButton({ text, label = 'Copy message' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const value = String(text || '').trim();
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  if (!String(text || '').trim()) return null;

  return (
    <button
      type="button"
      className="project-agent-copy-btn"
      onClick={handleCopy}
      aria-label={label}
      title={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? <FaCheck aria-hidden /> : <FaCopy aria-hidden />}
    </button>
  );
}

export default function ProjectAgentMessageBody({
  content,
  reasoningContent,
  showCopy = true,
  isStreaming = false
}) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div className="project-agent-msg-body">
      {showCopy && <CopyMessageButton text={content} label="Copy response" />}
      {reasoningContent && (
        <details
          className="project-agent-reasoning-details"
          {...(isStreaming ? { open: true } : {})}
        >
          <summary>Reasoning</summary>
          <div className="project-agent-reasoning-text">{reasoningContent}</div>
        </details>
      )}
      {html ? (
        <div className="project-agent-md" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        !reasoningContent && <span className="project-agent-md-empty">…</span>
      )}
    </div>
  );
}
