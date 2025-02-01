import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
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
      
      // Call parent's onSubmit with form data and price
      await onSubmit({
        ...formData,
        price: selectedOption.price
      });
      
      onHide();
    } catch (err) {
      setError(err.message || 'Failed to create banner ad');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Banner Advertisement</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter banner title"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>GIF URL</Form.Label>
            <Form.Control
              type="url"
              name="gif"
              value={formData.gif}
              onChange={handleInputChange}
              placeholder="Enter GIF URL"
              required
            />
          </Form.Group>

          {previewUrl && (
            <div className="text-center mb-3">
              <img 
                src={previewUrl} 
                alt="Banner Preview" 
                style={{ maxWidth: '100%', maxHeight: '200px' }}
              />
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Website URL</Form.Label>
            <Form.Control
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              placeholder="Enter website URL"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Duration</Form.Label>
            <Form.Select
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
            >
              {BANNER_OPTIONS.map((option, index) => (
                <option key={index} value={option.duration}>
                  {option.label} - {option.price} SOL
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button 
              variant="primary" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Banner Ad'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CreateBannerModal; 