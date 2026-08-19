import React, { useState } from 'react';
import { FaTwitter, FaTelegram, FaCheckCircle, FaChartLine, FaRobot, FaCopy, FaCheck } from 'react-icons/fa';

const AQUADS_X_HANDLE = '@_Aquads_';
const AQUADS_X_URL = 'https://x.com/_Aquads_';
const AQUADS_TELEGRAM_URL = 'https://t.me/+6rJbDLqdMxA3ZTUx';
const AQUADS_BUMP_BOT_URL = 'https://t.me/aquadsbumpbot';

const BOT_FEATURES = [
  { icon: '🐦', title: 'Twitter & Facebook Raids', desc: 'Starter 1→5/day · Premium 5→10/day when bumped' },
  { icon: '📈', title: 'Trending & Rankings', desc: 'Trend across Aquads, BexTools & trending channel' },
  { icon: '🗳️', title: 'Voting & Boosts', desc: 'Get bullish votes + real TG members' },
  { icon: '🎨', title: 'Custom Branding', desc: 'Your logo in vote notifications on trending channel' },
  { icon: '🌐', title: 'Cross-Community Raids', desc: 'Share raids across all opted-in groups' },
  { icon: '💰', title: 'Points → Cash', desc: '$100 per 10K points — paid to your community' }
];

export function buildAquaSwapChartUrl(pairAddress, blockchain) {
  if (!pairAddress || !blockchain) return null;
  return `https://aquads.xyz/share/aquaswap?token=${encodeURIComponent(String(pairAddress).trim())}&blockchain=${encodeURIComponent(blockchain)}`;
}

