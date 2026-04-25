import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * HowItWorksSection
 *
 * Dual-rail "How Aquads Works" pitch for the landing page.
 *
 * Narrative spine:
 *   - Projects (cyan rail)  → build MOMENTUM via activity (the perks fuel a flywheel)
 *   - Freelancers (purple rail) → build REPUTATION (compounds linearly through trust signals)
 *
 * Visual: shared center timeline with numbered nodes, side cards slide in from left/right,
 * and a glowing curved arrow on the projects side loops Step 04 back to Step 02 to make the
 * "momentum loop" thesis literal. Freelancer side stays a clean linear timeline.
 *
 * The component reuses the gradient utility classes (text-gradient-cyan / text-gradient-purple)
 * already injected by LandingPage.js, so no extra style import is needed.
 */

// ---------- Step data ----------

const projectSteps = [
  {
    n: '01',
    title: 'List & ignite',
    oneLiner:
      "$199 one-time. Auto-fill from DexScreener (symbol, chain, pair). Your bubble goes live and the flywheel starts the moment you launch.",
    perks: ['One-time fee', 'DexScreener auto-fill', '5% off for affiliates'],
    cta: { label: 'Create your listing', to: '/home?openListProject=true' },
    mockup: 'ignite',
  },
  {
    n: '02',
    title: 'Drive activity, earn the bump',
    oneLiner:
      "Bullish votes grow your bubble. Hit 100 votes and you auto-bump to top placement — no extra fees, ever. The more your community shows up, the bigger you appear.",
    perks: ['Vote-driven bump', '100-vote threshold', 'Voters earn 20 pts', 'Vote boosts'],
    cta: { label: 'See live bubbles', to: '/home' },
    mockup: 'votes',
  },
  {
    n: '03',
    title: 'Unlock the hype toolkit',
    oneLiner:
      "Bumped projects get the full kit to stay loud — every feature designed to refuel momentum, not bill you for it.",
    perks: ['20 free raids/day', 'Telegram raid network', 'HyperSpace boosts', 'Banners', 'Deep Dive Q&A'],
    cta: { label: 'Explore the toolkit', to: '/telegram-bot' },
    mockup: 'toolkit',
  },
  {
    n: '04',
    title: 'Convert hype into holders',
    oneLiner:
      "AquaPay payment links, on-chain trust signals, trending placement, BexTools sync. New holders vote → bubble grows → more visibility → more holders. The loop never stops.",
    perks: ['AquaPay', 'Trending', 'BexTools', 'Holder loop'],
    cta: { label: 'Open dashboard', to: '/dashboard' },
    mockup: 'loop',
  },
];

const freelancerSteps = [
  {
    n: '01',
    title: 'Create your profile',
    oneLiner:
      "Free forever. No subscriptions. List unlimited services across 30+ categories. Set your own rates. Crypto and fiat supported.",
    perks: ['Free', 'Unlimited services', '30+ categories'],
    cta: { label: 'List a service', to: '/marketplace?modal=list-service' },
    mockup: 'profile',
  },
  {
    n: '02',
    title: 'Mint your On-Chain Resume',
    oneLiner:
      "Trust score, skill badges, and work history attested on Base via EAS. ~$0.01 to mint. Portable, tamper-proof, wallet-owned.",
    perks: ['Base', 'EAS', '~$0.01', 'Public URL'],
    cta: { label: 'Mint your resume', to: '/home?tab=onchain' },
    mockup: 'resume',
  },
  {
    n: '03',
    title: 'Build your reputation',
    oneLiner:
      "Pass skill tests for verified badges, collect client reviews, complete bookings — every win compounds your trust score and on-chain credentials.",
    perks: ['Skill tests', 'Reviews', 'Trust score', 'Verified badges'],
    cta: { label: 'Take a skill test', to: '/marketplace' },
    mockup: 'reputation',
  },
  {
    n: '04',
    title: 'Get hired and paid safely',
    oneLiner:
      "AI-matched leads, token-unlock client contacts ($1 USDC/token, 2 per lead), AquaPay crypto escrow, Stripe + PayPal for fiat — all in one dashboard.",
    perks: ['AI matching', 'Escrow', 'Crypto + fiat'],
    cta: { label: 'Browse jobs', to: '/marketplace' },
    mockup: 'paid',
  },
];

