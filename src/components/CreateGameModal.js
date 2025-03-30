import React, { useState } from 'react';
import { FaGamepad, FaTimesCircle } from 'react-icons/fa';
import { createGame } from '../services/api';
import Modal from './Modal';

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
  { label: 'Other', value: 'other' }
];

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
    tags: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is changed
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
    }
    
    if (!formData.gameUrl.trim()) {
      newErrors.gameUrl = 'Game URL is required';
    } else if (!isValidUrl(formData.gameUrl)) {
      newErrors.gameUrl = 'Please enter a valid URL';
    }
    
    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
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
      // Parse tags string into array
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      const gameData = {
        ...formData,
        tags: tagsArray
      };
      
      const newGame = await createGame(gameData);
      onCreateGame(newGame);
    } catch (error) {
      console.error('Error creating game:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to create game. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <div className="flex items-center mb-6">
          <FaGamepad className="text-3xl text-blue-500 mr-3" />
          <h2 className="text-2xl font-bold">Add a New Game</h2>
        </div>
        
        {errors.submit && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
            {errors.submit}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-1">
              <label className="block text-gray-300 mb-1">Game Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full bg-gray-700 text-white border ${
                  errors.title ? 'border-red-500' : 'border-gray-600'
                } rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter game title"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-300 mb-1">Project Name *</label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                className={`w-full bg-gray-700 text-white border ${
                  errors.projectName ? 'border-red-500' : 'border-gray-600'
                } rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter project or company name"
              />
              {errors.projectName && (
                <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>
              )}
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-300 mb-1">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`w-full bg-gray-700 text-white border ${
                  errors.description ? 'border-red-500' : 'border-gray-600'
                } rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]`}
                placeholder="Describe your game, its features, gameplay, etc."
              ></textarea>
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-300 mb-1">Banner Type</label>
              <select
                name="bannerType"
                value={formData.bannerType}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="image">Image</option>
                <option value="video">Video/YouTube</option>
              </select>
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-300 mb-1">
                {formData.bannerType === 'image' ? 'Banner Image URL (W640xH360px) *' : 'Video/YouTube URL *'}
              </label>
              <input
                type="url"
                name="bannerUrl"
                value={formData.bannerUrl}
                onChange={handleChange}
                className={`w-full bg-gray-700 text-white border ${
                  errors.bannerUrl ? 'border-red-500' : 'border-gray-600'
                } rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder={formData.bannerType === 'image' 
                  ? "Enter URL for game banner image (W640xH360px recommended)" 
                  : "Enter YouTube or video URL"}
              />
              {errors.bannerUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.bannerUrl}</p>
              )}
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-300 mb-1">Game URL (where to play) *</label>
              <input
                type="url"
                name="gameUrl"
                value={formData.gameUrl}
                onChange={handleChange}
                className={`w-full bg-gray-700 text-white border ${
                  errors.gameUrl ? 'border-red-500' : 'border-gray-600'
                } rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter URL where players can play your game"
              />
              {errors.gameUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.gameUrl}</p>
              )}
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-300 mb-1">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-span-1">
              <label className="block text-gray-300 mb-1">Blockchain *</label>
              <select
                name="blockchain"
                value={formData.blockchain}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BLOCKCHAIN_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-gray-300 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. nft, metaverse, play-to-earn"
              />
              <p className="text-gray-500 text-xs mt-1">Separate tags with commas</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition flex items-center disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                  Submitting...
                </>
              ) : (
                'Add Game'
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateGameModal; 