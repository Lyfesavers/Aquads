import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../services/api';
import { resolveLinkInBioButtonLook } from '../utils/linkInBioButtonLook';
import CreateLinkBioAdModal from './CreateLinkBioAdModal';
import {
  FaBullhorn,
  FaExternalLinkAlt,
  FaDiscord,
  FaTwitter,
  FaTelegram,
  FaGithub,
  FaYoutube,
  FaInstagram,
  FaLinkedin,
  FaReddit,
  FaTwitch,
  FaSpotify,
  FaFacebook,
  FaWhatsapp,
  FaTiktok,
  FaSnapchat,
  FaPinterest,
  FaTumblr,
  FaMedium,
  FaSoundcloud,
  FaPatreon,
  FaVimeo,
  FaDribbble,
  FaBehance,
  FaFigma,
  FaSlack,
  FaWeixin,
  FaLine,
  FaSignal,
  FaMastodon,
  FaEtsy,
  FaPaypal,
  FaAmazon,
  FaApple,
  FaGoogle,
  FaMicrosoft,
  FaSkype,
  FaCodepen,
  FaArtstation,
  FaBandcamp,
  FaDeezer,
  FaAudible,
  FaBlogger,
  FaWordpress,
  FaKickstarter,
  FaDeviantart,
  FaGoodreads,
  FaImdb,
  FaStrava,
  FaMeetup,
  FaFoursquare,
  FaYelp,
  FaQuora,
  FaStackOverflow,
  FaDev,
  FaDropbox,
  FaFlickr,
  FaUnsplash,
  FaShopify,
  FaEbay,
  FaItchIo,
  FaMixcloud,
  FaLastfm,
  FaSquarespace,
  FaWix,
  FaViber,
  FaVk,
  FaWeibo,
  FaXing,
  FaYahoo,
  FaProductHunt,
  FaRocketchat,
  FaTrello,
  FaUber,
  FaLyft,
  FaAirbnb,
  FaTripadvisor,
  FaGuilded,
  FaGitlab,
  FaStripe
} from 'react-icons/fa';

