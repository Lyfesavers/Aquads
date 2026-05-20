import React, { useEffect, useState } from 'react';
import {
  fetchProjectAgentVideoBlob,
  downloadProjectAgentVideo
} from '../../services/projectAgentApi';

export default function ProjectAgentMessageVideo({ messageId, token, status, progress }) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loadError, setLoadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const id = String(messageId);
  const isReady = status === 'completed';
  const isFailed = status === 'failed';
  const inFlight = !isReady && !isFailed;

  useEffect(() => {
    if (!isReady || !token || !id) {
      setBlobUrl('');
      return undefined;
    }

    let cancelled = false;
    let objectUrl = '';

    (async () => {
      try {
        setLoadError('');
        const blob = await fetchProjectAgentVideoBlob(id, token);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setLoadError('Video could not load.');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token, isReady]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProjectAgentVideo(id, token);
    } catch (e) {
      setLoadError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (isFailed) {
    return <p className="project-agent-meta project-agent-video-failed">Video generation failed.</p>;
  }

  if (inFlight) {
    const pct = progress != null && !Number.isNaN(Number(progress)) ? Math.round(Number(progress)) : null;
    return (
      <p className="project-agent-meta project-agent-video-progress">
        Generating video…{pct != null ? ` ${pct}%` : ''}
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="project-agent-meta">
        {loadError}{' '}
        <button
          type="button"
          className="project-agent-image-retry"
          onClick={() => {
            setLoadError('');
            setBlobUrl('');
          }}
        >
          Retry
        </button>
      </p>
    );
  }

  if (!blobUrl) {
    return <p className="project-agent-meta">Loading video…</p>;
  }

  return (
    <div className="project-agent-video-wrap">
      <video className="project-agent-video-player" src={blobUrl} controls playsInline preload="metadata" />
      <div className="project-agent-image-actions">
        <button
          type="button"
          className="project-agent-image-btn project-agent-image-btn--download"
          onClick={handleDownload}
          disabled={downloading}
          title="Download video"
        >
          {downloading ? '…' : 'Download'}
        </button>
      </div>
    </div>
  );
}
