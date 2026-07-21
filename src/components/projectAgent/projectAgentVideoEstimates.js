/** User-facing render time ranges for Skipper Create video (async provider). */
export const VIDEO_RENDER_ESTIMATES = {
  20: {
    label: '10–25 min',
    composerHint: 'Typical render: ~10–25 min. Server keeps working if you close this tab.',
    generatingHint: 'Rendering continues on the server — you can leave and come back.',
    longPhaseText: 'Long render in progress — 20s clips commonly take 10–25 minutes'
  },
  30: {
    label: '25–40 min',
    composerHint:
      'Typical render: ~25–40 min (two stitched segments). Server keeps working if you close this tab.',
    generatingHint:
      '30s uses two back-to-back renders — you can leave this chat and return later.',
    longPhaseText: 'Long render in progress — 30s clips commonly take 25–40 minutes'
  }
};

/**
 * After this many UI polls (~8s each), show a “still working” notice but keep polling.
 * Sora + server worker continue regardless.
 */
export const VIDEO_SOFT_NOTICE_POLLS = {
  20: 150,
  30: 280
};

export function getVideoRenderEstimate(seconds) {
  const n = Number(seconds);
  return n >= 30 ? VIDEO_RENDER_ESTIMATES[30] : VIDEO_RENDER_ESTIMATES[20];
}

export function getVideoSoftNoticePolls(seconds) {
  const n = Number(seconds);
  return n >= 30 ? VIDEO_SOFT_NOTICE_POLLS[30] : VIDEO_SOFT_NOTICE_POLLS[20];
}