// Map URL hostname to social icon (all major platforms people use)
const getSocialIcon = (url) => {
  if (!url || typeof url !== 'string') return FaExternalLinkAlt;
  try {
    const u = new URL(url);
    const host = (u.hostname || '').toLowerCase().replace(/^www\./, '');
    // Social & messaging
    if (host.includes('discord')) return FaDiscord;
    if (host.includes('guilded')) return FaGuilded;
    if (host.includes('x.com') || host === 'twitter.com') return FaTwitter;
    if (host.includes('t.me') || host.includes('telegram')) return FaTelegram;
    if (host.includes('whatsapp') || host.includes('wa.me')) return FaWhatsapp;
    if (host.includes('weixin') || host.includes('wechat')) return FaWeixin;
    if (host.includes('line.me') || host.includes('line.naver')) return FaLine;
    if (host.includes('signal.') || host.includes('signalmessenger')) return FaSignal;
    if (host.includes('messenger') || host.includes('fb.com') || host.includes('fb.me') || host.includes('facebook')) return FaFacebook;
    if (host.includes('mastodon') || host.includes('mstdn')) return FaMastodon;
    if (host.includes('slack')) return FaSlack;
    if (host.includes('skype')) return FaSkype;
    if (host.includes('viber')) return FaViber;
    if (host.includes('rocket.chat') || host.includes('rocketchat')) return FaRocketchat;
    // Short-form & video
    if (host.includes('tiktok')) return FaTiktok;
    if (host.includes('youtube') || host.includes('youtu.be')) return FaYoutube;
    if (host.includes('vimeo')) return FaVimeo;
    if (host.includes('twitch')) return FaTwitch;
    if (host.includes('dailymotion')) return FaExternalLinkAlt; // no icon in our set
    // Photo & visual
    if (host.includes('instagram')) return FaInstagram;
    if (host.includes('snapchat')) return FaSnapchat;
    if (host.includes('pinterest')) return FaPinterest;
    if (host.includes('flickr')) return FaFlickr;
    if (host.includes('unsplash')) return FaUnsplash;
    if (host.includes('deviantart')) return FaDeviantart;
    if (host.includes('artstation')) return FaArtstation;
    if (host.includes('dribbble')) return FaDribbble;
    if (host.includes('behance')) return FaBehance;
    if (host.includes('figma')) return FaFigma;
    // Dev & tech
    if (host.includes('github')) return FaGithub;
    if (host.includes('gitlab')) return FaGitlab;
    if (host.includes('bitbucket')) return FaExternalLinkAlt;
    if (host.includes('codepen')) return FaCodepen;
    if (host.includes('stackoverflow') || host.includes('stackexchange')) return FaStackOverflow;
    if (host.includes('dev.to')) return FaDev;
    if (host.includes('itch.io')) return FaItchIo;
    // Blog & writing
    if (host.includes('medium')) return FaMedium;
    if (host.includes('tumblr')) return FaTumblr;
    if (host.includes('blogger')) return FaBlogger;
    if (host.includes('wordpress')) return FaWordpress;
    if (host.includes('substack')) return FaExternalLinkAlt;
    if (host.includes('ghost.org')) return FaExternalLinkAlt;
    // Music & audio
    if (host.includes('spotify')) return FaSpotify;
    if (host.includes('soundcloud')) return FaSoundcloud;
    if (host.includes('bandcamp')) return FaBandcamp;
    if (host.includes('deezer')) return FaDeezer;
    if (host.includes('audible')) return FaAudible;
    if (host.includes('mixcloud')) return FaMixcloud;
    if (host.includes('last.fm')) return FaLastfm;
    if (host.includes('apple.com/music') || host.includes('music.apple')) return FaApple;
    // Biz & support
    if (host.includes('linkedin')) return FaLinkedin;
    if (host.includes('patreon')) return FaPatreon;
    if (host.includes('kickstarter')) return FaKickstarter;
    if (host.includes('paypal')) return FaPaypal;
    if (host.includes('stripe')) return FaStripe;
    // Shopping & marketplaces
    if (host.includes('etsy')) return FaEtsy;
    if (host.includes('amazon')) return FaAmazon;
    if (host.includes('shopify')) return FaShopify;
    if (host.includes('ebay')) return FaEbay;
    // Local & travel
    if (host.includes('airbnb')) return FaAirbnb;
    if (host.includes('tripadvisor')) return FaTripadvisor;
    if (host.includes('yelp')) return FaYelp;
    if (host.includes('foursquare')) return FaFoursquare;
    if (host.includes('meetup')) return FaMeetup;
    if (host.includes('uber')) return FaUber;
    if (host.includes('lyft')) return FaLyft;
    // Other communities & content
    if (host.includes('reddit')) return FaReddit;
    if (host.includes('quora')) return FaQuora;
    if (host.includes('producthunt')) return FaProductHunt;
    if (host.includes('goodreads')) return FaGoodreads;
    if (host.includes('imdb')) return FaImdb;
    if (host.includes('strava')) return FaStrava;
    if (host.includes('trello')) return FaTrello;
    // Storage & productivity
    if (host.includes('dropbox')) return FaDropbox;
    if (host.includes('google')) return FaGoogle;
    if (host.includes('microsoft')) return FaMicrosoft;
    // Sites & builders
    if (host.includes('squarespace')) return FaSquarespace;
    if (host.includes('wix')) return FaWix;
    // More international
    if (host.includes('vk.com') || host === 'vk') return FaVk;
    if (host.includes('weibo')) return FaWeibo;
    if (host.includes('xing')) return FaXing;
    if (host.includes('yahoo')) return FaYahoo;
  } catch (_) {}
  return FaExternalLinkAlt;
};

