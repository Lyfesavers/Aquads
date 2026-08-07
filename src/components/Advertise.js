import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  FaBullhorn,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaCreditCard,
  FaGamepad,
  FaExchangeAlt,
  FaGift,
  FaExpandAlt,
  FaFileImage,
  FaSyncAlt,
  FaUsers,
  FaWater,
  FaArrowRight,
  FaGlobe,
  FaSearchDollar
} from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import LoginModal from './LoginModal';
import CreateAccountModal from './CreateAccountModal';
import CreateBannerModal from './CreateBannerModal';
import ProfileModal from './ProfileModal';
import BannerDisplay from './BannerDisplay';
import { getDisplayName } from '../utils/nameUtils';
import { StandardDesktopNavLinks, StandardMobileNavLinks } from './StandardNavLinks';
import {
  MobileHamburgerButton,
  MobileMenuPanel,
  MobileNavAuthSection,
  MobileNavButton,
  MobileNavLink,
} from './MobileNavMenu';
import { API_URL } from '../services/api';
import logger from '../utils/logger';

/** Pricing mirrors BANNER_OPTIONS in CreateBannerModal.js — keep the two in sync. */
const BANNER_PRICING = [
  { duration: '24 Hours', price: 10, note: 'Best for launch day and AMAs' },
  { duration: '3 Days', price: 20, note: 'Covers a full listing push', popular: true },
  { duration: '7 Days', price: 40, note: 'Best value for sustained reach' }
];

/** Real screenshot of the home page placement; falls back to the wireframe if absent. */
const HERO_SCREENSHOT = '/advertise-hero.jpeg';

const PLATFORM_STATS = [
  { value: '750+', label: 'Monthly active users' },
  { value: '16 min', label: 'Average time on site' },
  { value: '#1', label: 'Google page one rankings' },
  { value: '60+', label: 'Blockchains supported' }
];

/* ---------------------------------------------------------------------------
   Mockup primitives — miniature wireframes of each real page so advertisers
   can see exactly where their banner lands before they buy.
--------------------------------------------------------------------------- */

const Wire = ({ className = '' }) => (
  <div className={`rounded-[2px] bg-gradient-to-r from-white/[0.16] to-white/[0.06] ${className}`} />
);

/**
 * Browser frame around each page mockup. Hovering the parent card dims the
 * page chrome via the overlay so only the ad slot stays lit — the ad slot
 * sits above the overlay on z-20.
 */
const MockScreen = ({ url, glow = 'rgba(56,189,248,0.12)', children }) => (
  <div className="w-full overflow-hidden rounded-lg border border-white/10 bg-[#0a0f1d] shadow-lg shadow-black/40">
    <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.06] px-2 py-1.5">
      <div className="flex gap-1">
        <div className="h-1.5 w-1.5 rounded-full bg-red-400/50" />
        <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/50" />
        <div className="h-1.5 w-1.5 rounded-full bg-green-400/50" />
      </div>
      <div className="ml-1 flex-1 truncate rounded-full bg-black/40 px-2 py-[2px] text-[7px] font-medium text-gray-500">
        aquads.xyz{url}
      </div>
    </div>

    <div className="relative aspect-[16/10]">
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at top, ${glow}, transparent 62%)` }}
      />
      <div className="relative flex h-full flex-col">{children}</div>
      <div className="pointer-events-none absolute inset-0 z-10 transition-colors duration-500 group-hover:bg-black/60" />
    </div>
  </div>
);

const MockNav = () => (
  <div className="flex shrink-0 items-center gap-1.5 border-b border-white/10 bg-white/[0.05] px-2 py-1.5">
    <div className="h-2 w-2 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500" />
    <Wire className="h-1.5 w-6" />
    <div className="ml-auto flex items-center gap-1">
      <Wire className="h-1.5 w-4" />
      <Wire className="h-1.5 w-4" />
      <Wire className="h-1.5 w-4" />
      <div className="h-1.5 w-5 rounded-[2px] bg-gradient-to-r from-yellow-400/60 to-amber-500/50" />
    </div>
  </div>
);

const MockAdSlot = ({ className = '' }) => (
  <div
    className={`relative z-20 flex items-center justify-center overflow-hidden rounded bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 shadow-lg shadow-blue-500/50 ring-1 ring-white/30 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-cyan-400/60 group-hover:ring-white/70 ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.45)_50%,transparent_70%)] transition-transform duration-1000 group-hover:translate-x-full" />
    <span className="relative text-[8px] font-extrabold tracking-[0.18em] text-white drop-shadow">
      YOUR AD
    </span>
  </div>
);

