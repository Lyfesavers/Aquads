// ============================================================================
// BotControlPanel — full-page web interface for the Aquads Telegram Bot
// ----------------------------------------------------------------------------
// Every action here maps 1:1 to a Telegram bot command; nothing is invented on
// the web side. Under the hood we hit /api/bot/* for bot-specific state and
// /api/twitter-raids/* for raid CRUD (both already exist and are the exact
// endpoints the bot itself uses). See server/routes/bot.js for the contract.
//
// UI/UX guidelines that inform this file:
//   - Mobile-first. Every touch target is >= 40px. Horizontal tab bar scrolls.
//   - Glass surfaces (backdrop-blur) with subtle gradient borders for depth.
//   - Loading skeletons instead of blank areas; toast feedback on every action.
//   - Micro-animations (hover-lift, gradient-shimmer, ring-glow on focus).
//   - Never blocks: state loads progressively; failed sub-loads don't hide UI.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaTelegram, FaDiscord, FaCheckCircle, FaTimesCircle,
  FaExclamationTriangle, FaSyncAlt, FaStar, FaTrash, FaPlus,
  FaCopy, FaExternalLinkAlt, FaTwitter, FaFacebook, FaPalette, FaImage,
  FaVideo, FaCrown, FaCoins, FaBolt, FaRocket, FaUsers, FaUserCog,
  FaChevronRight, FaGem, FaLink, FaTh, FaMagic,
} from 'react-icons/fa';
import { API_URL } from '../services/api';

const TELEGRAM_BOT_URL = 'https://t.me/aquadsbumpbot';
const DISCORD_BOT_INVITE = 'https://discord.com/oauth2/authorize?client_id=1481005410465874112&permissions=2251801961425920&integration_type=0&scope=bot+applications.commands';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function useAuthToken(currentUser) {
  return useMemo(() => {
    if (currentUser?.token) return currentUser.token;
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) return JSON.parse(raw)?.token || null;
    } catch (_) { /* ignore */ }
    return null;
  }, [currentUser]);
}

async function botApi(token, path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const view = (
    // Bottom-center on mobile, top-right on desktop — thumbs never obscure the message
    <div className="fixed z-[9999] pointer-events-none inset-x-3 bottom-3 sm:inset-auto sm:bottom-auto sm:top-6 sm:right-6 flex flex-col gap-2 sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-sm animate-toast-in ${
            t.kind === 'success' ? 'bg-emerald-950/85 border-emerald-400/30 text-emerald-100' :
            t.kind === 'error' ? 'bg-rose-950/85 border-rose-400/30 text-rose-100' :
            'bg-slate-900/85 border-slate-500/30 text-slate-100'
          }`}
        >
          <div className="flex items-start gap-2">
            {t.kind === 'success' && <FaCheckCircle className="mt-0.5 text-emerald-300 flex-shrink-0" />}
            {t.kind === 'error' && <FaExclamationTriangle className="mt-0.5 text-rose-300 flex-shrink-0" />}
            <span>{t.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
  return { push, view };
}

// ---------------------------------------------------------------------------
// Reusable UI primitives
// ---------------------------------------------------------------------------

// Glass surface with subtle gradient hover.
function Card({ children, className = '', glow = false, as: Component = 'div' }) {
  return (
    <Component
      className={`relative bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl shadow-black/30 ${
        glow ? 'ring-1 ring-cyan-400/20' : ''
      } ${className}`}
    >
      {children}
    </Component>
  );
}

// Gradient-outline card for hero/CTA areas. The `::before` creates the border.
function GradientCard({ children, className = '', from = 'from-cyan-500/40', to = 'to-purple-500/40' }) {
  return (
    <div className={`relative rounded-2xl p-[1px] bg-gradient-to-br ${from} via-blue-500/20 ${to} ${className}`}>
      <div className="relative rounded-[calc(1rem-1px)] bg-gray-950/90 backdrop-blur-xl h-full">
        {children}
      </div>
    </div>
  );
}

// Modern toggle switch (iOS-style) — accessible via keyboard.
function ToggleSwitch({ checked, onChange, disabled, srLabel, colorOn = 'bg-emerald-500', colorOff = 'bg-gray-700' }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={srLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center h-7 w-12 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? colorOn + ' shadow-lg shadow-emerald-500/30' : colorOff
      }`}
    >
      <span
        className={`absolute left-0.5 inline-block w-6 h-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, right, gradientFrom = 'from-cyan-500', gradientTo = 'to-blue-500' }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20`}>
            <Icon className="text-white text-sm sm:text-base" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-white leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

function StatusPill({ ok, labelOk, labelBad }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      ok ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
      'bg-gray-800/80 text-gray-400 border border-gray-700'
    }`}>
      {ok ? <FaCheckCircle /> : <FaTimesCircle />}
      {ok ? labelOk : labelBad}
    </span>
  );
}

function SkeletonRow({ className = '' }) {
  return <div className={`rounded-lg bg-gradient-to-r from-gray-800/40 via-gray-700/40 to-gray-800/40 animate-shimmer ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} className="h-24" />
        ))}
      </div>
      <SkeletonRow className="h-40" />
      <SkeletonRow className="h-32" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-logged-in gate
