import React from 'react';
import { FaGlobe, FaTwitter, FaTelegram, FaDiscord, FaGithub, FaReddit } from 'react-icons/fa';
import TokenSentiment from './TokenSentiment';
// TradingViewChart removed in token details as requested

const formatUsd = (value, { compactBelowOne = false } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'N/A';
  if (compactBelowOne && n < 1) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'N/A';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const StatCard = ({ label, value, sub, subClassName = 'text-gray-500' }) => (
  <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/15 hover:bg-white/[0.05]">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
    <div className="mt-1 text-sm lg:text-base font-semibold text-white tabular-nums truncate" title={String(value)}>
      {value}
    </div>
    {sub ? <div className={`mt-0.5 text-[11px] tabular-nums truncate ${subClassName}`}>{sub}</div> : null}
  </div>
);

const SocialLink = ({ href, icon: Icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </a>
);

const TokenDetails = ({
  token,
  showReviews,
  onClose,
  currentUser,
  showNotification,
  showDexFrame,
  selectedDex,
  onDexClick,
  setShowDexFrame,
  isMobile = false,
  colSpan = 9
}) => {
  const change24h = Number(token.priceChangePercentage24h) || 0;
  const isUp = change24h >= 0;

  const stats = [
    { label: 'Market Cap', value: formatUsd(token.marketCap) },
    { label: 'Volume 24h', value: formatUsd(token.totalVolume) },
    { label: 'Fully Diluted Val.', value: formatUsd(token.fullyDilutedValuation) },
    { label: '24h High', value: formatUsd(token.high24h, { compactBelowOne: true }) },
    { label: '24h Low', value: formatUsd(token.low24h, { compactBelowOne: true }) },
    {
      label: 'All Time High',
      value: formatUsd(token.ath, { compactBelowOne: true }),
      sub:
        typeof token.athChangePercentage === 'number'
          ? `${token.athChangePercentage.toFixed(2)}% from ATH`
          : null,
      subClassName: 'text-rose-400'
    },
    { label: 'Market Cap Rank', value: token.marketCapRank ? `#${token.marketCapRank}` : 'N/A' },
    {
      label: 'Circulating Supply',
      value: formatAmount(token.circulatingSupply),
      sub: token.maxSupply ? `Max ${formatAmount(token.maxSupply)}` : null
    },
    { label: 'Total Supply', value: formatAmount(token.totalSupply) },
    {
      label: 'Price',
      value: formatUsd(token.currentPrice, { compactBelowOne: true }),
      sub: `${change24h.toFixed(2)}% (24h)`,
      subClassName: isUp ? 'text-emerald-400' : 'text-rose-400'
    }
  ];

  const links = [
    token.links?.homepage && { href: token.links.homepage, icon: FaGlobe, label: 'Website' },
    token.links?.twitter_screen_name && {
      href: `https://twitter.com/${token.links.twitter_screen_name}`,
      icon: FaTwitter,
      label: 'Twitter'
    },
    token.links?.telegram_channel_identifier && {
      href: `https://t.me/${token.links.telegram_channel_identifier}`,
      icon: FaTelegram,
      label: 'Telegram'
    },
    token.links?.discord && { href: token.links.discord, icon: FaDiscord, label: 'Discord' },
    token.links?.github && { href: token.links.github, icon: FaGithub, label: 'Github' },
    token.links?.subreddit_url && { href: token.links.subreddit_url, icon: FaReddit, label: 'Reddit' }
  ].filter(Boolean);

  const content = (
    <div className="p-4 lg:p-6">
      {/* Header: identity, live price and primary action */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <img
            src={token.image}
            alt={token.name}
            className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-gray-800 ring-1 ring-white/10"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder.png';
            }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg md:text-2xl font-bold text-white truncate">{token.name}</h3>
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-300">
                {token.symbol?.toUpperCase()}
              </span>
              {token.marketCapRank ? (
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                  Rank #{token.marketCapRank}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-bold text-white tabular-nums">
                {formatUsd(token.currentPrice, { compactBelowOne: true })}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? '▲' : '▼'} {Math.abs(change24h).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <a
            href={`/aquaswap?symbol=${encodeURIComponent(token.symbol)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-3.5 py-2 text-xs md:text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all hover:from-blue-500 hover:to-cyan-500 hover:shadow-blue-500/25"
          >
            Buy / Trade on AquaSwap
          </a>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metrics fill the wide column, sentiment sits alongside instead of leaving dead space */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                sub={stat.sub}
                subClassName={stat.subClassName}
              />
            ))}
          </div>

          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <SocialLink key={link.label} href={link.href} icon={link.icon} label={link.label} />
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-1" onClick={(e) => e.stopPropagation()}>
          <TokenSentiment
            tokenId={token.id}
            currentUser={currentUser}
            showNotification={showNotification}
          />
        </div>
      </div>
    </div>
  );

  // Conditional rendering based on mobile vs desktop
  if (isMobile) {
    return (
      <div className="rounded-xl border border-blue-500/25 bg-gray-900/80 backdrop-blur-sm shadow-xl shadow-black/30">
        {content}
      </div>
    );
  }

  return (
    <tr className="bg-gray-900/80 backdrop-blur-sm border-t border-b border-blue-500/25">
      <td colSpan={colSpan} className="p-0">
        {content}
      </td>
    </tr>
  );
};

export default TokenDetails;
