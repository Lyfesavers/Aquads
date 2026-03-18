import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_URL } from '../services/api';
import {
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

// Button style class names for link buttons
const BUTTON_STYLES = {
  rounded: 'rounded-2xl',
  pill: 'rounded-full',
  minimal: 'rounded-2xl border-0 bg-transparent',
  bordered: 'rounded-2xl bg-transparent',
  filled: 'rounded-2xl'
};

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

  useEffect(() => {
    if (!username) {
      setError('Invalid page');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/users/links/${encodeURIComponent(username)}`);
        if (!res.ok) {
          if (res.status === 404) setError('Page not found');
          else setError('Failed to load');
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

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

  const { displayName, image, bioLinks, linkInBioAccentColor, linkInBioButtonStyle } = data;
  const hasLinks = Array.isArray(bioLinks) && bioLinks.length > 0;
  const accentHex = (linkInBioAccentColor && /^#[0-9A-Fa-f]{3,6}$/.test(linkInBioAccentColor)) ? linkInBioAccentColor : '#22d3ee';
  const theme = buildThemeFromAccent(accentHex);
  const buttonStyleKey = ['rounded', 'pill', 'minimal', 'bordered', 'filled'].includes(linkInBioButtonStyle) ? linkInBioButtonStyle : 'rounded';
  const buttonClass = BUTTON_STYLES[buttonStyleKey] || BUTTON_STYLES.rounded;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center px-4 py-12 pb-20 relative overflow-hidden"
      style={{
        background: 'linear-gradient(165deg, #0c0f1a 0%, #0a0e18 40%, #060910 100%)',
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      {/* Layered background orbs — theme colors */}
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

      <div className="relative w-full max-w-md flex flex-col items-center">
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
          className="text-2xl font-semibold text-white tracking-tight mb-10 text-center"
          style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}
        >
          {displayName}
        </motion.h1>

        {/* Links — staggered entrance + premium hover */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full space-y-3"
        >
          {hasLinks ? (
            bioLinks.map((link, i) => {
              const IconComponent = getSocialIcon(link.url);
              return (
                <motion.a
                  key={i}
                  variants={item}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center justify-between w-full px-5 py-4 text-left relative overflow-hidden transition-all duration-300 ${buttonClass}`}
                  style={{
                    background: buttonStyleKey === 'filled' ? theme.accentFilled : buttonStyleKey === 'minimal' ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                    border: buttonStyleKey === 'minimal' ? `1px solid ${theme.accent}` : buttonStyleKey === 'bordered' ? `1px solid ${theme.badgeBorder}` : '1px solid rgba(255, 255, 255, 0.06)',
                    backdropFilter: buttonStyleKey === 'minimal' ? 'none' : 'blur(12px)'
                  }}
                  whileHover={{
                    scale: 1.02,
                    y: -2,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Hover shine sweep — theme color */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(105deg, transparent 0%, ${theme.shine} 45%, ${theme.shine} 55%, transparent 100%)`,
                      backgroundSize: '200% 100%',
                      animation: 'linkInBioShine 0.6s ease-out'
                    }}
                  />
                  <span className="relative flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <span
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors duration-300 group-hover:opacity-100"
                      style={{ color: theme.accent, backgroundColor: theme.accentHover }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </span>
                    <span className="text-white font-medium truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {link.title}
                    </span>
                  </span>
                  <span
                    className="relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ color: theme.accent }}
                  >
                    <FaExternalLinkAlt className="w-4 h-4" />
                  </span>
                </motion.a>
              );
            })
          ) : (
            <motion.p variants={item} className="text-slate-500 text-center py-10 text-sm">
              No links yet.
            </motion.p>
          )}
        </motion.div>

        {/* Powered by — premium pill badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-auto pt-14 flex flex-col items-center gap-3"
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
