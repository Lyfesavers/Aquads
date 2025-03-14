import React, { useState, useEffect } from 'react';
import { FaGamepad, FaTimesCircle } from 'react-icons/fa';
import { updateGame } from '../services/api';
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

const EditGameModal = ({ game, onClose, onUpdateGame }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bannerType: 'image',
    bannerUrl: '',
    gameUrl: '',
    projectName: '',
    category: '',
    blockchain: '',
    tags: []
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load the game data into the form when the component mounts
  useEffect(() => {
    if (game) {
      setFormData({
        title: game.title || '',
        description: game.description || '',
        bannerType: game.bannerType || 'image',
        bannerUrl: game.bannerUrl || '',
        gameUrl: game.gameUrl || '',
        projectName: game.projectName || '',
        category: game.category || '',
        blockchain: game.blockchain || '',
        tags: game.tags || []
      });
    }
  }, [game]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when it's changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.bannerUrl.trim()) newErrors.bannerUrl = 'Banner URL is required';
    if (formData.bannerUrl.trim() && !isValidUrl(formData.bannerUrl)) newErrors.bannerUrl = 'Invalid URL format';
    if (!formData.gameUrl.trim()) newErrors.gameUrl = 'Game URL is required';
    if (formData.gameUrl.trim() && !isValidUrl(formData.gameUrl)) newErrors.gameUrl = 'Invalid URL format';
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.blockchain) newErrors.blockchain = 'Blockchain is required';
    
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
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      const updatedGame = await updateGame(game._id, formData);
      onUpdateGame(updatedGame);
      onClose();
    } catch (error) {
      console.error('Error updating game:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to update game. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal onClose={onClose}>
      <div className="bg-gray-800 text-white rounded-lg overflow-hidden">
        <div className="flex justify-between items-center bg-gray-700 p-4 border-b border-gray-600">
          <h2 className="text-xl font-bold flex items-center">
            <FaGamepad className="mr-2" /> Edit Game
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {errors.submit && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4">
              {errors.submit}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-1 md:col-span-2">
              <label className="block mb-1">Game Title*</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.title ? 'border-red-500' : 'border-gray-600'}`}
                placeholder="Enter game title"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
            
            {/* Description */}
            <div className="col-span-1 md:col-span-2">
              <label className="block mb-1">Description*</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.description ? 'border-red-500' : 'border-gray-600'}`}
                placeholder="Enter game description"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>
            
            {/* Banner Type */}
            <div>
              <label className="block mb-1">Banner Type*</label>
              <select
                name="bannerType"
                value={formData.bannerType}
                onChange={handleChange}
                className="w-full bg-gray-700 rounded p-2 border border-gray-600"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            
            {/* Banner URL */}
            <div>
              <label className="block mb-1">Banner URL*</label>
              <input
                type="text"
                name="bannerUrl"
                value={formData.bannerUrl}
                onChange={handleChange}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.bannerUrl ? 'border-red-500' : 'border-gray-600'}`}
                placeholder={`Enter ${formData.bannerType} URL`}
              />
              {errors.bannerUrl && <p className="text-red-500 text-sm mt-1">{errors.bannerUrl}</p>}
            </div>
            
            {/* Game URL */}
            <div>
              <label className="block mb-1">Game URL*</label>
              <input
                type="text"
                name="gameUrl"
                value={formData.gameUrl}
                onChange={handleChange}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.gameUrl ? 'border-red-500' : 'border-gray-600'}`}
                placeholder="https://..."
              />
              {errors.gameUrl && <p className="text-red-500 text-sm mt-1">{errors.gameUrl}</p>}
            </div>
            
            {/* Project Name */}
            <div>
              <label className="block mb-1">Project Name*</label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.projectName ? 'border-red-500' : 'border-gray-600'}`}
                placeholder="Enter project name"
              />
              {errors.projectName && <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>}
            </div>
            
            {/* Category */}
            <div>
              <label className="block mb-1">Category*</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.category ? 'border-red-500' : 'border-gray-600'}`}
              >
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>
            
            {/* Blockchain */}
            <div>
              <label className="block mb-1">Blockchain*</label>
              <select
                name="blockchain"
                value={formData.blockchain}
                onChange={handleChange}
                className={`w-full bg-gray-700 rounded p-2 border ${errors.blockchain ? 'border-red-500' : 'border-gray-600'}`}
              >
                <option value="">Select Blockchain</option>
                {BLOCKCHAIN_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.blockchain && <p className="text-red-500 text-sm mt-1">{errors.blockchain}</p>}
            </div>
            
            {/* Tags */}
            <div className="col-span-1 md:col-span-2">
              <label className="block mb-1">Tags</label>
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  className="flex-grow bg-gray-700 rounded-l p-2 border border-gray-600"
                  placeholder="Add a tag and press Enter"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="bg-blue-600 text-white px-4 rounded-r hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <div key={tag} className="bg-blue-900 text-blue-100 px-2 py-1 rounded-full flex items-center">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-blue-300 hover:text-white"
                      >
                        <FaTimesCircle />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Game'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditGameModal; 