function listingTweetIntent({ projectName, pairAddress }) {
  const lines = [
    `Listing ${projectName || 'our project'} on @_Aquads_ — excited to join the bubble map! 🚀`
  ];
  if (pairAddress) {
    lines.push(String(pairAddress).trim());
  }
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(lines.join(' '))}`;
}

const primaryBtn =
  'inline-flex items-center justify-center min-h-11 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/10 transition-colors';
const ghostBtn =
  'inline-flex items-center justify-center min-h-10 w-full px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors';

/**
 * Post-listing next steps: ownership verification first, then chart link + bump bot.
 * Rendered inside CreateAdModal's existing fullscreen Modal so every listing path sees it.
 */
const ListingSubmittedPanel = ({
  projectName = '',
  tokenChartUrl = null,
  pairAddress = '',
  listingTier = 'starter',
  paymentPending = false,
  onClose
}) => {
  const [chartCopied, setChartCopied] = useState(false);
  const isPremium = listingTier === 'premium';
  const displayName = projectName || 'your project';
  const telegramExample = `Application for ${projectName || 'TOKEN'} just submitted — check it`;
  const reviewLabel = isPremium ? 'Premium · ~1 hour after payment' : 'Starter · typically 24–48 hours';

  const copyChartLink = async () => {
    const url = tokenChartUrl || 'https://aquads.xyz';
    try {
      await navigator.clipboard.writeText(url);
      setChartCopied(true);
      setTimeout(() => setChartCopied(false), 2000);
      if (typeof window.showNotification === 'function') {
        window.showNotification('Chart link copied!', 'success');
      }
    } catch {
      setChartCopied(false);
    }
  };

  return (
    <div
      className="text-white w-full max-w-4xl mx-auto pb-10"
      style={{
        paddingTop: 'max(3.75rem, calc(env(safe-area-inset-top, 0px) + 2.75rem))',
        paddingBottom: 'max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem))'
      }}
    >
      <header className="text-center mb-6 sm:mb-8 px-1">
        <p className="inline-flex items-center gap-2 mb-3 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-cyan-200">
          Application received
        </p>
        <h2 className="text-[1.65rem] sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-tight break-words px-2">
          {projectName ? (
            <>
              <span className="text-white">{projectName}</span>
              <span className="text-gray-400 font-medium"> submitted</span>
            </>
          ) : (
            'Application submitted'
          )}
        </h2>
        <p className="text-gray-400 text-sm sm:text-base mt-2 max-w-xl mx-auto leading-relaxed">
          Verify ownership so we can review and go live.
        </p>
        <p className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
          {reviewLabel}
        </p>
      </header>

      {paymentPending && (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-50 leading-relaxed">
          <p className="font-semibold text-amber-100 mb-0.5">Complete payment</p>
          Please finish payment in the window we just opened.
          {isPremium
            ? ' Premium listings enter the 1-hour fast-track queue once payment is verified.'
            : ' Your listing enters the standard review queue once payment is verified.'}
          {' '}Then verify ownership below.
        </div>
      )}

      <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 sm:p-6 lg:p-7 mb-4 sm:mb-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-start gap-3 mb-4 sm:mb-5">
          <span className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-cyan-900/40">
            1
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-white">Verify ownership</h3>
              <span className="rounded-full bg-cyan-500/15 border border-cyan-400/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                Required
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
              Choose <strong className="text-white font-medium">one</strong> method so we can match your submission. Telegram verification must come from the <strong className="text-white font-medium">owner of your project&apos;s Telegram group</strong> — anyone else joining our chat does not count.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5 flex flex-col min-h-[220px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
                <FaTwitter className="text-sky-300 text-lg" />
              </div>
              <h4 className="text-white font-semibold">Via X</h4>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-4">
              From {displayName}&apos;s official X account, DM <strong className="text-gray-100 font-medium">{AQUADS_X_HANDLE}</strong>, then tag us in a public post. Include your <strong className="text-gray-100 font-medium">project name</strong> and <strong className="text-gray-100 font-medium">contract / pair address</strong>.
            </p>
            <div className="flex flex-col gap-2 mt-auto">
              <a
                href={AQUADS_X_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryBtn}
              >
                Message {AQUADS_X_HANDLE}
              </a>
              <a
                href={listingTweetIntent({ projectName, pairAddress })}
                target="_blank"
                rel="noopener noreferrer"
                className={ghostBtn}
              >
                Draft public post →
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5 flex flex-col min-h-[220px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
                <FaTelegram className="text-sky-300 text-lg" />
              </div>
              <h4 className="text-white font-semibold">Via Telegram</h4>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              The <strong className="text-gray-100 font-medium">owner</strong> of your project&apos;s Telegram group must join Aquads Telegram and post that your listing was just submitted. A random member joining our group is <strong className="text-gray-100 font-medium">not</strong> verification.
            </p>
            <p className="text-gray-500 text-xs leading-relaxed mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              Example:{' '}
              <span className="text-cyan-300/90 font-medium break-words">{telegramExample}</span>
            </p>
            <a
              href={AQUADS_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${primaryBtn} mt-auto`}
            >
              Join Aquads Telegram
            </a>
          </div>
        </div>

        <p className="text-gray-500 text-xs sm:text-sm mt-4 sm:mt-5 flex items-start gap-2 leading-relaxed">
          <FaCheckCircle className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            After ownership is verified, we review and your bubble appears on the map once approved.
          </span>
        </p>
      </section>

      <p className="text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase text-gray-500 mb-3 px-0.5">
        Optional · while you wait
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
              <FaChartLine className="text-sm" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">Add your chart link</h3>
              <p className="text-xs text-gray-500 mt-0.5">Live AquaSwap token chart on your site</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            {tokenChartUrl
              ? 'Add this as a button on your website — visitors get your live chart with rich preview cards when shared on social.'
              : 'Add this to your website as a partner button to boost domain authority and visibility.'}
          </p>
          <div className="mt-auto bg-black/40 border border-white/10 rounded-xl p-1.5 pl-3 flex items-center gap-2">
            <input
              type="text"
              value={tokenChartUrl || 'https://aquads.xyz'}
              readOnly
              className="bg-transparent text-cyan-300 text-xs sm:text-sm w-full min-w-0 outline-none font-mono truncate"
            />
            <button
              type="button"
              onClick={copyChartLink}
              className="shrink-0 inline-flex items-center gap-1.5 min-h-9 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-xs font-semibold px-3 rounded-lg transition-colors"
            >
              {chartCopied ? <FaCheck className="text-[10px]" /> : <FaCopy className="text-[10px]" />}
              {chartCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Live DEX Chart', 'Swap Widget', 'Price & Volume', 'Boosts SEO'].map((b) => (
              <span
                key={b}
                className="inline-flex items-center text-[11px] bg-white/5 text-gray-300 border border-white/10 rounded-full px-2.5 py-1"
              >
                {b}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center text-violet-300">
              <FaRobot className="text-sm" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white">Telegram bump bot</h3>
              <p className="text-xs text-gray-500 mt-0.5">@aquadsbumpbot — free marketing tools</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 flex-1">
            {BOT_FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-2 rounded-xl bg-black/25 border border-white/5 p-2.5">
                <span className="text-base shrink-0 leading-none mt-0.5" aria-hidden="true">{f.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight">{f.title}</p>
                  <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <a
            href={AQUADS_BUMP_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Start @aquadsbumpbot
          </a>
        </section>
      </div>

      <div className="flex justify-center px-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-5 rounded-xl text-sm text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          I&apos;ll do this later — Close
        </button>
      </div>
    </div>
  );
};

export default ListingSubmittedPanel;
