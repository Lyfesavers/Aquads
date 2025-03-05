import React, { useState } from 'react';
import Modal from './Modal';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CreateBlogModal = ({ onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    bannerImage: initialData?.bannerImage || ''
  });
  const [previewUrl, setPreviewUrl] = useState(initialData?.bannerImage || '');
  const [error, setError] = useState('');
  const [wordCount, setWordCount] = useState(
    initialData?.content ? initialData.content.trim().split(/\s+/).length : 0
  );

  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      return contentType.startsWith('image/');
    } catch (error) {
      return false;
    }
  };

  const handleBannerChange = async (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, bannerImage: url }));
    
    if (url) {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        setPreviewUrl(url);
        setError('');
      } else {
        setPreviewUrl('');
        setError('Please enter a valid image URL');
      }
    } else {
      setPreviewUrl('');
      setError('');
    }
  };

  const handleContentChange = (content) => {
    const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/);
    const count = words[0] === '' ? 0 : words.length;
    setWordCount(count);
    
    if (count > 5000) {
      setError('Content exceeds 5000 words limit');
    } else {
      setError('');
    }
    
    setFormData(prev => ({ ...prev, content }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!previewUrl) {
      setError('Please enter a valid banner image URL');
      return;
    }
    if (wordCount > 5000) {
      setError('Content exceeds 5000 words limit');
      return;
    }
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!formData.content.trim()) {
      setError('Please enter content');
      return;
    }

    onSubmit(formData);
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-white">
        <h2 className="text-2xl font-bold mb-4">
          {initialData ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1">Banner Image URL</label>
            <input
              type="url"
              value={formData.bannerImage}
              onChange={handleBannerChange}
              className="w-full px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Banner preview"
                  className="w-full h-40 object-cover rounded"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1">Content</label>
            <div className="bg-gray-700 rounded">
              <ReactQuill
                value={formData.content}
                onChange={handleContentChange}
                className="bg-gray-800 text-white"
                theme="snow"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image', 'blockquote', 'code-block'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['clean']
                  ]
                }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-400">
              Word count: {wordCount}/5000
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!!error}
              className={`px-4 py-2 rounded ${
                error 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {initialData ? 'Update Blog' : 'Create Blog'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateBlogModal; 