// ---------- Tiny in-card mockups ----------
// Kept intentionally compact (~200×140) so they sit beside copy on desktop and stack cleanly on mobile.

const ProjectMockup = ({ kind }) => {
  if (kind === 'ignite') {
    return (
      <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-950/80 border border-cyan-500/20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_40px_rgba(34,211,238,0.55)]"
            initial={{ scale: 0.6, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.15 }}
          >
            $TKN
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ boxShadow: ['0 0 0 0 rgba(34,211,238,0)', '0 0 0 30px rgba(34,211,238,0)'] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-cyan-200/80 font-mono">
          <span>● LIVE</span>
          <span>auto-imported · DexScreener</span>
        </div>
      </div>
    );
  }
  if (kind === 'votes') {
    return (
      <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-950/80 border border-cyan-500/20 overflow-hidden p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-cyan-300">Bullish votes</span>
          <motion.span
            className="text-2xl font-black text-white tabular-nums"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            100<span className="text-cyan-400">+</span>
          </motion.span>
        </div>
        <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-teal-400"
            initial={{ width: '0%' }}
            whileInView={{ width: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-semibold">
            BUMPED
          </span>
          <span className="text-gray-400">Top placement · 0 fees</span>
        </div>
      </div>
    );
  }
  if (kind === 'toolkit') {
    const items = [
      { icon: '🐦', label: 'Raids' },
      { icon: '🤖', label: 'Telegram' },
      { icon: '🎧', label: 'HyperSpace' },
      { icon: '🖼️', label: 'Banners' },
      { icon: '🔍', label: 'Deep Dive' },
    ];
    return (
      <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-950/80 border border-cyan-500/20 overflow-hidden p-3">
        <div className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2">Momentum dashboard</div>
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              className="aspect-square rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <span className="text-base sm:text-lg leading-none">{it.icon}</span>
              <span className="text-[8px] text-gray-400 mt-1">{it.label}</span>
            </motion.div>
          ))}
        </div>
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-cyan-200/80">
          <span>20 free raids · daily</span>
          <span className="text-green-400">● active</span>
        </div>
      </div>
    );
  }
  // 'loop'
  return (
    <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-950/80 border border-cyan-500/20 overflow-hidden p-3">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg
          viewBox="0 0 100 100"
          className="w-24 h-24"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          <defs>
            <linearGradient id="loop-mock-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="38" fill="none" stroke="url(#loop-mock-grad)" strokeWidth="3" strokeDasharray="6 6" opacity="0.85" />
          <circle cx="50" cy="12" r="4" fill="#22d3ee" />
        </motion.svg>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
        <span className="text-[10px] uppercase tracking-widest text-cyan-300">Holders</span>
        <motion.span
          className="text-2xl font-black text-white tabular-nums"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          +1,247
        </motion.span>
        <span className="text-[10px] text-cyan-200/80">via AquaPay · trending</span>
      </div>
    </div>
  );
};

