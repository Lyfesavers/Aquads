import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaEnvelope, FaTelegram, FaDiscord } from 'react-icons/fa';

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

  const handleEmailClick = (job) => {
    const emailSubject = `Application for ${job.title} position`;
    const emailBody = `Hi ${job.ownerUsername},

I am writing to apply for the ${job.title} position posted on Aquads.

I have reviewed the requirements and I am confident I would be a great fit for this role.

Requirements mentioned:
${job.requirements}

I look forward to discussing how my skills align with your needs.

Best regards,
[Your name]`;

    const mailtoLink = `mailto:${job.contactEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
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
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-800/70 transition-all duration-300"
          onClick={() => toggleExpand(job._id)}
        >
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                {/* Profile image circle */}
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                  <img
                    src={job.owner?.image || job.ownerImage || `https://ui-avatars.com/api/?name=${job.ownerUsername}&background=random`}
                    alt={job.ownerUsername}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${job.ownerUsername}&background=random`;
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                  <p className="text-sm text-gray-400">Posted by {job.ownerUsername} • {formatDate(job.createdAt)}</p>
                </div>
              </div>
              
              {/* Fix the condition here */}
              {currentUser && (currentUser.userId === job.owner || currentUser.userId === job.owner._id) && (
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditJob(job);
                    }}
                    className="text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <FaEdit size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this job?')) {
                        onDeleteJob(job._id);
                      }
                    }}
                    className="text-red-500 hover:text-red-400 transition-colors"
                  >
                    <FaTrash size={18} />
                  </button>
                </div>
              )}
            </div>
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
                  <div className="mt-2 space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmailClick(job);
                      }}
                      className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <FaEnvelope />
                      <span>{job.contactEmail}</span>
                    </button>
                    
                    {job.contactTelegram && (
                      <a
                        href={`https://t.me/${job.contactTelegram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <FaTelegram />
                        <span>{job.contactTelegram}</span>
                      </a>
                    )}
                    
                    {job.contactDiscord && (
                      <div className="flex items-center space-x-2 text-blue-400">
                        <FaDiscord />
                        <span>{job.contactDiscord}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default JobList; 