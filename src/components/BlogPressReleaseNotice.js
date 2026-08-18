import React from 'react';
import { PRESS_RELEASE_DISCLAIMER, PRESS_RELEASE_LABEL } from '../utils/blogPressRelease';

export const BlogPressReleaseBadge = ({ className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-900 ${className}`}
  >
    {PRESS_RELEASE_LABEL}
  </span>
);

export const BlogPressReleaseDisclaimer = ({ className = '' }) => (
  <aside
    className={`rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90 ${className}`}
    role="note"
    aria-label="Press release disclosure"
  >
    <p className="font-semibold text-amber-200 mb-1">{PRESS_RELEASE_LABEL}</p>
    <p className="leading-relaxed">{PRESS_RELEASE_DISCLAIMER}</p>
  </aside>
);
