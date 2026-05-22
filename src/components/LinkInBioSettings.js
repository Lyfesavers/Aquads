import React, { useState, useEffect } from 'react';
import { updateLinkInBio, socket } from '../services/api';
import { resolveLinkInBioButtonLook } from '../utils/linkInBioButtonLook';
import { BioLinkIcon, LINK_IN_BIO_ICON_PICKER, LINK_IN_BIO_ICON_GROUPS, getEffectiveIconPickerId, getIconPickerLabel } from '../utils/linkInBioIcons';
import { FaPlus, FaTrash, FaCopy, FaChevronUp, FaChevronDown, FaLink, FaExternalLinkAlt, FaPalette, FaImage, FaBullhorn, FaDollarSign, FaChartBar, FaEye, FaMousePointer } from 'react-icons/fa';

const MAX_LINKS = 30;
const MAX_TAGLINE = 200;
const BASE_URL = 'https://www.aquads.xyz';

const PRESET_COLORS = [
  '#22d3ee', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#fb923c', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#1e3a5f'
];

const TEXT_PRESET_COLORS = [
  '#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8',
  '#22d3ee', '#eab308', '#fb923c', '#f43f5e', '#a855f7', '#84cc16', '#22c55e'
];

const BACKGROUND_COLOR_PRESETS = [
  '#0c0f1a', '#0a0e18', '#060910', '#111827', '#0f172a', '#18181b', '#1e1b4b', '#1a1a2e',
  '#134e4a', '#1e3a5f', '#312e81', '#3f1d1d', '#422006', '#14532d', '#1e293b', '#27272a'
];

const BUTTON_SHAPE_OPTIONS = [
  { id: 'rounded', label: 'Rounded', desc: 'Classic app-icon corners' },
  { id: 'pill', label: 'Soft squircle', desc: 'Extra-rounded tile shape' }
];

const BUTTON_FILL_OPTIONS = [
  { id: 'bordered', label: 'Bordered', desc: 'Dark tile + accent edge' },
  { id: 'filled', label: 'Filled', desc: 'Rich accent gradient fill' },
  { id: 'minimal', label: 'Outline', desc: 'Transparent with accent border' }
];

