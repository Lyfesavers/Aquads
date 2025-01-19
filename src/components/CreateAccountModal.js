import React, { useState } from 'react';
import Modal from './Modal';

const CreateAccountModal = ({ onCreateAccount, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    image: null
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('username', formData.username);
    data.append('password', formData.password);
    if (formData.image) {
      data.append('image', formData.image);
    }
    onCreateAccount(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const previewContainer = document.getElementById('profileImagePreview');
        if (previewContainer) {
          previewContainer.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Profile Picture</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.image && (
              <div className="mt-2">
                <img
                  id="profileImagePreview"
                  alt="Profile preview"
                  className="w-24 h-24 rounded-full object-cover mx-auto"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateAccountModal; 