/** Home page: banner sits between the live bubble map and the token list. */
const BubbleMapMock = () => (
  <MockScreen url="/" glow="rgba(56,189,248,0.14)">
    <MockNav />
    <div className="flex shrink-0 gap-1 px-2 py-1">
      {['w-4', 'w-3', 'w-5', 'w-3'].map((w, i) => (
        <div key={i} className="flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1 py-[2px]">
          <div className="h-1 w-1 rounded-full bg-emerald-400/80" />
          <Wire className={`h-1 ${w}`} />
        </div>
      ))}
    </div>
    <div className="relative flex-1 px-2">
      <div className="absolute left-[8%] top-[16%] h-7 w-7 rounded-full bg-gradient-to-br from-blue-300/70 to-blue-600/30 shadow-md shadow-blue-500/20 ring-1 ring-white/25" />
      <div className="absolute left-[30%] top-[6%] h-9 w-9 rounded-full bg-gradient-to-br from-purple-300/70 to-purple-600/30 shadow-md shadow-purple-500/20 ring-1 ring-white/25" />
      <div className="absolute left-[54%] top-[20%] h-6 w-6 rounded-full bg-gradient-to-br from-cyan-300/70 to-cyan-600/30 shadow-md shadow-cyan-500/20 ring-1 ring-white/25" />
      <div className="absolute left-[73%] top-[5%] h-8 w-8 rounded-full bg-gradient-to-br from-emerald-300/70 to-emerald-600/30 shadow-md shadow-emerald-500/20 ring-1 ring-white/25" />
      <div className="absolute left-[19%] top-[52%] h-5 w-5 rounded-full bg-gradient-to-br from-pink-300/70 to-pink-600/30 ring-1 ring-white/25" />
      <div className="absolute left-[44%] top-[56%] h-6 w-6 rounded-full bg-gradient-to-br from-amber-300/70 to-amber-600/30 ring-1 ring-white/25" />
      <div className="absolute left-[67%] top-[54%] h-4 w-4 rounded-full bg-gradient-to-br from-sky-300/70 to-sky-600/30 ring-1 ring-white/25" />
    </div>
    <div className="shrink-0 px-2 pb-1">
      <MockAdSlot className="h-5" />
    </div>
    <div className="shrink-0 space-y-[3px] px-2 pb-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gradient-to-br from-white/30 to-white/10" />
          <Wire className="h-1.5 flex-1" />
          <Wire className="h-1.5 w-5" />
          <div
            className={`h-1.5 w-4 rounded-[2px] ${i === 1 ? 'bg-rose-400/60' : 'bg-emerald-400/60'}`}
          />
        </div>
      ))}
    </div>
  </MockScreen>
);

/** Freelancer Hub: banner is the first thing above search and service cards. */
const MarketplaceMock = () => (
  <MockScreen url="/marketplace" glow="rgba(129,140,248,0.14)">
    <MockNav />
    <div className="shrink-0 px-2 py-1.5">
      <MockAdSlot className="h-5" />
    </div>
    <div className="flex shrink-0 items-center gap-1 px-2 pb-1.5">
      <div className="flex h-2.5 flex-1 items-center gap-1 rounded-full bg-white/[0.07] px-1.5">
        <div className="h-1 w-1 rounded-full ring-1 ring-white/30" />
        <Wire className="h-1 w-10" />
      </div>
      <div className="h-2.5 w-6 rounded-full bg-gradient-to-r from-blue-500/50 to-cyan-500/40" />
    </div>
    <div className="grid flex-1 grid-cols-3 gap-1.5 px-2 pb-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-1 rounded border border-white/10 bg-white/[0.05] p-1"
        >
          <div className="h-1/2 rounded-[2px] bg-gradient-to-br from-white/15 to-white/[0.04]" />
          <div className="flex items-center gap-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-cyan-300/70 to-blue-500/40" />
            <Wire className="h-1 flex-1" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-[1px]">
              {[0, 1, 2].map((s) => (
                <div key={s} className="h-[3px] w-[3px] rounded-[1px] bg-amber-400/70" />
              ))}
            </div>
            <div className="h-1 w-3 rounded-[1px] bg-emerald-400/50" />
          </div>
        </div>
      ))}
    </div>
  </MockScreen>
);