const LinkInBioSettings = ({ currentUser, onProfileUpdate, showNotification }) => {
  const [bioLinks, setBioLinks] = useState([]);
  const [accentColor, setAccentColor] = useState('#22d3ee');
  const [customColor, setCustomColor] = useState('');
  const [buttonColor, setButtonColor] = useState('');
  const [buttonColorCustom, setButtonColorCustom] = useState('');
  const [textColor, setTextColor] = useState('');
  const [textColorCustom, setTextColorCustom] = useState('');
  const [buttonShape, setButtonShape] = useState('rounded');
  const [buttonFill, setButtonFill] = useState('bordered');
  const [buttonTranslucent, setButtonTranslucent] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [backgroundColorCustom, setBackgroundColorCustom] = useState('');
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adPricing, setAdPricing] = useState({ day: 10, threeDays: 20, sevenDays: 40 });
  const [tagline, setTagline] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    setBioLinks(Array.isArray(currentUser?.bioLinks) ? [...currentUser.bioLinks] : []);
  }, [currentUser?.bioLinks]);

  useEffect(() => {
    const t = currentUser?.linkInBioTagline;
    setTagline(typeof t === 'string' ? t : '');
  }, [currentUser?.linkInBioTagline]);

  useEffect(() => {
    const c = currentUser?.linkInBioAccentColor;
    if (c && /^#[0-9A-Fa-f]{3,6}$/.test(c)) {
      setAccentColor(c);
      if (!PRESET_COLORS.includes(c.toLowerCase())) setCustomColor(c);
    }
    const bc = currentUser?.linkInBioButtonColor;
    if (bc && /^#[0-9A-Fa-f]{3,6}$/.test(bc)) {
      setButtonColor(bc);
      if (!PRESET_COLORS.includes(bc.toLowerCase())) setButtonColorCustom(bc);
    } else {
      setButtonColor('');
      setButtonColorCustom('');
    }
    const tc = currentUser?.linkInBioTextColor;
    if (tc && /^#[0-9A-Fa-f]{3,6}$/.test(tc)) {
      setTextColor(tc);
      if (!TEXT_PRESET_COLORS.includes(tc.toLowerCase())) setTextColorCustom(tc);
      else setTextColorCustom('');
    } else {
      setTextColor('');
      setTextColorCustom('');
    }
    const look = resolveLinkInBioButtonLook(currentUser || {});
    setButtonShape(look.shape);
    setButtonFill(look.fill);
    setButtonTranslucent(look.translucent);
    const bg = currentUser?.linkInBioBackgroundImageUrl;
    setBackgroundImageUrl(typeof bg === 'string' ? bg : '');
    const bgColor = currentUser?.linkInBioBackgroundColor;
    if (bgColor && /^#[0-9A-Fa-f]{3,6}$/.test(bgColor)) {
      setBackgroundColor(bgColor);
      if (!BACKGROUND_COLOR_PRESETS.includes(bgColor.toLowerCase())) setBackgroundColorCustom(bgColor);
      else setBackgroundColorCustom('');
    } else {
      setBackgroundColor('');
      setBackgroundColorCustom('');
    }
  }, [
    currentUser?.linkInBioAccentColor,
    currentUser?.linkInBioButtonColor,
    currentUser?.linkInBioTextColor,
    currentUser?.linkInBioButtonShape,
    currentUser?.linkInBioButtonFill,
    currentUser?.linkInBioButtonTranslucent,
    currentUser?.linkInBioButtonStyle,
    currentUser?.linkInBioBackgroundImageUrl,
    currentUser?.linkInBioBackgroundColor
  ]);

  useEffect(() => {
    setAdsEnabled(Boolean(currentUser?.linkInBioAdsEnabled));
  }, [currentUser?.linkInBioAdsEnabled]);

  useEffect(() => {
    const p = currentUser?.linkInBioAdPricing;
    if (p && typeof p === 'object') {
      setAdPricing({
        day: p.day > 0 ? p.day : 10,
        threeDays: p.threeDays > 0 ? p.threeDays : 20,
        sevenDays: p.sevenDays > 0 ? p.sevenDays : 40
      });
    }
  }, [currentUser?.linkInBioAdPricing?.day, currentUser?.linkInBioAdPricing?.threeDays, currentUser?.linkInBioAdPricing?.sevenDays]);

  useEffect(() => {
    if (!currentUser?.emailVerified || !currentUser?.userId) return;

    const handleLoaded = (data) => setAnalytics(data);
    const handleUpdate = (data) => setAnalytics(data);

    socket.on('linkInBioAnalyticsLoaded', handleLoaded);
    socket.on('linkInBioAnalyticsUpdate', handleUpdate);

    socket.emit('requestLinkInBioAnalytics', { userId: currentUser.userId });

    return () => {
      socket.off('linkInBioAnalyticsLoaded', handleLoaded);
      socket.off('linkInBioAnalyticsUpdate', handleUpdate);
    };
  }, [currentUser?.emailVerified, currentUser?.userId]);

  const addLink = () => {
    if (bioLinks.length >= MAX_LINKS) {
      showNotification?.(`Maximum ${MAX_LINKS} links allowed`, 'error');
      return;
    }
    setBioLinks(prev => [...prev, { title: '', url: '', order: prev.length, iconKey: null, iconImageUrl: '' }]);
  };

  const removeLink = (index) => {
    setBioLinks(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i })));
  };

  const updateLink = (index, field, value) => {
    setBioLinks(prev => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const moveLink = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === bioLinks.length - 1) return;
    const next = [...bioLinks];
    const j = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[j]] = [next[j], next[index]];
    setBioLinks(next.map((l, i) => ({ ...l, order: i })));
  };

  const save = async () => {
    const sanitized = bioLinks
      .map((l, i) => {
        const row = {
          title: (l.title || '').trim().slice(0, 80) || 'Link',
          url: (l.url || '').trim(),
          order: i
        };
        const iconKey = typeof l.iconKey === 'string' ? l.iconKey.trim().toLowerCase() : '';
        if (iconKey && iconKey !== 'auto') row.iconKey = iconKey;
        const iconImage = (l.iconImageUrl || '').trim();
        if (iconImage && /^https?:\/\//i.test(iconImage)) row.iconImageUrl = iconImage;
        return row;
      })
      .filter(l => l.url);
    if (sanitized.some(l => !/^https?:\/\//i.test(l.url))) {
      showNotification?.('All URLs must start with https:// (or http://)', 'error');
      return;
    }
    const hex = customColor.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(customColor.trim()) ? customColor.trim() : accentColor;
    const btnHex = (buttonColorCustom.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(buttonColorCustom.trim()))
      ? buttonColorCustom.trim()
      : (buttonColor || null);
    const txtHex = (textColorCustom.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(textColorCustom.trim()))
      ? textColorCustom.trim()
      : (textColor || null);
    const bgHex = (backgroundColorCustom.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(backgroundColorCustom.trim()))
      ? backgroundColorCustom.trim()
      : (backgroundColor || null);
    const payload = {
      bioLinks: sanitized,
      linkInBioTagline: tagline.trim().slice(0, MAX_TAGLINE) || null,
      linkInBioAccentColor: hex,
      linkInBioButtonColor: btnHex || null,
      linkInBioTextColor: txtHex || null,
      linkInBioButtonShape: buttonShape,
      linkInBioButtonFill: buttonFill,
      linkInBioButtonTranslucent: buttonTranslucent,
      linkInBioBackgroundImageUrl: backgroundImageUrl.trim() || null,
      linkInBioBackgroundColor: bgHex || null,
      linkInBioAdsEnabled: adsEnabled,
      linkInBioAdPricing: {
        day: Math.max(1, adPricing.day || 10),
        threeDays: Math.max(1, adPricing.threeDays || 20),
        sevenDays: Math.max(1, adPricing.sevenDays || 40)
      }
    };
    const beforeSave = {
      ...currentUser,
      bioLinks: Array.isArray(currentUser?.bioLinks) ? currentUser.bioLinks.map((l) => ({ ...l })) : [],
      linkInBioAdPricing: currentUser?.linkInBioAdPricing ? { ...currentUser.linkInBioAdPricing } : undefined
    };
    onProfileUpdate?.((prev) => ({ ...prev, ...payload }), { silent: true, linkInBio: true });
    setSaving(true);
    try {
      const updated = await updateLinkInBio(payload);
      onProfileUpdate?.((prev) => ({ ...prev, ...updated }), { silent: true, linkInBio: true });
      if (updated.linkInBioAdsEnabled !== undefined) {
        setAdsEnabled(Boolean(updated.linkInBioAdsEnabled));
      }
      if (updated.linkInBioAdPricing) {
        setAdPricing({
          day: updated.linkInBioAdPricing.day > 0 ? updated.linkInBioAdPricing.day : 10,
          threeDays: updated.linkInBioAdPricing.threeDays > 0 ? updated.linkInBioAdPricing.threeDays : 20,
          sevenDays: updated.linkInBioAdPricing.sevenDays > 0 ? updated.linkInBioAdPricing.sevenDays : 40
        });
      }
      showNotification?.('Link in bio saved.', 'success');
    } catch (err) {
      onProfileUpdate?.(() => beforeSave, { silent: true, linkInBio: true });
      showNotification?.(err.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const profileUrl = currentUser?.username ? `${BASE_URL}/links/${currentUser.username}` : '';
  const copyUrl = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    showNotification?.('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerified = currentUser?.emailVerified === true;

  if (!isVerified) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6 text-center">
          <p className="text-amber-200 font-medium">Verify your email to use Link in bio</p>
          <p className="text-gray-400 text-sm mt-2">Once verified, you can add a custom link-in-bio page at aquads.xyz/links/yourname</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <p className="text-gray-400 text-sm">Your future page URL:</p>
          <p className="text-cyan-400 font-mono text-sm mt-1 break-all">{profileUrl || '—'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-6 border border-cyan-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center text-2xl">
              <FaLink className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Link in bio</h2>
              <p className="text-gray-400 text-sm">One link for your socials. Powered by Aquads.xyz</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-800/80 rounded-lg px-4 py-2 border border-gray-600/50">
              <p className="text-xs text-gray-500">Your page</p>
              <p className="text-cyan-400 font-mono text-sm break-all">{profileUrl}</p>
            </div>
            <button
              onClick={copyUrl}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${copied ? 'bg-green-600/20 text-green-400' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
            >
              <FaCopy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FaChartBar className="text-cyan-400" />
            Analytics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/40 rounded-xl p-4 border border-gray-600/40 text-center">
              <FaEye className="text-cyan-400 mx-auto mb-2 w-5 h-5" />
              <p className="text-2xl font-bold text-white">{(analytics.pageViews || 0).toLocaleString()}</p>
              <p className="text-gray-400 text-xs mt-1">Page Views</p>
            </div>
            <div className="bg-gray-700/40 rounded-xl p-4 border border-gray-600/40 text-center">
              <FaMousePointer className="text-cyan-400 mx-auto mb-2 w-5 h-5" />
              <p className="text-2xl font-bold text-white">{(analytics.totalAdClicks || 0).toLocaleString()}</p>
              <p className="text-gray-400 text-xs mt-1">Ad Clicks</p>
            </div>
          </div>
          {analytics.ads && analytics.ads.length > 0 && analytics.ads.some(a => a.clicks > 0) && (
            <div className="mt-4">
              <p className="text-gray-400 text-xs font-medium mb-2">Clicks per ad</p>
              <div className="space-y-2">
                {analytics.ads.filter(a => a.clicks > 0).map(ad => (
                  <div key={ad._id} className="flex items-center justify-between bg-gray-700/30 rounded-lg px-3 py-2 border border-gray-600/30">
                    <span className="text-white text-sm truncate mr-3">{ad.title}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ad.status === 'active' ? 'bg-green-500/20 text-green-400' : ad.status === 'expired' ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {ad.status}
                      </span>
                      <span className="text-cyan-400 font-semibold text-sm">{ad.clicks.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Background image & color */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <FaImage className="text-cyan-400" />
          Page background
        </h3>
        <p className="text-gray-400 text-sm mb-3">Set a background color or full-screen image. If both are set, the image takes priority.</p>

        <div className="mb-5">
          <p className="text-gray-300 text-sm font-medium mb-2">Background color</p>
          <p className="text-gray-500 text-xs mb-2">Used when no background image is set. Default is the Aquads dark gradient.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setBackgroundColor(''); setBackgroundColorCustom(''); }}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${!backgroundColor && !backgroundColorCustom ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
            >
              Default gradient
            </button>
            {BACKGROUND_COLOR_PRESETS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => { setBackgroundColor(hex); setBackgroundColorCustom(''); }}
                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${backgroundColor.toLowerCase() === hex ? 'border-white ring-2 ring-white/50' : 'border-gray-600 hover:border-gray-500'}`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor || backgroundColorCustom || '#0c0f1a'}
              onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundColorCustom(e.target.value); }}
              className="w-10 h-10 rounded cursor-pointer border border-gray-600 bg-transparent"
            />
            <input
              type="text"
              placeholder="#0c0f1a"
              value={backgroundColorCustom}
              onChange={(e) => {
                setBackgroundColorCustom(e.target.value);
                if (/^#[0-9A-Fa-f]{3,6}$/.test(e.target.value)) setBackgroundColor(e.target.value);
              }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <p className="text-gray-300 text-sm font-medium mb-2">Background image</p>
        <p className="text-gray-500 text-xs mb-3"><strong>Recommended dimensions:</strong> 1920×1080 or larger (16:9 works on all screens). The image will be scaled to cover the whole screen and cropped if needed. Leave empty to use your background color or the default gradient.</p>
        <input
          type="url"
          placeholder="https://example.com/your-image.jpg"
          value={backgroundImageUrl}
          onChange={(e) => setBackgroundImageUrl(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      {/* Color palette & button style */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <FaPalette className="text-cyan-400" />
          Color & tile style
        </h3>
        <p className="text-gray-400 text-sm mb-4">Pick your accent color and how app-style link tiles look on your page.</p>

        <div className="mb-5">
          <p className="text-gray-300 text-sm font-medium mb-2">Accent color</p>
          <p className="text-gray-500 text-xs mb-2">Controls link icon color, social icon color, highlights, and glow effects.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => { setAccentColor(hex); setCustomColor(''); }}
                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${accentColor.toLowerCase() === hex ? 'border-white ring-2 ring-white/50' : 'border-gray-600 hover:border-gray-500'}`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => { setAccentColor(e.target.value); setCustomColor(e.target.value); }}
              className="w-10 h-10 rounded cursor-pointer border border-gray-600 bg-transparent"
            />
            <input
              type="text"
              placeholder="#22d3ee"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                if (/^#[0-9A-Fa-f]{3,6}$/.test(e.target.value)) setAccentColor(e.target.value);
              }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-5">
          <p className="text-gray-300 text-sm font-medium mb-2">Button color</p>
          <p className="text-gray-500 text-xs mb-2">Optional. Tile backgrounds and social circle fills. Leave “Same as main” to match the accent color.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setButtonColor(''); setButtonColorCustom(''); }}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${!buttonColor && !buttonColorCustom ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
            >
              Same as main
            </button>
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => { setButtonColor(hex); setButtonColorCustom(''); }}
                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${(buttonColor === hex || buttonColorCustom === hex) ? 'border-white ring-2 ring-white/50' : 'border-gray-600 hover:border-gray-500'}`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={buttonColor || buttonColorCustom || accentColor}
              onChange={(e) => { setButtonColor(e.target.value); setButtonColorCustom(e.target.value); }}
              className="w-10 h-10 rounded cursor-pointer border border-gray-600 bg-transparent"
            />
            <input
              type="text"
              placeholder="Or custom hex"
              value={buttonColorCustom}
              onChange={(e) => {
                setButtonColorCustom(e.target.value);
                if (/^#[0-9A-Fa-f]{3,6}$/.test(e.target.value)) setButtonColor(e.target.value);
              }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-5">
          <p className="text-gray-300 text-sm font-medium mb-2">Text color</p>
          <p className="text-gray-500 text-xs mb-2">Optional. Sets the color for your short bio and link tile labels. Leave default for automatic contrast.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setTextColor(''); setTextColorCustom(''); }}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${!textColor && !textColorCustom ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
            >
              Default
            </button>
            {TEXT_PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => { setTextColor(hex); setTextColorCustom(''); }}
                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${(textColor === hex || textColorCustom === hex) ? 'border-white ring-2 ring-white/50' : 'border-gray-600 hover:border-gray-500'}`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor || textColorCustom || '#e2e8f0'}
              onChange={(e) => { setTextColor(e.target.value); setTextColorCustom(e.target.value); }}
              className="w-10 h-10 rounded cursor-pointer border border-gray-600 bg-transparent"
            />
            <input
              type="text"
              placeholder="Or custom hex"
              value={textColorCustom}
              onChange={(e) => {
                setTextColorCustom(e.target.value);
                if (/^#[0-9A-Fa-f]{3,6}$/.test(e.target.value)) setTextColor(e.target.value);
              }}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-300 text-sm font-medium mb-1">Tile shape</p>
            <p className="text-gray-500 text-xs mb-2">How rounded each app-style icon tile appears.</p>
            <div className="flex flex-wrap gap-2">
              {BUTTON_SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setButtonShape(opt.id)}
                  className={`px-4 py-2.5 rounded-lg border-2 text-left transition-all ${buttonShape === opt.id ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white bg-gray-700/30'}`}
                >
                  <span className="font-medium block">{opt.label}</span>
                  <span className="text-xs opacity-80">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-300 text-sm font-medium mb-1">Tile fill</p>
            <p className="text-gray-500 text-xs mb-2">Default is solid. Turn on glass below for a frosted look.</p>
            <div className="flex flex-wrap gap-2">
              {BUTTON_FILL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setButtonFill(opt.id)}
                  className={`px-4 py-2.5 rounded-lg border-2 text-left transition-all ${buttonFill === opt.id ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white bg-gray-700/30'}`}
                >
                  <span className="font-medium block">{opt.label}</span>
                  <span className="text-xs opacity-80">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-gray-600 bg-gray-700/30 px-4 py-3 hover:border-gray-500 transition-colors">
            <input
              type="checkbox"
              checked={buttonTranslucent}
              onChange={(e) => setButtonTranslucent(e.target.checked)}
              className="mt-1 rounded border-gray-500 text-cyan-500 focus:ring-cyan-500"
            />
            <span>
              <span className="text-gray-200 text-sm font-medium block">Translucent / glass</span>
              <span className="text-gray-500 text-xs">Softer, blurred see-through tiles. Off = fully solid colors (recommended).</span>
            </span>
          </label>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h3 className="text-white font-semibold mb-2">Short bio</h3>
        <p className="text-gray-400 text-sm mb-3">
          One line under your name (e.g. role or company). Shown only on your public link page.
        </p>
        <textarea
          value={tagline}
          onChange={(e) => setTagline(e.target.value.slice(0, MAX_TAGLINE))}
          placeholder="Designer · Web3 · Your company"
          rows={2}
          className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-y min-h-[2.75rem]"
        />
        <p className="text-gray-500 text-xs mt-1">{tagline.length} / {MAX_TAGLINE}</p>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h3 className="text-white font-semibold">Links</h3>
          <button
            type="button"
            onClick={addLink}
            disabled={bioLinks.length >= MAX_LINKS}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <FaPlus className="w-4 h-4" />
            Add link
          </button>
        </div>
        <p className="text-gray-500 text-xs mb-4">
          Social profile links show as a compact row under your bio. Other links use app-style tiles. When a URL isn&apos;t recognized, pick one of our custom icons below—or paste your own logo URL.
        </p>

        {bioLinks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No links yet. Add your first link above.</p>
        ) : (
          <ul className="space-y-3">
            {bioLinks.map((link, index) => {
              const activeIconId = getEffectiveIconPickerId(link, link.url);
              return (
              <li
                key={index}
                className="p-3 rounded-lg bg-gray-700/50 border border-gray-600/50"
              >
                <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveLink(index, 'up')} disabled={index === 0} className="text-gray-500 hover:text-white p-0.5 disabled:opacity-30" aria-label="Move up">
                    <FaChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => moveLink(index, 'down')} disabled={index === bioLinks.length - 1} className="text-gray-500 hover:text-white p-0.5 disabled:opacity-30" aria-label="Move down">
                    <FaChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-600/60 flex items-center justify-center flex-shrink-0 text-cyan-400">
                  <BioLinkIcon link={link} url={link.url} className="w-5 h-5" iconColor="#22d3ee" />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Label"
                    value={link.title}
                    onChange={e => updateLink(index, 'title', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={e => updateLink(index, 'url', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
                  title="Open"
                >
                  <FaExternalLinkAlt className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-600/40">
                  <p className="text-xs text-gray-500 mb-2">Tile icon — when the URL isn&apos;t auto-detected</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      value={activeIconId === 'custom-image' ? 'custom-image' : activeIconId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom-image') return;
                        setBioLinks((prev) => prev.map((l, i) => (
                          i === index
                            ? {
                              ...l,
                              iconKey: val === 'auto' ? null : val,
                              iconImageUrl: val !== 'auto' ? '' : (l.iconImageUrl || '')
                            }
                            : l
                        )));
                      }}
                      disabled={activeIconId === 'custom-image'}
                      className="flex-1 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {activeIconId === 'custom-image' && (
                        <option value="custom-image">Custom image URL</option>
                      )}
                      {LINK_IN_BIO_ICON_GROUPS.map((group) => (
                        <optgroup key={group} label={group}>
                          {LINK_IN_BIO_ICON_PICKER.filter((opt) => (opt.group || 'Other') === group).map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500 sm:w-36 sm:text-right flex-shrink-0">
                      {activeIconId === 'custom-image' ? 'Using custom URL' : getIconPickerLabel(activeIconId)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <input
                      type="url"
                      placeholder="Or paste a custom logo image URL"
                      value={link.iconImageUrl || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBioLinks((prev) => prev.map((l, i) => (
                          i === index
                            ? { ...l, iconImageUrl: v, iconKey: v.trim() ? null : l.iconKey }
                            : l
                        )));
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-xs focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </li>
            );
            })}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-gray-500 text-xs">{bioLinks.length} / {MAX_LINKS} links</p>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Monetize with Ads */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <FaBullhorn className="text-cyan-400" />
          Monetize with Ads
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Let anyone buy banner ad space on your link-in-bio page. Payments go directly to your AquaPay wallet via crypto.
        </p>

        {!currentUser?.aquaPay?.isEnabled ? (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-200 text-sm font-medium">AquaPay required</p>
            <p className="text-gray-400 text-xs mt-1">Enable AquaPay in your dashboard to receive ad payments directly to your wallet.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gray-700/30 border border-gray-600/50">
              <div>
                <p className="text-white text-sm font-medium">Enable ads on your page</p>
                <p className="text-gray-500 text-xs">An "Advertise Here" button will appear on your page</p>
              </div>
              <button
                type="button"
                onClick={() => setAdsEnabled(!adsEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${adsEnabled ? 'bg-cyan-500' : 'bg-gray-600'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${adsEnabled ? 'translate-x-6' : ''}`}
                />
              </button>
            </div>

            {adsEnabled && (
              <div className="space-y-3">
                <p className="text-gray-300 text-sm font-medium flex items-center gap-2">
                  <FaDollarSign className="text-cyan-400" />
                  Set your prices (USDC)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">24 Hours</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={adPricing.day}
                        onChange={(e) => setAdPricing(prev => ({ ...prev, day: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-7 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">3 Days</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={adPricing.threeDays}
                        onChange={(e) => setAdPricing(prev => ({ ...prev, threeDays: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-7 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">7 Days</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={adPricing.sevenDays}
                        onChange={(e) => setAdPricing(prev => ({ ...prev, sevenDays: parseFloat(e.target.value) || 0 }))}
                        className="w-full pl-7 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-700/20 border border-gray-600/30">
                  <p className="text-gray-400 text-xs">
                    <strong className="text-gray-300">Banner specs:</strong> 1280×200px, GIF/PNG/JPG. Displayed as a pill-shaped banner at the bottom of your page. Ads auto-activate on crypto payment.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-gray-500 text-xs text-center">
        Your page will show &quot;Powered by Aquads.xyz&quot; at the bottom.
      </p>
    </div>
  );
};

export default LinkInBioSettings;
