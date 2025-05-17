import React, { useState } from 'react';
import Modal from './Modal';

const CreateJobModal = ({ onClose, onCreateJob, job = null }) => {
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    requirements: job?.requirements || '',
    payAmount: job?.payAmount || '',
    payType: job?.payType || 'hourly',
    jobType: job?.jobType || 'hiring',
    contactEmail: job?.contactEmail || '',
    contactTelegram: job?.contactTelegram || '',
    contactDiscord: job?.contactDiscord || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (job) {
        // If job exists, we're editing
        await onCreateJob({ ...formData, _id: job._id });
      } else {
        // New job creation
        await onCreateJob(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error creating/editing job:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">{job ? 'Edit Job' : 'Create New Job'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="jobType"
                value="hiring"
                checked={formData.jobType === 'hiring'}
                onChange={handleChange}
                className="text-blue-500"
              />
              <span>Hiring</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="jobType"
                value="for-hire"
                checked={formData.jobType === 'for-hire'}
                onChange={handleChange}
                className="text-blue-500"
              />
              <span>For Hire</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Requirements</label>
            <textarea
              name="requirements"
              required
              value={formData.requirements}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Pay Amount
              </label>
              <input
                type="number"
                name="payAmount"
                value={formData.payAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Pay Type
              </label>
              <select
                name="payType"
                value={formData.payType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 rounded"
                required
              >
                <option value="hourly">Hourly</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Email</label>
            <input
              type="email"
              name="contactEmail"
              required
              value={formData.contactEmail}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telegram (Optional)</label>
            <input
              type="text"
              name="contactTelegram"
              value={formData.contactTelegram}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Discord (Optional)</label>
            <input
              type="text"
              name="contactDiscord"
              value={formData.contactDiscord}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 rounded"
            />
          </div>

          <div className="mt-4 p-3 bg-indigo-900/50 border border-indigo-600/30 rounded-lg">
            <p className="text-indigo-300 text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
              Note: Job postings will automatically expire after 30 days. You can refresh expired jobs from your dashboard to move them back to the top of the listings.
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
            >
              {job ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateJobModal; 