/** GameHub: banner sits directly under the nav, above the arcade hero. */
const GameHubMock = () => (
  <MockScreen url="/games" glow="rgba(168,85,247,0.16)">
    <MockNav />
    <div className="shrink-0 px-2 py-1.5">
      <MockAdSlot className="h-5" />
    </div>
    <div className="shrink-0 px-2 pb-1.5">
      <div className="flex h-6 items-center justify-center gap-1 rounded bg-gradient-to-r from-indigo-500/40 via-purple-500/30 to-fuchsia-500/30 ring-1 ring-white/15">
        <Wire className="h-1.5 w-12" />
      </div>
    </div>
    <div className="grid flex-1 grid-cols-4 gap-1.5 px-2 pb-2">
      {[
        'from-rose-400/50 to-rose-600/20',
        'from-sky-400/50 to-sky-600/20',
        'from-emerald-400/50 to-emerald-600/20',
        'from-amber-400/50 to-amber-600/20',
        'from-violet-400/50 to-violet-600/20',
        'from-cyan-400/50 to-cyan-600/20',
        'from-pink-400/50 to-pink-600/20',
        'from-lime-400/50 to-lime-600/20'
      ].map((tone, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center gap-1 rounded border border-white/10 bg-white/[0.05] p-1"
        >
          <div className={`h-3 w-3 rounded-[3px] bg-gradient-to-br ${tone}`} />
          <Wire className="h-1 w-4/5" />
        </div>
      ))}
    </div>
  </MockScreen>
);

/** AquaSwap: banner sits above the swap card on mobile, below it on desktop. */
const AquaSwapMock = () => (
  <MockScreen url="/aquaswap" glow="rgba(34,211,238,0.16)">
    <MockNav />
    <div className="flex flex-1 items-center justify-center px-2 py-2">
      <div className="w-3/5 space-y-1 rounded-lg border border-white/10 bg-white/[0.06] p-1.5 shadow-lg shadow-black/30">
        <Wire className="h-1.5 w-8" />
        <div className="flex h-5 items-center gap-1 rounded bg-white/[0.09] px-1">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-300/80 to-orange-500/50" />
          <Wire className="h-1 w-5" />
          <Wire className="ml-auto h-1 w-4" />
        </div>
        <div className="flex justify-center">
          <div className="h-3 w-3 rounded-full bg-gradient-to-br from-cyan-300/70 to-blue-500/50 ring-1 ring-white/20" />
        </div>
        <div className="flex h-5 items-center gap-1 rounded bg-white/[0.09] px-1">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-300/80 to-purple-500/50" />
          <Wire className="h-1 w-5" />
          <Wire className="ml-auto h-1 w-4" />
        </div>
        <div className="h-3 rounded bg-gradient-to-r from-blue-500/60 to-cyan-500/60" />
      </div>
    </div>
    <div className="shrink-0 px-2 pb-2">
      <MockAdSlot className="h-5" />
    </div>
  </MockScreen>
);

/** AquaFi: banner runs above the savings pools and portfolio analytics. */
const AquaFiMock = () => (
  <MockScreen url="/aquafi" glow="rgba(45,212,191,0.15)">
    <MockNav />
    <div className="shrink-0 px-2 py-1.5">
      <MockAdSlot className="h-5" />
    </div>
    <div className="grid shrink-0 grid-cols-3 gap-1.5 px-2 pb-1.5">
      {['from-cyan-400/50', 'from-teal-400/50', 'from-blue-400/50'].map((tone, i) => (
        <div key={i} className="space-y-1 rounded border border-white/10 bg-white/[0.05] p-1">
          <Wire className="h-1 w-6" />
          <div className={`h-2 rounded-[2px] bg-gradient-to-r ${tone} to-transparent`} />
        </div>
      ))}
    </div>
    <div className="flex-1 space-y-1 px-2 pb-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-1 py-1"
        >
          <div className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-300/70 to-blue-600/40" />
          <Wire className="h-1 flex-1" />
          <div className="rounded-[2px] bg-emerald-400/25 px-1 py-[1px]">
            <div className="h-1 w-4 rounded-[1px] bg-emerald-300/70" />
          </div>
        </div>
      ))}
    </div>
  </MockScreen>
);

