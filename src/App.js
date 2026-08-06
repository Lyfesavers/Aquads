import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Buffer } from 'buffer';
import { 
  socket, 
  fetchAds, 
  createAd as apiCreateAd, 
  updateAd as apiUpdateAd,
  deleteAd as apiDeleteAd, 
  loginUser, 
  loginWithGoogle,
  register as apiRegister,
  verifyToken,
  pingServer,
  API_URL,
  BACKEND_URL,
  reconnectSocket,
  trackClick,
  trackBubbleClick,
  forceSessionLogout,
  persistAuthSession,
  commitAuthSession,
  clearAuthSessionStorage,
  getAuthSessionGeneration
} from './services/api';
import {
  resetSkipperClientSession,
  getSkipperAuthEpoch,
  normalizeAquadsUser,
  skipperDebugLog,
  SKIPPER_PROJECT_ONBOARDING_DELAY_MS
} from './components/projectAgent/projectAgentSession';
import { warmSkipperSessionForUser } from './services/projectAgentApi';
import LoginModal from './components/LoginModal';
import CreateAdModal from './components/CreateAdModal';
import CreateAccountModal from './components/CreateAccountModal';
import EmailVerificationModal from './components/EmailVerificationModal';
import EditAdModal from './components/EditAdModal';
import CreateBannerModal from './components/CreateBannerModal';
import TokenBanner from './components/TokenBanner';
import TokenList from './components/TokenList';
import TokenRating from './components/TokenRating';
const Marketplace = lazy(() => import('./components/Marketplace'));
const Bounties = lazy(() => import('./components/Bounties'));
const PartnerMarketplace = lazy(() => import('./components/PartnerMarketplace'));
const GameHub = lazy(() => import('./components/GameHub'));
const GamePage = lazy(() => import('./components/GamePage'));
import ProfileModal from './components/ProfileModal';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import DesktopInstallPrompt from './components/DesktopInstallPrompt';
import { PWAInstallProvider } from './contexts/PWAInstallContext';
const HowTo = lazy(() => import('./components/HowTo'));
const BlogPage = lazy(() => import('./components/BlogPage'));
const FreeCoursePage = lazy(() => import('./components/FreeCoursePage'));
const Affiliate = lazy(() => import('./components/Affiliate'));
const Terms = lazy(() => import('./components/Terms'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./components/CookiePolicy'));
const AquaFi = lazy(() => import('./components/AquaFi'));
const AquaSwap = lazy(() => import('./components/AquaSwap'));
const AquaSwapEmbed = lazy(() => import('./components/AquaSwapEmbed'));
const WalletAnalyzer = lazy(() => import('./components/WalletAnalyzer'));
const AquadsPFPGenerator = lazy(() => import('./components/AquadsPFPGenerator'));
const VerifyUser = lazy(() => import('./components/VerifyUser'));
const MemberVerification = lazy(() => import('./components/MemberVerification'));
import BannerDisplay from './components/BannerDisplay';
import RotatingBanner from './components/RotatingBanner';
import useUserPresence from './hooks/useUserPresence';

const ProjectInfo = lazy(() => import('./components/ProjectInfo'));
const FreelancerBenefits = lazy(() => import('./components/FreelancerBenefits'));
const BookingConversationPage = lazy(() => import('./components/BookingConversationPage'));
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import emailService from './services/emailService';
import emailjs from '@emailjs/browser';
import NotificationBell from './components/NotificationBell';
import { getDisplayName } from './utils/nameUtils';
import BumpReminderModal from './components/BumpReminderModal';
import logger from './utils/logger';
import {
  persistAdsCache,
  readAdsCache,
  mergeIncomingAdsWithCurrent,
  mergeAdVotesSnapshot,
} from './utils/adsCache';
import {
  readTokensCache,
  persistTokensCache,
  readGlobalStatsCache,
  persistGlobalStatsCache,
  getTokensCacheAgeMs,
  TOKENS_CACHE_STALE_MS,
} from './utils/tokensCache';
import './App.css';
import FilterControls from './components/FilterControls';
import {
  FILTER_BLOCKCHAIN_OPTIONS,
  matchesBlockchainFilter,
  getBlockchainLabel,
} from './constants/blockchains';
const DotsAndBoxes = lazy(() => import('./components/DotsAndBoxes'));
const HorseRacing = lazy(() => import('./components/HorseRacing'));
const CrosswordPuzzle = lazy(() => import('./components/CrosswordPuzzle'));
const BeanstalksAndChutes = lazy(() => import('./components/BeanstalksAndChutes'));
const Sludo = lazy(() => import('./components/Sludo'));
const Aquataire = lazy(() => import('./components/Aquataire'));
const Checkers = lazy(() => import('./components/Checkers'));

const ServicePage = lazy(() => import('./components/ServicePage'));
const ExtensionAuth = lazy(() => import('./components/ExtensionAuth'));
const ProjectAgentPage = lazy(() => import('./components/projectAgent/ProjectAgentPage'));
const ProjectAgentFab = lazy(() => import('./components/projectAgent/ProjectAgentFab'));
const TelegramBot = lazy(() => import('./components/TelegramBot'));
const BotControlPanel = lazy(() => import('./components/BotControlPanel'));
const PublicResume = lazy(() => import('./components/PublicResume'));
const LinkInBio = lazy(() => import('./components/LinkInBio'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const AquaPayWithPhantom = lazy(() => import('./components/AquaPayWithPhantom'));
const CustodialPayment = lazy(() => import('./components/FreelancerEscrow/CustodialPayment'));
const AquaPayInfo = lazy(() => import('./components/AquaPayInfo'));
const HyperSpace = lazy(() => import('./components/HyperSpace'));
const Documentation = lazy(() => import('./components/Documentation/Documentation'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const ClaimBubblePage = lazy(() => import('./components/ClaimBubblePage'));

window.Buffer = Buffer;

// Initialize EmailJS right after imports
emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);

// Constants for ad sizes and animations
const BASE_MAX_SIZE = 100;
const MIN_SIZE = 50;
// Function to get responsive size based on screen width
function getResponsiveSize(baseSize) {
  // Get current viewport width
  const viewportWidth = window.innerWidth;
  
  if (viewportWidth <= 480) {
    // Mobile - bigger bubbles for better interaction
    return Math.floor(baseSize * 0.65);
  } else if (viewportWidth <= 768) {
    // Tablet - medium bubbles (reduced from 0.8 to 0.7)
    return Math.floor(baseSize * 0.7);
  }
  // Desktop - normal size
  return baseSize;
}

// Use this function to get current max size
function getMaxSize() {
  return getResponsiveSize(BASE_MAX_SIZE);
}

const BLOCKCHAIN_OPTIONS = FILTER_BLOCKCHAIN_OPTIONS;

const SHRINK_RATE = 4; // Amount to shrink by each interval
const SHRINK_INTERVAL = 15000; // 15 seconds (matches backend for real-time sync)
const SHRINK_PERCENTAGE = 0.9; // More gradual shrinking
const TOKEN_PRICE = 0.01; // SOL per token
const AD_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const AD_WARNING_TIME = 24 * 60 * 60 * 1000; // 1 day
const FREE_AD_LIMIT = 1;
const LAYOUT_DEBOUNCE = 200; // Debounce time for layout calculations
const ANIMATION_DURATION = '0.3s'; // Slower animations
const REPOSITION_INTERVAL = 10000; // 5 seconds between position updates
const BUBBLE_PADDING = 20; // Padding from edges
/** Side inset for bubble-map grid only (tighter than BUBBLE_PADDING = less gutter on mobile map). */
const MOBILE_BUBBLEMAP_GRID_MARGIN_H = 3;
/** Narrow horizontal gap between column slots when packing rows (votes sit above discs). */
const MOBILE_BUBBLEMAP_INTER_COLUMN_GAP_PX = 2;
/** Min column budget (legacy); column math uses packed width + gap above. */
const MOBILE_BUBBLEMAP_VOTE_STRIP_MIN_WIDTH = 84;
/** Breathing room between a row's rendered bottom and the next row's vote strip. */
const MOBILE_BUBBLEMAP_ROW_CLEARANCE_PX = 8;
/** Horizontal gap bounds between rendered lanes. A lane is as wide as the vote strip, which is wider than the disc it sits above. */
const MOBILE_BUBBLEMAP_MIN_LANE_GAP_PX = 6;
const MOBILE_BUBBLEMAP_MAX_LANE_GAP_PX = 14;
/** Upper bound on packed columns; phones resolve to 4–5 from the measured lane width. */
const MOBILE_BUBBLEMAP_MAX_COLUMNS = 6;
/** Columns the mobile bubble map aims for (rows read as a 5-up grid). */
const MOBILE_BUBBLEMAP_PREFERRED_COLUMNS = 5;
/**
 * Lane count used *only* to pick disc diameters. Row packing is resolved separately from
 * painted width, so raising the columns-per-row no longer shrinks the discs.
 */
const MOBILE_BUBBLEMAP_SIZING_COLUMNS = 4;
/**
 * Painted-vs-box geometry for the mobile map. `.bubble` is CSS-scaled at ≤480px, so a
 * container box paints far smaller than its width — packing the box wasted ~30px per lane
 * and ~19px per row. These let the grid pack what is actually drawn.
 * Keep in sync with index.css (.bubble scale) and index2.css (.vote-popup top/max-width).
 */
const MOBILE_BUBBLE_PAINT_SCALE = 0.6;
/** `.vote-popup` layout width at ≤480px (max-width 118px; ~114px rendered) — it is wider than the disc. */
const MOBILE_VOTE_STRIP_LAYOUT_WIDTH_PX = 114;
/** `.vote-popup` top offset inside the bubble box before scaling. */
const MOBILE_VOTE_STRIP_TOP_OFFSET_PX = -48;
/** Slack under the last row so the map container never clips the final discs. */
const MOBILE_BUBBLEMAP_BOTTOM_PADDING_PX = 24;
const BANNER_HEIGHT = 0; // Height of the banner area including nav and token banner
const TOP_PADDING = BANNER_HEIGHT + 5; // Additional padding from top to account for banner

/** Bumped bubbles per page on 1080p desktop panels @ 100–125% scale (user-tested). */
const BUBBLE_MAP_ITEMS_PER_PAGE_1080P = 90;
/** 1080p panel @ 150% Windows scale — logical ~1280×720: 5 full rows of 11 columns. */
const BUBBLE_MAP_ITEMS_PER_PAGE_1080P_150 = 55;
/** 1440p @ 100% scale — user-tested: ~10 rows × 20 cols (65 shown + 135 more room). */
const BUBBLE_MAP_ITEMS_PER_PAGE_1440P = 200;
/** 1440p @ 125% scale (Windows recommended) — user-tested fit at 100% browser zoom. */
const BUBBLE_MAP_ITEMS_PER_PAGE_1440P_125 = 96;
/** Desktop grid geometry — keep in sync with arrangeDesktopGrid(). */
const DESKTOP_GRID_CELL_WIDTH = 115;
const DESKTOP_GRID_H_MARGIN = 10;
const DESKTOP_GRID_V_MARGIN = 30;
/** The map sits in an inner scroll container, so its usable width is a scrollbar narrower than window.innerWidth. */
const DESKTOP_GRID_SCROLLBAR_RESERVE = 18;
/** Smallest edge-to-edge gap between two full-size discs sharing a row. */
const DESKTOP_GRID_MIN_H_GAP = 12;
/** At or below this width rows keep the tuned fixed cell (tablet page sizes are aligned to it). */
const DESKTOP_GRID_FIXED_CELL_MAX_WIDTH = 768;

/**
 * Columns and cell width for one desktop/laptop row.
 *
 * A fixed 115px cell discards every leftover pixel under one whole cell. On a 1080p laptop at
 * 150% Windows scale (logical 1280px) that left ~110px unused — one column short on every row.
 * Sizing the cell from the largest disc the viewport can paint plus a minimum gap recovers it,
 * then the leftover is spread across the row instead of sitting as a right-hand gutter.
 *
 * The reference disc is the viewport's max diameter, not this page's largest disc, so the
 * column count stays identical on every page as unbumped bubbles shrink.
 */
function resolveDesktopGridColumns(screenWidth) {
  if (screenWidth <= DESKTOP_GRID_FIXED_CELL_MAX_WIDTH) {
    const availableWidth = Math.max(1, screenWidth - DESKTOP_GRID_H_MARGIN * 2);
    return {
      columns: Math.max(1, Math.floor(availableWidth / DESKTOP_GRID_CELL_WIDTH)),
      cellWidth: DESKTOP_GRID_CELL_WIDTH,
    };
  }

  const availableWidth = Math.max(
    1,
    screenWidth - DESKTOP_GRID_H_MARGIN * 2 - DESKTOP_GRID_SCROLLBAR_RESERVE
  );
  // Past DESKTOP_GRID_FIXED_CELL_MAX_WIDTH getResponsiveSize() no longer scales the disc down.
  const referenceCell = BASE_MAX_SIZE + DESKTOP_GRID_MIN_H_GAP;
  const columns = Math.max(1, Math.floor(availableWidth / referenceCell));

  return { columns, cellWidth: availableWidth / columns };
}

/**
 * Desktop grid positions for a whole page, from the visible sort order.
 *
 * Row stride is the tallest bubble in that row. Deriving it from each bubble's own
 * size (old behaviour) made shrunk unbumped bubbles use a shorter stride than the
 * bumped bubbles above them, so on the bumped→unbumped page they collapsed upward
 * and overlapped the bumped rows. Uniform-size pages keep the exact same geometry.
 */
function computeDesktopGridLayout(sizesPx, screenWidth) {
  const horizontalMargin = DESKTOP_GRID_H_MARGIN;
  const verticalMargin = DESKTOP_GRID_V_MARGIN;
  const { columns, cellWidth } = resolveDesktopGridColumns(screenWidth);

  const positions = [];
  let rowTop = TOP_PADDING + verticalMargin;

  for (let start = 0; start < sizesPx.length; start += columns) {
    const rowSizes = sizesPx.slice(start, start + columns);
    const rowHeight = rowSizes.reduce((tallest, size) => Math.max(tallest, size), 1);

    rowSizes.forEach((size, column) => {
      positions.push({
        x: horizontalMargin + column * cellWidth + cellWidth / 2 - size / 2,
        // Center in the row band so a mixed bumped/unbumped row reads as one row.
        y: rowTop + (rowHeight - size) / 2,
      });
    });

    rowTop += rowHeight + verticalMargin;
  }

  return { positions, packedHeight: Math.ceil(rowTop + verticalMargin) };
}

function getScreenLogicalDimensions() {
  return {
    w: Math.max(window.screen.width, window.screen.height),
    h: Math.min(window.screen.width, window.screen.height),
  };
}

/**
 * True when the primary monitor is a 1440px-tall panel at 100% scale.
 * QHD 2560×1440, ultrawide 3440×1440, etc.
 */
function is1440pDesktopMonitor100() {
  const { w, h } = getScreenLogicalDimensions();
  return h >= 1380 && h <= 1500 && w >= 2480;
}

/**
 * True when the primary monitor is a QHD panel at ~125% Windows scale.
 * Standard: 2048×1152. Fractional scale (e.g. dpr 1.375): ~1862×1048.
 */
function is1440pDesktopMonitor125() {
  const { w, h } = getScreenLogicalDimensions();
  if (h >= 1100 && h <= 1200 && w >= 2000) {
    return true;
  }
  if (w >= 1840 && w <= 1890 && h >= 1035 && h <= 1065) {
    return true;
  }
  return false;
}

function is1440pDesktopMonitor() {
  return is1440pDesktopMonitor100() || is1440pDesktopMonitor125();
}

/**
 * Viewport fallback for 1440p @ 100% when screen.* reports the wrong monitor.
 */
function is1440pTallViewport(viewportWidth, viewportHeight) {
  if (is1440pDesktopMonitor125()) {
    return false;
  }
  return viewportWidth >= 1900 && viewportHeight >= 1100 && viewportHeight <= 1450;
}

/**
 * True when the primary monitor is a 1080p panel at 150% Windows scale (~1280×720).
 */
function is1080pDesktopMonitor150() {
  if (is1440pDesktopMonitor()) {
    return false;
  }
  const { w, h } = getScreenLogicalDimensions();
  return w >= 1260 && w <= 1300 && h >= 680 && h <= 760;
}

/**
 * True when the primary monitor is a 1080p desktop panel @ 100–125% scale.
 * Uses screen.* (not innerWidth) so Windows/macOS display scaling still matches.
 */
function is1080pDesktopMonitor() {
  if (is1440pDesktopMonitor() || is1080pDesktopMonitor150()) {
    return false;
  }

  const { w, h } = getScreenLogicalDimensions();

  // 1366×768 laptops have their own tuned page size — do not treat as 1080p.
  if (w >= 1340 && w <= 1390 && h >= 740 && h <= 790) {
    return false;
  }

  if (w >= 1880 && w <= 1940 && h >= 1000 && h <= 1120) return true; // 100% scale
  if (w >= 1720 && w <= 1780 && h >= 960 && h <= 1020) return true;  // ~110% scale
  if (w >= 1520 && w <= 1560 && h >= 820 && h <= 900) return true;  // 125% scale
  return false;
}

/**
 * Page 1 is the bumped showcase; every later page walks one combined list of
 * (bumped overflow → unbumped) so a single offset can never drift.
 *
 * The previous math subtracted one page of bumped overflow from the page offset, which
 * only held while bumped ads fit on two pages. With small mobile page sizes bumped ads
 * span three or more pages, the offset went negative, and pages came back blank or with
 * the wrong slice — leaving bumped projects unreachable.
 */
function paginateBubbleMapAds(bumpedAds, nonBumpedAds, itemsPerPage, currentPage) {
  const perPage = Math.max(1, itemsPerPage);
  const page = Math.max(1, currentPage);

  // No bumped ads at all (e.g. liquidity enforcement cleared them): don't strand page 1 empty.
  if (bumpedAds.length === 0) {
    const start = (page - 1) * perPage;
    return {
      visibleAds: nonBumpedAds.slice(start, start + perPage),
      totalPages: Math.max(1, Math.ceil(nonBumpedAds.length / perPage))
    };
  }

  const overflowThenUnbumped = [...bumpedAds.slice(perPage), ...nonBumpedAds];
  const totalPages = 1 + Math.ceil(overflowThenUnbumped.length / perPage);

  if (page === 1) {
    return { visibleAds: bumpedAds.slice(0, perPage), totalPages };
  }

  const start = (page - 2) * perPage;
  return {
    visibleAds: overflowThenUnbumped.slice(start, start + perPage),
    totalPages
  };
}

/** How many bubbles fit per pagination page for this viewport / monitor. */
function calculateBubbleMapItemsPerPage(viewportWidth, viewportHeight) {
  if (is1440pDesktopMonitor125()) {
    return BUBBLE_MAP_ITEMS_PER_PAGE_1440P_125;
  }
  if (is1440pDesktopMonitor100() || is1440pTallViewport(viewportWidth, viewportHeight)) {
    return BUBBLE_MAP_ITEMS_PER_PAGE_1440P;
  }
  if (is1080pDesktopMonitor150()) {
    return BUBBLE_MAP_ITEMS_PER_PAGE_1080P_150;
  }
  if (is1080pDesktopMonitor()) {
    return BUBBLE_MAP_ITEMS_PER_PAGE_1080P;
  }

  if (viewportWidth === 2560 && viewportHeight === 1440) {
    return BUBBLE_MAP_ITEMS_PER_PAGE_1440P;
  }
  if (viewportWidth === 1366 && viewportHeight === 768) {
    return 58;
  }
  if (viewportWidth >= 400 && viewportWidth <= 420 && viewportHeight >= 900 && viewportHeight <= 930) {
    return 48;
  }
  if (viewportWidth <= 480) {
    return 40;
  }
  if (viewportWidth <= 768) {
    return 35;
  }
  if (viewportWidth >= 2400) {
    return BUBBLE_MAP_ITEMS_PER_PAGE_1440P;
  }
  if (viewportWidth >= 1440) {
    return 65;
  }
  if (viewportWidth >= 1200) {
    return 58;
  }
  return 58;
}

/**
 * Largest column count ≤ maxPrefer whose row fits at minimum bubble diameter.
 * Actual bumped/unbumped sizes clamp into each lane via getMobileBubbleMapDisplaySize — column count must not use the pre-clamp bumped diameter or we never reach 4-up on typical phones (~103px discs).
 */
function mobileBubbleMapMaxFeasibleColumns(
  innerUsablePx,
  gapPx,
  maxPrefer = MOBILE_BUBBLEMAP_SIZING_COLUMNS,
  minBubblePx = MIN_SIZE
) {
  const g = Math.max(0, gapPx);
  const b = Math.max(MIN_SIZE, minBubblePx);
  if (innerUsablePx <= 0) return 1;
  let cMax = Math.min(maxPrefer, MOBILE_BUBBLEMAP_MAX_COLUMNS);
  for (let c = cMax; c >= 1; c -= 1) {
    const packed = c * b + Math.max(0, c - 1) * g;
    if (packed <= innerUsablePx + 1) return c;
  }
  return 1;
}

/**
 * Lane count + usable inner width used to derive disc diameters (not the packed row length).
 */
function resolveMobileBubbleMapColumns(viewportWidth, _maxDimGuessPx) {
  if (viewportWidth > 480) {
    return { columns: 5, usableWidth: Math.max(0, viewportWidth - BUBBLE_PADDING * 2) };
  }
  const uw = Math.max(0, viewportWidth - MOBILE_BUBBLEMAP_GRID_MARGIN_H * 2);
  const cols = mobileBubbleMapMaxFeasibleColumns(
    uw,
    MOBILE_BUBBLEMAP_INTER_COLUMN_GAP_PX,
    MOBILE_BUBBLEMAP_SIZING_COLUMNS
  );
  return { columns: cols, usableWidth: uw };
}

/** Stable bumped diameter so column count ≠ bubble size — prevents “fewer cols = giant gutters” while keeping bumped ~same scale. Logical `ad.size` unchanged elsewhere. */
function mobileBumpedMapDiameterPx(ad) {
  const softCap = Math.round(getResponsiveSize(BASE_MAX_SIZE * 1.62));
  const base = Math.max(
    Math.round(ad.size * 1.085),
    Math.round(getMaxSize() * 1.56),
    MIN_SIZE + 16
  );
  return Math.min(softCap, base);
}

/** Mobile bubble-map render pixels. Unbumped still scales with columns; bumped uses mobileBumpedMapDiameterPx (viewport-stable). Logical `ad.size` unchanged elsewhere. */
function getMobileBubbleMapDisplaySize(ad, viewportWidth) {
  if (!ad) return MIN_SIZE;
  if (viewportWidth > 480) return ad.size;

  const G = MOBILE_BUBBLEMAP_INTER_COLUMN_GAP_PX;

  if (ad.isBumped) {
    const raw = mobileBumpedMapDiameterPx(ad);
    const { columns, usableWidth } = resolveMobileBubbleMapColumns(viewportWidth, raw);
    const uniformSpan =
      columns > 0
        ? (usableWidth - Math.max(0, columns - 1) * G) / columns
        : usableWidth;
    /** Tight fit into lane — only 1px inset so bumped discs use almost full uniform span when 4-up. */
    const laneCeil = Math.max(MIN_SIZE, Math.floor(uniformSpan - 1));
    return Math.min(raw, laneCeil);
  }

  const colGuessDiameter = Math.max(
    MIN_SIZE,
    Math.round(getMaxSize() * 1.42)
  );
  const { columns: cols, usableWidth: usable } = resolveMobileBubbleMapColumns(
    viewportWidth,
    colGuessDiameter
  );
  const uniformSpan =
    cols > 0 ? (usable - Math.max(0, cols - 1) * G) / cols : usable;
  const fillTarget = Math.max(MIN_SIZE, Math.floor(uniformSpan * 0.92));
  const laneCap = Math.max(MIN_SIZE, Math.floor(uniformSpan - 1));

  return Math.min(
    laneCap,
    Math.min(
      Math.max(ad.size, Math.round(uniformSpan * 0.65)),
      Math.floor(fillTarget * 0.9)
    )
  );
}

/**
 * Rendered footprint of one mobile bubble slot, measured from the DOM.
 *
 * `.bubble` is CSS-scaled (index.css, ≤480px) so the disc paints far smaller than its
 * container box, while the vote strip is wider than the disc and overhangs it upward.
 * Packing against the container box therefore leaves large gaps on every side; packing
 * against these measured rects removes them without resizing anything.
 */
function measureMobileBubbleFootprint(containerEl) {
  if (!containerEl) return null;
  const disc = containerEl.querySelector('.bubble');
  if (!disc) return null;

  const containerRect = containerEl.getBoundingClientRect();
  const discRect = disc.getBoundingClientRect();
  if (!containerRect.width || !discRect.width) return null;

  const strip = containerEl.querySelector('.vote-popup');
  const stripRect = strip ? strip.getBoundingClientRect() : discRect;

  return {
    lane: Math.max(discRect.width, stripRect.width),
    minGap: MOBILE_BUBBLEMAP_MIN_LANE_GAP_PX,
    topOverhang: Math.max(0, containerRect.top - Math.min(discRect.top, stripRect.top)),
    bottomExtent: Math.max(discRect.bottom, stripRect.bottom) - containerRect.top,
  };
}

/**
 * Same footprint as measureMobileBubbleFootprint, derived from the CSS constants instead of
 * the DOM so the render path can use it with no measurement pass.
 *
 * A 99px container paints a 59px disc under a 68px vote strip, so packing container boxes
 * wasted ~30px of every lane. Lanes are the painted width; container boxes may overlap
 * their neighbours (nothing drawn or clickable lives in that overflow).
 */
function mobileBubblePaintedFootprint(containerPx) {
  const box = Math.max(1, containerPx);
  const center = box / 2;
  const discHalf = (box * MOBILE_BUBBLE_PAINT_SCALE) / 2;
  const stripTop =
    center + (MOBILE_VOTE_STRIP_TOP_OFFSET_PX - center) * MOBILE_BUBBLE_PAINT_SCALE;

  return {
    lane: Math.max(box * MOBILE_BUBBLE_PAINT_SCALE, MOBILE_VOTE_STRIP_LAYOUT_WIDTH_PX * MOBILE_BUBBLE_PAINT_SCALE),
    minGap: MOBILE_BUBBLEMAP_INTER_COLUMN_GAP_PX,
    /** Container top → painted top. Negative: the vote strip paints above the box. */
    paintedTop: Math.min(center - discHalf, stripTop),
    bottomExtent: center + discHalf,
  };
}

/**
 * Mobile grid positions from visible sort order — same packing rules as adjustBubblesForMobile()
 * but without a DOM measurement pass (instant on render, like computeDesktopGridLayout).
 */
function computeMobileGridLayout(visibleAds, screenWidth) {
  if (!Array.isArray(visibleAds) || visibleAds.length === 0 || screenWidth > 480) {
    return { positions: [], packedHeight: 0 };
  }

  const horizontalMargin = MOBILE_BUBBLEMAP_GRID_MARGIN_H;
  const usableWidth = Math.max(0, screenWidth - horizontalMargin * 2);

  const sizesPx = visibleAds.map((ad) => getMobileBubbleMapDisplaySize(ad, screenWidth));
  const isBumpedFlags = visibleAds.map((ad) => !!ad.isBumped);

  const bumpedSizes = sizesPx.filter((_, i) => isBumpedFlags[i]);
  const unbumpedSizes = sizesPx.filter((_, i) => !isBumpedFlags[i]);
  const maxBumpedDim = bumpedSizes.length ? Math.max(MIN_SIZE, ...bumpedSizes) : MIN_SIZE;
  const maxUnbumpedDim = unbumpedSizes.length ? Math.max(MIN_SIZE, ...unbumpedSizes) : MIN_SIZE;

  const bumpedFootprint = mobileBubblePaintedFootprint(maxBumpedDim);
  const unbumpedFootprint = mobileBubblePaintedFootprint(maxUnbumpedDim);
  const footprintFor = (isBumped) => (isBumped ? bumpedFootprint : unbumpedFootprint);

  const positions = [];
  /** Top of the current row's painted band (not of its container box). */
  let rowPaintedTop = TOP_PADDING;
  let lastPaintedBottom = TOP_PADDING;
  let idx = 0;

  while (idx < visibleAds.length) {
    const rowIsBumped = isBumpedFlags[idx];
    const footprint = footprintFor(rowIsBumped);
    const laneDim = Math.max(1, footprint.lane);
    const minGap = footprint.minGap;

    const rowColumns = Math.max(
      1,
      Math.min(
        MOBILE_BUBBLEMAP_PREFERRED_COLUMNS,
        MOBILE_BUBBLEMAP_MAX_COLUMNS,
        Math.floor((usableWidth + minGap) / (laneDim + minGap))
      )
    );
    const laneGap =
      rowColumns > 1
        ? Math.min(
            MOBILE_BUBBLEMAP_MAX_LANE_GAP_PX,
            Math.max(minGap, (usableWidth - rowColumns * laneDim) / (rowColumns - 1))
          )
        : 0;
    const rowStride = laneDim + laneGap;

    const remaining = visibleAds.length - idx;
    const rowBubbleCount = Math.min(rowColumns, remaining);

    const rowPackedWidth =
      rowBubbleCount * laneDim + Math.max(0, rowBubbleCount - 1) * laneGap;
    const rowClusterStart =
      horizontalMargin + Math.max(0, (usableWidth - rowPackedWidth) / 2);

    for (let col = 0; col < rowBubbleCount; col += 1) {
      const index = idx + col;
      const bubbleW = sizesPx[index] ?? laneDim;

      const laneLeft = Math.max(
        0,
        Math.min(rowClusterStart + col * rowStride, screenWidth - laneDim)
      );
      // Centre the container on its lane: the box is wider than the lane, so it overhangs
      // into the neighbouring lanes while the drawn disc/strip stays inside.
      const x = laneLeft + (laneDim - bubbleW) / 2;
      const y = rowPaintedTop - footprint.paintedTop;

      positions.push({ x, y });
    }

    idx += rowBubbleCount;
    lastPaintedBottom = rowPaintedTop + (footprint.bottomExtent - footprint.paintedTop);
    rowPaintedTop = lastPaintedBottom + MOBILE_BUBBLEMAP_ROW_CLEARANCE_PX;
  }

  const packedHeight = Math.ceil(lastPaintedBottom + MOBILE_BUBBLEMAP_BOTTOM_PADDING_PX);
  return { positions, packedHeight };
}
const MERCHANT_WALLET = {
    SOL: "J8ewxZwntodH8sT8LAXN5j6sAsDhtCh8sQA6GwRuLTSv",
    ETH: "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05",
    BTC: "bc1qdh9ar2elv6cvhfqccvlf8w6rwy0r592f9a6dyt",
    BASE: "0x98BC1BEC892d9f74B606D478E6b45089D2faAB05"
}; // Replace with your wallet address
const ADMIN_USERNAME = "admin"; // You can change this to your preferred admin username

// Helper functions for responsive positioning
function calculateSafePosition(size, windowWidth, windowHeight, existingAds) {
  // Center of the available space (excluding banner)
  const centerX = windowWidth / 2;
  const centerY = (windowHeight - TOP_PADDING) / 1 + TOP_PADDING;
  
  // If this is the first bubble, place it directly in the center of available space
  if (existingAds.length === 0) {
    return {
      x: centerX - size/2,
      y: centerY - size/2
    };
  }
  
  // Reduced spacing between bubbles for tighter packing
  const bubbleSpacing = 0.50;
  
  // ALWAYS use grid for consistent spacing across all screen sizes
  const useGridApproach = true;
  
  if (useGridApproach) {
    // FIXED PIXEL GRID - critical for consistent spacing across all screen sizes!
    // 115px = perfect tight spacing with 100px bubbles (~15px edge gap)
    const cellSize = 115;
    const gridColumns = Math.floor((windowWidth - 2 * BUBBLE_PADDING) / cellSize);
    const gridRows = Math.floor((windowHeight - TOP_PADDING - BUBBLE_PADDING) / cellSize);
    
    const grid = Array(gridRows).fill().map(() => Array(gridColumns).fill(false));
    
    existingAds.forEach(ad => {
      const col = Math.floor((ad.x - BUBBLE_PADDING) / cellSize);
      const row = Math.floor((ad.y - TOP_PADDING) / cellSize);
      
      if (col >= 0 && col < gridColumns && row >= 0 && row < gridRows) {
        grid[row][col] = true;
        
        for (let r = Math.max(0, row-1); r <= Math.min(gridRows-1, row+1); r++) {
          for (let c = Math.max(0, col-1); c <= Math.min(gridColumns-1, col+1); c++) {
            if (Math.sqrt(Math.pow(r-row, 2) + Math.pow(c-col, 2)) <= 1) {
              grid[r][c] = true;
            }
          }
        }
      }
    });
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        if (!grid[row][col]) {
          const x = BUBBLE_PADDING + col * cellSize;
          const y = TOP_PADDING + row * cellSize;
          
          let hasOverlap = false;
          for (const ad of existingAds) {
            const distance = calculateDistance(
              x + size/2, 
              y + size/2, 
              ad.x + ad.size/2, 
              ad.y + ad.size/2
            );
            
            const minDistance = ((size + ad.size) / 2) * bubbleSpacing;
            
            if (distance < minDistance) {
              hasOverlap = true;
              break;
            }
          }
          
          if (!hasOverlap) {
            return { x, y };
          }
        }
      }
    }
  }
  
  // REMOVED: Spiral fallback code - was causing screen-size-dependent spacing
  // Grid approach handles all cases with fixed 115px spacing
  
  // If grid is full, return center position as last resort
  return {
    x: centerX - size/2,
    y: centerY - size/2
  };
}

function ensureInViewport(x, y, size, windowWidth, windowHeight, existingAds, currentAdId) {
  const minX = BUBBLE_PADDING;
  const maxX = windowWidth - size - BUBBLE_PADDING;
  const minY = TOP_PADDING;
  const maxY = windowHeight - size - BUBBLE_PADDING;

  // Grid already handles perfect spacing - just clamp to viewport bounds
  // Removed 25-iteration push-apart loop that was causing inconsistent spacing
  let newX = Math.min(Math.max(x, minX), maxX);
  let newY = Math.min(Math.max(y, minY), maxY);

  return { x: newX, y: newY };
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Add Auth Context near the top of the file - outside the App component
const AuthContext = React.createContext();

// Create a custom NavigationListener component to track navigation events
const NavigationListener = ({ onNavigate }) => {
  const location = useLocation();
  const prevLocationRef = useRef(location);
  
  useEffect(() => {
    if (location.pathname !== prevLocationRef.current.pathname) {
      onNavigate();
      prevLocationRef.current = location;
      // Layout is handled by HomeLayoutHandler for /home navigation
    }
  }, [location, onNavigate]);
  
  return null;
};

// Ref to hold React Router navigate function for use outside Router children
const navigateRef = { current: null };

const NavigateHelper = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  return null;
};

// Handle URL parameters for opening profile modal with specific tab
const ProfileTabHandler = ({ currentUser, setShowProfileModal, setProfileModalInitialTab }) => {
  const location = useLocation();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab === 'onchain') {
      if (currentUser && currentUser.userType === 'freelancer') {
        // User is logged in as freelancer, open profile modal immediately
        setProfileModalInitialTab('onchain');
        setShowProfileModal(true);
        // Clean up URL by removing the tab parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        // User not logged in or not a freelancer, store the tab to open after login
        localStorage.setItem('aquads_pending_profile_tab', 'onchain');
        // Clean up URL by removing the tab parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [location.search, currentUser, setShowProfileModal, setProfileModalInitialTab]);
  
  return null;
};

// Handle URL parameters for opening dashboard with specific tab
const DashboardTabHandler = ({ currentUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const openDashboardTab = searchParams.get('openDashboard');
    
    if (openDashboardTab) {
      if (currentUser) {
        window.history.replaceState({}, '', window.location.pathname);
        navigate(`/dashboard/${openDashboardTab}`, { replace: true });
      } else {
        localStorage.setItem('aquads_pending_dashboard_tab', openDashboardTab);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [location.search, currentUser, navigate]);
  
  return null;
};

// Open login / create-account / list-project modals from URL.
// Supported params: ?showLogin=true, ?showCreateAccount=true, ?openListProject=true
// Runs on every search change so SPA links from the landing page work (not only full page load).
// `openListProject=true` is auth-aware: logged-in users see the List Project modal,
// guests are routed into the sign-up modal first so they can never trigger a paid flow without an account.
const AuthModalQueryHandler = ({ setShowLoginModal, setShowCreateAccountModal, setShowCreateModal, currentUser }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode && !sessionStorage.getItem('pendingReferralCode')) {
      sessionStorage.setItem('pendingReferralCode', refCode);
    }

    let shouldReplace = false;
    if (params.get('showCreateAccount') === 'true') {
      setShowCreateAccountModal(true);
      params.delete('showCreateAccount');
      shouldReplace = true;
    }
    if (params.get('showLogin') === 'true') {
      setShowLoginModal(true);
      params.delete('showLogin');
      shouldReplace = true;
    }
    if (params.get('openListProject') === 'true') {
      if (currentUser) {
        setShowCreateModal(true);
      } else {
        setShowCreateAccountModal(true);
      }
      params.delete('openListProject');
      shouldReplace = true;
    }
    if (shouldReplace) {
      const next = params.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
    }
  }, [location.pathname, location.search, navigate, setShowLoginModal, setShowCreateAccountModal, setShowCreateModal, currentUser]);

  return null;
};

// Component to handle bubble layout when navigating to home page from landing page
const HomeLayoutHandler = ({ arrangeDesktopGrid, adjustBubblesForMobile }) => {
  const location = useLocation();
  const previousPath = useRef(null);

  useEffect(() => {
    const isNavigatingToHome =
      location.pathname === '/home' &&
      previousPath.current !== null &&
      previousPath.current !== '/home';

    if (isNavigatingToHome) {
      window.isArrangingDesktopGrid = false;
      // Desktop + mobile grid positions are computed at render from vote sort — no delayed re-grid.
      previousPath.current = location.pathname;
      return;
    }

    const isFromLanding =
      location.pathname === '/home' &&
      (previousPath.current === '/' || previousPath.current === null);

    if (isFromLanding && location.pathname === '/home') {
      window.isArrangingDesktopGrid = false;
      // Grid positions computed at render; landing only needs smooth transition flag if desired.
      previousPath.current = location.pathname;
      return;
    }

    previousPath.current = location.pathname;
  }, [location.pathname, arrangeDesktopGrid, adjustBubblesForMobile]);

  return null;
};

/** Routes that render the bubble map or pass `ads` into page components — skip fetch on `/` and other marketing pages. */
function routeNeedsAdsFetch(pathname) {
  if (pathname === '/home') return true;
  if (pathname.startsWith('/dashboard')) return true;
  if (pathname === '/games') return true;
  if (pathname === '/list-token-free') return true;
  if (pathname === '/swap' || pathname === '/aquaswap' || pathname === '/share/aquaswap') return true;
  if (pathname.startsWith('/share/blog/')) return true;
  if (pathname === '/learn') return true;
  if (pathname.startsWith('/learn/') && !pathname.startsWith('/learn/courses')) return true;
  return false;
}

const AdsFetchOnRoute = ({ loadAdsFromApi }) => {
  const location = useLocation();
  const apiFetchedRef = useRef(false);

  useEffect(() => {
    if (!routeNeedsAdsFetch(location.pathname)) return;
    // Always refetch once per session when the bubble map is needed — even if localStorage
    // hydrated ads (hasLoadedAds used to skip fetch, leaving stale isBumped stuck forever).
    if (apiFetchedRef.current) return;
    apiFetchedRef.current = true;
    loadAdsFromApi();
  }, [location.pathname, loadAdsFromApi]);

  return null;
};

const TokensFetchOnRoute = ({ loadTokensFromApi, hasLoadedTokens }) => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/home') return;
    if (!hasLoadedTokens) {
      loadTokensFromApi();
      return;
    }
    // Stale in-memory list: refresh quietly when user returns to home (same cadence as server sync).
    if (getTokensCacheAgeMs() >= TOKENS_CACHE_STALE_MS) {
      loadTokensFromApi({ background: true });
    }
  }, [location.pathname, loadTokensFromApi, hasLoadedTokens]);

  return null;
};

