import React, { useState } from 'react';

const EditServiceModal = ({ service, onClose, onEditService, categories }) => {
  const [formData, setFormData] = useState({
    title: service.title || '',
    description: service.description || '',
    category: service.category || '',
    price: service.price || '',
    hourlyRate: service.hourlyRate || '',
    currency: service.currency || 'USDC',
    deliveryTime: service.deliveryTime || '3',
    image: service.image || '',
    videoUrl: service.videoUrl || '',
    requirements: service.requirements || '',

  });
  const [previewUrl, setPreviewUrl] = useState(service.image || '');
  const [error, setError] = useState('');
  
  // Character count function (including spaces)
  const getCharacterCount = (text) => {
    return text.length;
  };

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType.startsWith('image/') && 
        (contentType.includes('gif') || contentType.includes('png') || contentType.includes('jpeg') || contentType.includes('jpg'));
    } catch (error) {
      return false;
    }
  };

  const handleImageChange = async (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, image: url }));
    
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL (JPEG, PNG, or GIF)');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!previewUrl) {
      setError('Please enter a valid image URL');
      return;
    }
    
    // Validate description character count
    const characterCount = getCharacterCount(formData.description);
    if (characterCount < 200) {
      setError(`Description must contain at least 200 characters. Currently: ${characterCount} characters`);
      return;
    }
    
    // Validate video URL if provided (same as games)
    if (formData.videoUrl && formData.videoUrl.trim() !== '') {
      if (!(formData.videoUrl.includes('youtube.com/watch?v=') || 
            formData.videoUrl.includes('youtube.com/embed/') ||
            formData.videoUrl.includes('youtu.be/'))) {
        setError('Only YouTube videos are supported. Please provide a YouTube link.');
        return;
      }
    }
    
    onEditService(service._id, formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-gradient-to-br from-gray-900 to-black rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-2xl font-bold text-white mb-6">Edit Your Service</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Service Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="I will..."
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      required
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (Minimum 200 characters)
                    </label>
                    <textarea
                      required
                      rows="4"
                      placeholder="Describe your service in detail... (minimum 200 characters for professional presentation)"
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-sm ${getCharacterCount(formData.description) >= 200 ? 'text-green-400' : 'text-yellow-400'}`}>
                        Character count: {getCharacterCount(formData.description)} / 200 minimum
                      </p>
                      {getCharacterCount(formData.description) < 200 && (
                        <p className="text-xs text-gray-400">
                          {200 - getCharacterCount(formData.description)} more characters needed
                        </p>
                      )}
                    </div>
                  </div>



                  {/* Price and Delivery Time */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (USDC)
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Hourly Rate (USDC) - Optional
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Delivery Time (Days)
                      </label>
                      <select
                        required
                        className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                        value={formData.deliveryTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      >
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="5">5 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Service Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Service Image URL (768px x 384px)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="Enter image URL (JPEG, PNG, or GIF) - Recommended: 768x384px"
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.image}
                      onChange={handleImageChange}
                    />
                    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                    {previewUrl && (
                      <div className="mt-2">
                        <img
                          src={previewUrl}
                          alt="Service preview"
                          className="h-32 w-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Service Video (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Service Video URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="Enter YouTube URL (youtube.com/watch?v= or youtu.be/)"
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Adding a video can increase engagement and showcase your work better!
                    </p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Requirements from Buyers
                    </label>
                    <textarea
                      rows="3"
                      placeholder="What do you need from buyers to get started?"
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.requirements}
                      onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-600/80 hover:bg-gray-700/80 rounded-lg transition-colors text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!!error}
                      className={`px-4 py-2 rounded-lg transition-colors text-white ${
                        error 
                          ? 'bg-gray-500/80 cursor-not-allowed' 
                          : 'bg-indigo-500/80 hover:bg-indigo-600/80'
                      }`}
                    >
                      Update Service
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditServiceModal; 