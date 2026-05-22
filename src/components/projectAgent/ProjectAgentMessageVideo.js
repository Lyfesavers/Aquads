import React, { useEffect, useMemo, useState } from 'react';
import { getProjectAgentVideoBlobUrl, invalidateProjectAgentMedia } from '../../services/projectAgentMediaCache';
import { getVideoRenderEstimate } from './projectAgentVideoEstimates';
import useLazyInView from './useLazyInView';

const STATUS_TICK_MS = 4000;

function VideoRetentionNotice({ variant = 'active', onRetry }) {
  if (variant === 'unavailable') {
    return (
      <div className="project-agent-video-retention project-agent-video-retention--unavailable">
        <p className="project-agent-video-retention-title">Clip no longer available</p>
        <p className="project-agent-video-retention-text">
          This video is no longer on our servers. Skipper keeps clips temporarily for in-chat playback
          only — save future videos from the player as soon as they finish so you keep a permanent copy.
        </p>
        {onRetry ? (
          <button type="button" className="project-agent-image-retry" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="project-agent-video-retention">
      <p className="project-agent-video-retention-text">
        <strong>Save your clip.</strong> Videos in chat are kept temporarily and may be removed after
        platform updates. Use the player controls to download and keep a permanent copy on your device.
      </p>
    </div>
  );
}

function buildGeneratingPhases(videoSeconds) {
  const estimate = getVideoRenderEstimate(videoSeconds);
  return [
    { afterSec: 0, text: 'Sending your prompt…' },
    { afterSec: 20, text: 'Rendering frames — this step is slow but active' },
    { afterSec: 90, text: 'Still generating — progress often stays at 0% for several minutes' },
    { afterSec: 180, text: 'Building motion and lighting — no action needed on your side' },
    { afterSec: 360, text: estimate.longPhaseText },
    { afterSec: 600, text: 'Still working — we check progress every few seconds automatically' },
    { afterSec: 900, text: 'Almost there — finishing touches on the server' }
  ];
}

const FINALIZING_PHASES = [
  { afterSec: 0, text: 'Render complete — downloading your clip…' },
  { afterSec: 8, text: 'Saving video to your chat…' },
  { afterSec: 20, text: 'Preparing playback — just a moment' }
];

function formatElapsed(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pickPhaseText(phases, elapsedSec) {
  let text = phases[0]?.text || 'Working…';
  for (const phase of phases) {
    if (elapsedSec >= phase.afterSec) text = phase.text;
  }
  return text;
}

function VideoGeneratingStatus({ status, progress, createdAt, videoSeconds }) {
  const [now, setNow] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const isFinalizing = status === 'finalizing';
  const startedAt = useMemo(() => {
    if (createdAt) {
      const t = new Date(createdAt).getTime();
      if (Number.isFinite(t)) return t;
    }
    return Date.now();
  }, [createdAt]);

  const elapsedSec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const pct =
    progress != null && !Number.isNaN(Number(progress))
      ? Math.min(100, Math.max(0, Math.round(Number(progress))))
      : null;

  const estimate = useMemo(() => getVideoRenderEstimate(videoSeconds), [videoSeconds]);
  const phases = isFinalizing ? FINALIZING_PHASES : buildGeneratingPhases(videoSeconds);
  const baseText = pickPhaseText(phases, elapsedSec);
  const eligibleTexts = phases.filter((p) => elapsedSec >= p.afterSec).map((p) => p.text);
  const rotateList = eligibleTexts.length ? eligibleTexts : [baseText];
  const rotateIdx = rotateList.length > 1 ? tick % rotateList.length : 0;
  const statusText = elapsedSec >= 45 ? rotateList[rotateIdx] : baseText;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), STATUS_TICK_MS);
    return () => window.clearInterval(id);
  }, [isFinalizing]);

  const showPct = pct != null && !isFinalizing;
  const barPct = isFinalizing ? 100 : showPct && pct > 0 ? pct : null;
  const clipLabel = videoSeconds ? `${videoSeconds}s clip` : 'clip';

  return (
    <div
      className={`project-agent-video-generating${isFinalizing ? ' project-agent-video-generating--finalizing' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="project-agent-video-generating-visual" aria-hidden="true">
        <div className="project-agent-video-generating-bars">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="project-agent-video-generating-ring" />
      </div>

      <p className="project-agent-video-generating-title">
        {isFinalizing ? 'Saving your video' : `Creating your ${clipLabel}`}
      </p>
      <p className="project-agent-video-generating-status">{statusText}</p>

      <div className="project-agent-video-generating-track" aria-hidden="true">
        <div
          className={`project-agent-video-generating-fill${
            barPct == null ? ' project-agent-video-generating-fill--indeterminate' : ''
          }`}
          style={barPct != null ? { width: `${barPct}%` } : undefined}
        />
      </div>

      <p className="project-agent-video-generating-meta">
        <span className="project-agent-video-generating-elapsed">{formatElapsed(elapsedSec)} elapsed</span>
        {showPct ? (
          <>
            <span className="project-agent-video-generating-sep">·</span>
            <span className="project-agent-video-generating-pct">{pct}%</span>
          </>
        ) : isFinalizing ? (
          <>
            <span className="project-agent-video-generating-sep">·</span>
            <span>Finishing up</span>
          </>
        ) : (
          <>
            <span className="project-agent-video-generating-sep">·</span>
            <span className="project-agent-video-generating-live">
              <span className="project-agent-video-generating-live-dot" />
              Live
            </span>
          </>
        )}
      </p>

      {!isFinalizing ? (
        <p className="project-agent-video-generating-hint">
          Estimated time: ~{estimate.label}. {estimate.generatingHint}
        </p>
      ) : (
        <p className="project-agent-video-generating-hint">
          When playback starts, save the file from the player — Skipper keeps clips temporarily and they
          may not be available later.
        </p>
      )}
    </div>
  );
}

export default function ProjectAgentMessageVideo({
  messageId,
  token,
  status,
  progress,
  createdAt,
  videoSeconds
}) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [containerRef, inView] = useLazyInView('320px');
  const id = String(messageId);
  const isReady = status === 'completed';
  const isFailed = status === 'failed';
  const inFlight = !isReady && !isFailed;

  useEffect(() => {
    if (!isReady || !token || !id || !inView) {
      if (!isReady) setBlobUrl('');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadError('');
        const objectUrl = await getProjectAgentVideoBlobUrl(id, token);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setLoadError('Video could not load.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, token, isReady, inView, retryKey]);

  if (isFailed) {
    return <p className="project-agent-meta project-agent-video-failed">Video generation failed.</p>;
  }

  if (inFlight) {
    return (
      <VideoGeneratingStatus
        status={status}
        progress={progress}
        createdAt={createdAt}
        videoSeconds={videoSeconds}
      />
    );
  }

  if (loadError) {
    return (
      <VideoRetentionNotice
        variant="unavailable"
        onRetry={() => {
          invalidateProjectAgentMedia(id, 'video');
          setLoadError('');
          setBlobUrl('');
          setRetryKey((k) => k + 1);
        }}
      />
    );
  }

  if (!blobUrl) {
    return (
      <div
        ref={containerRef}
        className="project-agent-video-generating project-agent-video-generating--loading-file"
      >
        <div className="project-agent-video-generating-visual" aria-hidden="true">
          <div className="project-agent-video-generating-bars">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <p className="project-agent-video-generating-status">
          {inView ? 'Loading video for playback…' : 'Video ready — scroll to load'}
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="project-agent-video-wrap">
      <VideoRetentionNotice variant="active" />
      <video
        className="project-agent-video-player"
        src={blobUrl}
        controls
        playsInline
        preload="metadata"
      />
    </div>
  );
}
