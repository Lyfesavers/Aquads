import React, { useState } from 'react';

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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">{job ? 'Edit Job' : 'Create New Job'}</h1>
              <p className="text-indigo-100 text-sm mt-1">Post your job opportunity or availability</p>
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
              {/* Job Type Selection */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <label className="block text-lg font-semibold text-white mb-4">
                  Job Type
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="jobType"
                      value="hiring"
                      checked={formData.jobType === 'hiring'}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-white font-medium">Hiring</span>
                      <p className="text-gray-400 text-sm">I'm looking to hire someone</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="jobType"
                      value="for-hire"
                      checked={formData.jobType === 'for-hire'}
                      onChange={handleChange}
                      className="w-5 h-5 text-indigo-500 bg-gray-700 border-gray-600 focus:ring-indigo-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-white font-medium">For Hire</span>
                      <p className="text-gray-400 text-sm">I'm available for work</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Job Title */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <label className="block text-lg font-semibold text-white mb-3">
                  Job Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Senior Web Developer, UI/UX Designer, Smart Contract Auditor..."
                  className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                  value={formData.title}
                  onChange={handleChange}
                />
                <p className="text-gray-400 text-sm mt-2">Be specific about the role or service you're offering</p>
              </div>

              {/* Description */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <label className="block text-lg font-semibold text-white mb-3">
                  Description
                </label>
                <textarea
                  name="description"
                  required
                  rows="6"
                  placeholder="Describe the job requirements, responsibilities, or your skills and experience..."
                  className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 resize-none"
                  value={formData.description}
                  onChange={handleChange}
                />
                <p className="text-gray-400 text-sm mt-2">Provide detailed information about the position or your expertise</p>
              </div>

              {/* Requirements */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <label className="block text-lg font-semibold text-white mb-3">
                  Requirements
                </label>
                <textarea
                  name="requirements"
                  required
                  rows="4"
                  placeholder="List specific skills, experience, or qualifications needed..."
                  className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 resize-none"
                  value={formData.requirements}
                  onChange={handleChange}
                />
                <p className="text-gray-400 text-sm mt-2">Specify what you're looking for or what you can offer</p>
              </div>

              {/* Pay Information */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Compensation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pay Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        name="payAmount"
                        value={formData.payAmount}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                        required
                      />
                    </div>
                    <p className="text-gray-400 text-xs mt-2">Enter the compensation amount</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pay Type
                    </label>
                    <select
                      name="payType"
                      value={formData.payType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white transition-all duration-200"
                      required
                    >
                      <option value="hourly">Hourly</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                    <p className="text-gray-400 text-xs mt-2">Select the payment frequency</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      required
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                      value={formData.contactEmail}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Telegram (Optional)
                    </label>
                    <input
                      type="text"
                      name="contactTelegram"
                      placeholder="@username or phone number"
                      className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                      value={formData.contactTelegram}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Discord (Optional)
                    </label>
                    <input
                      type="text"
                      name="contactDiscord"
                      placeholder="username#1234"
                      className="w-full px-4 py-3 bg-gray-700/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                      value={formData.contactDiscord}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Important Information</p>
                    <p className="text-blue-200 text-xs mt-1">Job postings will automatically expire after 30 days. You can refresh expired jobs from your dashboard to move them back to the top of the listings.</p>
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
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all duration-200 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/25"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>{job ? 'Update Job' : 'Create Job'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateJobModal; 