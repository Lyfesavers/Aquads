import React from 'react';
import {
  FaExternalLinkAlt,
  FaDiscord,
  FaGuilded,
  FaTwitter,
  FaTelegram,
  FaWhatsapp,
  FaWeixin,
  FaLine,
  FaSignal,
  FaFacebook,
  FaMastodon,
  FaSlack,
  FaSkype,
  FaViber,
  FaRocketchat,
  FaTiktok,
  FaYoutube,
  FaVimeo,
  FaTwitch,
  FaInstagram,
  FaSnapchat,
  FaPinterest,
  FaFlickr,
  FaGithub,
  FaGitlab,
  FaCodepen,
  FaStackOverflow,
  FaDev,
  FaItchIo,
  FaMedium,
  FaTumblr,
  FaSpotify,
  FaSoundcloud,
  FaLinkedin,
  FaPatreon,
  FaPaypal,
  FaStripe,
  FaEtsy,
  FaAmazon,
  FaShopify,
  FaEbay,
  FaReddit,
  FaQuora,
  FaProductHunt,
  FaGoodreads,
  FaStrava,
  FaMeetup,
  FaDropbox,
  FaGoogle,
  FaApple,
  FaMicrosoft,
  FaVk,
  FaWeibo,
  FaXing
} from 'react-icons/fa';
import {
  CUSTOM_BIO_ICON_CATALOG,
  CUSTOM_BIO_ICON_MAP,
  LEGACY_BIO_ICON_KEY_ALIASES,
  IconAuto,
  IconLink
} from './linkInBioCustomIcons';

export const AQUADS_LOGO_SRC = '/Aquadsnewlogo.png';

/** Picker in dashboard — custom Aquads icons + auto + Aquads logo. */
export const LINK_IN_BIO_ICON_PICKER = [
  ...CUSTOM_BIO_ICON_CATALOG,
  { id: 'aquads', label: 'Aquads', imageSrc: AQUADS_LOGO_SRC, group: 'Brand' }
];

export const LINK_IN_BIO_ICON_GROUPS = [...new Set(LINK_IN_BIO_ICON_PICKER.map((o) => o.group || 'Other'))];

const PICKER_BY_ID = Object.fromEntries(LINK_IN_BIO_ICON_PICKER.map((o) => [o.id, o]));

function isValidIconImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const t = url.trim();
  return t.length > 0 && /^https?:\/\//i.test(t);
}

function normalizeIconKey(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const key = raw.trim().toLowerCase();
  if (!key || key === 'auto') return '';
  return LEGACY_BIO_ICON_KEY_ALIASES[key] || key;
}

function resolveCustomIconComponent(key) {
  const normalized = normalizeIconKey(key);
  if (!normalized) return null;
  if (normalized === 'aquads') return null;
  return CUSTOM_BIO_ICON_MAP[normalized] || null;
}