/**
 * Only “classic” social / community profile URLs go in the compact icon row.
 * Other recognized URLs (GitHub, Spotify, Google, shops, etc.) stay full-width buttons but still get their icon on the button.
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

/** Solid by default; translucent enables glass (blur + rgba). */
function getLinkButtonSurface({ fill, translucent, buttonHex, buttonTheme, theme, hasBackgroundImage }) {
  const hx = normalizeHex(buttonHex);
  let background = '#161b22';
  let border = `1px solid ${hexToRgba(hx, 0.42)}`;
  let backdropFilter = 'none';

  if (fill === 'filled') {
    if (translucent) {
      background = hasBackgroundImage ? theme.accentFilled : hexToRgba(hx, 0.32);
      border = `1px solid ${hexToRgba(hx, 0.55)}`;
      backdropFilter = 'blur(12px)';
    } else {
      background = hx;
      border = `1px solid ${hexToRgba(hx, 0.9)}`;
    }
  } else if (fill === 'minimal') {
    background = 'transparent';
    border = `2px solid ${hx}`;
  } else {
    if (translucent) {
      background = hasBackgroundImage ? theme.accentFilled : 'rgba(255, 255, 255, 0.06)';
      border = `1px solid ${hasBackgroundImage ? theme.accent : buttonTheme.badgeBorder}`;
      backdropFilter = 'blur(12px)';
    } else {
      background = hasBackgroundImage ? '#0e1018' : '#161b22';
      border = `1px solid ${hexToRgba(hx, hasBackgroundImage ? 0.5 : 0.38)}`;
    }
  }

  return { background, border, backdropFilter };
}

