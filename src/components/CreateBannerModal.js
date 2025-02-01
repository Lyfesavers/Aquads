import React, { useState } from 'react';
import { Modal, Form, Alert } from 'react-bootstrap';
import { API_URL } from '../services/api';

const BANNER_OPTIONS = [
  { duration: 24 * 60 * 60 * 1000, label: '24 Hours', price: 0.5 },
  { duration: 3 * 24 * 60 * 60 * 1000, label: '3 Days', price: 1 },
  { duration: 7 * 24 * 60 * 60 * 1000, label: '7 Days', price: 2 }
];

const CreateBannerModal = ({ show, onHide, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    gif: '',
    url: '',
    duration: BANNER_OPTIONS[0].duration
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'gif') {
      validateGifUrl(value);
    }
  };

  const validateGifUrl = async (url) => {
    if (!url) {
      setPreviewUrl('');
      return;
    }

    if (!url.toLowerCase().endsWith('.gif')) {
      setError('URL must end with .gif');
      setPreviewUrl('');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Invalid URL');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/gif')) {
        throw new Error('URL must point to a GIF image');
      }
      setPreviewUrl(url);
      setError('');
    } catch (err) {
      setError('Invalid GIF URL');
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.gif || !formData.url) {
      setError('Please fill in all fields');
      return;
    }

    if (!previewUrl) {
      setError('Please provide a valid GIF URL');
      return;
    }

    try {
      setIsLoading(true);
      const selectedOption = BANNER_OPTIONS.find(opt => opt.duration === parseInt(formData.duration));
      
      const submitData = {
        title: formData.title.trim(),
        gif: formData.gif.trim(),
        url: formData.url.trim(),
        duration: parseInt(formData.duration),
        price: selectedOption.price,
        status: 'pending'
      };

      console.log('Submitting form data:', submitData);
      
      await onSubmit(submitData);
      onHide();
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to create banner ad');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="banner-modal">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg">
        <Modal.Header className="border-b border-gray-700 bg-gray-800 rounded-t-lg">
          <Modal.Title className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Create Banner Advertisement
          </Modal.Title>
          <button
            onClick={onHide}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            ×
          </button>
        </Modal.Header>
        <Modal.Body className="bg-gray-900 p-6">
          <Form onSubmit={handleSubmit}>
            {error && (
              <Alert variant="danger" className="bg-red-500/10 border border-red-500/20 text-red-400 mb-4 rounded">
                {error}
              </Alert>
            )}
            
            <Form.Group className="mb-4">
              <Form.Label className="text-gray-300">Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter banner title"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="text-gray-300">GIF URL</Form.Label>
              <Form.Control
                type="url"
                name="gif"
                value={formData.gif}
                onChange={handleInputChange}
                placeholder="Enter GIF URL"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </Form.Group>

            {previewUrl && (
              <div className="mb-4 p-2 bg-gray-800/50 rounded-lg">
                <img 
                  src={previewUrl} 
                  alt="Banner Preview" 
                  className="w-full max-h-48 object-contain rounded"
                />
              </div>
            )}

            <Form.Group className="mb-4">
              <Form.Label className="text-gray-300">Website URL</Form.Label>
              <Form.Control
                type="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="Enter website URL"
                required
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </Form.Group>

            <Form.Group className="mb-6">
              <Form.Label className="text-gray-300">Duration</Form.Label>
              <Form.Select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="bg-gray-800/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {BANNER_OPTIONS.map((option, index) => (
                  <option key={index} value={option.duration} className="bg-gray-800">
                    {option.label} - {option.price} SOL
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                isLoading
                  ? 'bg-indigo-500/50 cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/50'
              }`}
            >
              {isLoading ? 'Creating...' : 'Create Banner Ad'}
            </button>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
};

export default CreateBannerModal; 