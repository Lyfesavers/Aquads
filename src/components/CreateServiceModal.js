import React, { useState } from 'react';

const CreateServiceModal = ({ onClose, onCreateService, categories }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    currency: 'USDC',
    deliveryTime: '3',
    image: '',
    videoUrl: '',
    requirements: '',

  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  
  // Character count function (including spaces)
  const getCharacterCount = (text) => {
    return text.length;
  };

  // Payment terms filter function
  const checkForPaymentTerms = (text) => {
    const paymentTerms = [
      'payment', 'pay', 'paid', 'paying',
      'partial payment', 'full payment', 'advance payment', 'upfront payment',
      'deposit', 'down payment', 'initial payment',
      'money', 'cash', 'funds', 'funding',
      'budget', 'cost', 'price', 'pricing',
      'fee', 'fees', 'charge', 'charges',
      'billing', 'invoice', 'invoicing',
      'escrow', 'milestone', 'milestones',
      '50%', '100%', '25%', '75%',
      'half payment', 'quarter payment',
      'first payment', 'second payment', 'final payment'
    ];
    
    const lowerText = text.toLowerCase();
    const foundTerms = paymentTerms.filter(term => 
      lowerText.includes(term.toLowerCase())
    );
    
    return foundTerms;
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
    
         // Validate requirements for payment terms
     if (formData.requirements && formData.requirements.trim() !== '') {
       const foundPaymentTerms = checkForPaymentTerms(formData.requirements);
       if (foundPaymentTerms.length > 0) {
         setError(`Requirements field cannot contain payment-related terms. Please remove: ${foundPaymentTerms.join(', ')}. Requirements should describe what you need from the buyer to complete the work, not payment terms. Including payment terms will get your listing rejected.`);
         return;
       }
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
    
    onCreateService(formData);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Create New Service</h1>
              <p className="text-indigo-100 text-sm mt-1">Build your professional service listing</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white/10"
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
            <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <label className="block text-lg font-semibold text-white mb-3">
              Service Title
            </label>
            <input
              type="text"
              required
              placeholder="I will create a professional website for your business..."
              className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <p className="text-gray-400 text-sm mt-2">Start with "I will" to clearly describe what you offer</p>
          </div>

          {/* Category */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <label className="block text-lg font-semibold text-white mb-3">
              Category
            </label>
            <select
              required
              className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all duration-200"
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
            <p className="text-gray-400 text-sm mt-2">Choose the most relevant category for your service</p>
          </div>

          {/* Description */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <label className="block text-lg font-semibold text-white mb-3">
              Description (Minimum 200 characters)
            </label>
            <textarea
              required
              rows="6"
              placeholder="Describe your service in detail, including what you'll deliver, your expertise, and why clients should choose you..."
              className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 resize-none"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex justify-between items-center mt-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getCharacterCount(formData.description) >= 200 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <p className={`text-sm font-medium ${getCharacterCount(formData.description) >= 200 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {getCharacterCount(formData.description)} / 200 characters
                </p>
              </div>
              {getCharacterCount(formData.description) < 200 && (
                <p className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                  {200 - getCharacterCount(formData.description)} more needed
                </p>
              )}
            </div>
          </div>



          {/* Price and Delivery Time */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-4">Pricing & Delivery</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Starting Price (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">Set your starting price in USDC</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delivery Time
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all duration-200"
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
                <p className="text-gray-400 text-xs mt-2">How long will it take to deliver?</p>
              </div>
            </div>
          </div>

          {/* Service Image */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <label className="block text-lg font-semibold text-white mb-3">
              Service Image
            </label>
            <div className="space-y-4">
              <input
                type="url"
                required
                placeholder="https://example.com/your-service-image.jpg"
                className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                value={formData.image}
                onChange={handleImageChange}
              />
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Recommended: 768x384px (JPEG, PNG, or GIF)</span>
              </div>
              {error && (
                <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm text-gray-300 mb-2">Preview:</p>
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Service preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-600"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                      ✓ Valid
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service Video (Optional) */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <label className="block text-lg font-semibold text-white mb-3">
              Service Video (Optional)
            </label>
            <div className="space-y-3">
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=your-video-id"
                className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                value={formData.videoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
              />
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>Only YouTube videos are supported</span>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Pro Tip</p>
                    <p className="text-blue-200 text-xs">Adding a video can increase engagement by up to 80% and showcase your work better!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <label className="block text-lg font-semibold text-white mb-3">
              Requirements from Buyers
            </label>
            <div className="space-y-3">
              <textarea
                rows="4"
                placeholder="What do you need from buyers to get started? (e.g., project details, specifications, files, brand guidelines, etc.)"
                className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 resize-none"
                value={formData.requirements}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFormData(prev => ({ ...prev, requirements: newValue }));
                  
                  // Real-time validation for payment terms
                  if (newValue && newValue.trim() !== '') {
                    const foundPaymentTerms = checkForPaymentTerms(newValue);
                    if (foundPaymentTerms.length > 0) {
                      setError(`⚠️ Payment terms detected: ${foundPaymentTerms.join(', ')}. Requirements should describe what you need from the buyer, not payment terms. Including payment terms will get your listing rejected.`);
                    } else {
                      setError(''); // Clear error if no payment terms found
                    }
                  } else {
                    setError(''); // Clear error if field is empty
                  }
                }}
              />
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-amber-300 text-sm font-medium">Important</p>
                    <p className="text-amber-200 text-xs">Describe what information, files, or specifications you need from buyers to start the work. Do not include payment terms here.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
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
                disabled={!!error}
                className={`px-8 py-3 rounded-lg transition-all duration-200 text-white font-semibold ${
                  error 
                    ? 'bg-gray-500/80 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/25'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Service</span>
                </div>
              </button>
            </div>
            {error && (
              <div className="mt-4 flex items-center space-x-2 text-red-400 bg-red-900/20 p-4 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  </div>
  );
};

export default CreateServiceModal; 