function getLinkButtonIconChipStyle({ fill, translucent, buttonHex, buttonTheme, theme }) {
  const hx = normalizeHex(buttonHex);
  if (fill === 'filled' && !translucent) {
    return { color: theme.accent, backgroundColor: 'rgba(0, 0, 0, 0.22)' };
  }
  if (fill === 'minimal') {
    return { color: theme.accent, backgroundColor: hexToRgba(hx, translucent ? 0.12 : 0.14) };
  }
  return {
    color: theme.accent,
    backgroundColor: translucent ? buttonTheme.accentHover : 'rgba(0, 0, 0, 0.28)'
  };
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

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
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
        <div className="relative flex flex-col items-center gap-6">
          <div className="w-28 h-28 rounded-full bg-white/5 animate-pulse" style={{ boxShadow: '0 0 60px rgba(34, 211, 238, 0.08)' }} />
          <div className="h-6 w-44 rounded-full bg-white/10 animate-pulse" />
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
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

  const { displayName, image, bioLinks, linkInBioTagline, linkInBioAccentColor, linkInBioButtonColor, linkInBioBackgroundImageUrl, linkInBioAdsEnabled, linkInBioAdPricing, aquaPaySlug } = data;
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
  const theme = buildThemeFromAccent(accentHex);
  const buttonTheme = buildThemeFromAccent(buttonHex);
  const btnLook = resolveLinkInBioButtonLook(data);
  const radiusClass = btnLook.shape === 'pill' ? 'rounded-full' : 'rounded-2xl';
  const buttonSurface = getLinkButtonSurface({
    fill: btnLook.fill,
    translucent: btnLook.translucent,
    buttonHex,
    buttonTheme,
    theme,
    hasBackgroundImage
  });
  const iconChipStyle = getLinkButtonIconChipStyle({
    fill: btnLook.fill,
    translucent: btnLook.translucent,
    buttonHex,
    buttonTheme,
    theme
  });
  const accentNorm = normalizeHex(accentHex).toLowerCase();
  const buttonNorm = normalizeHex(buttonHex).toLowerCase();
  const linkTitleColor =
    btnLook.fill === 'filled' && !btnLook.translucent && accentNorm === buttonNorm
      ? contrastOnTintHex(accentHex)
      : theme.accent;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center px-4 py-12 pb-20 relative overflow-hidden"
      style={{
        background: hasBackgroundImage ? 'transparent' : 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 40%, #060910 100%)',
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

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Avatar with soft glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.orb2} 50%, transparent 100%)`,
              filter: 'blur(20px)',
              opacity: 0.5
            }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <img
            src={image}
            alt=""
            className="relative w-28 h-28 rounded-full object-cover border-2 border-white/10 shadow-xl"
            style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 80px ${theme.avatarGlow}` }}
          />
        </motion.div>

        {/* Display name — distinctive typography */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className={`text-2xl font-semibold text-white tracking-tight text-center ${taglineText || hasSocialLinks ? 'mb-2' : 'mb-10'}`}
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}
        >
          {displayName}
        </motion.h1>

        {taglineText ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="text-slate-400 text-sm text-center max-w-sm mx-auto leading-relaxed mb-6 px-1"
          >
            {taglineText}
          </motion.p>
        ) : null}

        {hasSocialLinks ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
            className="flex flex-wrap justify-center gap-2.5 w-full mb-8 px-1"
            role="list"
            aria-label="Social links"
          >
            {socialLinks.map((link, i) => {
              const IconComponent = getSocialIcon(link.url);
              return (
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
                    background: hexToRgba(normalizeHex(accentHex), hasBackgroundImage ? 0.48 : 0.88),
                    color: normalizeHex(buttonHex),
                    border: `1px solid ${hexToRgba(normalizeHex(accentHex), hasBackgroundImage ? 0.75 : 1)}`,
                    backdropFilter: hasBackgroundImage ? 'blur(12px)' : 'none',
                    boxShadow: `0 0 0 1px ${theme.badgeBorder}`
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <IconComponent className="w-5 h-5" />
                </motion.a>
              );
            })}
          </motion.div>
        ) : null}

        {/* Links — staggered entrance + premium hover */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full space-y-3"
        >
          {hasButtonLinks ? (
            buttonLinks.map((link, i) => {
              const IconComponent = getSocialIcon(link.url);
              return (
                <motion.a
                  key={`btn-${i}-${link.url}`}
                  variants={item}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center justify-between w-full px-5 py-4 text-left relative overflow-hidden transition-all duration-300 ${radiusClass}`}
                  style={{
                    background: buttonSurface.background,
                    border: buttonSurface.border,
                    backdropFilter: buttonSurface.backdropFilter
                  }}
                  whileHover={{
                    scale: 1.02,
                    y: -2,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Hover shine sweep — button color */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(105deg, transparent 0%, ${buttonTheme.shine} 45%, ${buttonTheme.shine} 55%, transparent 100%)`,
                      backgroundSize: '200% 100%',
                      animation: 'linkInBioShine 0.6s ease-out'
                    }}
                  />
                  <span className="relative flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <span
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors duration-300 group-hover:opacity-100"
                      style={iconChipStyle}
                    >
                      <IconComponent className="w-5 h-5" />
                    </span>
                    <span className="font-bold truncate" style={{ fontFamily: "'DM Sans', sans-serif", color: linkTitleColor }}>
                      {link.title}
                    </span>
                  </span>
                  <span
                    className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ color: linkTitleColor }}
                  >
                    <FaExternalLinkAlt className="w-4 h-4" />
                  </span>
                </motion.a>
              );
            })
          ) : !hasAnyLinks ? (
            <motion.p variants={item} className="text-slate-500 text-center py-10 text-sm">
              No links yet.
            </motion.p>
          ) : null}
        </motion.div>

        {/* Banner Ad Display — pill-shaped horizontal at bottom */}
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-[1.03] text-xs font-semibold shadow-lg hover:brightness-95"
              style={{
                background: '#f0ece6',
                color: theme.accent
              }}
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
              src="/Aquadsnewlogo.png"
              alt="Aquads"
              className="h-5 opacity-70"
              style={{ filter: `drop-shadow(0 0 8px ${theme.avatarGlow})` }}
            />
          </a>
        </motion.div>
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