/** Partner Store: banner leads the verified partner directory. */
const PartnerStoreMock = () => (
  <MockScreen url="/partner-rewards" glow="rgba(217,70,239,0.14)">
    <MockNav />
    <div className="shrink-0 px-2 py-1.5">
      <MockAdSlot className="h-5" />
    </div>
    <div className="grid flex-1 grid-cols-3 gap-1.5 px-2 pb-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="relative flex flex-col items-center justify-center gap-1 rounded border border-white/10 bg-white/[0.05] p-1"
        >
          <div className="absolute right-[3px] top-[3px] h-1 w-1 rounded-full bg-emerald-400/80" />
          <div className="h-3 w-3 rounded-full bg-gradient-to-br from-fuchsia-300/70 to-purple-600/40 ring-1 ring-white/20" />
          <Wire className="h-1 w-2/3" />
        </div>
      ))}
    </div>
  </MockScreen>
);

const PLACEMENTS = [
  {
    id: 'home',
    title: 'Bubble Map — Home',
    path: '/home',
    icon: FaGlobe,
    mock: BubbleMapMock,
    description:
      'Your banner sits between the live bubble map and the token list, right where traders scroll after scanning new projects.'
  },
  {
    id: 'marketplace',
    title: 'Freelancer Hub',
    path: '/marketplace',
    icon: FaUsers,
    mock: MarketplaceMock,
    description:
      'First thing above the search bar and service listings, seen by every project hiring help for a launch.'
  },
  {
    id: 'games',
    title: 'GameHub',
    path: '/games',
    icon: FaGamepad,
    mock: GameHubMock,
    description:
      'Directly under the nav and above the arcade hero, in front of the platform’s longest-dwelling visitors.'
  },
  {
    id: 'aquaswap',
    title: 'AquaSwap',
    path: '/aquaswap',
    icon: FaExchangeAlt,
    mock: AquaSwapMock,
    description:
      'Beside the cross-chain swap widget — above it on mobile, below the swap card on desktop — catching users mid-trade.'
  },
  {
    id: 'aquafi',
    title: 'AquaFi',
    path: '/aquafi',
    icon: FaWater,
    mock: AquaFiMock,
    description:
      'Above the savings pools and portfolio analytics, reaching holders who are actively deploying capital.'
  },
  {
    id: 'partners',
    title: 'Partner Store',
    path: '/partner-rewards',
    icon: FaGift,
    mock: PartnerStoreMock,
    description:
      'Leads the verified partner directory, where users arrive already looking for products to try.'
  }
];

const BANNER_SPECS = [
  { icon: FaExpandAlt, label: 'Size', value: '1280 × 200 px' },
  { icon: FaFileImage, label: 'Formats', value: 'GIF, PNG or JPG' },
  { icon: FaSyncAlt, label: 'Rotation', value: 'Every 10 seconds' },
  { icon: FaClock, label: 'Go live', value: 'Instantly when you pay in crypto' },
  { icon: FaCoins, label: 'Crypto', value: 'USDC, auto-approved' },
  { icon: FaCreditCard, label: 'Card', value: 'PayPal, admin reviewed' }
];

