import React, { useState, useEffect } from 'react';
import { updateLinkInBio } from '../services/api';
import { FaPlus, FaTrash, FaCopy, FaChevronUp, FaChevronDown, FaLink, FaExternalLinkAlt, FaPalette, FaImage, FaBullhorn, FaDollarSign } from 'react-icons/fa';

const MAX_LINKS = 12;
const BASE_URL = 'https://www.aquads.xyz';

const PRESET_COLORS = [
  '#22d3ee', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#fb923c', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#1e3a5f'
];

const BUTTON_STYLE_OPTIONS = [
  { id: 'rounded', label: 'Rounded', desc: 'Soft corners' },
  { id: 'pill', label: 'Pill', desc: 'Fully rounded' },
  { id: 'minimal', label: 'Minimal', desc: 'Outline only' },
  { id: 'bordered', label: 'Bordered', desc: 'Light border' },
  { id: 'filled', label: 'Filled', desc: 'Accent background' }
];

const LinkInBioSettings = ({ currentUser, onProfileUpdate, showNotification }) => {
  const [bioLinks, setBioLinks] = useState([]);
  const [accentColor, setAccentColor] = useState('#22d3ee');
  const [customColor, setCustomColor] = useState('');
  const [buttonColor, setButtonColor] = useState('');
  const [buttonColorCustom, setButtonColorCustom] = useState('');
  const [buttonStyle, setButtonStyle] = useState('rounded');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adPricing, setAdPricing] = useState({ day: 10, threeDays: 20, sevenDays: 40 });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBioLinks(Array.isArray(currentUser?.bioLinks) ? [...currentUser.bioLinks] : []);
  }, [currentUser?.bioLinks]);

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
    const s = currentUser?.linkInBioButtonStyle;
    if (s && BUTTON_STYLE_OPTIONS.some(o => o.id === s)) setButtonStyle(s);
    const bg = currentUser?.linkInBioBackgroundImageUrl;
    setBackgroundImageUrl(typeof bg === 'string' ? bg : '');
  }, [currentUser?.linkInBioAccentColor, currentUser?.linkInBioButtonColor, currentUser?.linkInBioButtonStyle, currentUser?.linkInBioBackgroundImageUrl]);

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

  const addLink = () => {
    if (bioLinks.length >= MAX_LINKS) {
      showNotification?.(`Maximum ${MAX_LINKS} links allowed`, 'error');
      return;
    }
    setBioLinks(prev => [...prev, { title: '', url: '', order: prev.length }]);
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
      .map((l, i) => ({
        title: (l.title || '').trim().slice(0, 80) || 'Link',
        url: (l.url || '').trim(),
        order: i
      }))
      .filter(l => l.url);
    if (sanitized.some(l => !/^https?:\/\//i.test(l.url))) {
      showNotification?.('All URLs must start with https:// (or http://)', 'error');
      return;
    }
    setSaving(true);
    try {
      const hex = customColor.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(customColor.trim()) ? customColor.trim() : accentColor;
      const btnHex = (buttonColorCustom.trim() && /^#[0-9A-Fa-f]{3,6}$/.test(buttonColorCustom.trim()))
        ? buttonColorCustom.trim()
        : (buttonColor || null);
      const updated = await updateLinkInBio({
        bioLinks: sanitized,
        linkInBioAccentColor: hex,
        linkInBioButtonColor: btnHex || null,
        linkInBioButtonStyle: buttonStyle,
        linkInBioBackgroundImageUrl: backgroundImageUrl.trim() || null,
        linkInBioAdsEnabled: adsEnabled,
        linkInBioAdPricing: {
          day: Math.max(1, adPricing.day || 10),
          threeDays: Math.max(1, adPricing.threeDays || 20),
          sevenDays: Math.max(1, adPricing.sevenDays || 40)
        }
      });
      onProfileUpdate?.({ ...currentUser, ...updated });
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

      {/* Background image */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <FaImage className="text-cyan-400" />
          Background image
        </h3>
        <p className="text-gray-400 text-sm mb-3">Full-screen image behind your link-in-bio page. Use a direct image URL (e.g. from Imgur or Cloudinary).</p>
        <p className="text-gray-500 text-xs mb-3"><strong>Recommended dimensions:</strong> 1920×1080 or larger (16:9 works on all screens). The image will be scaled to cover the whole screen and cropped if needed. Leave empty for the default gradient.</p>
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
          Color & button style
        </h3>
        <p className="text-gray-400 text-sm mb-4">Pick your accent color and how link buttons look on your page.</p>

        <div className="mb-5">
          <p className="text-gray-300 text-sm font-medium mb-2">Accent color</p>
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
          <p className="text-gray-500 text-xs mb-2">Optional. Leave “Same as main” to use the main color for link buttons.</p>
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

        <div>
          <p className="text-gray-300 text-sm font-medium mb-2">Button style</p>
          <div className="flex flex-wrap gap-2">
            {BUTTON_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setButtonStyle(opt.id)}
                className={`px-4 py-2.5 rounded-lg border-2 text-left transition-all ${buttonStyle === opt.id ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white bg-gray-700/30'}`}
              >
                <span className="font-medium block">{opt.label}</span>
                <span className="text-xs opacity-80">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
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

        {bioLinks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No links yet. Add your first link above.</p>
        ) : (
          <ul className="space-y-3">
            {bioLinks.map((link, index) => (
              <li
                key={index}
                className="flex items-center gap-2 p-3 rounded-lg bg-gray-700/50 border border-gray-600/50"
              >
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveLink(index, 'up')} disabled={index === 0} className="text-gray-500 hover:text-white p-0.5 disabled:opacity-30" aria-label="Move up">
                    <FaChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => moveLink(index, 'down')} disabled={index === bioLinks.length - 1} className="text-gray-500 hover:text-white p-0.5 disabled:opacity-30" aria-label="Move down">
                    <FaChevronDown className="w-4 h-4" />
                  </button>
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
              </li>
            ))}
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
