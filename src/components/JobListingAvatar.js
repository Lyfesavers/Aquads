import React, { useState } from 'react';

function userInitialsAvatarUrl(job) {
  const raw = String(job.ownerUsername || 'User').slice(0, 64);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(raw)}&size=128&bold=true&color=ffffff&background=random`;
}

const SYNDICATE_SURFACE = {
  web3career:
    'bg-gradient-to-br from-violet-600/55 via-violet-900/35 to-purple-950/70 border-violet-400/40',
  remotive:
    'bg-gradient-to-br from-blue-600/45 via-slate-800/40 to-slate-950/65 border-blue-400/35',
  himalayas:
    'bg-gradient-to-br from-emerald-600/45 via-slate-800/40 to-slate-950/65 border-emerald-400/35',
  jooble:
    'bg-gradient-to-br from-amber-600/45 via-slate-800/40 to-slate-950/65 border-amber-400/35',
};

/**
 * Avatar for job rows: syndicated feeds use company name text when API omits logos;
 * user listings use poster image or ui-avatars.
 */
export function JobListingAvatar({
  job,
  syndicated,
  boxClass = 'w-12 h-12 sm:w-16 sm:h-16',
  roundedClass = 'rounded-xl',
  compact = false,
}) {
  const [logoBroken, setLogoBroken] = useState(false);
  const displayName = String(job.ownerUsername || 'Company').trim() || 'Company';

  let inner;

  if (syndicated) {
    if (job.companyLogo && !logoBroken) {
      inner = (
        <img
          src={job.companyLogo}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={() => setLogoBroken(true)}
        />
      );
    } else {
      inner = (
        <div
          className={`flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden border text-center ${compact ? 'px-px py-px' : 'px-0.5 py-1'} ${
            SYNDICATE_SURFACE[job.source] || 'border-gray-500/45 bg-gray-800/95'
          }`}
        >
          <span
            className={
              compact
                ? 'line-clamp-2 max-h-full w-full overflow-hidden break-words text-[7px] font-semibold leading-tight text-white'
                : 'line-clamp-3 max-h-full w-full overflow-hidden break-words text-[9px] font-semibold leading-tight text-white drop-shadow-sm sm:text-[11px] sm:leading-snug'
            }
            title={displayName}
          >
            {displayName}
          </span>
        </div>
      );
    }
  } else if (job.owner?.image || job.ownerImage) {
    inner = (
      <img
        src={job.owner?.image || job.ownerImage}
        alt={displayName}
        className="h-full w-full object-cover"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = userInitialsAvatarUrl(job);
        }}
      />
    );
  } else {
    inner = (
      <img
        src={userInitialsAvatarUrl(job)}
        alt={displayName}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div
      className={`${boxClass} flex-shrink-0 overflow-hidden ${roundedClass} border border-gray-600/50 bg-gray-700`}
    >
      {inner}
    </div>
  );
}