/** Known brand logos from the URL (Google, Discord, etc.). Unrecognized URLs fall back to custom link icon. */
export function getIconFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return { type: 'custom', Icon: IconLink };
  }
  try {
    const host = (new URL(url).hostname || '').toLowerCase().replace(/^www\./, '');
    if (host.includes('aquads.xyz') || host === 'aquads.xyz') {
      return { type: 'image', src: AQUADS_LOGO_SRC };
    }
    if (host.includes('discord')) return { type: 'brand', Icon: FaDiscord };
    if (host.includes('guilded')) return { type: 'brand', Icon: FaGuilded };
    if (host.includes('x.com') || host === 'twitter.com') return { type: 'brand', Icon: FaTwitter };
    if (host.includes('t.me') || host.includes('telegram')) return { type: 'brand', Icon: FaTelegram };
    if (host.includes('whatsapp') || host.includes('wa.me')) return { type: 'brand', Icon: FaWhatsapp };
    if (host.includes('weixin') || host.includes('wechat')) return { type: 'brand', Icon: FaWeixin };
    if (host.includes('line.me') || host.includes('line.naver')) return { type: 'brand', Icon: FaLine };
    if (host.includes('signal.') || host.includes('signalmessenger')) return { type: 'brand', Icon: FaSignal };
    if (host.includes('messenger') || host.includes('fb.com') || host.includes('fb.me') || host.includes('facebook')) return { type: 'brand', Icon: FaFacebook };
    if (host.includes('mastodon') || host.includes('mstdn')) return { type: 'brand', Icon: FaMastodon };
    if (host.includes('slack')) return { type: 'brand', Icon: FaSlack };
    if (host.includes('skype')) return { type: 'brand', Icon: FaSkype };
    if (host.includes('viber')) return { type: 'brand', Icon: FaViber };
    if (host.includes('rocket.chat') || host.includes('rocketchat')) return { type: 'brand', Icon: FaRocketchat };
    if (host.includes('tiktok')) return { type: 'brand', Icon: FaTiktok };
    if (host.includes('youtube') || host.includes('youtu.be')) return { type: 'brand', Icon: FaYoutube };
    if (host.includes('vimeo')) return { type: 'brand', Icon: FaVimeo };
    if (host.includes('twitch')) return { type: 'brand', Icon: FaTwitch };
    if (host.includes('instagram')) return { type: 'brand', Icon: FaInstagram };
    if (host.includes('snapchat')) return { type: 'brand', Icon: FaSnapchat };
    if (host.includes('pinterest')) return { type: 'brand', Icon: FaPinterest };
    if (host.includes('flickr')) return { type: 'brand', Icon: FaFlickr };
    if (host.includes('github')) return { type: 'brand', Icon: FaGithub };
    if (host.includes('gitlab')) return { type: 'brand', Icon: FaGitlab };
    if (host.includes('codepen')) return { type: 'brand', Icon: FaCodepen };
    if (host.includes('stackoverflow') || host.includes('stackexchange')) return { type: 'brand', Icon: FaStackOverflow };
    if (host.includes('dev.to')) return { type: 'brand', Icon: FaDev };
    if (host.includes('itch.io')) return { type: 'brand', Icon: FaItchIo };
    if (host.includes('medium')) return { type: 'brand', Icon: FaMedium };
    if (host.includes('tumblr')) return { type: 'brand', Icon: FaTumblr };
    if (host.includes('spotify')) return { type: 'brand', Icon: FaSpotify };
    if (host.includes('soundcloud')) return { type: 'brand', Icon: FaSoundcloud };
    if (host.includes('linkedin')) return { type: 'brand', Icon: FaLinkedin };
    if (host.includes('patreon')) return { type: 'brand', Icon: FaPatreon };
    if (host.includes('paypal')) return { type: 'brand', Icon: FaPaypal };
    if (host.includes('stripe')) return { type: 'brand', Icon: FaStripe };
    if (host.includes('etsy')) return { type: 'brand', Icon: FaEtsy };
    if (host.includes('amazon')) return { type: 'brand', Icon: FaAmazon };
    if (host.includes('shopify')) return { type: 'brand', Icon: FaShopify };
    if (host.includes('ebay')) return { type: 'brand', Icon: FaEbay };
    if (host.includes('reddit')) return { type: 'brand', Icon: FaReddit };
    if (host.includes('quora')) return { type: 'brand', Icon: FaQuora };
    if (host.includes('producthunt')) return { type: 'brand', Icon: FaProductHunt };
    if (host.includes('goodreads')) return { type: 'brand', Icon: FaGoodreads };
    if (host.includes('strava')) return { type: 'brand', Icon: FaStrava };
    if (host.includes('meetup')) return { type: 'brand', Icon: FaMeetup };
    if (host.includes('dropbox')) return { type: 'brand', Icon: FaDropbox };
    if (host.includes('google')) return { type: 'brand', Icon: FaGoogle };
    if (host.includes('apple.com') || host.includes('music.apple')) return { type: 'brand', Icon: FaApple };
    if (host.includes('microsoft')) return { type: 'brand', Icon: FaMicrosoft };
    if (host.includes('vk.com') || host === 'vk') return { type: 'brand', Icon: FaVk };
    if (host.includes('weibo')) return { type: 'brand', Icon: FaWeibo };
    if (host.includes('xing')) return { type: 'brand', Icon: FaXing };
  } catch (_) {}
  return { type: 'custom', Icon: IconLink };
}

/** Custom image URL > picked icon > URL brand auto-detect > generic link icon. */
export function resolveBioLinkIcon(link, url) {
  const imageUrl = link?.iconImageUrl;
  if (isValidIconImageUrl(imageUrl)) {
    return { type: 'image', src: imageUrl.trim() };
  }

  const key = typeof link?.iconKey === 'string' ? link.iconKey.trim().toLowerCase() : '';
  if (key && key !== 'auto') {
    const picked = PICKER_BY_ID[normalizeIconKey(key)] || PICKER_BY_ID[key];
    if (picked?.imageSrc) return { type: 'image', src: picked.imageSrc };
    const CustomIcon = resolveCustomIconComponent(key);
    if (CustomIcon) return { type: 'custom', Icon: CustomIcon };
    if (key === 'aquads') return { type: 'image', src: AQUADS_LOGO_SRC };
  }

  return getIconFromUrl(url);
}

export function getEffectiveIconPickerId(link, url) {
  if (isValidIconImageUrl(link?.iconImageUrl)) return 'custom-image';
  const key = typeof link?.iconKey === 'string' ? link.iconKey.trim().toLowerCase() : '';
  if (key && key !== 'auto') return normalizeIconKey(key) || key;
  return 'auto';
}

export function BioLinkIcon({ link, url, className, style, iconColor }) {
  const resolved = resolveBioLinkIcon(link, url);
  if (resolved.type === 'image') {
    return (
      <img
        src={resolved.src}
        alt=""
        className={className}
        style={{ ...style, objectFit: 'contain' }}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }
  const Icon = resolved.Icon || IconLink;
  return <Icon className={className} style={{ ...style, color: iconColor || style?.color }} />;
}

export { IconAuto, IconLink };
