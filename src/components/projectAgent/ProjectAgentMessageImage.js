import React, { useCallback, useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import { downloadProjectAgentImage } from '../../services/projectAgentApi';
import {
  getProjectAgentImageBlobUrl,
  invalidateProjectAgentMedia
} from '../../services/projectAgentMediaCache';
import useLazyInView from './useLazyInView';

const IMAGE_GENERATING_PHASES = [
  'Sending your prompt…',
  'Composing the scene…',
  'Painting details and lighting…',
  'Refining colors and edges…',
  'Finishing your image…'
];

export function ImageGeneratingStatus() {
  const [now, setNow] = useState(() => Date.now());
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedSec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const phaseIdx = Math.min(IMAGE_GENERATING_PHASES.length - 1, Math.floor(elapsedSec / 5));
  const statusText = IMAGE_GENERATING_PHASES[phaseIdx];
  const mm = Math.floor(elapsedSec / 60);
  const ss = String(elapsedSec % 60).padStart(2, '0');

  return (
    <div
      className="project-agent-image-generating"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="project-agent-image-generating-visual" aria-hidden="true">
        <div className="project-agent-image-generating-tile">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="project-agent-image-generating-ring" />
      </div>

      <p className="project-agent-image-generating-title">Creating your image</p>
      <p className="project-agent-image-generating-status">{statusText}</p>

      <div className="project-agent-image-generating-track" aria-hidden="true">
        <div className="project-agent-image-generating-fill" />
      </div>

      <p className="project-agent-image-generating-meta">
        <span className="project-agent-image-generating-elapsed">
          {mm}:{ss} elapsed
        </span>
        <span className="project-agent-image-generating-sep">·</span>
        <span className="project-agent-image-generating-live">
          <span className="project-agent-image-generating-live-dot" />
          Live
        </span>
      </p>
    </div>
  );
}

export default function ProjectAgentMessageImage({ messageId, token, alt = 'Generated image' }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [containerRef, inView] = useLazyInView();
  const id = messageId != null ? String(messageId) : '';

  useEffect(() => {
    if (!id || !token || !inView) return undefined;
    let cancelled = false;

    setFailed(false);

    (async () => {
      try {
        const objectUrl = await getProjectAgentImageBlobUrl(id, token);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, token, retryKey, inView]);

  const handleDownload = useCallback(async () => {
    if (!id || !token || downloading) return;
    setDownloading(true);
    try {
      await downloadProjectAgentImage(id, token);
    } catch {
      /* ignore — user can retry */
    } finally {
      setDownloading(false);
    }
  }, [id, token, downloading]);

  if (failed) {
    return (
      <p className="project-agent-meta">
        Image could not load.{' '}
        <button
          type="button"
          className="project-agent-image-retry"
          onClick={() => {
            invalidateProjectAgentMedia(id, 'image');
            setFailed(false);
            setSrc('');
            setRetryKey((k) => k + 1);
          }}
        >
          Retry
        </button>
      </p>
    );
  }

  if (!src) {
    return (
      <div ref={containerRef} className="project-agent-media-placeholder">
        <p className="project-agent-meta">{inView ? 'Loading image…' : 'Image'}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="project-agent-image-wrap">
      <img className="project-agent-generated-img" src={src} alt={alt} loading="lazy" />
      <div className="project-agent-image-actions">
        <button
          type="button"
          className="project-agent-image-btn project-agent-image-btn--download"
          onClick={handleDownload}
          disabled={downloading}
          title="Download image"
        >
          <FaDownload aria-hidden />
          {downloading ? 'Saving…' : 'Download'}
        </button>
      </div>
    </div>
  );
}
