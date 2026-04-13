import React, { useState } from 'react';

const sourceLabel = (source) => {
  if (source === 'coindesk') return 'CoinDesk';
  if (source === 'global') return 'The Guardian';
  return source;
};

const sourceAccent = (source) => {
  if (source === 'coindesk') return 'from-amber-500/25 to-orange-600/10 border-amber-500/30';
  return 'from-sky-500/20 to-blue-900/20 border-sky-500/25';
};

const formatDate = (date) =>
  new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function ImageBanner({ imageUrl, source, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${sourceAccent(source)} border-b border-white/5 ${className}`}
        aria-hidden
      >
        <span className="text-4xl font-black text-white/10 tracking-tighter select-none">
          {source === 'coindesk' ? 'CD' : 'GU'}
        </span>
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
          {sourceLabel(source)}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gray-950 ${className}`}>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none" />
    </div>
  );
}

function FeaturedCard({ item }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-gray-900/90 to-gray-950 shadow-xl shadow-black/40 ring-1 ring-white/5 transition hover:border-amber-500/25 hover:ring-amber-500/10 lg:flex-row lg:min-h-[320px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
    >
      <div className="relative w-full lg:w-[52%] shrink-0">
        <ImageBanner
          imageUrl={item.imageUrl}
          source={item.source}
          className="aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto lg:min-h-full"
        />
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 backdrop-blur-md">
            {sourceLabel(item.source)}
          </span>
          <span className="rounded-md bg-black/45 px-2.5 py-1 font-mono text-[10px] text-gray-300 backdrop-blur-md">
            {formatDate(item.publishedAt)}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-500/80">Lead story</p>
        <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl sm:leading-snug">{item.title}</h3>
        {item.summary ? (
          <p className="text-base leading-relaxed text-gray-400 line-clamp-4">{item.summary}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400">
            Read full article
            <span aria-hidden className="transition group-hover:translate-x-0.5">
              →
            </span>
          </span>
          <span className="text-xs text-gray-600">Opens on {sourceLabel(item.source)}</span>
        </div>
      </div>
    </a>
  );
}

function ArticleCard({ item }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/60 shadow-lg shadow-black/30 ring-1 ring-white/5 transition hover:border-gray-500/40 hover:bg-gray-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
    >
      <ImageBanner imageUrl={item.imageUrl} source={item.source} className="aspect-[16/10] w-full shrink-0" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/5 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90">
            {sourceLabel(item.source)}
          </span>
          <time className="font-mono text-[10px] text-gray-500" dateTime={item.publishedAt}>
            {formatDate(item.publishedAt)}
          </time>
        </div>
        <h3 className="mb-2 flex-1 text-lg font-bold leading-snug text-white line-clamp-3 group-hover:text-amber-100/95 transition-colors">
          {item.title}
        </h3>
        {item.summary ? <p className="text-sm leading-relaxed text-gray-500 line-clamp-3">{item.summary}</p> : null}
        <span className="mt-4 text-xs font-semibold text-sky-400/90 group-hover:text-sky-300">
          View on publisher site →
        </span>
      </div>
    </a>
  );
}

const MarketNewsList = ({ items, retentionDays }) => {
  if (!items?.length) {
    return (
      <div className="text-center py-16 text-gray-400 max-w-lg mx-auto">
        <p className="mb-2 text-lg text-gray-300">No headlines yet</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          Stories sync from RSS a few times per day. Check back after the server has run its next update.
        </p>
      </div>
    );
  }

  const [lead, ...rest] = items;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.35em] text-amber-500/90">Wire desk</h3>
          <p className="mt-1 text-sm text-gray-500">
            {typeof retentionDays === 'number'
              ? `Rolling ${retentionDays}-day window · CoinDesk & The Guardian`
              : 'CoinDesk & The Guardian'}
          </p>
        </div>
        <p className="text-xs text-gray-600 max-w-md text-right sm:text-left">
          Headlines &amp; images from RSS · Full reporting opens on the publisher&apos;s site
        </p>
      </div>

      <FeaturedCard item={lead} />

      {rest.length > 0 ? (
        <div>
          <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">More coverage</h4>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((item) => (
              <ArticleCard key={item._id} item={item} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketNewsList;
