import React, { useState } from 'react';
import Modal from './Modal';

const CreateJobModal = ({ onClose, onCreateJob, job = null }) => {
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    requirements: job?.requirements || '',
    payAmount: job?.payAmount || '',
    payType: job?.payType || 'hourly',
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
        <h2 className="text-2xl font-bold mb-4">Create Job Posting</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium mb-1">Pay Amount</label>
              <input
                type="number"
                name="payAmount"
                required
                value={formData.payAmount}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pay Type</label>
              <select
                name="payType"
                value={formData.payType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-700 rounded"
              >
                <option value="hourly">Hourly</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
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
              Create Job
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateJobModal; 