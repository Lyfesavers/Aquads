import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../services/api';
import { resolveLinkInBioButtonLook } from '../utils/linkInBioButtonLook';
import { BioLinkIcon } from '../utils/linkInBioIcons';
import CreateLinkBioAdModal from './CreateLinkBioAdModal';
import { FaBullhorn } from 'react-icons/fa';

/**
 * Only “classic” social / community profile URLs go in the compact icon row.
 * Other recognized URLs (GitHub, Spotify, shops, etc.) show as app-style tiles in the full-width grid.
 */
const isClassicSocialBioUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const host = (new URL(url).hostname || '').toLowerCase().replace(/^www\./, '');
    if (host.includes('discord')) return true;
    if (host.includes('guilded')) return true;
    if (host.includes('x.com') || host === 'twitter.com') return true;
    if (host.includes('t.me') || host.includes('telegram')) return true;
    if (host.includes('whatsapp') || host.includes('wa.me')) return true;
    if (host.includes('weixin') || host.includes('wechat')) return true;
    if (host.includes('line.me') || host.includes('line.naver')) return true;
    if (host.includes('signal.') || host.includes('signalmessenger')) return true;
    if (host.includes('messenger') || host.includes('fb.com') || host.includes('fb.me') || host.includes('facebook')) return true;
    if (host.includes('mastodon') || host.includes('mstdn')) return true;
    if (host.includes('tiktok')) return true;
    if (host.includes('youtube') || host.includes('youtu.be')) return true;
    if (host.includes('twitch')) return true;
    if (host.includes('instagram')) return true;
    if (host.includes('snapchat')) return true;
    if (host.includes('pinterest')) return true;
    if (host.includes('linkedin')) return true;
    if (host.includes('reddit')) return true;
    if (host.includes('quora')) return true;
    if (host.includes('tumblr')) return true;
    if (host.includes('soundcloud')) return true;
    if (host.includes('meetup')) return true;
    if (host.includes('goodreads')) return true;
    if (host.includes('strava')) return true;
    if (host.includes('vk.com') || host === 'vk') return true;
    if (host.includes('weibo')) return true;
    if (host.includes('xing')) return true;
    return false;
  } catch (_) {
    return false;
  }
};

// Build theme from user's accent color (hex)
function hexToRgba(hex, alpha = 1) {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildThemeFromAccent(hex) {
  const accent = hexToRgba(hex, 0.95);
  const hover = hexToRgba(hex, 0.18);
  const filledBg = hexToRgba(hex, 0.22);
  const shine = hexToRgba(hex, 0.07);
  const glow = hexToRgba(hex, 0.15);
  const badgeBorder = hexToRgba(hex, 0.35);
  const badgeBg = hexToRgba(hex, 0.06);
  const orb1 = hexToRgba(hex, 0.07);
  const orb2 = hexToRgba(hex, 0.05);
  const orb3 = hexToRgba(hex, 0.03);
  return { accent, accentHover: hover, accentFilled: filledBg, shine, avatarGlow: glow, badgeBorder, badgeBg, orb1, orb2, orb3 };
}

function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return '#22d3ee';
  const h = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
  return /^#[0-9A-Fa-f]{3,6}$/.test(h) ? h : '#22d3ee';
}

