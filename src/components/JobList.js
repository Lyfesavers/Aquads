import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash } from 'react-icons/fa';

const JobList = ({ jobs, currentUser, onEditJob, onDeleteJob }) => {
  const [expandedJobId, setExpandedJobId] = useState(null);

  const toggleExpand = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!jobs?.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        No jobs posted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div 
          key={job._id}
          className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors"
        >
          {/* Header - Always visible */}
          <div 
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => toggleExpand(job._id)}
          >
            <div className="flex items-center space-x-4">
              <img 
                src={job.ownerImage || 'default-avatar.png'} 
                alt={job.ownerUsername}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-lg">{job.title}</h3>
                <p className="text-sm text-gray-400">
                  ${job.payAmount}/{job.payType} • Posted {formatDate(job.createdAt)}
                </p>
              </div>
            </div>
            {expandedJobId === job._id ? <FaChevronUp /> : <FaChevronDown />}
          </div>

          {/* Expanded Content */}
          {expandedJobId === job._id && (
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Description</h4>
                  <p className="mt-1">{job.description}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400">Requirements</h4>
                  <p className="mt-1">{job.requirements}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400">Contact Information</h4>
                  <div className="mt-1 space-y-1">
                    <p>Email: {job.contactEmail}</p>
                    {job.contactTelegram && <p>Telegram: {job.contactTelegram}</p>}
                    {job.contactDiscord && <p>Discord: {job.contactDiscord}</p>}
                  </div>
                </div>

                {currentUser && currentUser.userId === job.owner && (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditJob(job);
                      }}
                      className="p-2 text-blue-400 hover:text-blue-300"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteJob(job._id);
                      }}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <FaTrash />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default JobList; 