const FreelancerMockup = ({ kind }) => {
  if (kind === 'profile') {
    return (
      <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-purple-950/80 to-slate-950/80 border border-purple-500/20 overflow-hidden p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white font-semibold truncate">Senior Web3 Dev</div>
            <div className="text-[10px] text-purple-300">From $80/hr · USDC + Fiat</div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-semibold">FREE</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {['Solidity', 'React', 'Audit', 'Frontend', 'Smart contracts'].map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
              {t}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-purple-200/80">No subscriptions · pay only for results</div>
      </div>
    );
  }
  if (kind === 'resume') {
    return (
      <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-purple-950/80 to-slate-950/80 border border-purple-500/20 overflow-hidden p-3 flex items-center gap-3">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r="32" fill="none"
              stroke="#a855f7" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
              whileInView={{ strokeDashoffset: 2 * Math.PI * 32 * 0.12 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-black text-purple-300 leading-none">88</span>
            <span className="text-[8px] text-gray-400">Trust</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white font-semibold mb-1">On-Chain Resume</div>
          <div className="grid grid-cols-2 gap-1 text-[9px]">
            <div className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200 text-center">⛓️ Base</div>
            <div className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200 text-center">📜 EAS</div>
            <div className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200 text-center">🔒 Verified</div>
            <div className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200 text-center">~$0.01</div>
          </div>
        </div>
      </div>
    );
  }
  if (kind === 'reputation') {
    return (
      <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-purple-950/80 to-slate-950/80 border border-purple-500/20 overflow-hidden p-3">
        <div className="text-[10px] uppercase tracking-widest text-purple-300 mb-2">Reputation stack</div>
        <div className="space-y-1.5">
          {[
            { label: 'Skill tests passed', value: '7 / 10', pct: 70, color: 'bg-purple-400' },
            { label: 'Reviews (avg)', value: '4.9 ★', pct: 98, color: 'bg-pink-400' },
            { label: 'Jobs completed', value: '34', pct: 80, color: 'bg-fuchsia-400' },
          ].map((row, i) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-[10px] text-gray-300 mb-0.5">
                <span>{row.label}</span>
                <span className="text-white font-semibold">{row.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full ${row.color}`}
                  initial={{ width: '0%' }}
                  whileInView={{ width: `${row.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 0.1 + i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // 'paid'
  return (
    <div className="relative h-32 sm:h-36 w-full rounded-xl bg-gradient-to-br from-purple-950/80 to-slate-950/80 border border-purple-500/20 overflow-hidden p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-purple-300">Invoice</div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-semibold">PAID</span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg bg-white/5 border border-white/10 p-2">
          <div className="text-gray-400">Amount</div>
          <div className="text-white text-base font-black tabular-nums">$1,250</div>
          <div className="text-purple-300">USDC · Base</div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 p-2 flex flex-col justify-between">
          <div>
            <div className="text-gray-400">Methods</div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-500/30">AquaPay</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-500/30">Stripe</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-500/30">PayPal</span>
            </div>
          </div>
          <div className="text-purple-300">Escrow protected</div>
        </div>
      </div>
    </div>
  );
};

// ---------- Step card ----------

const StepCard = ({ step, side, MockupRenderer }) => {
  const isCyan = side === 'cyan';
  const accent = isCyan ? 'cyan' : 'purple';

  // Slide direction: cyan from left, purple from right.
  const initialX = isCyan ? -36 : 36;

  return (
    <motion.div
      initial={{ opacity: 0, x: initialX, y: 12 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className={`relative group rounded-2xl border backdrop-blur-xl p-5 sm:p-6 overflow-hidden
        ${isCyan
          ? 'border-cyan-500/20 bg-gradient-to-br from-cyan-950/60 via-slate-950/80 to-slate-950/90 hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(34,211,238,0.18)]'
          : 'border-purple-500/20 bg-gradient-to-br from-purple-950/60 via-slate-950/80 to-slate-950/90 hover:border-purple-400/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.18)]'
        }
        transition-all duration-300`}
    >
      {/* accent corner glow */}
      <div
        className={`pointer-events-none absolute -top-12 ${isCyan ? '-left-12' : '-right-12'} w-40 h-40 rounded-full blur-3xl opacity-40
          ${isCyan ? 'bg-cyan-500/40' : 'bg-purple-500/40'}`}
      />

      <div className="relative flex items-start gap-4">
        <div
          className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-display text-base font-black
            ${isCyan ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40' : 'bg-purple-500/15 text-purple-300 border border-purple-400/40'}`}
        >
          {step.n}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg sm:text-xl font-black font-display mb-1 ${isCyan ? 'text-gradient-cyan' : 'text-gradient-purple'}`}>
            {step.title}
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">{step.oneLiner}</p>
        </div>
      </div>

      {/* Mockup */}
      <div className="relative mt-4">
        <MockupRenderer kind={step.mockup} />
      </div>

      {/* Perk chips */}
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {step.perks.map((perk) => (
          <span
            key={perk}
            className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-medium border
              ${isCyan
                ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-200'
                : 'bg-purple-500/10 border-purple-400/30 text-purple-200'}`}
          >
            {perk}
          </span>
        ))}
      </div>

      {/* Inline CTA */}
      <div className="relative mt-4">
        <Link
          to={step.cta.to}
          className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors
            ${isCyan
              ? 'text-cyan-300 hover:text-cyan-200'
              : 'text-purple-300 hover:text-purple-200'}`}
        >
          {step.cta.label}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        </Link>
      </div>
    </motion.div>
  );
};

// ---------- Center rail with numbered nodes (desktop) ----------

const CenterRail = () => (
  <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none w-px">
    {/* gradient line */}
    <div
      className="absolute inset-y-6 left-1/2 -translate-x-1/2 w-[2px] rounded-full"
      style={{
        background:
          'linear-gradient(to bottom, rgba(34,211,238,0) 0%, rgba(34,211,238,0.55) 18%, rgba(255,255,255,0.4) 50%, rgba(168,85,247,0.55) 82%, rgba(168,85,247,0) 100%)',
      }}
    />
    {/* animated flowing pulse */}
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 w-[3px] h-24 rounded-full"
      style={{
        background:
          'linear-gradient(to bottom, transparent, rgba(255,255,255,0.85), transparent)',
        filter: 'blur(2px)',
      }}
      animate={{ top: ['-10%', '110%'] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

const RailNode = ({ index, total }) => {
  // Centered between cards on each row of the steps grid.
  const topPct = ((index + 0.5) / total) * 100;
  const isCyan = index < 2;
  return (
    <motion.div
      className="hidden md:flex absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center"
      style={{ top: `${topPct}%` }}
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ type: 'spring', stiffness: 180, damping: 14 }}
    >
      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-sm
        ${isCyan
          ? 'bg-slate-950 text-cyan-300 border-2 border-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.45)]'
          : 'bg-slate-950 text-purple-300 border-2 border-purple-400/60 shadow-[0_0_24px_rgba(168,85,247,0.45)]'}`}>
        {String(index + 1).padStart(2, '0')}
        <motion.span
          className={`absolute inset-0 rounded-full ${isCyan ? 'border-2 border-cyan-400/40' : 'border-2 border-purple-400/40'}`}
          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.4 }}
        />
      </div>
    </motion.div>
  );
};

// ---------- Momentum loop arrow (cyan side, desktop) ----------

const MomentumLoopArrow = () => {
  // Curved SVG arc that sits to the LEFT of the projects rail and visually loops
  // step 04's row back up to step 02's row, reinforcing the flywheel thesis.
  return (
    <div
      className="hidden lg:block absolute left-0 z-10 pointer-events-none"
      style={{
        // Step 02 row top ≈ 25%, Step 04 row bottom ≈ 100% of grid → arc spans 25% → 87.5%
        top: '25%',
        bottom: '12.5%',
        width: '64px',
      }}
      aria-hidden
    >
      <svg viewBox="0 0 64 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="momentum-loop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.85" />
          </linearGradient>
          <filter id="momentum-loop-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/*
          Path: starts at the top-right (rail edge near step 02), arcs out left,
          loops down, and ends at the bottom-right (rail edge near step 04) with an arrowhead.
          We draw it bottom→top so the arrow points UP (loop direction: 04 → 02).
        */}
        <motion.path
          d="M 56 196 C 8 170, 8 30, 56 4"
          fill="none"
          stroke="url(#momentum-loop-grad)"
          strokeWidth="2"
          strokeDasharray="6 6"
          strokeLinecap="round"
          filter="url(#momentum-loop-glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />
        {/* arrowhead at top */}
        <motion.polygon
          points="56,4 50,14 62,14"
          fill="#22d3ee"
          filter="url(#momentum-loop-glow)"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ delay: 1.4, type: 'spring', stiffness: 200 }}
        />
      </svg>

      {/* Label */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10px] tracking-[0.3em] uppercase font-semibold text-cyan-300/90"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ delay: 1.6, duration: 0.6 }}
      >
        ↻ Momentum loop
      </motion.div>
    </div>
  );
};

// ---------- Main section ----------

const HowItWorksSection = () => {
  // Mobile: single rail at a time via toggle. Desktop ignores this.
  const [mobileRail, setMobileRail] = useState('projects');

  return (
    <section className="relative w-full py-16 md:py-24 px-4 md:px-6 overflow-hidden landing-section">
      {/* background ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-[8%] w-72 h-72 md:w-96 md:h-96 bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-[8%] w-72 h-72 md:w-96 md:h-96 bg-purple-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-4 text-[10px] sm:text-xs uppercase tracking-[0.3em] text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            How Aquads works
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white font-display leading-tight">
            Two paths.{' '}
            <span className="whitespace-nowrap">One Web3 hub.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            <span className="text-gradient-cyan font-semibold">Projects build momentum.</span>{' '}
            <span className="text-gradient-purple font-semibold">Freelancers build reputation.</span>
            <br className="hidden sm:block" />
            Both compound — when you stay active.
          </p>
        </motion.div>

        {/* Mobile toggle */}
        <div className="md:hidden flex justify-center mb-8">
          <div className="inline-flex items-center p-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setMobileRail('projects')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                ${mobileRail === 'projects'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-gray-400 hover:text-white'}`}
            >
              For Projects
            </button>
            <button
              type="button"
              onClick={() => setMobileRail('freelancers')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                ${mobileRail === 'freelancers'
                  ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-400 hover:text-white'}`}
            >
              For Freelancers
            </button>
          </div>
        </div>

        {/* Rail thesis sub-headers (desktop only — mobile shows it inside the active rail) */}
        <div className="hidden md:grid grid-cols-2 gap-x-16 lg:gap-x-24 mb-6">
          <div className="text-right pr-4">
            <div className="inline-flex items-center gap-2 text-cyan-300 font-display font-bold uppercase tracking-[0.25em] text-sm">
              <span>For projects</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Momentum, not stagnation. Every perk fuels the flywheel.
            </p>
          </div>
          <div className="text-left pl-4">
            <div className="inline-flex items-center gap-2 text-purple-300 font-display font-bold uppercase tracking-[0.25em] text-sm">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>For freelancers</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Reputation, on-chain. Every job compounds your trust score.
            </p>
          </div>
        </div>

        {/* Mobile thesis line */}
        <div className="md:hidden text-center mb-6">
          {mobileRail === 'projects' ? (
            <p className="text-cyan-300 text-sm font-semibold">
              Momentum, not stagnation. Every perk fuels the flywheel.
            </p>
          ) : (
            <p className="text-purple-300 text-sm font-semibold">
              Reputation, on-chain. Every job compounds your trust score.
            </p>
          )}
        </div>

        {/* Dual-rail grid */}
        <div className="relative">
          <CenterRail />
          <MomentumLoopArrow />

          {/* Desktop: 2-col grid both rails simultaneously */}
          <div className="hidden md:grid grid-cols-2 gap-x-16 lg:gap-x-24 gap-y-10 relative">
            {/* render row by row so flexbox heights stay parallel */}
            {projectSteps.map((_, i) => (
              <React.Fragment key={`row-${i}`}>
                <div className="md:pr-2 lg:pr-6">
                  <StepCard step={projectSteps[i]} side="cyan" MockupRenderer={ProjectMockup} />
                </div>
                <div className="md:pl-2 lg:pl-6">
                  <StepCard step={freelancerSteps[i]} side="purple" MockupRenderer={FreelancerMockup} />
                </div>
              </React.Fragment>
            ))}

            {/* Numbered nodes overlaid on center rail */}
            {projectSteps.map((_, i) => (
              <RailNode key={`node-${i}`} index={i} total={projectSteps.length} />
            ))}
          </div>

          {/* Mobile: single rail */}
          <div className="md:hidden space-y-8 relative">
            {(mobileRail === 'projects' ? projectSteps : freelancerSteps).map((step, i, arr) => (
              <div key={`m-${i}`} className="relative">
                <StepCard
                  step={step}
                  side={mobileRail === 'projects' ? 'cyan' : 'purple'}
                  MockupRenderer={mobileRail === 'projects' ? ProjectMockup : FreelancerMockup}
                />

                {/* Mobile: momentum loop hint after step 04 on projects rail */}
                {mobileRail === 'projects' && i === arr.length - 1 && (
                  <motion.div
                    className="mt-6 flex items-center justify-center gap-2 text-cyan-300 text-xs uppercase tracking-[0.3em] font-semibold"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.01M20 20v-5h-.01M5 19a9 9 0 0014.65-3.27M19 5A9 9 0 004.35 8.27" />
                    </svg>
                    ↻ Loops back to step 02
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Closing dual CTA */}
        <motion.div
          className="mt-12 md:mt-16 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/home?openListProject=true">
            <motion.span
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-sm md:text-base shadow-lg shadow-cyan-500/30"
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(34,211,238,0.5)' }}
              whileTap={{ scale: 0.97 }}
            >
              🚀 Launch a project
            </motion.span>
          </Link>
          <Link to="/marketplace?modal=list-service">
            <motion.span
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-bold text-sm md:text-base shadow-lg shadow-purple-500/30"
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(168,85,247,0.5)' }}
              whileTap={{ scale: 0.97 }}
            >
              👥 Start freelancing
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
