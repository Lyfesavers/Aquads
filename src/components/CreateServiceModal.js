import React, { useState } from 'react';

const CreateServiceModal = ({ onClose, onCreateService, categories }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    currency: 'ETH',
    deliveryTime: '3',
    image: null,
    requirements: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateService(formData);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      
      // Also show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const previewContainer = document.getElementById('imagePreview');
        if (previewContainer) {
          previewContainer.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900/75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-gradient-to-br from-gray-900 to-black rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-2xl font-bold text-white mb-6">List Your Service</h3>
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
                      Description
                    </label>
                    <textarea
                      required
                      rows="4"
                      placeholder="Describe your service in detail..."
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Price and Delivery Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Price (ETH)
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
                      Service Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      className="w-full px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                      onChange={handleImageChange}
                    />
                    {formData.image && (
                      <div className="mt-2">
                        <img
                          id="imagePreview"
                          alt="Service preview"
                          className="h-32 w-full object-cover rounded-lg"
                        />
                      </div>
                    )}
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
                      className="px-4 py-2 bg-indigo-500/80 hover:bg-indigo-600/80 rounded-lg transition-colors text-white"
                    >
                      Create Service
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
};

export default CreateServiceModal; 