const Advertise = ({
  currentUser,
  showNotification,
  onLogin,
  onLogout,
  onCreateAccount,
  openMintFunnelPlatform
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [heroShotMissing, setHeroShotMissing] = useState(false);

  const handleLoginClick = () => setShowLoginModal(true);
  const handleCreateAccountClick = () => setShowCreateAccountModal(true);

  const handleLoginSubmit = async (credentials) => {
    try {
      await onLogin?.(credentials);
      setShowLoginModal(false);
    } catch (error) {
      logger.error('Login error:', error);
    }
  };

  const handleCreateAccountSubmit = async (formData) => {
    try {
      await onCreateAccount?.(formData);
      setShowCreateAccountModal(false);
    } catch (error) {
      logger.error('Create account error:', error);
    }
  };

  /** Booking requires an account, so unauthenticated visitors get the login modal instead. */
  const handleBookBanner = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    setShowBannerModal(true);
  };

  const handleBannerSubmit = async (bannerData) => {
    if (!currentUser) {
      throw new Error('Please log in first!');
    }

    const response = await fetch(`${API_URL}/bannerAds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`
      },
      body: JSON.stringify({
        ...bannerData,
        owner: currentUser.userId,
        status: 'pending'
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to create banner ad');
    }

    const newBanner = await response.json();
    showNotification?.('Banner ad created successfully!', 'success');
    return newBanner;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white">
      <Helmet>
        <title>Advertise on Aquads | Banner ads across the crypto launch stack</title>
        <meta
          name="description"
          content="Put your project in front of active crypto traders. One Aquads banner runs across the bubble map, Freelancer Hub, GameHub, AquaSwap, AquaFi and the Partner Store from $10."
        />
        <link rel="canonical" href="https://www.aquads.xyz/advertise" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aquads.xyz/advertise" />
        <meta property="og:title" content="Advertise on Aquads | Banner ads across the crypto launch stack" />
        <meta
          property="og:description"
          content="One banner, six high-traffic placements. Reach active crypto traders on Aquads from $10."
        />
        <meta property="og:image" content="https://www.aquads.xyz/metalogo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Advertise on Aquads" />
        <meta
          name="twitter:description"
          content="One banner, six high-traffic placements. Reach active crypto traders on Aquads from $10."
        />
        <meta name="twitter:image" content="https://www.aquads.xyz/metalogo.png" />
      </Helmet>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/5 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-700/50 bg-gray-800/90 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/home" className="flex items-center">
              <img src="/alogo.png" alt="AQUADS" className="aquads-nav-logo" />
            </Link>

            <MobileHamburgerButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />

            <div className="hidden items-center space-x-3 md:flex">
              <StandardDesktopNavLinks
                openMintFunnelPlatform={openMintFunnelPlatform}
                includeHome
                marketplaceLabel="Freelancer Hub"
              />

              {currentUser ? (
                <>
                  <NotificationBell currentUser={currentUser} />
                  <div className="user-dropdown relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center rounded bg-gray-700/90 px-3 py-1.5 text-sm text-yellow-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-gray-600/90 hover:shadow-gray-500/30"
                    >
                      <span className="mr-1">{getDisplayName(currentUser)}</span>
                      <svg
                        className={`ml-1 h-4 w-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {showUserDropdown && (
                      <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-700/50 bg-gray-800/95 shadow-xl backdrop-blur-sm">
                        <div className="py-2">
                          <Link
                            to="/dashboard"
                            onClick={() => setShowUserDropdown(false)}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-blue-600/50 hover:text-white"
                          >
                            📊 Dashboard
                          </Link>
                          <button
                            onClick={() => {
                              setShowBannerModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-blue-600/50 hover:text-white"
                          >
                            🎨 Book a banner
                          </button>
                          <button
                            onClick={() => {
                              setShowProfileModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-purple-600/50 hover:text-white"
                          >
                            ⚙️ Edit Profile
                          </button>
                          <hr className="my-2 border-gray-700" />
                          <button
                            onClick={() => {
                              onLogout?.();
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-red-600/50 hover:text-white"
                          >
                            🚪 Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLoginClick}
                    className="rounded bg-gray-700/90 px-3 py-1.5 text-sm text-yellow-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-gray-600/90 hover:shadow-gray-500/30"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleCreateAccountClick}
                    className="rounded bg-gray-700/90 px-3 py-1.5 text-sm text-yellow-400 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-gray-600/90 hover:shadow-gray-500/30"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          <MobileMenuPanel isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
            <StandardMobileNavLinks
              onNavigate={() => setIsMobileMenuOpen(false)}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
            <MobileNavAuthSection
              currentUser={currentUser}
              displayName={currentUser ? getDisplayName(currentUser) : null}
              onClose={() => setIsMobileMenuOpen(false)}
              onLogin={handleLoginClick}
              onCreateAccount={handleCreateAccountClick}
              onLogout={onLogout}
              notificationBell={
                currentUser ? (
                  <div className="flex justify-center py-2">
                    <NotificationBell currentUser={currentUser} />
                  </div>
                ) : null
              }
              loggedInExtras={
                currentUser ? (
                  <>
                    <MobileNavLink
                      to="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      icon="📊"
                      label="Dashboard"
                      className="hover:bg-cyan-500/10"
                    />
                    <MobileNavButton
                      onClick={() => {
                        setShowBannerModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      icon="🎨"
                      label="Book a banner"
                    />
                    <MobileNavButton
                      onClick={() => {
                        setShowProfileModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      icon="⚙️"
                      label="Edit Profile"
                    />
                  </>
                ) : null
              }
            />
          </MobileMenuPanel>
        </div>
      </nav>

      <div className="relative z-10">
        <BannerDisplay />
      </div>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-300">
              <FaBullhorn className="h-3 w-3" />
              Advertise with Aquads
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Put your project in front of{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                active crypto traders
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-gray-300">
              One banner runs across every high-traffic page on Aquads — the bubble map, Freelancer
              Hub, GameHub, AquaSwap, AquaFi and the Partner Store. No ad network, no minimum spend,
              live as soon as your payment confirms.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={handleBookBanner}
                className="inline-flex transform items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-7 py-3.5 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-cyan-600"
              >
                <FaBullhorn className="h-4 w-4" />
                Book a banner from $10
              </button>
              <a
                href="#placements"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800/60 px-7 py-3.5 font-semibold text-gray-200 backdrop-blur-sm transition-all duration-300 hover:border-gray-500 hover:bg-gray-700/60"
              >
                See where it appears
                <FaArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Hero mockup — the home page placement, shown large */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-600/20 via-cyan-500/10 to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-gray-700/60 bg-gray-900/70 p-3 shadow-2xl backdrop-blur-sm sm:p-4">
              {heroShotMissing ? (
                <BubbleMapMock />
              ) : (
                <img
                  src={HERO_SCREENSHOT}
                  alt="Illustration of banner ad placements across crypto site layouts"
                  className="w-full rounded-lg border border-white/10"
                  onError={() => setHeroShotMissing(true)}
                />
              )}
              <p className="mt-3 text-center text-xs text-gray-500">
                Banner placements at a glance — see the six real Aquads slots below
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PLATFORM_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-4 text-center backdrop-blur-sm"
            >
              <div className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs text-gray-400 sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-5 max-w-2xl text-center text-sm text-gray-500">
          Real Google Analytics figures from the last 28 days — no inflated numbers. We&apos;re
          early and growing, and our pricing reflects that: $10 gets you all six placements for a
          day.
        </p>
      </section>

      {/* Placements */}
      <section id="placements" className="relative z-10 mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Banner placements
          </span>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
            One banner,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              six placements
            </span>
          </h2>
          <p className="mt-4 text-gray-400">
            You don’t pick a page. Every banner rotates across all six of these locations for the
            full length of your booking, so a single buy covers the whole platform.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEMENTS.map((placement) => {
            const Mock = placement.mock;
            const Icon = placement.icon;

            return (
              <div
                key={placement.id}
                className="group overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-800/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                <div className="border-b border-gray-700/40 bg-gradient-to-b from-black/50 to-black/20 p-3">
                  <Mock />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-400/20 transition-colors group-hover:bg-blue-500/20">
                      <Icon className="h-3.5 w-3.5 text-blue-400" />
                    </span>
                    <h3 className="font-semibold text-white">{placement.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{placement.description}</p>
                  <Link
                    to={placement.path}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    View the live page
                    <FaArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Specs */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6 backdrop-blur-sm sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
            <div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">Everything you need to know</h2>
              <p className="mt-3 text-gray-400">
                Upload one image, choose how long it runs, and pay in USDC or by card. Crypto
                payments through AquaPay activate your banner automatically once the transaction is
                verified on chain.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'Animated GIFs are fully supported',
                  'Rotates with other live banners every 10 seconds',
                  'USDC on Solana, Ethereum, Base, Polygon, Arbitrum and more',
                  'Card and PayPal accepted, verified by an admin'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <FaCheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BANNER_SPECS.map((spec) => {
                const Icon = spec.icon;
                return (
                  <div
                    key={spec.label}
                    className="rounded-xl border border-gray-700/50 bg-gray-900/50 p-4 transition-colors hover:border-blue-400/40"
                  >
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <div className="mt-2.5 text-[11px] uppercase tracking-wider text-gray-500">
                      {spec.label}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white">{spec.value}</div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-center text-sm text-gray-400">
              Your banner rotates into view every 10 seconds across all six placements, and the
              average visitor spends close to 16 minutes on Aquads — so a single booking is seen
              repeatedly, not just once.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
            Simple flat rates, no bidding
          </h2>
          <p className="mt-4 text-gray-400">
            Every tier includes all six placements. Pay once, go live, no ongoing spend.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {BANNER_PRICING.map((tier) => (
            <div
              key={tier.duration}
              className={`relative rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 ${
                tier.popular
                  ? 'border-blue-400/60 bg-gradient-to-b from-blue-500/10 to-gray-800/40 shadow-xl shadow-blue-500/10'
                  : 'border-gray-700/60 bg-gray-800/40 hover:border-gray-600'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              )}
              <div className="text-sm font-medium text-gray-400">{tier.duration}</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">${tier.price}</span>
                <span className="text-sm text-gray-500">USDC</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">{tier.note}</p>
              <button
                onClick={handleBookBanner}
                className={`mt-5 w-full rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  tier.popular
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                    : 'border border-gray-600 bg-gray-900/60 text-gray-200 hover:border-gray-500 hover:bg-gray-700/60'
                }`}
              >
                Book {tier.duration.toLowerCase()}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Other ways to get seen */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">Other ways to get seen</h2>
          <p className="mt-3 text-gray-400">
            Banners are the fastest option. These stack on top of them.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            {
              icon: FaGlobe,
              title: 'List your project free',
              body: 'Claim a bubble on the map at no cost, then grow it with community votes.',
              to: '/list-token-free',
              cta: 'List for free'
            },
            {
              icon: FaSearchDollar,
              title: 'CPC ad campaigns',
              body: 'Run cost-per-click campaigns across 1,500+ external crypto platforms.',
              onClick: openMintFunnelPlatform,
              cta: 'Explore paid ads'
            },
            {
              icon: FaBullhorn,
              title: 'HyperSpace listeners',
              body: 'Fill your next X Space with real listeners and boost your reach.',
              to: '/hyperspace',
              cta: 'Boost a Space'
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-700/60 bg-gray-800/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-400/40"
              >
                <Icon className="h-5 w-5 text-cyan-400" />
                <h3 className="mt-3 font-semibold text-white">{item.title}</h3>
                <p className="mt-1.5 text-sm text-gray-400">{item.body}</p>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    {item.cta}
                    <FaArrowRight className="h-2.5 w-2.5" />
                  </Link>
                ) : (
                  <button
                    onClick={item.onClick}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    {item.cta}
                    <FaArrowRight className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-blue-400/25 bg-gradient-to-br from-blue-600/20 via-gray-900/60 to-purple-600/10 p-8 text-center backdrop-blur-sm sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.12),_transparent_65%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to go live?</h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-300">
              Upload your 1280 × 200 banner, pick a duration and pay in USDC or by card. Most
              campaigns are live within minutes.
            </p>
            <button
              onClick={handleBookBanner}
              className="mt-7 inline-flex transform items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-cyan-600"
            >
              <FaBullhorn className="h-4 w-4" />
              Book your banner
            </button>
            {!currentUser && (
              <p className="mt-3 text-xs text-gray-500">
                You’ll need an Aquads account — it takes a few seconds to create one.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      {showBannerModal && currentUser && (
        <CreateBannerModal onSubmit={handleBannerSubmit} onClose={() => setShowBannerModal(false)} />
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLoginSubmit}
          onCreateAccount={() => {
            setShowLoginModal(false);
            setShowCreateAccountModal(true);
          }}
        />
      )}

      {showCreateAccountModal && (
        <CreateAccountModal
          onClose={() => setShowCreateAccountModal(false)}
          onCreateAccount={handleCreateAccountSubmit}
        />
      )}

      {showProfileModal && currentUser && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          onProfileUpdate={() => showNotification?.('Profile updated successfully!', 'success')}
        />
      )}
    </div>
  );
};

export default Advertise;
