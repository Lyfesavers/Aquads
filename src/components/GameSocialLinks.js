import React from 'react';
import {
  FaTwitter,
  FaDiscord,
  FaTelegram,
  FaYoutube,
  FaTiktok,
  FaFacebook,
  FaInstagram,
  FaTwitch,
  FaReddit,
  FaLink,
  FaLinkedin,
  FaGithub,
  FaMedium
} from 'react-icons/fa';

export const GAME_SOCIAL_PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'discord', label: 'Discord' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'medium', label: 'Medium' },
  { value: 'website', label: 'Website / Other' }
];

const PLATFORM_STYLES = {
  twitter: { Icon: FaTwitter, className: 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30' },
  discord: { Icon: FaDiscord, className: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30' },
  telegram: { Icon: FaTelegram, className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30' },
  youtube: { Icon: FaYoutube, className: 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600/30' },
  tiktok: { Icon: FaTiktok, className: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/35 hover:bg-fuchsia-500/25' },
  facebook: { Icon: FaFacebook, className: 'bg-blue-700/25 text-blue-200 border-blue-600/40 hover:bg-blue-700/35' },
  instagram: { Icon: FaInstagram, className: 'bg-pink-600/20 text-pink-200 border-pink-500/40 hover:bg-pink-600/30' },
  twitch: { Icon: FaTwitch, className: 'bg-purple-600/25 text-purple-200 border-purple-500/40 hover:bg-purple-600/35' },
  reddit: { Icon: FaReddit, className: 'bg-orange-600/20 text-orange-200 border-orange-500/40 hover:bg-orange-600/30' },
  linkedin: { Icon: FaLinkedin, className: 'bg-blue-600/20 text-blue-200 border-blue-500/40 hover:bg-blue-600/30' },
  github: { Icon: FaGithub, className: 'bg-gray-600/40 text-gray-100 border-gray-500/50 hover:bg-gray-600/55' },
  medium: { Icon: FaMedium, className: 'bg-green-700/25 text-green-200 border-green-600/40 hover:bg-green-700/35' },
  website: { Icon: FaLink, className: 'bg-gray-600/30 text-gray-200 border-gray-500/40 hover:bg-gray-600/45' }
};

const DEFAULT_STYLE = { Icon: FaLink, className: 'bg-gray-600/30 text-gray-200 border-gray-500/40 hover:bg-gray-600/45' };

export const sanitizeGameSocialsForApi = (rows, { maxItems = 12 } = {}) => {
  if (!Array.isArray(rows)) return [];
  const allowed = new Set(GAME_SOCIAL_PLATFORM_OPTIONS.map((o) => o.value));
  const out = [];
  for (const row of rows) {
    if (!row || out.length >= maxItems) break;
    const platform = typeof row.platform === 'string' ? row.platform.trim() : '';
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!url || !platform || !allowed.has(platform)) continue;
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      continue;
    }
    out.push({ platform, url });
  }
  return out;
};

/**
 * Rounded icon buttons for game cards / detail page.
 */
const GameSocialLinks = ({ socials, size = 'md', className = '' }) => {
  if (!socials || !socials.length) return null;

  const items = socials.filter((s) => s && s.url && s.platform);
  if (!items.length) return null;

  const sizeCls = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-11 h-11 text-lg' : 'w-9 h-9 text-base';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map((s, i) => {
        const meta = PLATFORM_STYLES[s.platform] || DEFAULT_STYLE;
        const { Icon } = meta;
        const label = GAME_SOCIAL_PLATFORM_OPTIONS.find((o) => o.value === s.platform)?.label || 'Link';
        return (
          <a
            key={`${s.platform}-${i}`}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className={`inline-flex items-center justify-center rounded-full border transition-colors ${sizeCls} ${meta.className}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon aria-hidden />
            <span className="sr-only">{label}</span>
          </a>
        );
      })}
    </div>
  );
};

export default GameSocialLinks;
