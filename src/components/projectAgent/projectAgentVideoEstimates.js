/** User-facing render time ranges for Skipper Create video (async provider). */
export const VIDEO_RENDER_ESTIMATES = {
  15: {
    label: '10–20 min',
    composerHint: 'Typical render: ~10–20 min.',
    generatingHint: 'You can keep this chat open or come back later.',
    longPhaseText: 'Long render in progress — 15s clips commonly take 10–20 minutes'
  },
  30: {
    label: '25–40 min',
    composerHint: 'Typical render: ~25–40 min (two stitched segments, ~32s billed max).',
    generatingHint:
      '30s uses two back-to-back renders — you can keep this chat open or come back later.',
    longPhaseText: 'Long render in progress — 30s clips commonly take 25–40 minutes'
  }
};

/** Frontend poll attempts × VIDEO_POLL_MS (12s) before a soft timeout message. */
export const VIDEO_POLL_MAX_BY_SECONDS = {
  15: 120,
  30: 210
};

export function getVideoRenderEstimate(seconds) {
  const n = Number(seconds);
  return n >= 30 ? VIDEO_RENDER_ESTIMATES[30] : VIDEO_RENDER_ESTIMATES[15];
}

export function getVideoPollMaxAttempts(seconds) {
  const n = Number(seconds);
  return n >= 30 ? VIDEO_POLL_MAX_BY_SECONDS[30] : VIDEO_POLL_MAX_BY_SECONDS[15];
}
