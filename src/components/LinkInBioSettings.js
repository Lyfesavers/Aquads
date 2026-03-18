import React, { useState, useEffect } from 'react';
import { updateUserProfile } from '../services/api';
import { FaPlus, FaTrash, FaCopy, FaChevronUp, FaChevronDown, FaLink, FaExternalLinkAlt } from 'react-icons/fa';

const MAX_LINKS = 12;
const BASE_URL = 'https://www.aquads.xyz';

const LinkInBioSettings = ({ currentUser, onProfileUpdate, showNotification }) => {
  const [bioLinks, setBioLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBioLinks(Array.isArray(currentUser?.bioLinks) ? [...currentUser.bioLinks] : []);
  }, [currentUser?.bioLinks]);

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
      const updated = await updateUserProfile({ bioLinks: sanitized });
      onProfileUpdate?.({ ...currentUser, ...updated });
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

      <p className="text-gray-500 text-xs text-center">
        Your page will show &quot;Powered by Aquads.xyz&quot; at the bottom.
      </p>
    </div>
  );
};

export default LinkInBioSettings;