// ---------------------------------------------------------------------------
function LoginRequired() {
  return (
    <div className="max-w-lg mx-auto mt-20 px-4">
      <GradientCard>
        <div className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
            <FaUserCog className="text-2xl text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Log in to control the bot</h2>
          <p className="text-gray-400 text-sm sm:text-base mb-6">
            The Aquads Telegram Bot control panel needs you to be logged in so it can act on your behalf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/?showLogin=true"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105 active:scale-95"
            >
              Log in
            </Link>
            <Link
              to="/telegram-bot"
              className="px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
            >
              Back
            </Link>
          </div>
        </div>
      </GradientCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-linked-to-Telegram onboarding gate
// ---------------------------------------------------------------------------
function TelegramLinkRequired({ username, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const copyCmd = () => {
    try {
      navigator.clipboard.writeText(`/link ${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) { /* ignore */ }
  };
  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <GradientCard from="from-cyan-500/40" to="to-blue-500/40">
        <div className="p-6 sm:p-8">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-5 bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-cyan-500/40 relative">
            <FaTelegram className="text-2xl text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-950">1</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">Link your Telegram (10 seconds)</h2>
          <p className="text-gray-400 text-sm sm:text-base text-center mb-6">
            The bot needs to know which Telegram account belongs to <span className="text-cyan-300 font-semibold">@{username}</span>. This is a one-time step.
          </p>

          <ol className="text-sm text-gray-300 space-y-4 mb-6">
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">1</span>
              <div className="pt-0.5">Open <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline font-semibold">@aquadsbumpbot</a> on Telegram and tap <span className="text-white font-semibold">Start</span>.</div>
            </li>
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">2</span>
              <div className="pt-0.5 flex-1 min-w-0">
                <div className="mb-2">Send this command in the chat:</div>
                <button
                  onClick={copyCmd}
                  className="w-full flex items-center gap-2 bg-black/60 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl px-3 py-2.5 font-mono text-cyan-300 text-sm transition-colors group"
                >
                  <span className="flex-1 text-left truncate">/link {username}</span>
                  <span className={`text-xs flex items-center gap-1 transition-colors ${copied ? 'text-emerald-400' : 'text-gray-400 group-hover:text-white'}`}>
                    {copied ? <><FaCheckCircle /> Copied</> : <><FaCopy /> Copy</>}
                  </span>
                </button>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">3</span>
              <div className="pt-0.5">Come back here and refresh — the panel will unlock.</div>
            </li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-transform hover:scale-[1.02] active:scale-95"
            >
              <FaTelegram /> Open Telegram bot
            </a>
            <button
              onClick={onRefresh}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 font-semibold transition-colors"
            >
              <FaSyncAlt /> I've linked — refresh
            </button>
          </div>
        </div>
      </GradientCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero card — sits above the tabs on every screen
// ---------------------------------------------------------------------------
function HeroCard({ status, onRefresh, refreshing }) {
  const { user, telegram, discord, groups, freeRaids } = status;
  const defaultGroup = groups.find((g) => g.groupId === status.defaultGroupId);
  const points = Number(user.points || 0);

  return (
    <GradientCard from="from-cyan-500/50" to="to-purple-500/50" className="mb-4 sm:mb-6">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              {user.image ? (
                <img src={user.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-white/10 shadow-lg" />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              {telegram.linked && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center shadow-lg">
                  <FaCheckCircle className="text-white text-xs" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">@{user.username}</h1>
                <StatusPill ok={telegram.linked} labelOk="Telegram linked" labelBad="not linked" />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {defaultGroup ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FaStar className="text-cyan-400 text-xs" />
                    Default group: <span className="text-cyan-300 font-medium truncate max-w-[200px]">{defaultGroup.groupTitle || `Group ${defaultGroup.groupId}`}</span>
                  </span>
                ) : (
                  <span className="text-gray-500">No default group set</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <FaSyncAlt className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Quick stats strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <QuickStat icon={FaCoins} label="Points" value={points.toLocaleString()} accent="text-amber-300" />
          <QuickStat
            icon={FaBolt}
            label="Free raids left"
            value={freeRaids.dailyLimit > 0 ? `${freeRaids.raidsRemaining}/${freeRaids.dailyLimit}` : '—'}
            accent="text-emerald-300"
          />
          <QuickStat icon={FaUsers} label="Groups" value={groups.length} accent="text-cyan-300" />
          <QuickStat
            icon={FaDiscord}
            label="Discord"
            value={discord.linked ? 'Linked' : 'Not linked'}
            accent={discord.linked ? 'text-indigo-300' : 'text-gray-500'}
          />
        </div>
      </div>
    </GradientCard>
  );
}

function QuickStat({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 flex items-center gap-2.5 hover:border-white/10 transition-colors">
      <Icon className={`text-lg flex-shrink-0 ${accent}`} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold truncate">{label}</div>
        <div className={`text-sm sm:text-base font-bold truncate ${accent}`}>{value}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
function OverviewTab({ status, setActiveTab }) {
  const { telegram, discord, groups, freeRaids, socials, projects } = status;
  const optedInCount = groups.filter((g) => g.optedInToCommunityRaids).length;
  const brandedCount = projects.filter((p) => p.hasCustomBranding).length;
  const eligibleForBranding = projects.filter((p) => p.allowsCustomBranding && p.isBumped).length;

  const actions = [
    { id: 'raids', icon: FaBolt, title: 'Create a raid', desc: `${freeRaids.raidsRemaining} free left today`, gradientFrom: 'from-emerald-500', gradientTo: 'to-green-500' },
    { id: 'groups', icon: FaUsers, title: 'Manage groups', desc: `${groups.length} linked · ${optedInCount} in community raids`, gradientFrom: 'from-cyan-500', gradientTo: 'to-blue-500' },
    { id: 'branding', icon: FaPalette, title: 'Customize branding', desc: eligibleForBranding > 0 ? `${brandedCount}/${eligibleForBranding} projects branded` : 'Bump a Premium listing to unlock', gradientFrom: 'from-pink-500', gradientTo: 'to-purple-500' },
    { id: 'socials', icon: FaTwitter, title: 'Set social handles', desc: `${socials.twitterUsername ? '✓' : '·'} Twitter · ${socials.facebookUsername ? '✓' : '·'} Facebook`, gradientFrom: 'from-sky-500', gradientTo: 'to-cyan-500' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick actions grid — big tappable cards that jump into tabs */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <FaMagic className="text-cyan-400 text-sm" />
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Quick actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveTab(a.id)}
              className="group relative text-left p-4 sm:p-5 rounded-2xl bg-gray-900/60 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-gray-900/80 transition-all shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.gradientFrom} ${a.gradientTo} flex items-center justify-center shadow-lg mb-3 group-hover:scale-110 transition-transform`}>
                <a.icon className="text-white text-lg" />
              </div>
              <div className="font-bold text-white text-base mb-1 flex items-center gap-2">
                {a.title}
                <FaChevronRight className="text-gray-500 text-xs group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-xs sm:text-sm text-gray-400">{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Free raid quota progress card */}
      <Card>
        <div className="p-5">
          <SectionHeader
            icon={FaBolt}
            title="Free raid quota"
            subtitle={freeRaids.dailyLimit > 0 ? 'Resets every 24 hours' : freeRaids.reason || 'Bump a listing to unlock'}
            gradientFrom="from-emerald-500"
            gradientTo="to-green-500"
          />
          {freeRaids.dailyLimit > 0 ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-white">
                    {freeRaids.raidsRemaining}
                    <span className="text-lg text-gray-500 font-medium"> / {freeRaids.dailyLimit}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">raids remaining today</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Then <span className="text-white font-bold">2,000 pts</span> each</div>
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-cyan-500 transition-all duration-700 rounded-full shadow-glow-emerald"
                  style={{ width: `${Math.max(4, ((freeRaids.dailyLimit - freeRaids.raidsRemaining) / Math.max(1, freeRaids.dailyLimit)) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-amber-200/90 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
              <FaCrown className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>{freeRaids.reason || 'Free raids require a bumped listing.'}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Bot connections */}
      <Card>
        <div className="p-5">
          <SectionHeader icon={FaLink} title="Bot connections" subtitle="Your Aquads account across chat platforms" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ConnectionRow
              icon={FaTelegram}
              iconColor="text-cyan-400"
              name="Telegram"
              linked={telegram.linked}
              actionLabel="Open bot"
              actionHref={TELEGRAM_BOT_URL}
            />
            <ConnectionRow
              icon={FaDiscord}
              iconColor="text-indigo-400"
              name="Discord"
              linked={discord.linked}
              actionLabel={discord.linked ? 'Reconnect' : 'Add bot'}
              actionHref={DISCORD_BOT_INVITE}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ConnectionRow({ icon: Icon, iconColor, name, linked, actionLabel, actionHref }) {
  return (
    <div className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-xl px-4 py-3">
      <Icon className={`text-xl ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">{name}</div>
        <div className="text-xs text-gray-500">{linked ? 'Connected to your account' : 'Not connected'}</div>
      </div>
      <a
        href={actionHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 inline-flex items-center gap-1.5 whitespace-nowrap"
      >
        {actionLabel} <FaExternalLinkAlt className="text-[9px] opacity-70" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Groups tab
// ---------------------------------------------------------------------------
function GroupsTab({ status, token, refresh, toast }) {
  const [busy, setBusy] = useState(null);
  const { groups } = status;

  const setDefault = async (groupId) => {
    setBusy(groupId + ':default');
    try {
      await botApi(token, `/bot/groups/${encodeURIComponent(groupId)}/default`, { method: 'POST' });
      toast('Default group updated', 'success');
      await refresh();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  const toggleCommunity = async (groupId, enable) => {
    setBusy(groupId + ':toggle');
    try {
      await botApi(token, `/bot/groups/${encodeURIComponent(groupId)}/community-raids`, {
        method: 'POST',
        body: JSON.stringify({ enabled: enable }),
      });
      toast(enable ? 'Community raids ON for this group' : 'Community raids OFF for this group', 'success');
      await refresh();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  const removeGroup = async (groupId, title) => {
    if (!window.confirm(`Remove "${title || groupId}" from your account?\n\nThe bot stays in the group, but raids/alerts from your account won't fire there anymore.`)) return;
    setBusy(groupId + ':remove');
    try {
      await botApi(token, `/bot/groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' });
      toast('Group removed from your account', 'success');
      await refresh();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  if (groups.length === 0) {
    return (
      <Card>
        <div className="p-6 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
            <FaUsers className="text-2xl text-cyan-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Telegram groups linked yet</h3>
          <p className="text-gray-400 text-sm sm:text-base mb-6 max-w-md mx-auto">
            To link a Telegram group so raids fire in it, you need to run one command inside the group. It takes 20 seconds.
          </p>

          <div className="max-w-md mx-auto text-left text-sm text-gray-300 space-y-4 bg-black/30 border border-white/10 rounded-2xl p-5 mb-6">
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">1</span>
              <div className="pt-0.5">Add <span className="text-cyan-300 font-mono text-xs">@aquadsbumpbot</span> to your Telegram group.</div>
            </div>
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">2</span>
              <div className="pt-0.5">In the group, type <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-300 text-xs">/raidin</code> to join the community network, or <code className="bg-black/60 px-1.5 py-0.5 rounded text-cyan-300 text-xs">/raidout</code> for private raids.</div>
            </div>
            <div className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold flex-shrink-0">3</span>
              <div className="pt-0.5">Refresh this page — your group appears below.</div>
            </div>
          </div>

          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105"
          >
            <FaTelegram /> Open the bot
          </a>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl px-4 py-3 text-sm text-cyan-100/90 flex items-start gap-3">
        <FaStar className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          The <span className="font-semibold text-cyan-300">default group</span> is the source chat when you create a raid from this website or from bot DM. Raids created inside a specific Telegram group always fire in that group.
        </div>
      </div>

      {groups.map((g) => {
        const title = g.groupTitle || `Group ${g.groupId}`;
        const isBusy = (suffix) => busy === g.groupId + ':' + suffix;
        return (
          <Card key={g.groupId} className={g.isDefault ? 'ring-2 ring-cyan-500/50 shadow-cyan-500/20' : ''}>
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  g.isDefault ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-500/30' : 'bg-gray-800 border border-white/10'
                }`}>
                  <FaTelegram className={`text-lg ${g.isDefault ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-white font-bold text-base sm:text-lg leading-tight break-words">{title}</h3>
                    {g.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold text-cyan-100 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full px-2 py-0.5 shadow">
                        <FaStar className="text-[9px]" /> Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono truncate">ID: {g.groupId}</div>
                  {g.lastActiveAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      Last active {new Date(g.lastActiveAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Community raids row with toggle switch */}
              <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    g.optedInToCommunityRaids ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    <FaBolt />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">Community raids</div>
                    <div className="text-xs text-gray-400">
                      {g.optedInToCommunityRaids ? 'Shared with other opted-in groups' : 'Private to this group only'}
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={g.optedInToCommunityRaids}
                  onChange={(val) => toggleCommunity(g.groupId, val)}
                  disabled={isBusy('toggle')}
                  srLabel={`Toggle community raids for ${title}`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {!g.isDefault && (
                  <button
                    onClick={() => setDefault(g.groupId)}
                    disabled={!!busy}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 disabled:opacity-40 transition-colors"
                  >
                    {isBusy('default') ? <FaSyncAlt className="animate-spin" /> : <FaStar />}
                    Make default
                  </button>
                )}
                <button
                  onClick={() => removeGroup(g.groupId, g.groupTitle)}
                  disabled={!!busy}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition-colors"
                >
                  {isBusy('remove') ? <FaSyncAlt className="animate-spin" /> : <FaTrash />}
                  Remove
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raids tab
// ---------------------------------------------------------------------------
function RaidsTab({ status, token, refresh, toast }) {
  const { freeRaids, user } = status;
  const [tweetUrl, setTweetUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [raids, setRaids] = useState({ twitter: [], facebook: [] });
  const [raidsLoading, setRaidsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const loadRaids = useCallback(async () => {
    setRaidsLoading(true);
    try {
      const data = await botApi(token, '/bot/my-raids');
      setRaids(data);
    } catch (e) { toast(e.message, 'error'); } finally { setRaidsLoading(false); }
  }, [token, toast]);

  useEffect(() => { loadRaids(); }, [loadRaids]);

  const canUseFree = freeRaids.eligible && freeRaids.raidsRemaining > 0;
  const canUsePoints = user.points >= 2000;
  const validUrl = /\/status\/\d+/.test(tweetUrl);

  const createRaid = async (mode) => {
    if (!tweetUrl.trim()) return toast('Paste a tweet URL first', 'error');
    if (!validUrl) return toast('That does not look like a tweet URL', 'error');

    setCreating(true);
    try {
      const path = mode === 'free' ? '/twitter-raids/free' : '/twitter-raids/points';
      await botApi(token, path, {
        method: 'POST',
        body: JSON.stringify({
          tweetUrl: tweetUrl.trim(),
          title: `Twitter Raid by @${user.username}`,
          description: 'Help boost this tweet! Like, retweet, and comment to earn 20 points.',
        }),
      });
      toast(mode === 'free' ? 'Free raid created!' : 'Raid created (2,000 pts deducted)', 'success');
      setTweetUrl('');
      await Promise.all([refresh(), loadRaids()]);
    } catch (e) { toast(e.message, 'error'); } finally { setCreating(false); }
  };

  const cancelRaid = async (raidId, platform) => {
    if (!window.confirm('Cancel this raid? It will be removed from Telegram and can\'t be resurrected.')) return;
    setCancellingId(raidId);
    try {
      const path = platform === 'twitter' ? `/twitter-raids/${raidId}` : `/facebook-raids/${raidId}`;
      await botApi(token, path, { method: 'DELETE' });
      toast('Raid cancelled', 'success');
      await loadRaids();
    } catch (e) { toast(e.message, 'error'); } finally { setCancellingId(null); }
  };

  const merged = [...raids.twitter, ...raids.facebook]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Composer card */}
      <GradientCard from="from-emerald-500/40" to="to-cyan-500/40">
        <div className="p-5">
          <SectionHeader
            icon={FaBolt}
            title="Create a Twitter raid"
            subtitle="Same rules as /createraid — free daily quota first, then 2,000 pts each"
            gradientFrom="from-emerald-500"
            gradientTo="to-green-500"
          />
          <div className="relative">
            <FaTwitter className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400 pointer-events-none" />
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://twitter.com/user/status/1234567890"
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none font-mono text-sm transition-all"
            />
            {tweetUrl && (
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold ${validUrl ? 'text-emerald-400' : 'text-amber-400'}`}>
                {validUrl ? <FaCheckCircle /> : <FaExclamationTriangle />}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
            <button
              onClick={() => createRaid('free')}
              disabled={creating || !canUseFree || !tweetUrl.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-transform hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
              title={!canUseFree ? (freeRaids.reason || 'No free raids remaining today') : ''}
            >
              {creating ? <FaSyncAlt className="animate-spin" /> : <FaPlus />}
              Use free raid
              <span className="text-xs opacity-90 bg-black/20 rounded px-1.5 py-0.5">{freeRaids.raidsRemaining} left</span>
            </button>
            <button
              onClick={() => createRaid('points')}
              disabled={creating || !canUsePoints || !tweetUrl.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-transform hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
              title={!canUsePoints ? 'You need 2,000 points' : ''}
            >
              {creating ? <FaSyncAlt className="animate-spin" /> : <FaCoins />}
              Use 2,000 pts
            </button>
          </div>
          {!canUseFree && freeRaids.dailyLimit === 0 && (
            <div className="mt-3 text-xs text-amber-200/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
              {freeRaids.reason || 'Bump a listing to unlock free daily raids.'}
            </div>
          )}
        </div>
      </GradientCard>

      {/* Active raids list */}
      <Card>
        <div className="p-5">
          <SectionHeader
            icon={FaRocket}
            title="Your active raids"
            subtitle="Raids you created that are still live on Telegram"
            gradientFrom="from-cyan-500"
            gradientTo="to-blue-500"
            right={
              <button
                onClick={loadRaids}
                disabled={raidsLoading}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <FaSyncAlt className={raidsLoading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
              </button>
            }
          />
          {raidsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} className="h-20" />)}
            </div>
          ) : merged.length === 0 ? (
            <div className="text-center py-10 sm:py-14">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-gray-800/60 flex items-center justify-center">
                <FaBolt className="text-gray-500 text-xl" />
              </div>
              <p className="text-gray-400 text-sm">No active raids. Paste a tweet URL above to create one.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {merged.map((r) => (
                <RaidRow
                  key={r.id}
                  raid={r}
                  onCancel={() => cancelRaid(r.id, r.platform)}
                  cancelling={cancellingId === r.id}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function RaidRow({ raid, onCancel, cancelling }) {
  const isTwitter = raid.platform === 'twitter';
  return (
    <div className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all hover:-translate-y-0.5 ${
      isTwitter
        ? 'bg-gradient-to-r from-sky-500/5 to-transparent border-sky-500/20 hover:border-sky-500/40'
        : 'bg-gradient-to-r from-blue-500/5 to-transparent border-blue-500/20 hover:border-blue-500/40'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {isTwitter ? <FaTwitter className="text-sky-400" /> : <FaFacebook className="text-blue-400" />}
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{raid.platform}</span>
          {raid.paidWithPoints ? (
            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 font-semibold">
              {raid.pointsSpent} pts
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 font-semibold">
              Free raid
            </span>
          )}
        </div>
        <a href={raid.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 hover:underline text-sm break-all block leading-snug">
          {raid.url}
        </a>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <span>Created {new Date(raid.createdAt).toLocaleString()}</span>
          <span className="text-gray-700">·</span>
          <span>{raid.points} pts per completion</span>
        </div>
      </div>
      <button
        onClick={onCancel}
        disabled={cancelling}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 disabled:opacity-50 transition-colors flex-shrink-0"
      >
        {cancelling ? <FaSyncAlt className="animate-spin" /> : <FaTrash />}
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branding tab
// ---------------------------------------------------------------------------
function BrandingTab({ status, token, refresh, toast }) {
  const [busy, setBusy] = useState(null);
  const [editorFor, setEditorFor] = useState(null);
  const eligible = status.projects.filter((p) => p.allowsCustomBranding && p.isBumped);
  const nonEligible = status.projects.filter((p) => !p.allowsCustomBranding || !p.isBumped);

  const removeBranding = async (projectId) => {
    if (!window.confirm('Remove custom branding from this project? It will fall back to the default video.')) return;
    setBusy(projectId);
    try {
      await botApi(token, `/bot/branding/${projectId}`, { method: 'DELETE' });
      toast('Custom branding removed', 'success');
      await refresh();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <GradientCard from="from-pink-500/40" to="to-purple-500/40">
        <div className="p-5">
          <SectionHeader
            icon={FaPalette}
            title="Custom branding"
            subtitle="Your image or video plays in vote notifications, /mybubble, and raid posts"
            gradientFrom="from-pink-500"
            gradientTo="to-purple-500"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-3 bg-black/30 border border-white/5 rounded-xl p-3">
              <FaImage className="text-pink-400 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Image</div>
                <div className="text-xs text-gray-400 leading-relaxed">JPG or PNG, max <span className="text-white font-semibold">500KB</span>. Compress at tinypng.com.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-black/30 border border-white/5 rounded-xl p-3">
              <FaVideo className="text-purple-400 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Video URL</div>
                <div className="text-xs text-gray-400 leading-relaxed">Direct https:// .mp4, max <span className="text-white font-semibold">5MB</span>. Try catbox.moe.</div>
              </div>
            </div>
          </div>
        </div>
      </GradientCard>

      {eligible.length === 0 ? (
        <Card>
          <div className="p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-3xl mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
              <FaCrown className="text-2xl text-purple-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No eligible projects yet</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              Custom branding is exclusive to <span className="text-purple-300 font-semibold">Premium bumped listings</span>. Bump a project to unlock it.
            </p>
            <Link
              to="/dashboard/ads"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow-lg shadow-purple-500/30 transition-transform hover:scale-105"
            >
              <FaCrown /> Bump a listing
            </Link>
          </div>
        </Card>
      ) : (
        eligible.map((p) => (
          <Card key={p.id}>
            <div className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-shrink-0 self-center sm:self-start">
                  {p.logo ? (
                    <img src={p.logo} alt={p.title} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-white/10 shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-500">
                      <FaGem />
                    </div>
                  )}
                  {p.hasCustomBranding && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-2 border-gray-950 flex items-center justify-center shadow-lg">
                      <FaPalette className="text-white text-[10px]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap mb-1.5">
                    <h3 className="text-white font-bold text-base sm:text-lg leading-tight break-words">{p.title}</h3>
                    <span className="text-[10px] uppercase tracking-wide font-bold text-purple-100 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-2 py-0.5 shadow flex items-center gap-1">
                      <FaCrown className="text-[9px]" /> Premium
                    </span>
                  </div>
                  <div className="text-sm mb-3">
                    {p.hasCustomBranding ? (
                      <span className="inline-flex items-center gap-1.5 text-pink-300 font-medium">
                        <FaPalette /> {p.customBrandingVideoUrl ? 'Video branding active' : 'Image branding active'}
                      </span>
                    ) : (
                      <span className="text-gray-500">Using default branding</span>
                    )}
                  </div>
                  {p.customBrandingVideoUrl && (
                    <a href={p.customBrandingVideoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline break-all block mb-2 font-mono">
                      {p.customBrandingVideoUrl}
                    </a>
                  )}
                  {p.hasCustomBrandingImage && !p.customBrandingVideoUrl && (
                    <div className="text-xs text-gray-500 mb-2">
                      Image stored · ~{Math.round((p.customBrandingImageSize || 0) / 1024)} KB
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditorFor(editorFor === p.id ? null : p.id)}
                      disabled={busy === p.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white shadow-lg shadow-pink-500/25 disabled:opacity-40 transition-transform hover:scale-105"
                    >
                      <FaPalette /> {p.hasCustomBranding ? 'Change' : 'Set branding'}
                    </button>
                    {p.hasCustomBranding && (
                      <button
                        onClick={() => removeBranding(p.id)}
                        disabled={busy === p.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition-colors"
                      >
                        {busy === p.id ? <FaSyncAlt className="animate-spin" /> : <FaTrash />}
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {editorFor === p.id && (
                <BrandingEditor
                  project={p}
                  token={token}
                  onClose={() => setEditorFor(null)}
                  onSaved={async () => { setEditorFor(null); await refresh(); }}
                  toast={toast}
                />
              )}
            </div>
          </Card>
        ))
      )}

      {nonEligible.length > 0 && (
        <Card className="opacity-70">
          <div className="p-4 sm:p-5">
            <SectionHeader
              icon={FaCrown}
              title="Not eligible"
              subtitle="Bump these to Premium to unlock branding"
              gradientFrom="from-gray-500"
              gradientTo="to-gray-600"
            />
            <div className="space-y-2">
              {nonEligible.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm bg-black/20 rounded-xl px-3 py-2 border border-white/5">
                  {p.logo ? (
                    <img src={p.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex-shrink-0" />
                  )}
                  <div className="flex-1 truncate text-gray-300">{p.title}</div>
                  <span className="text-xs text-gray-500 uppercase whitespace-nowrap">
                    {!p.isBumped ? 'not bumped' : `${p.listingTier}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function BrandingEditor({ project, token, onClose, onSaved, toast }) {
  const [mode, setMode] = useState('image');
  const [videoUrl, setVideoUrl] = useState(project.customBrandingVideoUrl || '');
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageSize, setImageSize] = useState(0);
  const [saving, setSaving] = useState(false);

  const onFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast('Image must be under 500KB. Try tinypng.com to compress.', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setImageDataUrl(reader.result); setImageSize(file.size); };
    reader.onerror = () => toast('Could not read that image', 'error');
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = mode === 'video' ? { videoUrl: videoUrl.trim() } : { imageDataUrl };
      if (mode === 'video' && !videoUrl.trim()) { toast('Paste a direct https:// video URL', 'error'); setSaving(false); return; }
      if (mode === 'image' && !imageDataUrl) { toast('Pick an image first', 'error'); setSaving(false); return; }
      await botApi(token, `/bot/branding/${project.id}`, { method: 'POST', body: JSON.stringify(body) });
      toast('Branding saved!', 'success');
      await onSaved();
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="mt-4 bg-black/40 border border-pink-500/30 rounded-2xl p-4 sm:p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-white font-bold text-sm">Set branding for {project.title}</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">Close</button>
      </div>

      {/* Segmented switcher */}
      <div className="inline-flex bg-black/60 rounded-xl p-1 border border-white/10 mb-4 w-full sm:w-auto">
        <button
          onClick={() => setMode('image')}
          className={`flex-1 sm:flex-initial px-4 py-2 text-xs rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'image' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FaImage /> Image
        </button>
        <button
          onClick={() => setMode('video')}
          className={`flex-1 sm:flex-initial px-4 py-2 text-xs rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'video' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FaVideo /> Video URL
        </button>
      </div>

      {mode === 'image' ? (
        <div>
          <label className="block">
            <div className="border-2 border-dashed border-white/10 hover:border-pink-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-black/30 hover:bg-black/50">
              {imageDataUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img src={imageDataUrl} alt="preview" className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-lg" />
                  <div className="text-left flex-1">
                    <div className="text-sm text-white font-semibold">Ready to save</div>
                    <div className="text-xs text-gray-400">{Math.round(imageSize / 1024)} KB · click to change</div>
                  </div>
                </div>
              ) : (
                <>
                  <FaImage className="text-3xl text-gray-500 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-white">Click to upload image</div>
                  <div className="text-xs text-gray-500 mt-1">JPG or PNG · max 500KB</div>
                </>
              )}
            </div>
            <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={onFilePicked} className="hidden" />
          </label>
          <p className="text-xs text-gray-500 mt-2">Too big? Compress at <a className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer" href="https://tinypng.com">tinypng.com</a>.</p>
        </div>
      ) : (
        <div>
          <div className="relative">
            <FaVideo className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://files.catbox.moe/your-video.mp4"
              className="w-full bg-black/60 border border-white/10 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none font-mono transition-all"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Direct <span className="text-cyan-400">https://</span> link to a .mp4 file · max 5MB. We store the URL only, not the video.</p>
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white shadow-lg shadow-pink-500/30 disabled:opacity-50 transition-transform hover:scale-105"
        >
          {saving ? <FaSyncAlt className="animate-spin" /> : <FaCheckCircle />}
          Save branding
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Socials tab
// ---------------------------------------------------------------------------
function SocialsTab({ status, token, refresh, toast }) {
  const [twitter, setTwitter] = useState(status.socials.twitterUsername || '');
  const [facebook, setFacebook] = useState(status.socials.facebookUsername || '');
  const [savingTwitter, setSavingTwitter] = useState(false);
  const [savingFacebook, setSavingFacebook] = useState(false);

  useEffect(() => {
    setTwitter(status.socials.twitterUsername || '');
    setFacebook(status.socials.facebookUsername || '');
  }, [status.socials.twitterUsername, status.socials.facebookUsername]);

  const twitterDirty = twitter.trim() !== (status.socials.twitterUsername || '');
  const facebookDirty = facebook.trim() !== (status.socials.facebookUsername || '');

  const save = async (which) => {
    if (which === 'twitter') setSavingTwitter(true); else setSavingFacebook(true);
    try {
      const body = which === 'twitter'
        ? { twitterUsername: twitter.trim() || null }
        : { facebookUsername: facebook.trim() || null };
      await botApi(token, '/bot/socials', { method: 'POST', body: JSON.stringify(body) });
      toast(which === 'twitter' ? 'Twitter handle saved' : 'Facebook handle saved', 'success');
      await refresh();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      if (which === 'twitter') setSavingTwitter(false); else setSavingFacebook(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <div className="p-5">
          <SectionHeader
            icon={FaTwitter}
            title="Twitter / X handle"
            subtitle="Used to verify raid completions — must match your real X account"
            gradientFrom="from-sky-500"
            gradientTo="to-cyan-500"
          />
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value.replace(/^@+/, ''))}
                placeholder="your_twitter_handle"
                className="w-full bg-black/60 border border-white/10 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={() => save('twitter')}
              disabled={savingTwitter || !twitterDirty}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-sky-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
            >
              {savingTwitter ? <FaSyncAlt className="animate-spin" /> : <FaCheckCircle />}
              Save
            </button>
          </div>
          {status.socials.twitterUsername && (
            <p className="text-xs text-gray-500 mt-2">
              Current: <span className="text-sky-300 font-mono">@{status.socials.twitterUsername}</span>
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <SectionHeader
            icon={FaFacebook}
            title="Facebook handle"
            subtitle="Used to verify Facebook raid completions"
            gradientFrom="from-blue-500"
            gradientTo="to-indigo-500"
          />
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value.replace(/^@+/, ''))}
                placeholder="your_facebook_handle"
                className="w-full bg-black/60 border border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-all"
              />
            </div>
            <button
              onClick={() => save('facebook')}
              disabled={savingFacebook || !facebookDirty}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-blue-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
            >
              {savingFacebook ? <FaSyncAlt className="animate-spin" /> : <FaCheckCircle />}
              Save
            </button>
          </div>
          {status.socials.facebookUsername && (
            <p className="text-xs text-gray-500 mt-2">
              Current: <span className="text-blue-300 font-mono">@{status.socials.facebookUsername}</span>
            </p>
          )}
        </div>
      </Card>

      <GradientCard from="from-purple-500/40" to="to-pink-500/40">
        <div className="p-5">
          <SectionHeader
            icon={FaCrown}
            title="Vote boost packages"
            subtitle="Guaranteed bullish votes for your bubbles — same as /boostvote"
            gradientFrom="from-purple-500"
            gradientTo="to-pink-500"
          />
          <p className="text-sm text-gray-400 mb-4">
            Vote boost packages (100 / 250 / 500 / 1000 votes) live in the dashboard with up to 25% off. Whether you buy them via Telegram <code className="text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded text-xs">/boostvote</code> or here, the same tiers apply.
          </p>
          <Link
            to="/dashboard/ads"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow-lg shadow-purple-500/30 transition-transform hover:scale-105"
          >
            <FaCrown /> Open dashboard <FaChevronRight className="text-xs" />
          </Link>
        </div>
      </GradientCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const BotControlPanel = ({ currentUser }) => {
  const navigate = useNavigate();
  const token = useAuthToken(currentUser);
  const { push: toast, view: toastView } = useToasts();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const refresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setLoadError(null);
    try {
      const data = await botApi(token, '/bot/status');
      setStatus(data);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  // Shared header (glass sticky), same on every state
  const Header = ({ subtitle }) => (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0f]/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/telegram-bot')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm sm:text-base group"
        >
          <FaArrowLeft className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Back to bot info</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0">
            <FaTelegram className="text-white text-sm" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="text-sm font-bold text-white leading-tight truncate">Bot Control Panel</div>
            {subtitle && <div className="text-[10px] text-gray-500 truncate">{subtitle}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <PanelAnimations />
        <PanelBackground />
        <Header />
        <LoginRequired />
      </div>
    );
  }

  if (loading || !status) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <PanelAnimations />
        <PanelBackground />
        <Header />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loadError ? (
            <Card className="max-w-lg mx-auto mt-16">
              <div className="p-6 text-center">
                <FaExclamationTriangle className="text-3xl text-amber-400 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-white mb-2">Couldn't load bot status</h2>
                <p className="text-sm text-gray-400 mb-4">{loadError}</p>
                <button onClick={refresh} className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold">Retry</button>
              </div>
            </Card>
          ) : (
            <LoadingSkeleton />
          )}
        </div>
        {toastView}
      </div>
    );
  }

  if (!status.telegram.linked) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <PanelAnimations />
        <PanelBackground />
        <Header subtitle="Not linked yet" />
        <div className="relative pb-16">
          <TelegramLinkRequired username={status.user.username} onRefresh={refresh} />
        </div>
        {toastView}
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaTh },
    { id: 'groups', label: 'Groups', icon: FaUsers, badge: status.groups.length },
    { id: 'raids', label: 'Raids', icon: FaBolt },
    { id: 'branding', label: 'Branding', icon: FaPalette },
    { id: 'socials', label: 'Socials & Boost', icon: FaTwitter },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <PanelAnimations />
      <PanelBackground />

      <Header subtitle={`@${status.user.username}`} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 sm:pb-16">
        {/* Hero */}
        <HeroCard status={status} onRefresh={refresh} refreshing={refreshing} />

        {/* Tab bar — horizontal scroll on mobile so no wrapping */}
        <div className="relative mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`snap-start flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <t.icon className="text-sm" /> {t.label}
                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === t.id ? 'bg-white/20 text-white' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Right fade to hint at scrollable content */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#0a0a0f] to-transparent sm:hidden" />
        </div>

        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 'overview' && <OverviewTab status={status} setActiveTab={setActiveTab} />}
          {activeTab === 'groups' && <GroupsTab status={status} token={token} refresh={refresh} toast={toast} />}
          {activeTab === 'raids' && <RaidsTab status={status} token={token} refresh={refresh} toast={toast} />}
          {activeTab === 'branding' && <BrandingTab status={status} token={token} refresh={refresh} toast={toast} />}
          {activeTab === 'socials' && <SocialsTab status={status} token={token} refresh={refresh} toast={toast} />}
        </div>
      </div>

      {toastView}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ambient background & animations — extracted to keep the tree readable
// ---------------------------------------------------------------------------
function PanelBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}

// Inject panel-specific animations & utilities (scrollbar-hide, shimmer, etc.)
// Kept inline rather than in tailwind.config so we don't touch shared config.
function PanelAnimations() {
  return (
    <style>{`
      @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes toastIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      .animate-fade-in { animation: fadeIn 0.25s ease-out; }
      .animate-toast-in { animation: toastIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
      .animate-shimmer { background-size: 800px 100%; animation: shimmer 1.8s infinite linear; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      .shadow-glow-emerald { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
    `}</style>
  );
}

export default BotControlPanel;
