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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create New Service</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

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
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Starting Price (USDC)
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Delivery Time (Days)
              </label>
              <select
                required
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
              placeholder="What do you need from buyers to get started? (e.g., project details, specifications, files, etc.)"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
            <p className="text-gray-400 text-xs mt-1">
              Describe what information, files, or specifications you need from buyers to start the work. Do not include payment terms here.
            </p>
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
              Create Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServiceModal; 