/** Link-in-bio fields that must not be overwritten by a stale /verify-token during/after save */
const LINK_IN_BIO_STATE_KEYS = [
  'bioLinks',
  'linkInBioTagline',
  'linkInBioAccentColor',
  'linkInBioButtonColor',
  'linkInBioButtonShape',
  'linkInBioButtonFill',
  'linkInBioButtonTranslucent',
  'linkInBioButtonStyle',
  'linkInBioBackgroundImageUrl',
  'linkInBioBackgroundColor',
  'linkInBioTextColor',
  'linkInBioAdsEnabled',
  'linkInBioAdPricing'
];

function pickLinkInBioState(user) {
  if (!user || typeof user !== 'object') return {};
  const out = {};
  for (const key of LINK_IN_BIO_STATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(user, key) && user[key] !== undefined) {
      out[key] = user[key];
    }
  }
  return out;
}

/** Bubble rim title — full text, no truncation. */
function formatBubbleMapTitle(title) {
  return String(title || '').toUpperCase();
}

function App() {
  const [ads, setAds] = useState(() => {
    const cached = readAdsCache();
    if (cached.length > 0) {
      return cached.map((ad) => ({
        ...ad,
        bullishVotes: ad.bullishVotes || 0,
        bearishVotes: ad.bearishVotes || 0,
      }));
    }
    return [];
  });
  const adsRef = useRef(ads);

  const [tokenList, setTokenList] = useState(() => readTokensCache());
  const tokenListRef = useRef(tokenList);
  const [tokenGlobalStats, setTokenGlobalStats] = useState(() => readGlobalStatsCache());
  const [tokensLoading, setTokensLoading] = useState(() => readTokensCache().length === 0);
  const [tokensError, setTokensError] = useState(null);
  const [tokensSocketConnected, setTokensSocketConnected] = useState(false);
  const isFetchingTokensRef = useRef(false);
  const tokenDetailsRefreshPausedRef = useRef(false);
  /** If socket updates land mid-fetch, do not let a stale HTTP response overwrite them. */
  const lastTokensSocketAtRef = useRef(0);
  const tokensFetchStartedAtRef = useRef(0);
  
  // Detect iOS for better touch handling
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      document.documentElement.classList.add('ios');
    }
  }, []);
  
  /** Skip background verify briefly after login so it cannot merge the previous account. */
  const skipValidateUntilRef = useRef(0);

  const beginLoggedInSession = useCallback((user) => {
    const t0 = performance.now();
    const normalized = normalizeAquadsUser(user);
    skipperDebugLog('login session begin', {
      username: normalized?.username,
      userId: normalized?.userId,
      authGeneration: getAuthSessionGeneration()
    });
    commitAuthSession(normalized);
    resetSkipperClientSession();
    skipValidateUntilRef.current = Date.now() + 8000;
    skipNextValidationRef.current = true;
    if (
      window.location.pathname.startsWith('/project-agent') &&
      navigateRef.current
    ) {
      navigateRef.current('/', { replace: true });
    }
    setCurrentUser(normalized);
    warmSkipperSessionForUser(normalized);
    skipperDebugLog('login session committed', {
      ms: Math.round(performance.now() - t0),
      username: normalized?.username
    });
  }, []);

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        return user; // Return user immediately for initial state
      } catch (error) {
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  });

  // Do NOT mirror every currentUser change → localStorage (that overwrote a fresh
  // login with the previous account still in React until the next render).

  // When true, the next validateToken cycle is skipped because we just
  // received fresh data from the server (login/register). This prevents
  // an unnecessary verify → setCurrentUser → 7 effects cascade.
  const skipNextValidationRef = useRef(false);

  // Latest session user for async validateToken (avoids stale closures).
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Until this timestamp, apply verify-token but keep link-in-bio fields from React state
  // so a slow/stale GET cannot clobber an in-flight or just-applied PATCH.
  const linkInBioProtectUntilRef = useRef(0);

  // Tracks the latest token so async callbacks (NavigationListener, etc.)
  // can detect if the user changed before they apply stale results.
  const currentTokenRef = useRef(currentUser?.token);
  useEffect(() => {
    currentTokenRef.current = currentUser?.token ?? null;
  }, [currentUser]);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adToEdit, setAdToEdit] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showBumpReminderModal, setShowBumpReminderModal] = useState(false);
  const [unbumpedAd, setUnbumpedAd] = useState(null);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState('profile');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [skipperProjectOnboarding, setSkipperProjectOnboarding] = useState(false);
  const skipperOnboardingTimerRef = useRef(null);
  const [newUsername, setNewUsername] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // New state for blockchain filter and pagination
  const [blockchainFilter, setBlockchainFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() =>
    calculateBubbleMapItemsPerPage(window.innerWidth, window.innerHeight)
  );
  const [totalPages, setTotalPages] = useState(1);
  const [votePopup, setVotePopup] = useState(null);
  const [partnershipPopup, setPartnershipPopup] = useState(null);
  const [votingAdId, setVotingAdId] = useState(null); // Track which ad is currently being voted on
  const recentVoteUpdatesRef = useRef({});
  const RECENT_VOTE_TTL_MS = 2 * 60 * 1000;

  const mergeRecentVoteFields = useCallback((ad) => {
    const recent = recentVoteUpdatesRef.current[ad.id];
    if (!recent || Date.now() - recent.ts > RECENT_VOTE_TTL_MS) return ad;

    // Server may clear bump (liquidity gate) after a vote socket said bumped —
    // do not let the short vote TTL resurrect isBumped over a fresh API false.
    const serverClearedBump =
      ad.isBumped === false &&
      recent.isBumped === true &&
      (ad.meetsLiquidityRequirement === false ||
        (ad.liquidityCheckedAt &&
          new Date(ad.liquidityCheckedAt).getTime() > recent.ts) ||
        // Dex-feed payloads omit liquidity fields; 100+ votes on both sides + API not bumped = liq gate
        ((ad.bullishVotes || 0) >= 100 && (recent.bullishVotes || 0) >= 100));

    return {
      ...ad,
      bullishVotes: recent.bullishVotes,
      bearishVotes: recent.bearishVotes,
      ...(!serverClearedBump && recent.isBumped !== undefined && { isBumped: recent.isBumped }),
      ...(!serverClearedBump && recent.size !== undefined && { size: recent.size }),
      ...(recent.userVote !== undefined && { userVote: recent.userVote }),
    };
  }, []);

  const applyVoteUpdateToAds = useCallback((adId, fields) => {
    recentVoteUpdatesRef.current[adId] = { ...fields, ts: Date.now() };
    setAds((prevAds) => {
      const newAds = prevAds.map((ad) => (ad.id === adId ? { ...ad, ...fields } : ad));
      persistAdsCache(newAds);
      return newAds;
    });
  }, []);

  useEffect(() => {
    adsRef.current = ads;
  }, [ads]);

  useEffect(() => {
    tokenListRef.current = tokenList;
  }, [tokenList]);

  // Initialize user presence tracking across all pages
  useUserPresence(currentUser);

  // Logged-in users who never verified must see the code modal on every session until verified.
  useEffect(() => {
    if (!currentUser?.email) return;
    if (currentUser.emailVerified === true) {
      setShowEmailVerificationModal(false);
      return;
    }
    if (currentUser.emailVerified === false) {
      setPendingVerificationEmail(currentUser.email);
      setShowEmailVerificationModal(true);
    }
  }, [currentUser?.userId, currentUser?.email, currentUser?.emailVerified]);
  
  /**
   * Bubbles per page from monitor + viewport (see calculateBubbleMapItemsPerPage).
   * 1080p @ 100–125% → 90; 1080p @ 150% → 48; 1440p @ 100% → 200; 1440p @ 125% → 96.
   */
  useEffect(() => {
    const syncItemsPerPage = () => {
      setItemsPerPage(
        calculateBubbleMapItemsPerPage(window.innerWidth, window.innerHeight)
      );
    };

    syncItemsPerPage();

    window.addEventListener('resize', syncItemsPerPage);
    window.visualViewport?.addEventListener('resize', syncItemsPerPage);

    return () => {
      window.removeEventListener('resize', syncItemsPerPage);
      window.visualViewport?.removeEventListener('resize', syncItemsPerPage);
    };
  }, [windowSize]);

  // Calculate total pages whenever ads or filter changes
  useEffect(() => {
    const filteredAds = blockchainFilter === 'all'
      ? ads
      : ads.filter((ad) => matchesBlockchainFilter(ad.blockchain, blockchainFilter));

    // Separate bumped and non-bumped ads to calculate pages
    const bumpedAds = filteredAds.filter(ad => ad.isBumped);
    const nonBumpedAds = filteredAds.filter(ad => !ad.isBumped);

    const { totalPages: pageCount } = paginateBubbleMapAds(
      bumpedAds,
      nonBumpedAds,
      itemsPerPage,
      currentPage
    );

    setTotalPages(Math.max(1, pageCount));

    // Reset to page 1 when filter changes
    if (currentPage > pageCount) {
      setCurrentPage(1);
    }
  }, [ads, blockchainFilter, itemsPerPage, currentPage]);

  // Function to get currently visible ads
  const getVisibleAds = () => {
    const filteredAds = blockchainFilter === 'all'
      ? ads
      : ads.filter((ad) => matchesBlockchainFilter(ad.blockchain, blockchainFilter));

    // First, sort ads to put bumped ads first, then sort by bullish votes
    const sortedAds = [...filteredAds].sort((a, b) => {
      // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
      if (a.isBumped && !b.isBumped) return -1;
      if (!a.isBumped && b.isBumped) return 1;
      
      // Then sort by bullish votes (highest first)
      return (b.bullishVotes || 0) - (a.bullishVotes || 0);
    });
    
    // Separate bumped and non-bumped ads
    const bumpedAds = sortedAds.filter(ad => ad.isBumped);
    const nonBumpedAds = sortedAds.filter(ad => !ad.isBumped);

    return paginateBubbleMapAds(bumpedAds, nonBumpedAds, itemsPerPage, currentPage)
      .visibleAds;
  };

  // Function to handle blockchain filter change
  const handleBlockchainFilterChange = (blockchain) => {
    setBlockchainFilter(blockchain);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Function to handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Desktop + mobile: grid positions come from render index — no DOM arrange pass.
  };

  // Add this function to update ads with persistence
  const updateAds = (newAds) => {
    setAds(newAds);
    persistAdsCache(newAds);
  };

  const isFirstAdsLoadRef = useRef(true);

  const loadAdsFromApi = useCallback(async () => {
    const showLoading = isFirstAdsLoadRef.current;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const filterAdsForViewer = (list) =>
      currentUser?.isAdmin
        ? list
        : list.filter((ad) => ad.status !== 'pending' && ad.status !== 'rejected');

    try {
      if (showLoading) {
        setIsLoading(true);
        setLoadingMessage(isMobile ? 'Connecting to server...' : 'Loading ads...');
      }

      const data = await fetchAds();
      if (!Array.isArray(data)) {
        throw new Error('Invalid ads response');
      }

      const processedAds = mergeIncomingAdsWithCurrent(
        data,
        adsRef.current,
        mergeRecentVoteFields
      );

      persistAdsCache(processedAds);

      const currentMaxSize = getMaxSize();

      const repositionedAds = processedAds.map((ad, index) => {
        let adWithMetadata = {
          ...ad,
          originalSize: ad.size,
          originalMaxSize: currentMaxSize,
          currentMaxSize: currentMaxSize,
        };

        if (ad.x === 0 || ad.y === 0 || ad.y < TOP_PADDING) {
          logger.log('Fixing ad with invalid coordinates:', ad.id);

          let position;
          if (index > 0) {
            const baseX = windowSize.width / 2;
            const baseY = windowSize.height / 2;
            const angle = index * (Math.PI * 0.618033988749895);
            const radius = 50 + 20 * Math.sqrt(index);

            position = {
              x: baseX + Math.cos(angle) * radius - ad.size / 2,
              y: baseY + Math.sin(angle) * radius - ad.size / 2,
            };

            position = calculateSafePosition(
              ad.size,
              windowSize.width,
              windowSize.height,
              processedAds.filter((otherAd) => otherAd.id !== ad.id)
            );
          } else {
            position = calculateSafePosition(
              ad.size,
              windowSize.width,
              windowSize.height,
              processedAds.filter((otherAd) => otherAd.id !== ad.id)
            );
          }

          if (position.y < TOP_PADDING) {
            position.y = TOP_PADDING + 20;
          }

          adWithMetadata = { ...adWithMetadata, x: position.x, y: position.y };
        }

        return adWithMetadata;
      });

      setAds(filterAdsForViewer(repositionedAds));
    } catch (error) {
      logger.error('Error loading ads:', error);

      const cachedAds = readAdsCache();
      if (cachedAds.length > 0) {
        try {
          const parsedAds = mergeIncomingAdsWithCurrent(
            mergeAdVotesSnapshot(cachedAds).map((ad) => ({
              ...ad,
              bullishVotes: ad.bullishVotes || 0,
              bearishVotes: ad.bearishVotes || 0,
            })),
            adsRef.current,
            mergeRecentVoteFields
          );
          setAds(filterAdsForViewer(parsedAds));
        } catch (parseError) {
          logger.error('Error parsing cached ads:', parseError);
        }
      } else if (adsRef.current.length > 0) {
        // Keep live in-memory ads (e.g. socket vote updates) when fetch and cache both fail.
        setAds(filterAdsForViewer(adsRef.current));
      }

      if (showLoading && cachedAds.length === 0 && adsRef.current.length === 0) {
        const noticeId = Date.now();
        setNotifications((prev) => [
          ...prev,
          { id: noticeId, message: 'Connection issue. Using cached data.', type: 'warning' },
        ]);
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== noticeId));
        }, 3000);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
        setLoadingMessage('');
      }
      isFirstAdsLoadRef.current = false;
    }
  }, [currentUser?.userId, currentUser?.isAdmin, mergeRecentVoteFields]);

  const loadTokensFromApi = useCallback(async (options = {}) => {
    const background = options.background === true;
    if (isFetchingTokensRef.current) return;
    if (background && tokenDetailsRefreshPausedRef.current) return;

    const hasTokens = tokenListRef.current.length > 0;

    try {
      if (!background) {
        setTokensLoading(!hasTokens);
      }
      isFetchingTokensRef.current = true;
      tokensFetchStartedAtRef.current = Date.now();

      const [tokensResponse, statsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tokens`),
        fetch(`${BACKEND_URL}/api/tokens/global/stats`),
      ]);

      if (!tokensResponse.ok) {
        throw new Error(`Failed to fetch tokens: ${tokensResponse.status}`);
      }

      const data = await tokensResponse.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid tokens response format');
      }

      // Socket sync can finish while this request was in-flight — prefer the live push.
      if (lastTokensSocketAtRef.current <= tokensFetchStartedAtRef.current) {
        setTokenList(data);
        persistTokensCache(data);
        setTokensError(null);
      }

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setTokenGlobalStats(stats);
        persistGlobalStatsCache(stats);
      }
    } catch (error) {
      logger.error('Error loading tokens:', error);
      if (tokenListRef.current.length === 0 && !background) {
        setTokensError('Failed to load tokens. Please try again in a few minutes.');
      }
    } finally {
      isFetchingTokensRef.current = false;
      if (!background) {
        setTokensLoading(false);
      }
    }
  }, []);

  const handleTokenDetailsOpenChange = useCallback((open) => {
    tokenDetailsRefreshPausedRef.current = !!open;
  }, []);

  // Update socket connection handling
  useEffect(() => {
    // Replace the current socket event listeners with a single 'adsUpdated' listener
    socket.on('adsUpdated', (data) => {
      logger.log('Received adsUpdated event:', data);
      
      if (data.type === 'update') {
        setAds(prevAds => {
          const existingAdIndex = prevAds.findIndex(ad => ad.id === data.ad.id);
          
          // If ad exists in the list, update it
          if (existingAdIndex !== -1) {
            const oldAd = prevAds[existingAdIndex];
            let updatedAd = {...oldAd, ...data.ad};
            // Race-condition guard: prefer verified so approval is never overwritten by stale data
            const oldVerif = oldAd?.projectProfile?.verification?.status;
            const newVerif = data.ad?.projectProfile?.verification?.status;
            if (oldVerif === 'verified' && newVerif === 'pending_review') {
              updatedAd = {
                ...updatedAd,
                projectProfile: {
                  ...updatedAd.projectProfile,
                  verification: oldAd.projectProfile.verification
                }
              };
            } else if (newVerif === 'verified' && data.ad?.projectProfile?.verification) {
              updatedAd = {
                ...updatedAd,
                projectProfile: {
                  ...updatedAd.projectProfile,
                  verification: data.ad.projectProfile.verification
                }
              };
            }
            
            // Check if this is a banner ad that was just approved (status changed from pending to active)
            if (oldAd.status === 'pending' && updatedAd.status === 'active' && currentUser && updatedAd.owner === currentUser.username) {
              showNotification('Your banner ad has been approved and is now active!', 'success');
            }
            
            // If updated ad is now pending/rejected and user is not admin, remove it
            if (!currentUser?.isAdmin && (updatedAd.status === 'pending' || updatedAd.status === 'rejected')) {
              const newAds = prevAds.filter(ad => ad.id !== data.ad.id);
              persistAdsCache(newAds);
              return newAds;
            }
            
            // Otherwise, update the ad
            const newAds = prevAds.map(ad => 
              ad.id === data.ad.id ? updatedAd : ad
            );
            persistAdsCache(newAds);
            return newAds;
          } else {
            // Ad doesn't exist in list - check if we should add it (if it's active/approved)
            if (currentUser?.isAdmin || (data.ad.status !== 'pending' && data.ad.status !== 'rejected')) {
              const newAds = [...prevAds, data.ad];
              persistAdsCache(newAds);
              return newAds;
            }
          }
          
          return prevAds;
        });
      } else if (data.type === 'delete') {
        setAds(prevAds => {
          const newAds = prevAds.filter(ad => ad.id !== data.ad.id);
          persistAdsCache(newAds);
          return newAds;
        });
      } else if (data.type === 'create') {
        setAds(prevAds => {
          // Add the new ad to the list if it doesn't already exist
          const exists = prevAds.some(ad => ad.id === data.ad.id);
          if (!exists) {
            // Filter out pending and rejected ads - only show active/approved ads (unless admin)
            // Admins can see all ads including pending ones
            if (currentUser?.isAdmin || (data.ad.status !== 'pending' && data.ad.status !== 'rejected')) {
              const newAds = [...prevAds, data.ad];
              persistAdsCache(newAds);
              return newAds;
            }
          }
          return prevAds;
        });
      }
    });
    
    // Keep these for backward compatibility if they're still being used elsewhere
    socket.on('adUpdated', (incomingAd) => {
      setAds(prevAds => {
        const oldAd = prevAds.find(ad => ad.id === incomingAd.id);
        if (!oldAd) return prevAds;
        // Race-condition guard: prefer verified so approval is never overwritten by stale data
        const oldVerif = oldAd?.projectProfile?.verification?.status;
        const newVerif = incomingAd?.projectProfile?.verification?.status;
        let finalAd = incomingAd;
        if (oldVerif === 'verified' && newVerif === 'pending_review') {
          finalAd = {
            ...incomingAd,
            projectProfile: {
              ...incomingAd.projectProfile,
              verification: oldAd.projectProfile.verification
            }
          };
        } else if (newVerif === 'verified' && incomingAd?.projectProfile?.verification) {
          finalAd = {
            ...incomingAd,
            projectProfile: {
              ...incomingAd.projectProfile,
              verification: incomingAd.projectProfile.verification
            }
          };
        }
        const newAds = prevAds.map(ad => ad.id === incomingAd.id ? finalAd : ad);
        persistAdsCache(newAds);
        return newAds;
      });
    });

    socket.on('adDeleted', (deletedAdId) => {
      setAds(prevAds => {
        const newAds = prevAds.filter(ad => ad.id !== deletedAdId);
        persistAdsCache(newAds);
        return newAds;
      });
    });

    socket.on('adCreated', (newAd) => {
      setAds(prevAds => {
        // Add the new ad to the list if it doesn't already exist
        const exists = prevAds.some(ad => ad.id === newAd.id);
        if (!exists) {
          const newAds = [...prevAds, newAd];
          persistAdsCache(newAds);
          return newAds;
        }
        return prevAds;
      });
    });

    return () => {
      socket.off('adsUpdated');
      socket.off('adUpdated');
      socket.off('adDeleted');
      socket.off('adCreated');
    };
  }, []);

  useEffect(() => {
    const handleTokenUpdate = (data) => {
      if (data.type === 'update' && Array.isArray(data.tokens)) {
        lastTokensSocketAtRef.current = Date.now();
        setTokenList(data.tokens);
        persistTokensCache(data.tokens);
        setTokensError(null);
      }
    };

    let fallbackInterval = null;

    const startFallback = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(() => {
        if (!document.hidden && !tokenDetailsRefreshPausedRef.current) {
          loadTokensFromApi({ background: true });
        }
      }, 60000);
    };

    const stopFallback = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    const onConnect = () => {
      setTokensSocketConnected(true);
      stopFallback();
    };

    const onDisconnect = () => {
      setTokensSocketConnected(false);
      startFallback();
    };

    socket.on('tokensUpdated', handleTokenUpdate);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setTokensSocketConnected(true);
    } else {
      startFallback();
    }

    return () => {
      socket.off('tokensUpdated', handleTokenUpdate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      stopFallback();
    };
  }, [loadTokensFromApi]);

  // Debug ads state changes
  useEffect(() => {
    logger.log('Ads state updated:', ads);
  }, [ads]);

  // Backend handles automatic ad shrinking every 15 seconds
  // WebSocket events will update the frontend in real-time
  // No need for frontend shrinking interval

  // Effect for updating window size
  useEffect(() => {
    const handleResize = () => {
      // Store current width to detect mobile/desktop transitions
      const wasMobile = window.innerWidth <= 480;
      
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });

      // Update bubble sizes when window size changes
      const newMaxSize = getMaxSize();
      setAds(prevAds => {
        const updatedAds = prevAds.map(ad => {
          // For bumped ads, always use the maximum size
          if (ad.isBumped) {
            return ad;
          }
          
          // For shrunk (non-bumped) ads, we need to maintain their proportional size
          // relative to the maximum size for the current screen
          if (ad.originalSize && ad.originalMaxSize) {
            // Calculate how much the ad has shrunk as a percentage of its original max size
            const shrinkPercentage = ad.size / ad.originalMaxSize;
            
            // Calculate the new size based on this percentage of the new max size
            const newSize = Math.max(MIN_SIZE, Math.round(newMaxSize * shrinkPercentage * 10) / 10);
            
            return {
              ...ad,
              size: newSize,
              currentMaxSize: newMaxSize // Track current max size for reference
            };
          } else {
            // First time resize - store original values
            return {
              ...ad,
              originalSize: ad.size,
              originalMaxSize: BASE_MAX_SIZE,
              currentMaxSize: newMaxSize
            };
          }
        });
        
        return updatedAds;
      });
      
      // If transitioning from mobile to desktop, restore original positions
      const isNowDesktop = window.innerWidth > 480;
      if (wasMobile && isNowDesktop) {
        // Desktop positions are computed at render — no DOM grid pass.
      }
      // Mobile positions are also computed at render when windowSize updates.
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When ads are loaded, store their original size and max size for the screen
  useEffect(() => {
    if (ads.length > 0) {
      const currentMaxSize = getMaxSize(); // Get max size for current screen
      
      setAds(prevAds => {
        return prevAds.map(ad => {
          if (!ad.originalSize) {
            return {
              ...ad,
              originalSize: ad.size, // Store original size when first loaded
              originalMaxSize: currentMaxSize, // Store the max size for when this ad was loaded
              currentMaxSize: currentMaxSize
            };
          }
          return ad;
        });
      });

      // Check for unbumped ad if user is already logged in
      if (currentUser) {
        checkForUnbumpedAd(currentUser);
      }
    }
  }, [ads.length, currentUser]);

  const showNotification = (message, type = 'info', adDetails = null) => {
    const id = Date.now();
    
    // Special handling for successful votes
    if (type === 'success' && message.includes('Voted') && adDetails) {
      setVotePopup({
        id,
        message,
        type,
        adDetails
      });
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setVotePopup(null);
      }, 3000);
    } else {
      // Regular notifications
      setNotifications(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    }
  };

  useEffect(() => {
    const reason = sessionStorage.getItem('aquads_session_expired');
    if (reason) {
      sessionStorage.removeItem('aquads_session_expired');
      showNotification('Your session expired. Please log in again.', 'info');
    }
  }, []);

  // Function to check if user has an unbumped ad and show reminder
  const checkForUnbumpedAd = (user) => {
    if (!user || !ads.length) return;
    
    // Find the user's ad
    const userAd = ads.find(ad => ad.owner === user.username);
    
    if (userAd) {
      const bullish = userAd.bullishVotes || 0;
      const voteBumped = bullish >= 100;
      if (!voteBumped) {
        setUnbumpedAd(userAd);
        setShowBumpReminderModal(true);
      }
    }
  };

  // Function to handle when user clicks "Bump Now" from the reminder modal
  const handleBumpFromReminder = () => {
    setShowBumpReminderModal(false);
    showNotification(
      'Bumps are free: reach 100 bullish votes on your bubble (organic votes and vote boosts both count). Share your listing so the community can vote!',
      'info'
    );
  };

  const handleLogin = async (credentials) => {
    try {
      const user = await loginUser(credentials);
      skipNextValidationRef.current = true;
      beginLoggedInSession(user);
      setShowLoginModal(false);
      showNotification('Successfully logged in!', 'success');
      setTimeout(() => {
        checkForUnbumpedAd(user);
      }, 1000);
    } catch (error) {
      logger.error('Login error:', error);
      
      // Handle email verification requirement
      if (error.emailVerificationRequired && error.email) {
        setShowLoginModal(false);
        setPendingVerificationEmail(error.email);
        setShowEmailVerificationModal(true);
        showNotification('Please verify your email to continue', 'info');
      } else {
        showNotification(error.message || 'Login failed', 'error');
      }
      throw error;
    }
  };

  const handleGoogleLogin = async (idToken) => {
    try {
      const user = await loginWithGoogle(idToken);
      skipNextValidationRef.current = true;
      beginLoggedInSession(user);
      setShowLoginModal(false);
      showNotification('Successfully signed in with Google!', 'success');
      setTimeout(() => {
        checkForUnbumpedAd(user);
      }, 1000);
    } catch (error) {
      logger.error('Google login error:', error);
      if (error.emailVerificationRequired && error.email) {
        setShowLoginModal(false);
        setPendingVerificationEmail(error.email);
        setShowEmailVerificationModal(true);
        showNotification('Please verify your email to continue', 'info');
      } else {
        showNotification(error.message || 'Google login failed', 'error');
      }
    }
  };

  const handleLogout = () => {
    // Clear React state FIRST so the UI immediately reflects the logged-out state
    // even if the page reload below is delayed (mobile bfcache, suspended navigation,
    // race with pending awaits, etc.). Without this, localStorage was empty but
    // React state still held currentUser, producing a "fake logged in" UI where
    // every API call fired with no Authorization header (server saw
    // "No authentication token provided") and the interceptor's `hadAuth` guard
    // silently swallowed the resulting 401s.
    resetSkipperClientSession();
    clearAuthSessionStorage();
    setCurrentUser(null);
    socket.auth = {};
    socket.disconnect();
    // Full page reload on the same URL (not /home) — clean state without yanking the user
    // off marketplace, dashboard, Skipper, etc.
    const stayUrl = `${window.location.pathname}${window.location.search}` || '/';
    window.location.replace(stayUrl);
  };

  // When JWT refresh fails or access expires without recovery, force a clean logout.
  // Show the "session expired" notification immediately (not only after reload via
  // sessionStorage flag) so the user always gets feedback even if the reload is
  // delayed or never happens.
  useEffect(() => {
    const onSessionExpired = () => {
      try {
        showNotification('Your session has expired. Please log in again.', 'info');
      } catch (_) {}
      handleLogout();
    };
    window.addEventListener('sessionExpired', onSessionExpired);
    return () => window.removeEventListener('sessionExpired', onSessionExpired);
  }, []);

    // Open MintFunnel platform in full-screen popup
  const openMintFunnelPlatform = () => {
    // Track the click on Paid Ads button
    trackClick('paid_ads_button', window.location.pathname);
    
    const popup = window.open(
      'https://app.mintfunnel.co?ref=KA3IIME5',
      'mintfunnel-platform',
      'width=' + window.screen.width + ',height=' + window.screen.height + ',scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no,directories=no'
    );

    if (!popup) {
      showNotification('Popup blocked! Please allow popups for this site and try again.', 'error');
    }
  };

  const handleWelcomeModalClose = useCallback(() => {
    setShowWelcomeModal(false);
    if (skipperOnboardingTimerRef.current) {
      clearTimeout(skipperOnboardingTimerRef.current);
      skipperOnboardingTimerRef.current = null;
    }
    if (currentUserRef.current?.userType !== 'project') return;
    if (currentUserRef.current?.emailVerified !== true) return;
    skipperOnboardingTimerRef.current = window.setTimeout(() => {
      setSkipperProjectOnboarding(true);
      skipperOnboardingTimerRef.current = null;
    }, SKIPPER_PROJECT_ONBOARDING_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (skipperOnboardingTimerRef.current) {
        clearTimeout(skipperOnboardingTimerRef.current);
      }
    };
  }, []);

  const handleCreateAccount = async (formData) => {
    try {
      const user = await apiRegister(formData);
      if (user) {
        setNewUsername(user.username);

        if (user.verificationRequired && !user.emailVerified) {
          if (user.verificationCode) {
            logger.log('Attempting to send verification email...');
            try {
              await emailService.sendVerificationEmail(
                user.email,
                user.username,
                user.verificationCode
              );
              logger.log('Verification email sent successfully');
            } catch (emailError) {
              logger.error('Failed to send verification email:', emailError);
              alert('Account created but failed to send verification email. Please try resending.');
            }
          }

          setPendingVerificationEmail(user.email);
          setShowEmailVerificationModal(true);
          setShowCreateAccountModal(false);
          return;
        }

        skipNextValidationRef.current = true;
        beginLoggedInSession(user);

        if (formData.email) {
          logger.log('Attempting to send welcome email...');
          try {
            await emailService.sendWelcomeEmail(
              formData.email,
              user.username,
              user.referralCode
            );
            logger.log('Welcome email sent successfully');
          } catch (emailError) {
            logger.error('Failed to send welcome email:', emailError);
          }
        }

        setShowWelcomeModal(true);
        setShowCreateAccountModal(false);
      }
    } catch (error) {
      logger.error('Error creating account:', error);
      alert(error.message || 'Failed to create account');
    }
  };

  const handleEmailVerificationComplete = async ({ message, user: verifiedUser }) => {
    alert(message);

    const welcomeTargetEmail = pendingVerificationEmail || verifiedUser?.email;

    if (verifiedUser) {
      skipNextValidationRef.current = true;
      const merged = normalizeAquadsUser({
        ...(currentUserRef.current || {}),
        ...verifiedUser,
        token: verifiedUser.token,
        refreshToken: verifiedUser.refreshToken ?? currentUserRef.current?.refreshToken
      });
      commitAuthSession(merged);
      resetSkipperClientSession();
      skipValidateUntilRef.current = Date.now() + 8000;
      skipNextValidationRef.current = true;
      setCurrentUser(merged);
      reconnectSocket();
      warmSkipperSessionForUser(merged);

      if (welcomeTargetEmail && merged?.username) {
        logger.log('Sending welcome email after verification...');
        try {
          await emailService.sendWelcomeEmail(
            welcomeTargetEmail,
            merged.username,
            merged.referralCode
          );
          logger.log('Welcome email sent successfully after verification');
        } catch (emailError) {
          logger.error('Failed to send welcome email after verification:', emailError);
        }
      }
    }

    setShowEmailVerificationModal(false);
    setPendingVerificationEmail('');
    if (verifiedUser) {
      setShowWelcomeModal(true);
    }
  };

  const handleCreateAd = async (adData) => {
    try {
      if (!currentUser) {
        showNotification('Please log in first!', 'error');
        setShowLoginModal(true);
        return;
      }

      // Removed the one ad per user limit - users can now create multiple ads

      // Calculate a safe position for the new ad
      const position = calculateSafePosition(getMaxSize(), windowSize.width, windowSize.height, ads);

      // Ensure position is valid and not at y=0
      if (position.y === 0 || position.y < TOP_PADDING) {
        // Force y to be at least below the top padding with some margin
        position.y = TOP_PADDING + (getMaxSize() / 2) + 20;
        
        // Make sure it doesn't overlap with other ads
        const otherAds = [...ads];
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
          let hasOverlap = false;
          
          for (const ad of otherAds) {
            const distance = calculateDistance(
              position.x + getMaxSize()/2,
              position.y + getMaxSize()/2,
              ad.x + ad.size/2,
              ad.y + ad.size/2
            );
            
            // Consider bubbles too close if they are less than 75% of their combined sizes apart
            const minDistance = ((getMaxSize() + ad.size) / 2) * 0.75;
            
            if (distance < minDistance) {
              hasOverlap = true;
              // Move position down a bit and try again
              position.y += 20;
              break;
            }
          }
          
          if (!hasOverlap) {
            break;
          }
          
          attempts++;
          
          // If we can't find a spot vertically, try changing x as well
          if (attempts > maxAttempts / 2) {
            position.x = BUBBLE_PADDING + Math.random() * (windowSize.width - 2 * BUBBLE_PADDING - getMaxSize());
          }
        }
      }

      // Create the new ad object with explicit x and y coordinates
      const newAd = {
        id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...adData,
        size: getMaxSize(),
        preferredSize: getMaxSize(),
        x: position.x,
        y: position.y,
        createdAt: new Date().toISOString(),
        isBumped: false,
        owner: currentUser.username
      };

      // Log the ad data being sent to the server, including position
      logger.log('Creating new ad with position:', { x: position.x, y: position.y });
      logger.log('Complete ad data:', newAd);
      
      const createdAd = await apiCreateAd(newAd);
      logger.log('Created ad:', createdAd);
      
      // Only add to UI if admin (active immediately) or if it has active status
      if (currentUser?.isAdmin || createdAd.status === 'active') {
        setAds(prevAds => [...prevAds, createdAd]);
      }
      
      setShowCreateModal(false);
      
      // Show partnership popup after successful submission for all users
      // Build share URL for social/OG metadata (same as Shill templates)
      const tokenUrl = (adData.pairAddress && adData.blockchain)
        ? `https://aquads.xyz/share/aquaswap?token=${encodeURIComponent(adData.pairAddress.trim())}&blockchain=${encodeURIComponent(adData.blockchain)}`
        : null;
      setPartnershipPopup({
        projectName: adData.title,
        projectId: createdAd.id,
        tokenChartUrl: tokenUrl
      });
      
      // Auto dismiss after 30 seconds
      setTimeout(() => {
        setPartnershipPopup(null);
      }, 30000);
      
      // Show different messages based on user role or ad status
      if (currentUser?.isAdmin || createdAd.status === 'active') {
        showNotification('Project Listed successfully!', 'success');
      } else {
        showNotification('Project submitted for listing! It will be visible once approved by admins.', 'success');
      }
    } catch (error) {
      logger.error('Error creating ad:', error);
      
      // Handle email verification requirement
      if (error.emailVerificationRequired) {
        setShowCreateModal(false);
        if (currentUser?.email) {
          setPendingVerificationEmail(currentUser.email);
          setShowEmailVerificationModal(true);
          showNotification('Please verify your email to create listings', 'info');
        }
        return;
      }
      
      showNotification('Failed to List Project. Please try again.', 'error');
    }
  };

  const handleDeleteAd = async (adId) => {
    try {
      await apiDeleteAd(adId);
      setAds(prevAds => prevAds.filter(ad => ad.id !== adId));
      showNotification('Ad deleted successfully!', 'success');
    } catch (error) {
      logger.error('Error deleting ad:', error);
      showNotification('Failed to delete ad. Please try again.', 'error');
    }
  };

  const handleEditAd = async (adIdOrAd, editedData, options = {}) => {
    const { skipSuccessNotification = false } = options;
    try {
      // Handle case where first parameter is the entire ad object
      let adId, updatedFields;
      if (typeof adIdOrAd === 'object') {
        adId = adIdOrAd.id;
        setAdToEdit(adIdOrAd);
        setShowEditModal(true);
        return; // Exit early as we're just opening the modal
      } else {
        adId = adIdOrAd;
        updatedFields = editedData;
      }

      const ad = ads.find(a => a.id === adId);
      if (!ad) {
        showNotification('Ad not found!', 'error');
        return;
      }

      const updatedAd = {
        ...updatedFields,
        size: ad.size,
        isBumped: ad.isBumped
      };

      const response = await apiUpdateAd(adId, updatedAd);
      setAds(prevAds => {
        const next = prevAds.map(a => (a.id === adId ? response : a));
        persistAdsCache(next);
        return next;
      });
      setShowEditModal(false);
      setAdToEdit(null);
      if (!skipSuccessNotification) {
        showNotification('Ad updated successfully!', 'success');
      }
    } catch (error) {
      logger.error('Error updating ad:', error);
      showNotification('Failed to update ad. Please try again.', 'error');
    }
  };

  const handleAdPatched = (patchedAd) => {
    if (!patchedAd?.id) return;
    setAds((prevAds) => {
      const next = prevAds.map((a) => (a.id === patchedAd.id ? { ...a, ...patchedAd } : a));
      persistAdsCache(next);
      return next;
    });
  };

  // Add sentiment voting function
  const handleSentimentVote = async (adId, voteType) => {
    if (!currentUser) {
      showNotification('Please log in to vote', 'info');
      setShowLoginModal(true);
      return;
    }
    
    // Prevent double-clicking - if already voting on this ad, do nothing
    if (votingAdId === adId) {
      return;
    }
    
    // Set loading state for this specific ad
    setVotingAdId(adId);
    
    try {
      const response = await fetch(`${API_URL}/ads/${adId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ voteType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register vote');
      }

      const data = await response.json();
      
      // Get the ad details for the notification
      const votedAd = ads.find(ad => ad.id === adId);

      if (data.voteUnchanged) {
        showNotification(`You're already ${voteType} on this bubble — no change needed.`, 'info');
        return;
      }
      
      const voteFields = {
        bullishVotes: data.bullishVotes,
        bearishVotes: data.bearishVotes,
        userVote: data.userVote,
      };
      if (data.isBumped !== undefined) voteFields.isBumped = data.isBumped;
      if (data.size !== undefined) voteFields.size = data.size;
      applyVoteUpdateToAds(adId, voteFields);
      
      // Bubble votes: 1 point once per bubble; users can change bullish/bearish anytime
      if (data.pointsAwarded > 0) {
        showNotification(
          `Voted ${voteType}! +${data.pointsAwarded} points (one time per this bubble). You can change your vote anytime.`,
          'success',
          votedAd
        );
      } else {
        showNotification(
          `Vote updated (${voteType}). Points are only awarded the first time you vote on each bubble — switching bullish/bearish does not add more.`,
          'success',
          votedAd
        );
      }
    } catch (error) {
      logger.error('Error voting on ad:', error);
      showNotification(error.message || 'Failed to vote', 'error');
    } finally {
      // Clear loading state when done
      setVotingAdId(null);
    }
  };

  // Add this effect to handle wallet authentication requests
  useEffect(() => {
    const handleAuthRequest = () => {
      if (!currentUser) {
        showNotification('Authentication required before connecting wallet', 'warning');
        setShowLoginModal(true);
      }
    };
    
    window.addEventListener('requestAuthentication', handleAuthRequest);
    
    return () => {
      window.removeEventListener('requestAuthentication', handleAuthRequest);
    };
  }, [currentUser]);

  // Add a helper function to check authentication
  const requireAuth = (action) => {
    if (!currentUser) {
      showNotification('Please log in first!', 'error');
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  // Add this to debug render issues
  useEffect(() => {
    logger.log('Current ads state:', ads);
  }, [ads]);

  // Add these socket event listeners in useEffect
  useEffect(() => {
    // Add listener for vote updates
    socket.on('adVoteUpdated', (voteData) => {
      const voteFields = {
        bullishVotes: voteData.bullishVotes,
        bearishVotes: voteData.bearishVotes,
      };
      if (voteData.isBumped !== undefined) voteFields.isBumped = voteData.isBumped;
      if (voteData.size !== undefined) voteFields.size = voteData.size;
      applyVoteUpdateToAds(voteData.adId, voteFields);
    });

    // Listen for token purchase approval (after successful payment)
    socket.on('tokenPurchaseApproved', (data) => {
      if (data.userId && currentUser && (data.userId.toString() === (currentUser.userId || currentUser.id)?.toString())) {
        showNotification(`Your token purchase has been approved! ${data.amount} tokens have been added to your account.`, 'success');
      }
    });

    return () => {
      socket.off('adVoteUpdated');
      socket.off('tokenPurchaseApproved');
    };
  }, [currentUser, applyVoteUpdateToAds]);

  // Pick up token refreshes that happen inside the fetch interceptor (outside React).
  // Without this, React state would hold a stale token and the sync effect would
  // overwrite the refreshed token in localStorage.
  useEffect(() => {
    const handleTokenRefresh = (e) => {
      const { token, refreshToken } = e.detail;
      setCurrentUser((prev) => {
        if (!prev) return null;
        const next = { ...prev, token, refreshToken };
        persistAuthSession(next);
        return next;
      });
    };
    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    return () => window.removeEventListener('tokenRefreshed', handleTokenRefresh);
  }, []);

  // Cross-tab session sync: if `currentUser` is cleared in another tab (logout,
  // session expiry, etc.) the `storage` event fires here. Mirror the change so
  // this tab doesn't sit in a "fake logged in" state. The event does NOT fire
  // for changes made in the same tab — those are handled by handleLogout.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'currentUser') return;
      if (e.newValue) return;
      if (!currentUserRef.current) return;
      try {
        showNotification('You were logged out in another tab.', 'info');
      } catch (_) {}
      resetSkipperClientSession();
      setCurrentUser(null);
      socket.auth = {};
      socket.disconnect();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Periodic token validation — keeps user data fresh from the database.
  // Depends only on token + user id so optimistic profile/link-in-bio updates do not
  // restart verify on every setCurrentUser (which raced PATCH and caused UI to snap back).
  useEffect(() => {
    let cancelled = false;

    const validateToken = async () => {
      if (Date.now() < skipValidateUntilRef.current) return;
      const cu = currentUserRef.current;
      if (!cu || !cu.token) return;
      const tokenAtStart = cu.token;
      const userIdAtStart = cu.userId ?? cu.id ?? cu._id;
      const generationAtStart = getAuthSessionGeneration();
      try {
        const freshUser = await verifyToken(tokenAtStart);
        if (cancelled) return;
        if (generationAtStart !== getAuthSessionGeneration()) return;
        const live = currentUserRef.current;
        if (!live?.token || live.token !== tokenAtStart) return;
        if (freshUser && typeof freshUser === 'object') {
          const freshId = freshUser.userId ?? freshUser.id ?? freshUser._id;
          if (
            userIdAtStart != null &&
            freshId != null &&
            String(freshId) !== String(userIdAtStart)
          ) {
            return;
          }
          setCurrentUser((prev) => {
            if (!prev?.token || prev.token !== tokenAtStart) return prev;
            const prevId = prev.userId ?? prev.id ?? prev._id;
            if (
              prevId != null &&
              freshId != null &&
              String(freshId) !== String(prevId)
            ) {
              return prev;
            }
            let merged = {
              ...prev,
              ...freshUser,
              token: freshUser.token || prev.token,
              refreshToken: prev.refreshToken
            };
            if (Date.now() < linkInBioProtectUntilRef.current) {
              Object.assign(merged, pickLinkInBioState(prev));
            }
            if (JSON.stringify(merged) !== JSON.stringify(prev)) {
              persistAuthSession(merged);
              return merged;
            }
            return prev;
          });
        } else if (freshUser === false) {
          forceSessionLogout('expired');
        }
      } catch (error) {
        logger.error('Periodic token validation failed:', error);
      }
    };

    const handleRouteChange = () => {
      const live = currentUserRef.current;
      if (live && !cancelled) {
        reconnectSocket();
        validateToken();
      }
    };

    // Re-validate the session whenever the tab comes back into focus. The proactive
    // refresh handler already runs on visibilitychange, but it only mints a new
    // access token — it does NOT detect cases where the server has invalidated the
    // session (user suspended, profile changed, JWT secret rotated, etc.). Running
    // validateToken here catches those and triggers forceSessionLogout when needed.
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState !== 'visible') return;
      const live = currentUserRef.current;
      if (live && !cancelled) {
        validateToken();
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const live = currentUserRef.current;
    if (live) {
      reconnectSocket();
    }

    const interval = setInterval(validateToken, 5 * 60 * 1000);

    if (skipNextValidationRef.current) {
      skipNextValidationRef.current = false;
    } else if (live) {
      validateToken();
    }

    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handleRouteChange);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [currentUser?.token, currentUser?.userId, currentUser?.id]);

  const handleProfileUpdate = (updatedUserOrFn, options = {}) => {
    if (options.linkInBio) {
      linkInBioProtectUntilRef.current = Date.now() + 5000;
    }
    setCurrentUser((prev) => {
      const next =
        typeof updatedUserOrFn === 'function' ? updatedUserOrFn(prev) : updatedUserOrFn;
      if (next?.token) persistAuthSession(next);
      return next;
    });
    if (!options.silent) {
      showNotification('Profile updated successfully!', 'success');
    }
  };

  const handleBannerSubmit = async (bannerData) => {
    try {
      if (!currentUser) {
        throw new Error('Please log in first!');
      }

      const submitData = {
        ...bannerData,
        owner: currentUser.userId,
        status: 'pending'
      };

      logger.log('Sending to API:', submitData); // Debug log

      const response = await fetch(`${API_URL}/bannerAds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const newBanner = await response.json();
      showNotification('Banner ad created successfully!', 'success');
      return newBanner;
    } catch (error) {
      logger.error('Error creating banner ad:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  };

  // Bubble enhancement suggestions for App.js
  // Look for the bubble creation/management code and add these improvements:

  // 1. Subtle size variations for each bubble when created
  const createBubble = (ad) => {
    // Your existing bubble creation code
    
    // Add subtle size variation (5-10% difference between bubbles)
    const sizeVariation = 0.95 + Math.random() * 0.1;
    ad.element.style.transform = `scale(${sizeVariation})`;
    ad.baseScale = sizeVariation; // Store base scale for animations
    
    return ad;
  };

  // 2. Gentler deceleration for more fluid movement
  const updateBubblePosition = (ad) => {
    // Your existing position update code
    
    // Make deceleration slightly gentler (0.98 instead of 0.95)
    ad.vx *= 0.98;
    ad.vy *= 0.98;
    
    // Add subtle wobble effect on movement
    if (Math.abs(ad.vx) > 0.1 || Math.abs(ad.vy) > 0.1) {
      const wobble = Math.sin(Date.now() * 0.01) * 0.03;
      ad.element.style.transform = `scale(${ad.baseScale * (1 + wobble)})`;
    }
  };

  // 3. Improved collision response for spiral layout
  const handleCollision = (ad1, ad2) => {
    const dx = ad2.x - ad1.x;
    const dy = ad2.y - ad1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate minimum distance based on bubble sizes plus a buffer
    const minDistance = (ad1.size + ad2.size) / 2 + 15; // Added 15px buffer
    
    if (distance < minDistance) {
      // Calculate the overlap amount
      const overlap = minDistance - distance;
      
      // Calculate normalized direction vector
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Move bubbles apart with more force
      const moveAmount = overlap * 0.6; // 60% of overlap for smoother separation
      
      // Apply stronger separation for bumped bubbles
      const ad1Move = ad1.isBumped ? 0.3 : 0.5;
      const ad2Move = ad2.isBumped ? 0.3 : 0.5;
      
      // Update positions
      if (!ad1.isBumped) {
        ad1.x -= nx * moveAmount * ad1Move;
        ad1.y -= ny * moveAmount * ad1Move;
      }
      
      if (!ad2.isBumped) {
        ad2.x += nx * moveAmount * ad2Move;
        ad2.y += ny * moveAmount * ad2Move;
      }
      
      // Add velocity components to help bubbles naturally separate
      const velocityFactor = 0.5;
      ad1.velocityX = -nx * velocityFactor;
      ad1.velocityY = -ny * velocityFactor;
      ad2.velocityX = nx * velocityFactor;
      ad2.velocityY = ny * velocityFactor;
      
      // Update DOM immediately to prevent visual overlap
      const element1 = document.getElementById(ad1.id);
      const element2 = document.getElementById(ad2.id);
      
      if (element1) {
        element1.style.transform = `translate(${ad1.x}px, ${ad1.y}px)`;
        element1.style.transition = 'transform 0.3s ease-out';
      }
      
      if (element2) {
        element2.style.transform = `translate(${ad2.x}px, ${ad2.y}px)`;
        element2.style.transition = 'transform 0.3s ease-out';
      }
      
      return true;
    }
    return false;
  };

  // Function to smoothly refresh bubbles without glitching
  const refreshBubbles = (newAds, currentAds) => {
    if (!newAds?.length) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let hasCollision;
    let iterations = 0;
    const maxIterations = 50;

    do {
      hasCollision = false;
      iterations++;

      // Process each ad
      for (let i = 0; i < newAds.length; i++) {
        const ad = newAds[i];
        
        // Skip if the ad is being dragged
        if (ad.isDragging) continue;

        // Apply velocity with decay
        if (ad.velocityX || ad.velocityY) {
          ad.x += ad.velocityX;
          ad.y += ad.velocityY;
          ad.velocityX *= 0.95;
          ad.velocityY *= 0.95;
          
          // Clear tiny velocities
          if (Math.abs(ad.velocityX) < 0.01) ad.velocityX = 0;
          if (Math.abs(ad.velocityY) < 0.01) ad.velocityY = 0;
        }

        // Check collisions with other bubbles
        for (let j = i + 1; j < newAds.length; j++) {
          const otherAd = newAds[j];
          if (handleCollision(ad, otherAd)) {
            hasCollision = true;
          }
        }

        // Keep bubbles within viewport with padding
        const padding = 20;
        const maxX = windowWidth - ad.size - padding;
        const maxY = windowHeight - ad.size - padding;

        if (ad.x < padding) {
          ad.x = padding;
          ad.velocityX = Math.abs(ad.velocityX || 0) * 0.5;
        } else if (ad.x > maxX) {
          ad.x = maxX;
          ad.velocityX = -Math.abs(ad.velocityX || 0) * 0.5;
        }

        if (ad.y < padding) {
          ad.y = padding;
          ad.velocityY = Math.abs(ad.velocityY || 0) * 0.5;
        } else if (ad.y > maxY) {
          ad.y = maxY;
          ad.velocityY = -Math.abs(ad.velocityY || 0) * 0.5;
        }
      }
    } while (hasCollision && iterations < maxIterations);

    // Update all bubble positions in the DOM
    newAds.forEach(ad => {
      const element = document.getElementById(ad.id);
      if (element) {
        element.style.transform = `translate(${ad.x}px, ${ad.y}px)`;
        element.style.transition = iterations > 1 ? 'transform 0.3s ease-out' : 'none';
      }
    });
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Set up event listeners for dashboard opening from notifications

  // Effect to open dashboard after login if there was a pending tab
  useEffect(() => {
    if (currentUser) {
      const pendingTab = localStorage.getItem('aquads_pending_dashboard_tab');
      if (pendingTab) {
        localStorage.removeItem('aquads_pending_dashboard_tab');
        if (navigateRef.current) navigateRef.current(`/dashboard/${pendingTab}`);
      }
      
      // Effect to open profile modal after login if there was a pending tab
      const pendingProfileTab = localStorage.getItem('aquads_pending_profile_tab');
      if (pendingProfileTab && currentUser.userType === 'freelancer') {
        setProfileModalInitialTab(pendingProfileTab);
        setShowProfileModal(true);
        localStorage.removeItem('aquads_pending_profile_tab');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    // Define handler for opening dashboard with booking
    const handleOpenDashboardWithBooking = (event) => {
      logger.log('Opening dashboard with booking:', event.detail.bookingId);
      setActiveBookingId(event.detail.bookingId);
      if (navigateRef.current) navigateRef.current('/dashboard/bookings');
    };
    
    // Define handler for opening dashboard without specific booking
    const handleOpenDashboard = () => {
      logger.log('Opening dashboard');
      if (navigateRef.current) navigateRef.current('/dashboard');
    };
    
    // Open the profile modal at a specific tab from anywhere via a window event.
    // Used by the freelancer launch checklist to jump straight into the CV editor.
    const handleOpenProfileModal = (event) => {
      const tab = event?.detail?.tab || 'profile';
      if (currentUser) {
        setProfileModalInitialTab(tab);
        setShowProfileModal(true);
      } else {
        // Not logged in — defer until login completes (handled in a separate effect).
        try { localStorage.setItem('aquads_pending_profile_tab', tab); } catch (_) {}
      }
    };

    // Add event listeners
    window.addEventListener('openDashboardWithBooking', handleOpenDashboardWithBooking);
    window.addEventListener('openDashboard', handleOpenDashboard);
    window.addEventListener('aquads:open-profile-modal', handleOpenProfileModal);
    
    // Add global function to show dashboard (for use by other components)
    window.showDashboard = (tab, bookingId) => {
      logger.log('Global showDashboard called', tab, bookingId);
      if (bookingId) {
        setActiveBookingId(bookingId);
      }
      if (navigateRef.current) navigateRef.current(`/dashboard/${tab || 'ads'}`);
    };
    
    // Check localStorage for dashboard open flag (fallback method)
    const checkLocalStorage = () => {
      const shouldOpenDashboard = localStorage.getItem('aquads_open_dashboard');
      const bookingId = localStorage.getItem('aquads_open_booking');
      const timestamp = localStorage.getItem('aquads_notification_timestamp');
      
      // Only process recent requests (within last 5 seconds)
      const isRecent = timestamp && (Date.now() - parseInt(timestamp, 10)) < 5000;
      
      if (shouldOpenDashboard === 'true' && isRecent) {
        logger.log('Opening dashboard from localStorage flag');
        
        if (bookingId) {
          setActiveBookingId(bookingId);
        }
        
        // Clear the flags
        localStorage.removeItem('aquads_open_dashboard');
        localStorage.removeItem('aquads_open_booking');
        localStorage.removeItem('aquads_notification_timestamp');
        
        if (navigateRef.current) navigateRef.current('/dashboard/ads');
      }
    };
    
    // Check for localStorage flags on mount
    checkLocalStorage();
    
    // Return cleanup function
    return () => {
      window.removeEventListener('openDashboardWithBooking', handleOpenDashboardWithBooking);
      window.removeEventListener('openDashboard', handleOpenDashboard);
      window.removeEventListener('aquads:open-profile-modal', handleOpenProfileModal);
      delete window.showDashboard;
    };
  }, [currentUser]);

  // For mobile view only, sync DOM transforms to computed grid (optional refinement pass).
  function adjustBubblesForMobile() {
    if (window.innerWidth > 480) return;

    const visibleAds = getVisibleAds();
    const { positions, packedHeight } = computeMobileGridLayout(visibleAds, window.innerWidth);
    if (!positions.length) return;

    visibleAds.forEach((ad, index) => {
      const bubble = document.getElementById(ad.id);
      const pos = positions[index];
      if (bubble && pos) {
        bubble.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      }
    });

    const firstBubble = document.querySelector('.bubble-container');
    const mapContainer = firstBubble?.parentElement;
    if (mapContainer && packedHeight > 0) {
      mapContainer.style.minHeight = `${Math.max(window.innerHeight, packedHeight)}px`;
    }
  }

  // Restore original bubble positions when going back to desktop
  function restoreOriginalPositions() {
    // Only do this if we have stored positions and we're on desktop now
    if (!window.originalBubblePositions || window.innerWidth <= 480) return;
    
    // Find all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) return;
    
    // First try to reset using the model data (most accurate)
    resetBubblePositionsFromModel();
    
    // If model reset doesn't work, fall back to stored positions
    if (window.originalBubblePositions) {
      bubbles.forEach(bubble => {
        const originalData = window.originalBubblePositions.find(item => item.id === bubble.id);
        if (originalData && originalData.transform) {
          bubble.style.transform = originalData.transform;
        }
      });
    }
  }

  // Reset all bubble positions to match their state in the ads array
  function resetBubblePositionsFromModel() {
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) return;
    
    // For each bubble in the DOM, find its corresponding ad in the state
    // and apply the position from the state
    bubbles.forEach(bubble => {
      const adId = bubble.id;
      const ad = ads.find(a => a.id === adId);
      
      if (ad) {
        // Apply the position from the state model
        bubble.style.transform = `translate(${ad.x}px, ${ad.y}px)`;
      }
    });
    
    // Clear the stored positions to ensure fresh calculations next time
    window.originalBubblePositions = null;
  }

  // Update the ads model based on DOM positions
  function updateModelFromDomPositions() {
    // Prevent recursive updates by checking if we're already updating
    if (window.isUpdatingModelFromDom) return;
    window.isUpdatingModelFromDom = true;
    
    
    // Get all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (!bubbles.length) {
      window.isUpdatingModelFromDom = false;
      return;
    }
    
    // Create batch of updates to apply at once
    const updates = {};
    
    // Extract position from each bubble DOM element
    bubbles.forEach(bubble => {
      const adId = bubble.id;
      if (!adId) return;
      
      const transform = bubble.style.transform;
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      
      if (match && match.length === 3) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        // Only update if the position has significantly changed
        if (ads[adId] && 
            (Math.abs(ads[adId].x - x) > 1 || Math.abs(ads[adId].y - y) > 1)) {
          updates[adId] = {
            ...ads[adId],
            x,
            y
          };
        }
      }
    });
    
    // Only update state if we have actual changes
    if (Object.keys(updates).length > 0) {
      // Set a flag to prevent layout recalculation when this update happens
      window.skipNextLayoutUpdate = true;
      
      // Batch all updates together
      setAds(currentAds => {
        const newAds = { ...currentAds };
        Object.keys(updates).forEach(adId => {
          newAds[adId] = updates[adId];
        });
        return newAds;
      });
      
      // Add a small delay before allowing the next update
      setTimeout(() => {
        window.isUpdatingModelFromDom = false;
      }, 300); // Increased delay to prevent rapid updates
    } else {
      window.isUpdatingModelFromDom = false;
    }
  }

  // Arrange bubbles in a clean grid for desktop
  function arrangeDesktopGrid() {
    // Only run on desktop
    if (window.innerWidth <= 480) return;
    
    // Prevent multiple executions in quick succession
    if (window.isArrangingDesktopGrid) return;
    window.isArrangingDesktopGrid = true;
    
    // Find all bubble containers
    const bubbles = document.querySelectorAll('.bubble-container');
    if (bubbles.length === 0) {
      window.isArrangingDesktopGrid = false;
      return;
    }

    // Drop any packed height left by the mobile layout (window widened past 480) so the
    // desktop grid gets its min-h-screen back. No-op when the mobile path never ran.
    const mapContainer = bubbles[0].parentElement;
    if (mapContainer && mapContainer.style.minHeight) {
      mapContainer.style.minHeight = '';
    }
    
    // Use smooth transition when coming from landing page, otherwise fast
    const transitionStyle = window.useSmoothLayoutTransition 
      ? 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' 
      : 'transform 0.05s ease-out';
    
    bubbles.forEach(bubble => {
      bubble.style.transition = transitionStyle;
    });
    
    // Get all bubbles as an array
    const bubblesArray = Array.from(bubbles);
    
    // Sort bubbles by bullish votes (highest to lowest)
    const sortedBubbles = bubblesArray.sort((a, b) => {
      // Get the corresponding ad for each bubble using the bubble ID
      const adA = ads.find(ad => ad.id === a.id);
      const adB = ads.find(ad => ad.id === b.id);
      
      // If we can't find the ad, put it at the end
      if (!adA) return 1;
      if (!adB) return -1;
      // First prioritize bumped bubbles - all bumped bubbles come before unbumped ones
      if (adA.isBumped && !adB.isBumped) return -1;
      if (!adA.isBumped && adB.isBumped) return 1;
      

      // Sort by bullish votes (highest first)
      return (adB.bullishVotes || 0) - (adA.bullishVotes || 0);
    });
    
    const screenWidth = window.innerWidth;

    // Per-bubble sizes: bumped and shrunk bubbles share a page on the bumped→unbumped
    // boundary, so one reference size would overlap rows.
    const bubbleSizes = sortedBubbles.map(
      (bubble) => parseInt(bubble.style.width, 10) || 100
    );
    const { positions: gridPositions } = computeDesktopGridLayout(bubbleSizes, screenWidth);
    
    // Store current positions to check if we need to update the model
    const originalPositions = {};
    // Record original positions before moving
    sortedBubbles.forEach(bubble => {
      const adId = bubble.id;
      const transform = bubble.style.transform;
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      
      if (match && match.length === 3) {
        originalPositions[adId] = {
          x: parseFloat(match[1]),
          y: parseFloat(match[2])
        };
      }
    });
    
    // Now place each bubble in its grid cell (immediately)
    sortedBubbles.forEach((bubble, index) => {
      const position = gridPositions[index];
      if (!position) return;
      bubble.style.transform = `translate(${position.x}px, ${position.y}px)`;
    });
    
    // Check if positions actually changed
    let positionsChanged = false;
    sortedBubbles.forEach(bubble => {
      const adId = bubble.id;
      const transform = bubble.style.transform;
      const match = transform.match(/translate\((.+?)px,\s*(.+?)px\)/);
      
      if (match && match.length === 3) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        if (!originalPositions[adId] || 
            Math.abs(originalPositions[adId].x - x) > 5 || // Increased threshold to reduce updates
            Math.abs(originalPositions[adId].y - y) > 5) {
          positionsChanged = true;
        }
      }
    });
    
    // Update model immediately if positions changed and we're not skipping
    if (positionsChanged && !window.skipNextModelUpdate) {
      updateModelFromDomPositions();
    }
    
    // Reset flag and clear arrangement flag immediately
    window.skipNextModelUpdate = false;
    window.isArrangingDesktopGrid = false;
  }

  // Modify the return statement to wrap everything in the Auth context provider
  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      <Router>
        <Helmet>
          {/*
            Site-wide default meta tags. Any page that sets its own <Helmet>
            (LandingPage, BlogPage, HowTo, Marketplace, AquaSwap, etc.) overrides
            these by property/name. Pages without their own Helmet inherit these
            defaults. Keeping defaults here (instead of in public/index.html)
            prevents duplicate og:* / twitter:* tags appearing in prerendered HTML
            served to search/social crawlers.
          */}
          <title>Aquads — The launch stack for new crypto projects</title>
          <meta name="description" content="Aquads is the launch stack for new crypto projects: list on the bubble map, grow with raids and PR, hire Web3 freelancers, and get paid with AquaPay. Free listing." />
          <meta property="og:title" content="Aquads — The launch stack for new crypto projects" />
          <meta property="og:description" content="After your token launches: list, grow, hire, and get paid in one place. Bubble map, raids, marketplace, AquaPay — your first 30 days." />
          <meta property="og:image" content="https://www.aquads.xyz/metalogo.png" />
          <meta property="og:url" content="https://www.aquads.xyz/" />
          <meta property="og:type" content="website" />
          <meta name="twitter:title" content="Aquads — The launch stack for new crypto projects" />
          <meta name="twitter:description" content="After your token launches: list, grow, hire, and get paid in one place. Bubble map, raids, marketplace, AquaPay — your first 30 days." />
          <meta name="twitter:image" content="https://www.aquads.xyz/metalogo.png" />
        </Helmet>
        <PWAInstallProvider>
        <NavigationListener 
          onNavigate={() => {
            if (currentUser) {
              reconnectSocket();
            }
          }}
        />
        <NavigateHelper />
        <ProfileTabHandler 
          currentUser={currentUser}
          setShowProfileModal={setShowProfileModal}
          setProfileModalInitialTab={setProfileModalInitialTab}
        />
        <DashboardTabHandler 
          currentUser={currentUser}
        />
        <AuthModalQueryHandler
          setShowLoginModal={setShowLoginModal}
          setShowCreateAccountModal={setShowCreateAccountModal}
          setShowCreateModal={setShowCreateModal}
          currentUser={currentUser}
        />
        <HomeLayoutHandler arrangeDesktopGrid={arrangeDesktopGrid} adjustBubblesForMobile={adjustBubblesForMobile} />
        <AdsFetchOnRoute loadAdsFromApi={loadAdsFromApi} />
        <TokensFetchOnRoute loadTokensFromApi={loadTokensFromApi} hasLoadedTokens={tokenList.length > 0} />
        <DesktopInstallPrompt />
        {currentUser?.token && (
          <Suspense fallback={null}>
            <ProjectAgentFab
              key={`${getSkipperAuthEpoch(currentUser)}:${getAuthSessionGeneration()}`}
              currentUser={currentUser}
              openProjectOnboarding={skipperProjectOnboarding}
              onProjectOnboardingOpen={() => setSkipperProjectOnboarding(false)}
            />
          </Suspense>
        )}
        <Suspense fallback={
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #111827, #000000)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          </div>
        }>
        <Routes>
          <Route path="/extension-auth" element={<ExtensionAuth />} />
          <Route path="/dashboard/:tab?" element={
            <DashboardPage
              ads={ads}
              currentUser={currentUser}
              onDeleteAd={handleDeleteAd}
              onEditAd={handleEditAd}
              onAdPatched={handleAdPatched}
              activeBookingId={activeBookingId}
              setActiveBookingId={setActiveBookingId}
              onLogin={() => setShowLoginModal(true)}
              onLogout={handleLogout}
              onCreateAccount={() => setShowCreateAccountModal(true)}
              onProfileUpdate={handleProfileUpdate}
            />
          } />
          <Route path="/claim-bubble" element={
            <ClaimBubblePage
              currentUser={currentUser}
              onLogin={() => setShowLoginModal(true)}
              onCreateAccount={() => setShowCreateAccountModal(true)}
              showNotification={showNotification}
            />
          } />
          <Route path="/marketplace" element={
            <Marketplace 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              onBannerSubmit={handleBannerSubmit}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/bounties/:id?" element={
            <Bounties
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              showNotification={showNotification}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/bounty-pay/:escrowId" element={
            <CustodialPayment currentUser={currentUser} showNotification={showNotification} escrowType="bounty" />
          } />
          <Route path="/partner-rewards" element={
            <PartnerMarketplace 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              onBannerSubmit={handleBannerSubmit}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/service/:slug" element={
            <ServicePage 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              openMintFunnelPlatform={openMintFunnelPlatform}
            />
          } />
          <Route path="/booking-conversation/:bookingId" element={<BookingConversationPage />} />
          <Route path="/games/dots-and-boxes" element={<DotsAndBoxes currentUser={currentUser} />} />
          <Route path="/games/checkers" element={<Checkers currentUser={currentUser} />} />
          <Route path="/games/horse-racing" element={<HorseRacing currentUser={currentUser} />} />
          <Route path="/games/crossword" element={<CrosswordPuzzle currentUser={currentUser} />} />
          <Route path="/games/beanstalks-and-chutes" element={<BeanstalksAndChutes currentUser={currentUser} />} />
          <Route path="/games/snakes-and-ladders" element={<Navigate to="/games/beanstalks-and-chutes" replace />} />
          <Route path="/games/sludo" element={<Sludo currentUser={currentUser} />} />
          <Route path="/games/pulse-ludo" element={<Navigate to="/games/sludo" replace />} />
          <Route path="/aquataire" element={<Aquataire currentUser={currentUser} onLogin={handleLogin} onCreateAccount={handleCreateAccount} />} />
          <Route path="/games/aquataire" element={<Navigate to="/aquataire" replace />} />

          <Route path="/games/:id" element={
            <GamePage
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
            />
          } />
          <Route path="/share/game/:id" element={
            <GamePage
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
            />
          } />

          <Route path="/games" element={
            <GameHub 
              currentUser={currentUser}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateAccount={handleCreateAccount}
              openMintFunnelPlatform={openMintFunnelPlatform}
              ads={ads}
            />
          } />
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={
            <div className="bg-gradient-to-br from-gray-900 to-black text-white flex flex-col h-screen overflow-hidden">
              {/* Background stays fixed */}
              <div className="fixed inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
                <div className="tech-lines"></div>
                <div className="tech-dots"></div>
              </div>

              {/* Header: nav + token banner fixed, above scroll content so dropdown is not blocked */}
              <div className="relative z-[200001] flex-shrink-0">
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 h-16 min-h-[4rem] bg-gray-800/80 backdrop-blur-sm z-[200000] relative overflow-visible">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex items-center justify-between h-16">
                      <div className="flex items-center">
                        <Link to="/" className="flex items-center">
                          <img 
                            src="/alogo.png" 
                            alt="AQUADS" 
                            className="aquads-nav-logo"
                          />
                        </Link>
                      </div>
                      
                      {/* Mobile menu button - landing page style */}
                      <div className="md:hidden">
                        <button
                          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                          className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm"
                          aria-label="Toggle menu"
                        >
                          <div className="relative w-5 h-4 flex flex-col justify-between">
                            <motion.span
                              className="w-full h-0.5 bg-cyan-400 rounded-full origin-center"
                              animate={isMobileMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                              transition={{ duration: 0.2 }}
                            />
                            <motion.span
                              className="w-full h-0.5 bg-cyan-400 rounded-full"
                              animate={isMobileMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            />
                            <motion.span
                              className="w-full h-0.5 bg-cyan-400 rounded-full origin-center"
                              animate={isMobileMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                        </button>
                      </div>

                      {/* Desktop menu */}
                      <div className="hidden md:flex items-center space-x-3">
                        {/* Main Navigation - Smaller buttons */}
                        <Link
                          to="/marketplace"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Freelancer
                        </Link>
                        <Link
                          to="/games"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Games
                        </Link>
                        <Link
                          to="/bounties"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Bounties
                        </Link>
                        <button
                          onClick={openMintFunnelPlatform}
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Paid Ads
                        </button>
                        <Link
                          to="/learn"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Learn
                        </Link>
                        <Link
                          to="/list-token-free"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          List token free
                        </Link>
                        <Link
                          to="/claim-bubble"
                          className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                        >
                          Claim bubble
                        </Link>

                        {currentUser ? (
                          <>
                            <NotificationBell currentUser={currentUser} />
                            
                            {/* User Dropdown */}
                            <div className="relative user-dropdown">
                              <button 
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                className="flex items-center bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                              >
                                <span className="mr-1">{getDisplayName(currentUser)}</span>
                                <svg className={`w-4 h-4 ml-1 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              {/* Dropdown Menu - above token banner and RotatingBanner */}
                              {showUserDropdown && (
                                <div className="absolute right-0 mt-2 w-52 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-[200002]">
                                  <div className="py-2">
                                    <Link
                                      to="/dashboard"
                                      onClick={() => setShowUserDropdown(false)}
                                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                                    >
                                      📊 Dashboard
                                    </Link>
                                    <Link
                                      to="/claim-bubble"
                                      onClick={() => setShowUserDropdown(false)}
                                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-teal-600/50 transition-colors"
                                    >
                                      🫧 Claim your bubble
                                    </Link>
                                    <button
                                      onClick={() => {
                                        setShowCreateModal(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                                    >
                                      ➕ List Project
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowBannerModal(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/50 transition-colors"
                                    >
                                      🎨 Create Banner Ad
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowProfileModal(true);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-purple-600/50 transition-colors"
                                    >
                                      ⚙️ Edit Profile
                                    </button>
                                    <hr className="my-2 border-gray-700" />
                                    <Link to="/aquafi" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">💧 AquaFi</Link>
                                    <Link to="/aquaswap" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">💱 AquaSwap</Link>
                                    <Link to="/partner-rewards" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">🤝 Partners</Link>
                                    <Link to="/telegram-bot" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">🤖 Telegram Bot</Link>
                                    <Link to="/aquapay" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">💸 AquaPay</Link>
                                    <Link to="/hyperspace" onClick={() => setShowUserDropdown(false)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-cyan-600/30 transition-colors">🚀 HyperSpace</Link>
                                    <hr className="my-2 border-gray-700" />
                                    <button
                                      onClick={() => {
                                        handleLogout();
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-red-600/50 transition-colors"
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
                              onClick={() => setShowLoginModal(true)}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Login
                            </button>
                            <button
                              onClick={() => setShowCreateAccountModal(true)}
                              className="bg-gray-700/90 hover:bg-gray-600/90 px-3 py-1.5 rounded text-sm shadow-lg hover:shadow-gray-500/30 transition-all duration-300 backdrop-blur-sm text-yellow-400"
                            >
                              Create Account
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Mobile menu - out of flow so it never adds to nav height */}
                  <div className="absolute left-0 right-0 top-full pointer-events-none md:pointer-events-auto" style={{ minHeight: 0 }}>
                    <div className="pointer-events-auto">
                    <AnimatePresence>
                      {isMobileMenuOpen && (
                        <>
                          <motion.div
                            className="md:hidden fixed inset-0 bg-black/50 z-[199999]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                          />
                          <motion.div
                            className="md:hidden absolute top-full left-0 right-0 mt-2 mx-4 z-[200000] max-h-[85vh] flex flex-col"
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden overscroll-contain">
                              <div className="p-2">
                                <Link
                                  to="/marketplace"
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-purple-500/10 transition-all"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-lg">👥</span>
                                  <span className="font-medium">Freelancer Hub</span>
                                </Link>
                                <Link
                                  to="/games"
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-lg">🎮</span>
                                  <span className="font-medium">GameHub</span>
                                </Link>
                                <Link
                                  to="/bounties"
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-lg">🏆</span>
                                  <span className="font-medium">Bounties</span>
                                </Link>
                                <button
                                  onClick={() => { openMintFunnelPlatform(); setIsMobileMenuOpen(false); }}
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all w-full text-left"
                                >
                                  <span className="text-lg">📢</span>
                                  <span className="font-medium">Paid Ads</span>
                                </button>
                                <Link
                                  to="/learn"
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-lg">📚</span>
                                  <span className="font-medium">Learn</span>
                                </Link>
                                <Link
                                  to="/list-token-free"
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-lg">✨</span>
                                  <span className="font-medium">List token free</span>
                                </Link>
                                <Link
                                  to="/claim-bubble"
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-teal-500/10 transition-all"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-lg">🫧</span>
                                  <span className="font-medium">Claim your bubble</span>
                                </Link>
                                <div className="h-px bg-white/10 my-2" />
                                <Link to="/aquafi" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                                  <span className="text-lg">💧</span>
                                  <span className="font-medium">AquaFi</span>
                                </Link>
                                <Link to="/aquaswap" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                                  <span className="text-lg">💱</span>
                                  <span className="font-medium">AquaSwap</span>
                                </Link>
                                <Link to="/partner-rewards" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                                  <span className="text-lg">🎁</span>
                                  <span className="font-medium">Partners</span>
                                </Link>
                                <Link to="/telegram-bot" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                                  <span className="text-lg">🤖</span>
                                  <span className="font-medium">Telegram Bot</span>
                                </Link>
                                <Link to="/aquapay" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                                  <span className="text-lg">💸</span>
                                  <span className="font-medium">AquaPay</span>
                                </Link>
                                <Link to="/hyperspace" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                                  <span className="text-lg">🚀</span>
                                  <span className="font-medium">HyperSpace</span>
                                </Link>
                                {currentUser ? (
                                  <>
                                    <div className="h-px bg-white/10 my-2" />
                                    <div className="flex justify-center py-2">
                                      <NotificationBell currentUser={currentUser} />
                                    </div>
                                    <span className="block px-4 py-2 text-blue-300 text-sm">Welcome, {getDisplayName(currentUser)}!</span>
                                    <Link
                                      to="/dashboard"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-cyan-500/10 transition-all w-full"
                                    >
                                      <span className="text-lg">📊</span>
                                      <span className="font-medium">Dashboard</span>
                                    </Link>
                                    <button
                                      onClick={() => { setShowProfileModal(true); setIsMobileMenuOpen(false); }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all w-full text-left"
                                    >
                                      <span className="text-lg">⚙️</span>
                                      <span className="font-medium">Edit Profile</span>
                                    </button>
                                    <button
                                      onClick={() => { setShowCreateModal(true); setIsMobileMenuOpen(false); }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all w-full text-left"
                                    >
                                      <span className="text-lg">➕</span>
                                      <span className="font-medium">List Project</span>
                                    </button>
                                    <button
                                      onClick={() => { setShowBannerModal(true); setIsMobileMenuOpen(false); }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all w-full text-left"
                                    >
                                      <span className="text-lg">🎨</span>
                                      <span className="font-medium">Create Banner Ad</span>
                                    </button>
                                    <div className="h-px bg-white/10 my-2" />
                                    <button
                                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-red-500/20 transition-all w-full text-left"
                                    >
                                      <span className="text-lg">🚪</span>
                                      <span className="font-medium">Logout</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <div className="h-px bg-white/10 my-2" />
                                    <button
                                      onClick={() => { setShowLoginModal(true); setIsMobileMenuOpen(false); }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-cyan-500/10 transition-all w-full text-left"
                                    >
                                      <span className="text-lg">🔑</span>
                                      <span className="font-medium">Login</span>
                                    </button>
                                    <button
                                      onClick={() => { setShowCreateAccountModal(true); setIsMobileMenuOpen(false); }}
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all w-full text-left"
                                    >
                                      <span className="text-lg">✨</span>
                                      <span className="font-medium">Create Account</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                    </div>
                  </div>
                </nav>

                <div className="fixed top-16 left-0 right-0 z-[3]" style={{ marginTop: 0 }}>
                  <TokenBanner />
                </div>
              </div>

              {/* Only this area scrolls; stays below header so dropdown is not blocked */}
              <div className="flex-1 min-h-0 overflow-y-auto relative z-0">
                <div className="pt-20">
                  <h1 className="sr-only">
                    Aquads launch stack — list new crypto projects on the bubble map, grow, hire, and get paid
                  </h1>
                  {/* Rotating Banner - AquaSwap & Chrome Extension */}
                  <RotatingBanner currentUser={currentUser} />

                  {/* Filter controls */}
                  <div className="container mx-auto px-4">
                    <FilterControls 
                      currentBlockchain={blockchainFilter}
                      onBlockchainChange={handleBlockchainFilterChange}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                      totalItems={blockchainFilter === 'all'
                        ? ads.length
                        : ads.filter((ad) => matchesBlockchainFilter(ad.blockchain, blockchainFilter)).length}
                    />
                  </div>
                  
                  {/* Bubbles section - keep it as is, remove fixed positioning */}
                  {(() => {
                    const visibleAds = getVisibleAds();
                    const isDesktop = windowSize.width > 480;
                    const bubbleSizesPx = visibleAds.map((ad) =>
                      getMobileBubbleMapDisplaySize(ad, windowSize.width)
                    );
                    const mobileLayout = isDesktop
                      ? null
                      : computeMobileGridLayout(visibleAds, windowSize.width);
                    const desktopLayout = isDesktop
                      ? computeDesktopGridLayout(bubbleSizesPx, windowSize.width)
                      : null;
                    const packedHeight =
                      mobileLayout?.packedHeight || desktopLayout?.packedHeight || 0;
                    const mapMinHeight =
                      packedHeight > 0
                        ? Math.max(windowSize.height, packedHeight)
                        : undefined;

                    return (
                  <div
                    className="relative min-h-screen overflow-hidden pt-3"
                    style={
                      mapMinHeight
                        ? { minHeight: `${mapMinHeight}px` }
                        : undefined
                    }
                  >
                    {/* Ads */}
                    {visibleAds.length === 0
                      ? null
                      : visibleAds.map((ad, visibleIndex) => {
                        const bubblePx = bubbleSizesPx[visibleIndex];
                        const { x, y } = (isDesktop
                          ? desktopLayout.positions[visibleIndex]
                          : mobileLayout.positions[visibleIndex]) || { x: ad.x, y: ad.y };

                        return (
                          <div 
                            key={ad.id}
                            id={ad.id}
                            className="bubble-container"
                            style={{
                              position: 'absolute',
                              transform: `translate(${x}px, ${y}px)`,
                              width: `${bubblePx}px`,
                              height: `${bubblePx}px`,
                              transition: 'none',
                              zIndex: ad.isBumped ? 2 : 1
                            }}
                          >
                            <motion.div
                              className={`absolute bubble ${ad.isBumped ? 'bumped-ad' : ''} ${ad.blockchain ? `bubble-${ad.blockchain.toLowerCase()}` : 'bubble-ethereum'}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                transition: `all ${ANIMATION_DURATION} ease-in-out`,
                                cursor: 'pointer',
                                touchAction: 'auto'
                              }}
                              onClick={(e) => {
                                if (!e.defaultPrevented) {
                                  // Check if ad has pairAddress or contractAddress for token chart
                                  const tokenAddress = ad.pairAddress || ad.contractAddress;
                                  if (tokenAddress && tokenAddress.trim()) {
                                    trackBubbleClick(ad.id);
                                    const blockchain = ad.blockchain || 'ethereum';
                                    const tokenName = ad.title || '';
                                    window.location.href = `/aquaswap?token=${encodeURIComponent(tokenAddress.trim())}&blockchain=${encodeURIComponent(blockchain)}&name=${encodeURIComponent(tokenName)}`;
                                  }
                                  // If no pair/contract address, do nothing (no redirect)
                                }
                              }}
                            >
                              {/* Voting popup that appears on hover */}
                              <div className="vote-popup">
                                <button 
                                  className={`vote-button bearish-vote ${ad.userVote === 'bearish' ? 'active-vote' : ''} ${votingAdId === ad.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSentimentVote(ad.id, 'bearish');
                                  }}
                                  disabled={votingAdId === ad.id}
                                  aria-label="Vote bearish"
                                  title="1 point once per bubble on your first vote here; you can change to bullish anytime."
                                >
                                  {votingAdId === ad.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <img 
                                      src="/Bearish.svg" 
                                      alt="Bearish" 
                                      className="w-4 h-4"
                                    />
                                  )}
                                </button>
                                <button 
                                  className={`vote-button bullish-vote ${ad.userVote === 'bullish' ? 'active-vote' : ''} ${votingAdId === ad.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSentimentVote(ad.id, 'bullish');
                                  }}
                                  disabled={votingAdId === ad.id}
                                  aria-label="Vote bullish"
                                  title="1 point once per bubble on your first vote here; you can change to bearish anytime."
                                >
                                  {votingAdId === ad.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <img 
                                      src="/Bullish.svg" 
                                      alt="Bullish" 
                                      className="w-4 h-4"
                                    />
                                  )}
                                </button>
                              </div>
                              
                              <div className="bubble-content">
                                {/* Background of bubble */}
                                <div className="bubble-bg"></div>

                                {/* Curved text at top */}
                              <div 
                                className="bubble-text-curved"
                              >
                                  <svg 
                                    width="100%" 
                                    height="40" 
                                    viewBox="0 0 120 40"
                                    className="hover:opacity-75 transition-opacity duration-300"
                                    style={{
                                      overflow: 'visible'
                                    }}
                                    title={ad.title}
                                  >
                                    <defs>
                                      <path 
                                        id={`curve-${ad.id}`} 
                                        d="M 10 30 Q 60 5 110 30" 
                                        fill="transparent"
                                      />
                                    </defs>
                                    <text 
                                      fontSize={`${Math.max(bubblePx * 0.15, 14)}px`}
                                      fill="white"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      className="hover:fill-blue-300 transition-colors duration-300"
                                      style={{
                                        textShadow: '0 0 3px rgba(0, 0, 0, 0.8)',
                                        fontWeight: '500'
                                      }}
                                    >
                                      <textPath 
                                        href={`#curve-${ad.id}`} 
                                        startOffset="50%"
                                      >
                                        {formatBubbleMapTitle(ad.title)}
                                      </textPath>
                                    </text>
                                  </svg>
                                </div>
                                
                                {/* Logo Container */}
                                <div className="bubble-logo-container">
                                  <img
                                    src={ad.logo}
                                    alt={ad.title}
                                    loading="lazy"
                                    className="w-full h-full object-contain"
                                    style={{
                                      objectFit: 'contain',
                                      maxWidth: '95%',
                                      maxHeight: '95%'
                                    }}
                                    onLoad={(e) => {
                                      if (e.target.src.toLowerCase().endsWith('.gif')) {
                                        e.target.setAttribute('loop', 'infinite');
                                      }
                                    }}
                                  />
                                </div>
                                
                                {(ad.projectProfile?.liquidityLock?.status === 'verified'
                                  || ad.bullishVotes > 0
                                  || ad.bearishVotes > 0) && (
                                  <div className="bubble-bottom-badges">
                                    {ad.projectProfile?.liquidityLock?.status === 'verified' && (
                                      <div
                                        className="bubble-lp-lock-icon"
                                        title="Liquidity lock verified on-chain"
                                        aria-label="Liquidity lock verified"
                                      >
                                        🔒
                                      </div>
                                    )}
                                    {(ad.bullishVotes > 0 || ad.bearishVotes > 0) && (
                                      <div 
                                        className={`vote-percentage ${
                                          ad.bullishVotes > ad.bearishVotes 
                                            ? 'vote-bullish' 
                                            : ad.bearishVotes > ad.bullishVotes 
                                              ? 'vote-bearish' 
                                              : 'vote-neutral'
                                        }`}
                                      >
                                        {ad.bullishVotes + ad.bearishVotes > 0 
                                          ? ad.bullishVotes > ad.bearishVotes 
                                            ? 'BUY' 
                                            : ad.bearishVotes > ad.bullishVotes 
                                              ? 'SELL' 
                                              : '50/50'
                                          : 'No votes'}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    {visibleAds.length === 0 && (
                      <div className="flex items-center justify-center min-h-[50vh] flex-col">
                        {isLoading ? (
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                            <p className="text-gray-400 text-xl">{loadingMessage || 'Loading ads...'}</p>
                            {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                              <p className="text-sm text-gray-500 mt-2 text-center px-4">
                                Mobile networks may take longer to connect
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-400 text-xl mb-2">No projects found</p>
                            {blockchainFilter !== 'all' && (
                              <p className="text-gray-500">
                                No projects found for {getBlockchainLabel(blockchainFilter)}.
                                <button 
                                  className="ml-2 text-blue-400 hover:text-blue-300 underline"
                                  onClick={() => handleBlockchainFilterChange('all')}
                                >
                                  View all projects
                                </button>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                    );
                  })()}

                  {/* Token list section - add z-index and proper background */}
                  <div className="relative z-10 bg-transparent">
                    {/* Multi-Section Banner (GameHub, Freelancer, Telegram, Coinbound) */}
                    <div className="w-full overflow-hidden flex">
                      {/* Game Hub Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/game-hub-section.svg"
                          alt="Game Hub"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <Link 
                          to="/games" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                      
                      {/* Freelancer Hub Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/freelancer-hub-section.svg"
                          alt="Freelancer Hub"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <Link 
                          to="/marketplace" 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                      
                      {/* Telegram Mini App Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/telegram-section.svg"
                          alt="Telegram Mini App"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <Link 
                          to="/telegram-bot"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                      
                      {/* Coinbound Section */}
                      <div className="flex-1 relative">
                        <img
                          src="/coinbound-section.svg"
                          alt="Free Marketing Plan"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] md:max-h-[280px] lg:max-h-[320px] block"
                          style={{ 
                            pointerEvents: 'none', 
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                          draggable="false"
                        />
                        <a 
                          href="https://app.mintfunnel.co?ref=KA3IIME5" 
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackClick('free_marketing_banner', window.location.pathname)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            zIndex: 10,
                            cursor: 'pointer',
                            textDecoration: 'none',
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Banner Ad Display */}
                    <BannerDisplay rounded={true} />
                    
                    <TokenList 
                      currentUser={currentUser}
                      showNotification={showNotification}
                      tokens={tokenList}
                      globalStats={tokenGlobalStats}
                      tokensLoading={tokensLoading}
                      tokensError={tokensError}
                      tokensSocketConnected={tokensSocketConnected}
                      onTokenDetailsOpenChange={handleTokenDetailsOpenChange}
                    />
                  </div>
                </div>

                {/* Modals — login/create-account are global (see below Routes) */}
                {showProfileModal && currentUser && (
                  <ProfileModal
                    currentUser={currentUser}
                    onClose={() => {
                      setShowProfileModal(false);
                      setProfileModalInitialTab('profile'); // Reset to default tab on close
                    }}
                    onProfileUpdate={handleProfileUpdate}
                    initialTab={profileModalInitialTab}
                  />
                )}

                {showCreateModal && currentUser && (
                  <CreateAdModal
                    onCreateAd={handleCreateAd}
                    onClose={() => setShowCreateModal(false)}
                    currentUser={currentUser}
                    userAds={ads}
                  />
                )}

                {showBannerModal && currentUser && (
                  <CreateBannerModal
                    onSubmit={handleBannerSubmit}
                    onClose={() => setShowBannerModal(false)}
                  />
                )}

                {showWelcomeModal && (
                  <WelcomeModal
                    username={currentUser.username}
                    referralCode={currentUser.referralCode}
                    onClose={handleWelcomeModalClose}
                  />
                )}

                {/* Bump Reminder Modal */}
                {showBumpReminderModal && unbumpedAd && (
                  <BumpReminderModal
                    isOpen={showBumpReminderModal}
                    onClose={() => setShowBumpReminderModal(false)}
                    onBumpNow={handleBumpFromReminder}
                    userAd={unbumpedAd}
                  />
                )}

                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="fixed bottom-4 left-4 text-white text-sm z-50">
                    Ads loaded: {ads.length}
                  </div>
                )}

              {/* Footer - inside scroll so it appears with rest of content */}
              <div className="relative z-10">
                <Footer />
              </div>
              </div>

              {/* Partnership & Growth popup — rendered outside scroll area so z-index works above header */}
              {partnershipPopup && (
                <div className="fixed inset-0 z-[300000] bg-black/80 backdrop-blur-md overflow-y-auto">
                  <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all animate-fadeIn">

                      {/* Header */}
                      <div className="relative bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-blue-600/20 rounded-t-2xl px-6 pt-6 pb-4 text-center border-b border-gray-700/40">
                        <button
                          onClick={() => setPartnershipPopup(null)}
                          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none transition-colors"
                          title="Close"
                        >
                          ✕
                        </button>
                        <div className="text-5xl mb-3">🎉</div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                          {partnershipPopup.projectName ? `${partnershipPopup.projectName} is Listed!` : 'Project Listed!'}
                        </h2>
                        <p className="text-gray-300 text-sm sm:text-base">
                          Maximize your project's reach with these two quick steps
                        </p>
                      </div>

                      {/* Content */}
                      <div className="px-6 py-5 space-y-5">

                        {/* --- Section 1: AquaSwap Chart Link --- */}
                        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border border-blue-500/20 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">📊</span>
                            <div>
                              <h3 className="text-lg font-bold text-white">Add Your Chart Link</h3>
                              <p className="text-sm text-gray-400">Link your website to your live AquaSwap token chart</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">
                            {partnershipPopup.tokenChartUrl
                              ? "Add this link as a button on your website — visitors get your live chart with rich preview cards when shared on social."
                              : "Add this link to your website as a partner button to boost your domain authority and visibility."}
                          </p>

                          {/* URL box */}
                          <div className="bg-black/40 border border-gray-600/40 rounded-lg p-2.5 flex items-center gap-2 mb-3">
                            <input
                              type="text"
                              value={partnershipPopup.tokenChartUrl || 'https://aquads.xyz'}
                              readOnly
                              className="bg-transparent text-cyan-300 text-sm w-full outline-none font-mono truncate"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(partnershipPopup.tokenChartUrl || 'https://aquads.xyz');
                                showNotification('Chart link copied!', 'success');
                              }}
                              className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                            >
                              Copy
                            </button>
                          </div>

                          {/* Benefits pills */}
                          <div className="flex flex-wrap gap-2">
                            {['Live DEX Chart', 'Swap Widget', 'Price & Volume', 'Boosts SEO'].map(b => (
                              <span key={b} className="inline-flex items-center gap-1 text-xs bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full px-2.5 py-1">
                                ✓ {b}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* --- Section 2: Telegram Bot --- */}
                        <div className="bg-gradient-to-br from-purple-900/30 to-violet-900/20 border border-purple-500/20 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">🤖</span>
                            <div>
                              <h3 className="text-lg font-bold text-white">Supercharge with Our Telegram Bot</h3>
                              <p className="text-sm text-gray-400">@aquadsbumpbot — Free marketing tools for your project</p>
                            </div>
                          </div>

                          {/* Feature grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                            {[
                              { icon: '🐦', title: 'Twitter & Facebook Raids', desc: 'Starter 1→5/day · Premium 5→10/day when bumped' },
                              { icon: '📈', title: 'Trending & Rankings', desc: 'Trend across Aquads, BexTools & trending channel' },
                              { icon: '🗳️', title: 'Voting & Boosts', desc: 'Get bullish votes + real TG members' },
                              { icon: '🎨', title: 'Custom Branding', desc: 'Your logo in vote notifications on trending channel' },
                              { icon: '🌐', title: 'Cross-Community Raids', desc: 'Share raids across all opted-in groups' },
                              { icon: '💰', title: 'Points → Cash', desc: '$100 per 10K points — paid to your community' }
                            ].map(f => (
                              <div key={f.title} className="flex items-start gap-2.5 bg-black/20 rounded-lg p-2.5">
                                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-white leading-tight">{f.title}</p>
                                  <p className="text-xs text-gray-400 leading-snug">{f.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Bot CTA */}
                          <a
                            href="https://t.me/aquadsbumpbot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-purple-900/30"
                          >
                            <span className="text-xl">✈️</span>
                            Start @aquadsbumpbot on Telegram
                          </a>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-6 pb-5 pt-1 flex justify-center">
                        <button
                          onClick={() => setPartnershipPopup(null)}
                          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          I'll do this later — Close
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* EditAdModal: rendered outside scroll area so it appears on top */}
              {showEditModal && adToEdit && currentUser && (
                <EditAdModal
                  ad={adToEdit}
                  onEditAd={handleEditAd}
                  onClose={() => {
                    setShowEditModal(false);
                    setAdToEdit(null);
                  }}
                />
              )}
            </div>
          } />
                      <Route path="/whitepaper" element={<Navigate to="/docs#wp-executive-summary" replace />} />
            <Route path="/learn" element={<HowTo currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} ads={ads} />} />
            <Route path="/learn/courses" element={<Navigate to="/learn" replace />} />
            <Route path="/learn/courses/:slug" element={<FreeCoursePage currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} />} />
            <Route path="/share/courses/:slug" element={<FreeCoursePage currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} />} />
                                 <Route path="/learn/:slug" element={<BlogPage currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} ads={ads} />} />
            <Route path="/share/blog/:id" element={<BlogPage currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onCreateAccount={handleCreateAccount} openMintFunnelPlatform={openMintFunnelPlatform} ads={ads} />} />
            <Route path="/affiliate" element={<Affiliate />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/verify-user" element={<VerifyUser />} />
            <Route path="/verify-member/:memberId" element={<MemberVerification />} />
            <Route path="/resume/:username" element={<PublicResume />} />
            <Route path="/links/:username" element={<LinkInBio />} />
            <Route path="/pay/:slug" element={<AquaPayWithPhantom currentUser={currentUser} />} />
            <Route path="/custodial-pay/:escrowId" element={<CustodialPayment currentUser={currentUser} showNotification={showNotification} />} />
            <Route path="/aquafi" element={
              <AquaFi 
                currentUser={currentUser} 
                showNotification={showNotification}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onCreateAccount={handleCreateAccount}
                openMintFunnelPlatform={openMintFunnelPlatform}
              />
            } />
            <Route path="/swap" element={<AquaSwap ads={ads} currentUser={currentUser} showNotification={showNotification} onVote={handleSentimentVote} votingAdId={votingAdId} onRequireLogin={() => setShowLoginModal(true)} />} />
            <Route path="/aquaswap" element={<AquaSwap ads={ads} currentUser={currentUser} showNotification={showNotification} onVote={handleSentimentVote} votingAdId={votingAdId} onRequireLogin={() => setShowLoginModal(true)} />} />
            <Route path="/share/aquaswap" element={<AquaSwap ads={ads} currentUser={currentUser} showNotification={showNotification} onVote={handleSentimentVote} votingAdId={votingAdId} onRequireLogin={() => setShowLoginModal(true)} />} />
            <Route path="/wallet-analyzer" element={<WalletAnalyzer currentUser={currentUser} showNotification={showNotification} />} />
            <Route
              path="/pfp-generator"
              element={
                <AquadsPFPGenerator
                  currentUser={currentUser}
                  onLogin={() => setShowLoginModal(true)}
                  showNotification={showNotification}
                />
              }
            />

            <Route path="/embed/aquaswap" element={<AquaSwapEmbed />} />
            <Route
              path="/list-token-free"
              element={
                <ProjectInfo
                  currentUser={currentUser}
                  ads={ads}
                  onAdPatched={handleAdPatched}
                  onLogin={() => setShowLoginModal(true)}
                  onCreateAccount={() => setShowCreateAccountModal(true)}
                />
              }
            />
            <Route path="/why-list" element={<Navigate to="/list-token-free" replace />} />
            <Route path="/freelancer-benefits" element={<FreelancerBenefits currentUser={currentUser} />} />
            <Route path="/telegram-bot" element={<TelegramBot currentUser={currentUser} />} />
            <Route path="/telegram-bot/panel" element={<BotControlPanel currentUser={currentUser} />} />
            <Route path="/aquapay" element={<AquaPayInfo />} />
            <Route path="/hyperspace" element={<HyperSpace currentUser={currentUser} />} />
            <Route path="/docs" element={<Documentation />} />
            <Route
              path="/project-agent/:adId?"
              element={<ProjectAgentPage currentUser={currentUser} />}
            />
        </Routes>
        </Suspense>

        {/* Global auth modals — AquaSwap votes, header login links, etc. */}
        {showLoginModal && (
          <LoginModal
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            onClose={() => setShowLoginModal(false)}
            onCreateAccount={() => {
              setShowLoginModal(false);
              setShowCreateAccountModal(true);
            }}
          />
        )}

        {showCreateAccountModal && (
          <CreateAccountModal
            isOpen={showCreateAccountModal}
            onCreateAccount={handleCreateAccount}
            onClose={() => setShowCreateAccountModal(false)}
          />
        )}

        {/* Global vote success popup (bubble map + AquaSwap) */}
        {votePopup && (
          <div className="fixed inset-0 flex items-center justify-center z-[999999998] bg-black/70 backdrop-blur-md">
            <div className="bg-gray-900 border-2 border-purple-500 rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all animate-fadeIn">
              <div className="flex flex-col items-center">
                {votePopup.adDetails && (
                  <div className="mb-4 flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full mb-2 flex items-center justify-center text-center overflow-hidden ${votePopup.adDetails.blockchain ? `bubble-${votePopup.adDetails.blockchain.toLowerCase()}` : 'bubble-ethereum'}`}>
                      {votePopup.adDetails.logo ? (
                        <img
                          src={votePopup.adDetails.logo}
                          alt={votePopup.adDetails.title}
                          className="w-16 h-16 object-contain"
                        />
                      ) : (
                        <span className="text-lg font-bold">{votePopup.adDetails.title.substring(0, 2)}</span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{votePopup.adDetails.title}</h3>
                    <p className="text-sm text-gray-300 mb-4">
                      {votePopup.adDetails.blockchain
                        ? getBlockchainLabel(votePopup.adDetails.blockchain)
                        : 'Ethereum'
                      }
                    </p>
                  </div>
                )}

                <div className="text-6xl mb-4 flex justify-center">
                  {votePopup.message.includes('bullish') ? (
                    <img src="/Bullish.svg" alt="Bullish" className="w-16 h-16" />
                  ) : (
                    <img src="/Bearish.svg" alt="Bearish" className="w-16 h-16" />
                  )}
                </div>

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {votePopup.message.includes('bullish') ? 'Bullish Vote!' : 'Bearish Vote!'}
                  </h2>
                  <p className="text-lg text-gray-200">{votePopup.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setVotePopup(null)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global toast notifications */}
        <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none" style={{ zIndex: 999999999 }}>
          {notifications.map(({ id, message, type }) => (
            <div
              key={id}
              className={`p-4 rounded shadow-lg pointer-events-auto ${
                type === 'error' ? 'bg-red-500' :
                type === 'success' ? 'bg-green-500' :
                'bg-blue-500'
              }`}
            >
              {message}
            </div>
          ))}
        </div>

        {showEmailVerificationModal && pendingVerificationEmail && (
          <EmailVerificationModal
            email={pendingVerificationEmail}
            onVerificationComplete={handleEmailVerificationComplete}
          />
        )}
        </PWAInstallProvider>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;