function relativeLuminanceFromHex(hex) {
  let h = normalizeHex(hex).replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Foreground on a tile tinted with `hex` (e.g. social circle filled with accent). */
function contrastOnTintHex(hex) {
  return relativeLuminanceFromHex(hex) > 0.55 ? 'rgba(15, 17, 24, 0.92)' : 'rgba(255, 255, 255, 0.96)';
}

function darkenHex(hex, amount = 0.35) {
  let h = normalizeHex(hex).replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const mix = (n) => Math.max(0, Math.min(255, Math.round(n * (1 - amount))));
  const r = mix(parseInt(h.slice(0, 2), 16));
  const g = mix(parseInt(h.slice(2, 4), 16));
  const b = mix(parseInt(h.slice(4, 6), 16));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function lightenHex(hex, amount = 0.28) {
  let h = normalizeHex(hex).replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const mix = (n) => Math.min(255, Math.round(n + (255 - n) * amount));
  const r = mix(parseInt(h.slice(0, 2), 16));
  const g = mix(parseInt(h.slice(2, 4), 16));
  const b = mix(parseInt(h.slice(4, 6), 16));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function buildPageBackgroundFromHex(hex) {
  const base = normalizeHex(hex);
  return `linear-gradient(165deg, ${base} 0%, ${darkenHex(base, 0.28)} 42%, ${darkenHex(base, 0.52)} 100%)`;
}

const DEFAULT_PAGE_BACKGROUND = 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 40%, #060910 100%)';

/** Accent color drives icon glyphs; chip only when filled tile matches accent and needs contrast. */
function getLinkIconPresentation(accentHex, buttonHex, fill, translucent) {
  const accent = normalizeHex(accentHex);
  const button = normalizeHex(buttonHex);
  const needsChip = fill === 'filled' && !translucent && accent.toLowerCase() === button.toLowerCase();
  return {
    iconColor: accent,
    needsChip,
    chipStyle: {
      backgroundColor: relativeLuminanceFromHex(accent) > 0.55 ? 'rgba(15, 17, 24, 0.38)' : 'rgba(255, 255, 255, 0.14)'
    }
  };
}

/** App-tile surface for the full-width icon grid (rich gradient + glass). */
function getAppTileSurface({ fill, translucent, shape, buttonHex, theme, hasBackgroundImage }) {
  const hx = normalizeHex(buttonHex);
  const radius = shape === 'pill' ? '28%' : '22%';
  let background = `linear-gradient(155deg, ${hexToRgba(hx, 0.42)} 0%, rgba(18, 22, 32, 0.96) 55%, rgba(10, 12, 18, 0.98) 100%)`;
  let border = `1px solid ${hexToRgba(hx, hasBackgroundImage ? 0.55 : 0.4)}`;
  let backdropFilter = 'none';
  let boxShadow = `0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.2)`;

  if (fill === 'filled') {
    if (translucent) {
      background = `linear-gradient(155deg, ${hexToRgba(hx, 0.72)} 0%, ${hexToRgba(hx, 0.38)} 100%)`;
      border = `1px solid ${hexToRgba(hx, 0.65)}`;
      backdropFilter = 'blur(20px) saturate(1.2)';
      boxShadow = `0 10px 40px ${hexToRgba(hx, 0.28)}, 0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
    } else {
      background = `linear-gradient(155deg, ${hexToRgba(hx, 1)} 0%, ${hx} 45%, ${hexToRgba(hx, 0.78)} 100%)`;
      border = `1px solid ${hexToRgba(hx, 0.85)}`;
      boxShadow = `0 10px 36px ${hexToRgba(hx, 0.35)}, 0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -2px 0 rgba(0, 0, 0, 0.15)`;
    }
  } else if (fill === 'minimal') {
    background = hasBackgroundImage
      ? `linear-gradient(155deg, rgba(255, 255, 255, 0.06) 0%, rgba(0, 0, 0, 0.35) 100%)`
      : 'linear-gradient(155deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.55) 100%)';
    border = `2px solid ${hexToRgba(hx, translucent ? 0.75 : 0.9)}`;
    if (translucent) backdropFilter = 'blur(16px)';
    boxShadow = `0 6px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)`;
  } else {
    if (translucent) {
      background = hasBackgroundImage
        ? `linear-gradient(155deg, ${hexToRgba(hx, 0.35)} 0%, rgba(0, 0, 0, 0.55) 100%)`
        : `linear-gradient(155deg, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0.65) 100%)`;
      border = `1px solid ${hexToRgba(hx, 0.55)}`;
      backdropFilter = 'blur(20px) saturate(1.15)';
      boxShadow = `0 10px 36px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.14)`;
    } else {
      background = hasBackgroundImage
        ? `linear-gradient(155deg, ${hexToRgba(hx, 0.28)} 0%, rgba(14, 16, 24, 0.94) 100%)`
        : `linear-gradient(155deg, rgba(32, 38, 52, 0.98) 0%, rgba(14, 17, 26, 0.98) 100%)`;
      border = `1px solid ${hexToRgba(hx, hasBackgroundImage ? 0.5 : 0.38)}`;
    }
  }

  return { background, border, backdropFilter, boxShadow, borderRadius: radius };
}

/** Premium bezel: chrome outer frame + accent gold inset ring (AI mockup style). */
function getTilePremiumFrame(accentHex, shape) {
  const accent = normalizeHex(accentHex);
  const accentLight = lightenHex(accent, 0.32);
  const accentDark = darkenHex(accent, 0.18);
  const outerRadius = shape === 'pill' ? '30%' : '24%';
  const goldRadius = shape === 'pill' ? '27%' : '21%';
  const innerRadius = shape === 'pill' ? '24%' : '18%';

  return {
    innerRadius,
    outer: {
      borderRadius: outerRadius,
      background: 'linear-gradient(145deg, #eef1f6 0%, #b8bec8 22%, #5c6370 52%, #989faa 78%, #d7dbe3 100%)',
      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.48), 0 3px 8px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -2px 0 rgba(0, 0, 0, 0.38)',
      padding: '4px'
    },
    goldRing: {
      borderRadius: goldRadius,
      background: `linear-gradient(135deg, ${accentLight} 0%, ${accent} 42%, ${accentDark} 100%)`,
      boxShadow: `0 0 14px ${hexToRgba(accent, 0.42)}, inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 0 -1px 0 rgba(0, 0, 0, 0.22)`,
      padding: '2.5px'
    }
  };
}

/** Social row circles: button color fill + accent color icon & ring. */
function getSocialCircleStyle({ fill, translucent, buttonHex, accentHex, hasBackgroundImage }) {
  const btn = normalizeHex(buttonHex);
  const accent = normalizeHex(accentHex);
  const sameColor = btn.toLowerCase() === accent.toLowerCase();
  let background = `linear-gradient(145deg, ${hexToRgba(btn, 0.9)} 0%, ${hexToRgba(btn, 0.62)} 100%)`;
  let border = `1px solid ${hexToRgba(accent, 0.8)}`;
  let backdropFilter = 'none';
  let boxShadow = `0 4px 16px ${hexToRgba(btn, 0.32)}, 0 0 0 1px ${hexToRgba(accent, 0.22)}, inset 0 1px 0 rgba(255, 255, 255, 0.16)`;

  if (fill === 'filled') {
    background = translucent ? hexToRgba(btn, 0.48) : btn;
    border = `2px solid ${hexToRgba(accent, 0.92)}`;
    if (translucent) backdropFilter = 'blur(12px) saturate(1.15)';
    boxShadow = `0 4px 18px ${hexToRgba(btn, 0.38)}, 0 0 0 1px ${hexToRgba(accent, 0.28)}`;
  } else if (fill === 'minimal') {
    background = hasBackgroundImage ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.18)';
    border = `2px solid ${hexToRgba(accent, 0.92)}`;
    if (translucent) backdropFilter = 'blur(10px)';
    boxShadow = `0 4px 14px rgba(0, 0, 0, 0.28), 0 0 0 1px ${hexToRgba(accent, 0.2)}`;
  } else if (translucent) {
    background = hexToRgba(btn, hasBackgroundImage ? 0.42 : 0.34);
    border = `1px solid ${hexToRgba(accent, 0.72)}`;
    backdropFilter = 'blur(12px) saturate(1.1)';
  } else {
    background = hexToRgba(btn, hasBackgroundImage ? 0.68 : 0.82);
  }

  let iconColor = accent;
  if (fill === 'filled' && !translucent && sameColor) {
    iconColor = contrastOnTintHex(btn);
  }

  return { background, border, backdropFilter, boxShadow, iconColor };
}

// Load distinctive fonts (Syne + DM Sans) for this page only
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
if (!document.querySelector('link[href*="Syne"]')) document.head.appendChild(fontLink);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 }
  }
};

const gridItem = {
  hidden: { opacity: 0, scale: 0.82, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 26 }
  }
};

const LinkInBio = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAds, setActiveAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);

  useEffect(() => {
    if (!username) {
      setError('Invalid page');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/users/links/${encodeURIComponent(username)}`, {
          cache: 'no-store'
        });
        if (!res.ok) {
          if (res.status === 404) setError('Page not found');
          else setError('Failed to load');
          return;
        }
        const json = await res.json();
        setData(json);
        // Track page view (fire-and-forget)
        fetch(`${API_URL}/users/links/${encodeURIComponent(username)}/view`, { method: 'POST' }).catch(() => {});
      } catch (err) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  // Fetch active ads for this page
  useEffect(() => {
    if (!username) return;
    const fetchAds = async () => {
      try {
        const res = await fetch(`${API_URL}/link-bio-ads/active/${encodeURIComponent(username)}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const ads = await res.json();
          setActiveAds(Array.isArray(ads) ? ads : []);
        }
      } catch (_) {}
    };
    fetchAds();
    const interval = setInterval(fetchAds, 30000);
    return () => clearInterval(interval);
  }, [username]);

  // Rotate ads every 15 seconds
  useEffect(() => {
    if (activeAds.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [activeAds.length]);

  const currentAd = activeAds.length > 0 ? activeAds[currentAdIndex % activeAds.length] : null;

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 40%, #060910 100%)',
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        {/* Soft orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] rounded-full bg-cyan-500/[0.04] blur-[80px]" />
          <div className="absolute bottom-0 right-0 w-[70%] h-[50%] rounded-full bg-blue-500/[0.03] blur-[100px]" />
        </div>
        <div className="relative flex flex-col items-center gap-6 w-full">
          <div
            className="w-full max-w-[260px] h-44 bg-white/5 animate-pulse mb-2"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
            }}
          />
          <div className="h-6 w-44 rounded-full bg-white/10 animate-pulse" />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5 sm:gap-5 w-full max-w-2xl px-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-full aspect-square rounded-[22%] bg-white/5 animate-pulse" />
                <div className="h-2.5 w-3/4 rounded-full bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 100%)',
          fontFamily: "'DM Sans', sans-serif"
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-slate-400 text-lg mb-4">{error || 'Page not found'}</p>
          <a
            href="https://www.aquads.xyz"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors text-sm font-medium"
          >
            Go to Aquads.xyz
          </a>
        </motion.div>
      </div>
    );
  }

  const { displayName, image, bioLinks, linkInBioTagline, linkInBioAccentColor, linkInBioButtonColor, linkInBioTextColor, linkInBioBackgroundImageUrl, linkInBioBackgroundColor, linkInBioAdsEnabled, linkInBioAdPricing, aquaPaySlug } = data;
  const sortedLinks = Array.isArray(bioLinks)
    ? [...bioLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  const socialLinks = sortedLinks.filter((l) => isClassicSocialBioUrl(l.url));
  const buttonLinks = sortedLinks.filter((l) => !isClassicSocialBioUrl(l.url));
  const hasSocialLinks = socialLinks.length > 0;
  const hasButtonLinks = buttonLinks.length > 0;
  const hasAnyLinks = hasSocialLinks || hasButtonLinks;
  const taglineText = typeof linkInBioTagline === 'string' ? linkInBioTagline.trim() : '';
  const accentHex = (linkInBioAccentColor && /^#[0-9A-Fa-f]{3,6}$/.test(linkInBioAccentColor)) ? linkInBioAccentColor : '#22d3ee';
  const buttonHex = (linkInBioButtonColor && /^#[0-9A-Fa-f]{3,6}$/.test(linkInBioButtonColor)) ? linkInBioButtonColor : accentHex;
  const hasBackgroundImage = linkInBioBackgroundImageUrl && typeof linkInBioBackgroundImageUrl === 'string' && linkInBioBackgroundImageUrl.trim().length > 0 && /^https?:\/\//i.test(linkInBioBackgroundImageUrl.trim());
  const backgroundColorHex = (linkInBioBackgroundColor && /^#[0-9A-Fa-f]{3,6}$/.test(linkInBioBackgroundColor)) ? linkInBioBackgroundColor : null;
  const textColorHex = (linkInBioTextColor && /^#[0-9A-Fa-f]{3,6}$/.test(linkInBioTextColor)) ? linkInBioTextColor : null;
  const pageBackground = hasBackgroundImage
    ? 'transparent'
    : backgroundColorHex
      ? buildPageBackgroundFromHex(backgroundColorHex)
      : DEFAULT_PAGE_BACKGROUND;
  const theme = buildThemeFromAccent(accentHex);
  const buttonTheme = buildThemeFromAccent(buttonHex);
  const btnLook = resolveLinkInBioButtonLook(data);
  const iconPresentation = getLinkIconPresentation(accentHex, buttonHex, btnLook.fill, btnLook.translucent);
  const tileSurface = getAppTileSurface({
    fill: btnLook.fill,
    translucent: btnLook.translucent,
    shape: btnLook.shape,
    buttonHex,
    buttonTheme,
    theme,
    hasBackgroundImage
  });
  const labelColor = textColorHex
    ? textColorHex
    : btnLook.fill === 'filled' && !btnLook.translucent
      ? contrastOnTintHex(buttonHex)
      : 'rgba(226, 232, 240, 0.92)';
  const taglineColor = textColorHex || undefined;
  const socialCircleStyle = getSocialCircleStyle({
    fill: btnLook.fill,
    translucent: btnLook.translucent,
    buttonHex,
    accentHex,
    hasBackgroundImage
  });
  const tileFrame = getTilePremiumFrame(accentHex, btnLook.shape);
  const advertiseBtnStyle = (() => {
    const btn = normalizeHex(buttonHex);
    const accent = normalizeHex(accentHex);
    const textColor = textColorHex || accent;
    if (btnLook.fill === 'filled') {
      const sameColor = btn.toLowerCase() === accent.toLowerCase();
      return {
        background: btnLook.translucent ? hexToRgba(btn, 0.48) : btn,
        color: !btnLook.translucent && sameColor ? contrastOnTintHex(btn) : textColor,
        border: `1px solid ${hexToRgba(accent, 0.72)}`,
        backdropFilter: btnLook.translucent ? 'blur(12px)' : 'none',
        boxShadow: `0 4px 18px ${hexToRgba(btn, 0.28)}`
      };
    }
    if (btnLook.fill === 'minimal') {
      return {
        background: hasBackgroundImage ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.18)',
        color: textColor,
        border: `2px solid ${hexToRgba(accent, 0.92)}`,
        backdropFilter: btnLook.translucent ? 'blur(10px)' : 'none'
      };
    }
    return {
      background: btnLook.translucent
        ? hexToRgba(btn, hasBackgroundImage ? 0.35 : 0.28)
        : hexToRgba(btn, hasBackgroundImage ? 0.42 : 0.22),
      color: textColor,
      border: `1px solid ${hexToRgba(accent, 0.55)}`,
      backdropFilter: btnLook.translucent ? 'blur(12px)' : 'none',
      boxShadow: `0 4px 14px ${hexToRgba(btn, 0.2)}`
    };
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center px-4 py-12 pb-20 relative overflow-hidden"
      style={{
        background: pageBackground,
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Full-screen background: image layer (absolute so it stays behind content; img tag avoids CSS url escaping issues) */}
      {hasBackgroundImage && (
        <div className="absolute inset-0 w-full min-h-full pointer-events-none" style={{ zIndex: 0 }}>
          <img
            src={linkInBioBackgroundImageUrl.trim()}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ minHeight: '100vh', minWidth: '100%' }}
          />
          {/* Stronger tint overlay so text/buttons stay readable */}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.55) 100%)'
            }}
          />
        </div>
      )}
      {/* Layered background orbs — theme colors (hidden when custom background image is set) */}
      {!hasBackgroundImage && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[140%] h-[90%] rounded-full blur-[100px]" style={{ background: theme.orb1 }} />
          <div className="absolute bottom-0 right-0 w-[90%] h-[60%] rounded-full blur-[120px] translate-y-1/4" style={{ background: theme.orb2 }} />
          <div className="absolute bottom-1/3 left-0 w-[60%] h-[40%] rounded-full blur-[80px]" style={{ background: theme.orb3 }} />
          {/* Subtle grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
            }}
          />
        </div>
      )}

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Profile header — centered narrow column */}
        <div className="w-full max-w-md flex flex-col items-center">
        {/* Hero logo — full image blended into page top (Linktree-style) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full mb-4 -mt-3"
        >
          <motion.div
            className="absolute inset-x-[-8%] top-[10%] bottom-[-10%] pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 75% 55% at 50% 38%, ${hexToRgba(accentHex, hasBackgroundImage ? 0.28 : 0.42)} 0%, transparent 72%)`,
              filter: 'blur(28px)'
            }}
            animate={{ opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
            style={{
              background: hasBackgroundImage
                ? 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 100%)'
                : backgroundColorHex
                  ? `linear-gradient(to bottom, transparent 0%, ${hexToRgba(backgroundColorHex, 0.55)} 100%)`
                  : 'linear-gradient(to bottom, transparent 0%, rgba(6, 9, 16, 0.65) 100%)'
            }}
          />
          <img
            src={image}
            alt=""
            className="relative w-full max-h-52 sm:max-h-60 object-contain object-center mx-auto select-none pointer-events-none"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)',
              filter: `drop-shadow(0 12px 40px ${theme.avatarGlow})`
            }}
          />
        </motion.div>

        {/* Display name — distinctive typography */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className={`text-2xl font-semibold text-white tracking-tight text-center ${taglineText || hasSocialLinks ? 'mb-2' : hasButtonLinks ? 'mb-6' : 'mb-10'}`}
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}
        >
          {displayName}
        </motion.h1>

        {taglineText ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className={`text-sm text-center max-w-sm mx-auto leading-relaxed mb-6 px-1 ${taglineColor ? '' : 'text-slate-400'}`}
            style={taglineColor ? { color: taglineColor } : undefined}
          >
            {taglineText}
          </motion.p>
        ) : null}

        {hasSocialLinks ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
            className="flex flex-wrap justify-center gap-2.5 w-full mb-6 px-1"
            role="list"
            aria-label="Social links"
          >
            {socialLinks.map((link, i) => (
              <motion.a
                key={`social-${i}-${link.url}`}
                role="listitem"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.title || 'Social link'}
                title={link.title || 'Social link'}
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300 hover:scale-110"
                style={{
                  background: socialCircleStyle.background,
                  border: socialCircleStyle.border,
                  backdropFilter: socialCircleStyle.backdropFilter,
                  boxShadow: socialCircleStyle.boxShadow
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <BioLinkIcon link={link} url={link.url} className="w-5 h-5" iconColor={socialCircleStyle.iconColor} />
              </motion.a>
            ))}
          </motion.div>
        ) : null}
        </div>

        {/* App-style link grid — full page width */}
        {hasButtonLinks ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full px-4 sm:px-6 md:px-8 mt-2 mb-4"
          >
            <div
              className="w-full max-w-2xl mx-auto grid grid-cols-3 sm:grid-cols-4 gap-x-3.5 gap-y-5 sm:gap-x-5 sm:gap-y-7"
              role="list"
              aria-label="Links"
            >
              {buttonLinks.map((link, i) => {
                const title = (link.title || '').trim() || 'Link';
                const tileIconProps = {
                  link,
                  url: link.url,
                  iconColor: iconPresentation.iconColor,
                  style: { filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35))' }
                };
                return (
                  <motion.a
                    key={`tile-${i}-${link.url}`}
                    role="listitem"
                    variants={gridItem}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={title}
                    title={title}
                    className="group flex flex-col items-center gap-2 sm:gap-2.5 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ outlineColor: hexToRgba(normalizeHex(accentHex), 0.65) }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <div
                      className="relative w-full aspect-square transition-all duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
                      style={tileFrame.outer}
                    >
                      <div
                        className="w-full h-full transition-all duration-300 group-hover:brightness-105"
                        style={tileFrame.goldRing}
                      >
                        <div
                          className="relative w-full h-full overflow-hidden"
                          style={{
                            borderRadius: tileFrame.innerRadius,
                            background: tileSurface.background,
                            border: tileSurface.border,
                            backdropFilter: tileSurface.backdropFilter,
                            boxShadow: tileSurface.boxShadow
                          }}
                        >
                      {/* iOS-style top gloss */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 28%, transparent 52%, rgba(0,0,0,0.18) 100%)'
                        }}
                      />
                      {/* Accent shimmer on hover */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background: `linear-gradient(115deg, transparent 30%, ${buttonTheme.shine} 50%, transparent 70%)`,
                          backgroundSize: '200% 100%',
                          animation: 'linkInBioShine 0.75s ease-out'
                        }}
                      />
                      {/* Hover glow ring */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          boxShadow: `inset 0 0 0 1px ${hexToRgba(normalizeHex(accentHex), 0.65)}, 0 0 24px ${hexToRgba(normalizeHex(accentHex), 0.4)}`
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {iconPresentation.needsChip ? (
                          <span
                            className="flex items-center justify-center rounded-[18%] w-[52%] h-[52%]"
                            style={iconPresentation.chipStyle}
                          >
                            <BioLinkIcon
                              {...tileIconProps}
                              tile
                              tileInChip
                              className="w-[62%] h-[62%] transition-transform duration-300 group-hover:scale-110"
                            />
                          </span>
                        ) : (
                          <BioLinkIcon
                            {...tileIconProps}
                            tile
                            className="w-[38%] h-[38%] transition-transform duration-300 group-hover:scale-110"
                          />
                        )}
                      </div>
                        </div>
                      </div>
                    </div>
                    <span
                      className="w-full text-center text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 px-0.5"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: labelColor }}
                    >
                      {title}
                    </span>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        ) : !hasAnyLinks ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-500 text-center py-10 text-sm w-full max-w-md"
          >
            No links yet.
          </motion.p>
        ) : null}

        {/* Footer — centered narrow column */}
        <div className="w-full max-w-md flex flex-col items-center">
        {currentAd && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="w-full mt-8"
          >
            <AnimatePresence mode="wait">
              <motion.a
                key={currentAd._id}
                href={currentAd.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  fetch(`${API_URL}/link-bio-ads/${currentAd._id}/click`, { method: 'POST' }).catch(() => {});
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="block w-full rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                style={{
                  border: `1px solid ${theme.badgeBorder}`,
                  background: 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <img
                  src={currentAd.gif}
                  alt={currentAd.title || 'Ad'}
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '80px', minHeight: '40px' }}
                  loading="lazy"
                />
              </motion.a>
            </AnimatePresence>
            {activeAds.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {activeAds.map((ad, i) => (
                  <div
                    key={ad._id}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: i === currentAdIndex % activeAds.length ? theme.accent : 'rgba(255,255,255,0.15)'
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Advertise Here button — only if ads are enabled */}
        {linkInBioAdsEnabled && aquaPaySlug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-6"
          >
            <button
              onClick={() => setShowAdModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-[1.03] text-xs font-semibold hover:brightness-95"
              style={advertiseBtnStyle}
            >
              <FaBullhorn className="w-3 h-3" />
              Advertise Here
            </button>
          </motion.div>
        )}

        {/* Powered by — premium pill badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-auto pt-8 flex flex-col items-center gap-3"
        >
          <a
            href="https://www.aquads.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all duration-300 hover:opacity-90"
            style={{
              background: theme.badgeBg,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.badgeBorder}`
            }}
          >
            <span className="text-slate-500 text-xs font-medium">Powered by</span>
            <span className="font-semibold text-sm" style={{ fontFamily: "'Syne', sans-serif", color: theme.accent }}>
              Aquads.xyz
            </span>
            <img
              src="/alogo.png"
              alt="Aquads"
              className="h-5 opacity-70"
              style={{ filter: `drop-shadow(0 0 8px ${theme.avatarGlow})` }}
            />
          </a>
        </motion.div>
        </div>
      </div>

      {/* Ad purchase modal */}
      {showAdModal && linkInBioAdsEnabled && aquaPaySlug && (
        <CreateLinkBioAdModal
          onClose={() => setShowAdModal(false)}
          targetUsername={data.username}
          aquaPaySlug={aquaPaySlug}
          pricing={linkInBioAdPricing}
        />
      )}

      {/* Keyframe for hover shine — inject once */}
      <style>{`
        @keyframes linkInBioShine {
          from { background-position: 200% 0; }
          to   { background-position: -100% 0; }
        }
      `}</style>
    </motion.div>
  );
};

export default LinkInBio;
