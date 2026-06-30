import React, { useState, useEffect } from 'react';
import { FaGamepad, FaPlus, FaTrash } from 'react-icons/fa';
import { createGame } from '../services/api';
import { GAME_SOCIAL_PLATFORM_OPTIONS, sanitizeGameSocialsForApi } from './GameSocialLinks';

const BLOCKCHAIN_OPTIONS = [
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Solana', value: 'solana' },
  { label: 'Binance Smart Chain', value: 'bsc' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'WAX', value: 'wax' },
  { label: 'Sui', value: 'sui' },
  { label: 'Polkadot', value: 'polkadot' },
  { label: 'Aptos', value: 'aptos' },
  { label: 'Near', value: 'near' },
  { label: 'Immutable X', value: 'immutablex' },
  { label: 'Kaspa', value: 'kaspa' },
  { label: 'Other', value: 'other' }
];

const GAME_BANNER_IMAGE_SIZE = '640×360 px (16:9)';

const CATEGORY_OPTIONS = [
  { label: 'Action', value: 'action' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'RPG', value: 'rpg' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Puzzle', value: 'puzzle' },
  { label: 'Simulation', value: 'simulation' },
  { label: 'Sports', value: 'sports' },
  { label: 'Card Game', value: 'card' },
  { label: 'Casual', value: 'casual' },
  { label: 'Racing', value: 'racing' },
  { label: 'Battle Royale', value: 'battle-royale' },
  { label: 'MMORPG', value: 'mmorpg' },
  { label: 'Platformer', value: 'platformer' },
  { label: 'Shooter', value: 'shooter' },
  { label: 'Fighting', value: 'fighting' },
  { label: 'Other', value: 'other' }
];

const inputClass = (hasError) =>
  `w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 ${
    hasError ? 'ring-2 ring-red-500/60' : ''
  }`;

const CreateGameModal = ({ onClose, onCreateGame }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bannerType: 'image',
    bannerUrl: '',
    gameUrl: '',
    projectName: '',
    category: 'action',
    blockchain: 'ethereum',
    tags: '',
    socials: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.bannerUrl.trim()) {
      newErrors.bannerUrl = 'Banner URL is required';
    } else if (!isValidUrl(formData.bannerUrl)) {
      newErrors.bannerUrl = 'Please enter a valid URL';
    } else if (formData.bannerType === 'video' &&
              !(formData.bannerUrl.includes('youtube.com/watch?v=') ||
                formData.bannerUrl.includes('youtube.com/embed/') ||
                formData.bannerUrl.includes('youtu.be/'))) {
      newErrors.bannerUrl = 'Only YouTube videos are supported. Please provide a YouTube link.';
    }

    if (!formData.gameUrl.trim()) {
      newErrors.gameUrl = 'Game URL is required';
    } else if (!isValidUrl(formData.gameUrl)) {
      newErrors.gameUrl = 'Please enter a valid URL';
    }

    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }

    const incompleteSocial = (formData.socials || []).some((row) => {
      const u = row?.url?.trim();
      const p = row?.platform;
      return (u && !p) || (p && !u);
    });
    if (incompleteSocial) {
      newErrors.socials = 'Each social row needs both a platform and a URL, or remove the row.';
    }
    const badSocialUrl = (formData.socials || []).some((row) => {
      if (!row?.url?.trim() || !row?.platform) return false;
      return !isValidUrl(row.url.trim());
    });
    if (badSocialUrl) {
      newErrors.socials = 'Please enter a valid URL for each social link.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

      const gameData = {
        ...formData,
        tags: tagsArray,
        socials: sanitizeGameSocialsForApi(formData.socials || [])
      };

      const newGame = await createGame(gameData);

      onClose();
      onCreateGame(newGame);
    } catch (error) {
      console.error('Error creating game:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to create game. Please try again.'
      }));
      setIsSubmitting(false);
    }
  };

  const addSocialRow = () => {
    if ((formData.socials || []).length >= 12) return;
    setFormData((prev) => ({
      ...prev,
      socials: [...(prev.socials || []), { platform: 'twitter', url: '' }]
    }));
    setErrors((prev) => ({ ...prev, socials: '' }));
  };

  const removeSocialRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      socials: (prev.socials || []).filter((_, i) => i !== index)
    }));
    setErrors((prev) => ({ ...prev, socials: '' }));
  };

  const updateSocialRow = (index, field, value) => {
    setFormData((prev) => {
      const next = [...(prev.socials || [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return { ...prev, socials: next };
    });
    if (errors.socials) {
      setErrors((prev) => ({ ...prev, socials: '' }));
    }
  };

  const showBannerPreview =
    formData.bannerType === 'image' &&
    formData.bannerUrl.trim() &&
    isValidUrl(formData.bannerUrl.trim());

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 shadow-lg shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <FaGamepad className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Add a New Game</h1>
                <p className="text-blue-100 text-sm mt-1">List your game on the Aquads Game Hub</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {errors.submit && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 border border-red-500/30 p-4 rounded-xl mb-6">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{errors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Game Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className={inputClass(errors.title)}
                      placeholder="Enter game title"
                    />
                    {errors.title && (
                      <p className="text-red-400 text-sm mt-2">{errors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Project Name *</label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleChange}
                      className={inputClass(errors.projectName)}
                      placeholder="Enter project or company name"
                    />
                    {errors.projectName && (
                      <p className="text-red-400 text-sm mt-2">{errors.projectName}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="5"
                      className={`${inputClass(errors.description)} resize-none`}
                      placeholder="Describe your game, its features, gameplay, and what makes it unique..."
                    />
                    {errors.description && (
                      <p className="text-red-400 text-sm mt-2">{errors.description}</p>
                    )}
                    <p className="text-gray-400 text-sm mt-2">Help players understand what your game is about</p>
                  </div>
                </div>
              </div>

              {/* Banner & Media */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Banner & Media</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Banner Type</label>
                    <select
                      name="bannerType"
                      value={formData.bannerType}
                      onChange={handleChange}
                      className={inputClass(false)}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video / YouTube</option>
                    </select>
                    <p className="text-gray-400 text-xs mt-2">Choose how your game appears in the hub</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {formData.bannerType === 'image' ? 'Banner Image URL *' : 'Video / YouTube URL *'}
                    </label>
                    <input
                      type="url"
                      name="bannerUrl"
                      value={formData.bannerUrl}
                      onChange={handleChange}
                      className={inputClass(errors.bannerUrl)}
                      placeholder={formData.bannerType === 'image'
                        ? 'https://example.com/your-game-banner.jpg'
                        : 'https://youtube.com/watch?v=your-video-id'}
                    />
                    {formData.bannerType === 'image' && (
                      <p className="text-gray-400 text-xs mt-2">
                        Recommended size: <span className="text-gray-300">{GAME_BANNER_IMAGE_SIZE}</span>. Direct image URL (JPG, PNG, or WebP).
                      </p>
                    )}
                    {formData.bannerType === 'video' && (
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-2">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span>Only YouTube videos are supported (youtube.com or youtu.be)</span>
                      </div>
                    )}
                    {errors.bannerUrl && (
                      <p className="text-red-400 text-sm mt-2">{errors.bannerUrl}</p>
                    )}
                  </div>
                </div>

                {showBannerPreview && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-300 mb-2">Banner preview:</p>
                    <div className="relative rounded-lg overflow-hidden border border-gray-600 aspect-video max-w-xl">
                      <img
                        src={formData.bannerUrl.trim()}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/640x360?text=Preview+Unavailable';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Game Details */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Game Details</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Game URL (where to play) *</label>
                    <input
                      type="url"
                      name="gameUrl"
                      value={formData.gameUrl}
                      onChange={handleChange}
                      className={inputClass(errors.gameUrl)}
                      placeholder="https://yourgame.com/play"
                    />
                    {errors.gameUrl && (
                      <p className="text-red-400 text-sm mt-2">{errors.gameUrl}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">The link players click to launch your game</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={inputClass(false)}
                      >
                        {CATEGORY_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Blockchain *</label>
                      <select
                        name="blockchain"
                        value={formData.blockchain}
                        onChange={handleChange}
                        className={inputClass(false)}
                      >
                        {BLOCKCHAIN_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      className={inputClass(false)}
                      placeholder="e.g. nft, metaverse, play-to-earn"
                    />
                    <p className="text-gray-400 text-xs mt-2">Separate tags with commas to help players discover your game</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Social Links</h3>
                    <p className="text-gray-400 text-sm mt-1">Optional — add your community or project pages (max 12)</p>
                  </div>
                  <button
                    type="button"
                    onClick={addSocialRow}
                    disabled={(formData.socials || []).length >= 12}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
                  >
                    <FaPlus className="text-xs" />
                    Add social
                  </button>
                </div>

                {errors.socials && (
                  <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg mb-4">
                    <span className="text-sm">{errors.socials}</span>
                  </div>
                )}

                {(formData.socials || []).length === 0 ? (
                  <p className="text-gray-500 text-sm bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
                    No socials yet — use &quot;Add social&quot; to link Twitter, Discord, and more.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(formData.socials || []).map((row, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <select
                          value={row.platform || 'twitter'}
                          onChange={(e) => updateSocialRow(index, 'platform', e.target.value)}
                          className="sm:w-44 w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all duration-200"
                        >
                          {GAME_SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={row.url || ''}
                          onChange={(e) => updateSocialRow(index, 'url', e.target.value)}
                          className="flex-1 w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 transition-all duration-200"
                          placeholder="https://"
                        />
                        <button
                          type="button"
                          onClick={() => removeSocialRow(index)}
                          className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg bg-gray-700/80 hover:bg-red-900/50 text-gray-300 hover:text-red-300 border border-gray-600 transition-colors"
                          title="Remove"
                          aria-label="Remove social row"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex flex-col sm:flex-row justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-600/80 hover:bg-gray-700/80 rounded-lg transition-all duration-200 text-white font-medium hover:shadow-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 rounded-lg transition-all duration-200 text-white font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <FaGamepad className="w-4 h-4" />
                          <span>Add Game</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGameModal;
