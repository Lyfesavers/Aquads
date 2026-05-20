import React, { useCallback, useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa';
import {
  fetchProjectAgentImageBlob,
  downloadProjectAgentImage
} from '../../services/projectAgentApi';

export default function ProjectAgentMessageImage({ messageId, token, alt = 'Generated image' }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!messageId || !token) return undefined;
    let cancelled = false;
    let objectUrl = '';

    (async () => {
      try {
        const blob = await fetchProjectAgentImageBlob(messageId, token);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, token]);

  const handleDownload = useCallback(async () => {
    if (!messageId || !token || downloading) return;
    setDownloading(true);
    try {
      await downloadProjectAgentImage(messageId, token);
    } catch {
      /* ignore — user can retry */
    } finally {
      setDownloading(false);
    }
  }, [messageId, token, downloading]);

  if (failed) {
    return <p className="project-agent-meta">Image unavailable</p>;
  }

  if (!src) {
    return <p className="project-agent-meta">Loading image…</p>;
  }

  return (
    <div className="project-agent-image-wrap">
      <img className="project-agent-generated-img" src={src} alt={alt} />
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
